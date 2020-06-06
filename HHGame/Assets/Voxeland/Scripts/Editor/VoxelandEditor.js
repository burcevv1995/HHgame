
@CustomEditor (Voxeland) 
class VoxelandEditor extends Editor
{
	var oldMousePos : Vector2;
	var mouseWasPressed : boolean;
	
	var listeningForGuiChanges : boolean;
	var guiChanged : boolean;
	
	var undoCallback : System.Reflection.FieldInfo;

	/*
	function Awake ()
	{
		var cb:EditorApplication.CallbackFunction = CopyDataToTemp;
		EditorApplication.playmodeStateChanged = System.Delegate.Combine(cb, EditorApplication.playmodeStateChanged);
	}
	*/
	
	function OnInspectorGUI ()
	{
		CheckUndo();
		
		//Undo.RegisterUndo(target, "Undo");
				
		//Undo.SetSnapshotTarget(target, "Voxeland settings changed");
			//Undo.CreateSnapshot();
		
		EditorGUIUtility.LookLikeInspector ();
		//DrawDefaultInspector ();
		
		target.data = EditorGUILayout.ObjectField("Data:", target.data, VoxelandData, false);
		
		target.brushSize = EditorGUILayout.IntSlider ("Brush Size:", target.brushSize, 0, 3);
		
		EditorGUILayout.LabelField("Press Left Click to add block,\nShift-Left Click to dig block,\nCtrl-Left Click to replace block", GUI.skin.textArea, GUILayout.Height(44));
		
		var rect = GUILayoutUtility.GetRect (50, 16, "TextField"); rect.x-=18;
		target.guiTypes = EditorGUI.Foldout(rect, target.guiTypes, "Block Types");
		if (target.guiTypes) 
		{
			for (var t:int=1;t<target.types.length;t++) DrawType(target.types[t], t, t==target.selected);
			
			rect = GUILayoutUtility.GetRect (50, 20, "TextField"); rect.x=rect.width-207; rect.width=47;
						if (GUI.Button(rect, "Up")) target.selected = ArraySwitch ( target.types, target.selected, target.selected-1 );
			rect.x+=50; if (GUI.Button(rect, "Down")) target.selected = ArraySwitch ( target.types, target.selected, target.selected+1 );
			rect.x+=50; if (GUI.Button(rect, "Add")) target.types = ArrayAdd ( target.types, new VoxelandBlockType() );
			rect.x+=50; rect.width=60; if (GUI.Button(rect, "Remove")) target.types = ArrayRemoveAt ( target.types, target.selected );
		}
		
		rect = GUILayoutUtility.GetRect (50, 16, "TextField"); rect.x-=18;
		target.guiSettings = EditorGUI.Foldout(rect, target.guiSettings, "Settings");
		if (target.guiSettings)
		{
			target.playmodeEdit = EditorGUILayout.Toggle("Playmode Edit", target.playmodeEdit);
			target.independPlaymode = EditorGUILayout.Toggle("Do Not Save Playmode Changes", target.independPlaymode);
			target.landShader = EditorGUILayout.ObjectField("Land Shader", target.landShader, Shader, false);
			//target.ambientOcclusion = EditorGUILayout.Slider ("Ambient Occlusion:", target.ambientOcclusion, 0, 1);
			target.landAmbient = EditorGUILayout.ColorField ("Additional Ambient", target.landAmbient);
			target.landSpecular = EditorGUILayout.ColorField ("Land Specular", target.landSpecular);
			target.landShininess = EditorGUILayout.IntSlider ("Land Shininess:", target.landShininess, 0.01, 1);
			
			target.grassMaterial = EditorGUILayout.ObjectField("Grass Material", target.grassMaterial, Material, false);
			target.grassAnimSpeed = EditorGUILayout.FloatField("Grass Animation Speed", target.grassAnimSpeed);
			//target.grassAnimInEditor = EditorGUILayout.Toggle("Animate In Editor", target.grassAnimInEditor);
			
			target.highlightMaterial = EditorGUILayout.ObjectField("Highlight Material", target.highlightMaterial, Material, false);
			target.lightmapPadding = EditorGUILayout.Slider ("Lightmap Padding:", target.lightmapPadding, 0, 0.5);
		}
		/*	
		rect = GUILayoutUtility.GetRect (50, 16, "TextField"); rect.x-=18;
		//target.guiExport = EditorGUI.Foldout(rect, target.guiExport, "Export");
		if (target.guiExport)
		{
			rect = GUILayoutUtility.GetRect (50, 18, "TextField"); rect.x+=18; rect.width-=18;
			if (GUI.Button(rect, "Export to Obj")) { ExportToObj(); }
			rect = GUILayoutUtility.GetRect (50, 18, "TextField"); rect.x+=18; rect.width-=18;
			if (GUI.Button(rect, "Export and Assign")) { ExportAndAssign(); }
		}
		*/

		rect = GUILayoutUtility.GetRect (50, 16, "TextField"); rect.x-=18;
		target.guiRebuild = EditorGUI.Foldout(rect, target.guiRebuild, "Update and Rebuild");
		if (target.guiRebuild)
		{
			rect = GUILayoutUtility.GetRect (50, 18, "TextField"); rect.x+=18; rect.width-=18;
			if (GUI.Button(rect, "Rebuild")) 
			{ 
				target.Rebuild(true); 
				SetSetStaticEditorFlagsRecirsive (target.gameObject, GameObjectUtility.GetStaticEditorFlags(target.gameObject) );
			}
			
			rect = GUILayoutUtility.GetRect (50, 18, "TextField"); rect.x+=18; rect.width-=18;
			//if (GUI.Button(rect, "Build Colliders")) target.BuildColliders();
		}
		
		if ( GUI.changed ) {guiChanged = true; }
	}
	
	function CheckUndo()
    {
        if ( Event.current.type == EventType.MouseDown && Event.current.button == 0 
        	|| Event.current.type == EventType.KeyUp && ( Event.current.keyCode == KeyCode.Tab ) ) 
        {
            Undo.SetSnapshotTarget( target, "Voxeland" );
            Undo.CreateSnapshot();
            Undo.ClearSnapshotTarget();
            listeningForGuiChanges = true;
            guiChanged = false;
        }
 
        if ( listeningForGuiChanges && guiChanged ) 
        {
            // Some GUI value changed after pressing the mouse.
            // Register the previous snapshot as a valid undo.
            Undo.SetSnapshotTarget( target, "Voxeland" );
            Undo.RegisterSnapshot();
            Undo.ClearSnapshotTarget();
            listeningForGuiChanges = false;
        }
    }
	
	//function OnEnable ()  { alwaysDrawBrush = true; Debug.Log("run"); AlwaysDrawBrush(); }
	//function OnDisable () { alwaysDrawBrush = false; }
	
	function OnUndoRedo()
	{
		if (Selection.activeTransform != target.transform) return;
		target.Rebuild(true); 
		SetSetStaticEditorFlagsRecirsive (target.gameObject, GameObjectUtility.GetStaticEditorFlags(target.gameObject) );
	}
	
	function OnSceneGUI ()
	{
		//undo-redo
		if (!undoCallback) undoCallback = typeof(EditorApplication).GetField("undoRedoPerformed", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
		var undoFunction : EditorApplication.CallbackFunction = OnUndoRedo;
		undoCallback.SetValue(null, undoFunction);

		
		if (!target.enabled || Event.current.alt || Event.current.button != 0) return;

		/*
		//animating grass
		if (target.grassAnimInEditor && !!target.grassMaterial && Event.current.type == EventType.Repaint)
		{
			target.grassAnimState += Time.deltaTime * target.grassAnimSpeed;
			target.grassAnimState = Mathf.Repeat(target.grassAnimState, 6.283185307179586476925286766559);
			target.grassMaterial.SetFloat("_AnimState", target.grassAnimState);
			Debug.Log(target.grassMaterial.GetFloat("_AnimState"));
		}
		*/
		

		
		//skipping if mouse position has not changed
		var mousePos : Vector2 = Event.current.mousePosition;
		mousePos.y = Screen.height - mousePos.y - 40;
		

			//hiding wireframe
			for (var i=target.transform.childCount-1; i>=0; i--)
			{
				var child : Transform = target.transform.GetChild(i);
				if (!!child.renderer) EditorUtility.SetSelectedWireframeHidden(child.renderer, true);
				
				for (var j=child.childCount-1; j>=0; j--)
				{
					var child2 : Transform = child.GetChild(j);
					if (!!child2.renderer) EditorUtility.SetSelectedWireframeHidden(child2.renderer, true);
				}
				
			}
			
			//if ( Event.current.button != 0 ) return; //do nothing when pressed non-left button
			
			//rebuilding mesh if no terrain data detected
			if (!target.terrain) target.Rebuild(false);
			SetSetStaticEditorFlagsRecirsive (target.gameObject, GameObjectUtility.GetStaticEditorFlags(target.gameObject) );
			
			var aimRay : Ray = Camera.current.ScreenPointToRay(mousePos);
			
			var aimFace = target.GetFaceByRay(aimRay);
			var aimObj = target.GetObjectByRay(aimRay, aimFace);
	
			if ((!!aimFace && aimFace != target.oldAimFace) || (!!aimObj && aimObj != target.oldAimObj)) 
			{
				target.CheckHightlight();
				
				var aimFaces : VoxelandFace[];
				if (!!aimFace) aimFaces = target.GetNeigFaces(aimFace.parent, target.brushSize);
				
				target.DrawHighlight(aimFaces, aimObj);
				
				target.oldAimFace = aimFace;
				target.oldAimFaces = aimFaces;
				target.oldAimObj = aimObj;
			}
	
			//setting block
			if (Event.current.type == EventType.MouseDown) 
			{
				//registering undo
			//	var undoObjs : Mesh[] = new Mesh[target.terrain.length];
			//	for (i=0; i<target.terrain.length; i++) undoObjs[i] = target.terrain[i].GetComponent(MeshFilter).sharedMesh;
				Undo.RegisterUndo (target.data, "Voxel terrain");
				
				
				var filled : boolean = target.types[target.selected].filled;
				var hasObj : boolean = !!target.types[target.selected].object;
				
					if (!aimObj && Event.current.shift) target.SetBlocks( target.GetBlocksByFaces(target.oldAimFaces, true), 0 ); //digging
					else if (!aimObj && filled && Event.current.control) target.SetBlocks( target.GetBlocksByFaces(target.oldAimFaces, true), target.selected ); //replacing
					else if (!aimObj && filled) target.SetBlocks( target.GetBlocksByFaces(target.oldAimFaces, false), target.selected ); //adding
					
					else if (!!aimObj && Event.current.shift) target.SetBlock(aimObj.coords, 0); //removing obj
					else if (!filled && hasObj) 
					{ 
						var faces : VoxelandFace[] = new VoxelandFace[1]; faces[0] = aimFace;
						target.SetBlocks( target.GetBlocksByFaces(faces, false), target.selected ); //adding
					}
	
				mouseWasPressed = true;
				
				//EditorUtility.SetDirty (target);
				//Undo.CreateSnapshot();
				//Undo.RegisterSnapshot();
			}
			
			//un-selecting chunks
			Selection.activeGameObject = target.transform.gameObject;
			
			oldMousePos = mousePos;
		
		//updating every frame	
		if ( Mathf.RoundToInt(mousePos.x) != Mathf.RoundToInt(oldMousePos.x) ||
			Mathf.RoundToInt(mousePos.y) != Mathf.RoundToInt(oldMousePos.y) ||
			Event.current.type == EventType.MouseDown)
				HandleUtility.Repaint();
		
		
	}
	
	
	function DrawType (type, num:int, selected:boolean)
	{
		//
		//rect.x = 20; rect.width-=20;
		
		
		
		var source : Rect;
		if (type.filled) source = GUILayoutUtility.GetRect (50, 84, "TextField");
		else source = GUILayoutUtility.GetRect (50, 54, "TextField");
		
		//Drawing background box
		var rect : Rect = new Rect(16, source.y, source.width, source.height);
		if (selected) GUI.Box(rect, "");
		
		//Drawing main interface
		var indent : int = 90;
		var lineSpace : int = 15;
		
		rect = new Rect(indent, source.y+3, source.width-30, 15);
		
		//label
		var boldtext = new GUIStyle (GUI.skin.textField);
		boldtext.fontStyle = FontStyle.Bold;
		type.name = EditorGUI.TextField(rect, type.name); 
		
		//filled checkbutton
		rect.y += lineSpace; type.filled = EditorGUI.Toggle(rect, type.filled); 
		rect.x+=20; rect.width-=20; EditorGUI.LabelField(rect, "Filled");
		
		if (type.filled)
		{
			rect.y += lineSpace;
			rect.x = indent; rect.width = source.width-indent; EditorGUI.LabelField(rect, "Texture:");
			rect.x = indent+70; rect.width = source.width-indent-70; type.texture = EditorGUI.ObjectField(rect, type.texture, Texture, false);
			
			rect.y += lineSpace;
			rect.x = indent; rect.width = source.width-indent; EditorGUI.LabelField(rect, "Bump:");
			rect.x = indent+70; rect.width = source.width-indent-70; type.bumpTexture = EditorGUI.ObjectField(rect, type.bumpTexture, Texture, false);
			
			rect.y += lineSpace;
			rect.x = indent; rect.width = source.width-indent; type.hasGrassAbove = EditorGUI.Toggle(rect, type.hasGrassAbove);
			rect.x = indent+20; rect.width = source.width-indent-20; EditorGUI.LabelField(rect, "Has Grass Above");
			
			//rect.x = 70; rect.width = 50; rect.height = 50; rect.y -= 32;
			//EditorGUI.DrawPreviewTexture(rect,type.texture);
		}
		else
		{
			rect.y += lineSpace;
			//type.object = EditorGUI.ObjectField(rect, "Object:", type.object, Transform);
			rect.x = indent; rect.width = source.width-indent; EditorGUI.LabelField(rect, "Object:");
			rect.x = indent+70; rect.width = source.width-indent-70; type.object = EditorGUI.ObjectField(rect, type.object, Transform, false);
		}
		
		//drawing select button
		rect = new Rect(20, source.y+4, 76, 46);
		if (type.filled) rect.height = 76;

		if (GUI.Button(rect, num.ToString())) target.selected = num;
		
		GUI.Box(rect, "");
		
		rect.x+=1; rect.y+=1; rect.width-=2; rect.height-=2;
		if (type.filled && !!type.texture) EditorGUI.DrawPreviewTexture(rect,type.texture);
		
		//EditorGUILayout.Space();
	}
	
	function ExportToObj () : String //returns local path of exported asset
	{
		var path : String = EditorUtility.SaveFilePanel("Save To Obj","Assets", target.transform.name + ".obj", "obj");	
		if (path.length == 0) return;
		ExportToObj(path);
				
		var localPath : String = path.Replace(Application.dataPath, "Assets");	
		AssetDatabase.ImportAsset(localPath, ImportAssetOptions.Default);		
		return localPath;
	}
	
	function ExportToObj (path:String)
	{
		var text = new System.Text.StringBuilder();
		var currentVertCount : int = 1;

		//exporting mesh
		for (var t:int=0; t<target.terrain.length; t++)
		{
			var renderMesh : Mesh;
			var filter : MeshFilter = target.terrain[t].GetComponent(MeshFilter);
			if (!!filter && !!filter.sharedMesh) renderMesh = filter.sharedMesh;
			
			if (!!renderMesh) 
			{
				var pos : Vector3 = target.terrain[t].transform.position;
				text.Append( MeshToString(renderMesh, currentVertCount, pos, "Voxeland_"+t.ToString()) );
				text.AppendLine();
				currentVertCount += renderMesh.vertices.length;
			}
		}

		//writing exported data
		//var sw = new System.IO.StreamWriter(path);
		//sw.WriteLine(text);
		//sw.Close();
		System.IO.File.WriteAllText(path, text.ToString());
	}
	
	function ExportAndAssign ()
	{
		var localPath : String = ExportToObj();
		var asset : Transform = AssetDatabase.LoadAssetAtPath(localPath, typeof(Transform));
		if (!asset) { Debug.Log("Could not load exported asset. Please make sure it was exported inside 'Assets' folder."); return; }
				
		target.enabled = false;
			
		for (var t:int=0; t<target.terrain.length; t++)
		{
			target.terrain[t].transform.localPosition = Vector3(0,0,0);
			 target.terrain[t].GetComponent(VoxelandChunk).enabled = false;
			
			var filter : MeshFilter = target.terrain[t].GetComponent(MeshFilter);
			
			var meshTfm : Transform = asset.Find( "Voxeland_" + t.ToString() );
			if (!!meshTfm) filter.mesh = meshTfm.GetComponent(MeshFilter).sharedMesh;
		}
	}
	
	
	function MeshToString (mesh:Mesh, vCount:int, vAppend:Vector3, name:String)
	{
		var text = new System.Text.StringBuilder();
        
        for(var v : Vector3 in mesh.vertices) { text.Append("v " + (-v.x-vAppend.x) + " " + (v.y+vAppend.y) + " " + (v.z+vAppend.z)); text.AppendLine(); }
		for(var v : Vector3 in mesh.normals) { text.Append("vn " + v.x + " " + v.y + " " + v.z); text.AppendLine(); }
		for(var v : Vector3 in mesh.uv) { text.Append("vt " + v.x + " " + v.y + " " + v.z); text.AppendLine(); }
		//for(var v : Vector3 in mesh.colors) { text.Append("vc " + v.x + " " + v.y + " " + v.z); text.AppendLine(); }
        
        text.AppendLine();
        
        text.Append("g ").Append(name); text.AppendLine();
        
        text.Append("usemtl unnamed"); text.AppendLine();
        text.Append("usemap unnamed"); text.AppendLine();
        for (var i=0;i<mesh.triangles.length;i+=3) 
		{
			text.Append(String.Format("f {2}/{2}/{2} {1}/{1}/{1} {0}/{0}/{0}\n", mesh.triangles[i]+vCount, mesh.triangles[i+1]+vCount, mesh.triangles[i+2]+vCount));
			text.AppendLine();
		}
		
		return text;
	}
	
	function ArrayAdd (array:VoxelandBlockType[], type:VoxelandBlockType)
	{
		var newArray = new VoxelandBlockType[ array.length+1 ];
		for (var i=0; i<array.length; i++) newArray[i] = array[i];
		newArray[ array.length ] = type;
		return newArray;
	}
	
	function ArrayRemoveAt (array:VoxelandBlockType[], at:int)
	{
		var newArray = new VoxelandBlockType[ array.length-1 ];
		for (var i=0; i<array.length-1; i++) 
		{
			if (i>=at) newArray[i] = array[i+1];
			else newArray[i] = array[i];
		}
		return newArray;
	}
	
	function ArraySwitch (array:VoxelandBlockType[], num1:int, num2:int)
	{
		if (num1<0 || num1>=array.length ||
			num2<0 || num2>=array.length) return num1;
		
		var tmp = array[num1];
		array[num1] = array[num2];
		array[num2] = tmp;
		
		return num2;
	}
	
	function SetSetStaticEditorFlagsRecirsive (go:GameObject, flags:StaticEditorFlags) 
	{
		GameObjectUtility.SetStaticEditorFlags (go, flags);
		
		for (var i:int; i<go.transform.childCount; i++)
		SetSetStaticEditorFlagsRecirsive (go.transform.GetChild(i).gameObject, flags);
	}
	
}