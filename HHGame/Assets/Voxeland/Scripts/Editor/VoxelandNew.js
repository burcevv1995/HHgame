
enum VoxelandCreateDataType {create, assign, none}

class VoxelandNew extends EditorWindow 
{
	var createData : VoxelandCreateDataType;
	var data : VoxelandData;
	var chunkSize : int = 10;
	var chunksX : int = 5;
	var chunksZ : int = 5;
	var sizeY : int = 25;
	var fill : int[] = [0,0,1];
	
	
	@MenuItem("GameObject/Create Other/Voxeland Terrain")
	static function Init() 
	{
		//var window = new VoxelandCreateDataWindow();
		var window = ScriptableObject.CreateInstance.<VoxelandNew>();
		window.position = Rect(Screen.width/2,Screen.height/2, 110, 70);
		window.ShowUtility();
	}

	
	function OnGUI() 
	{
		createData = EditorGUILayout.EnumPopup("Land Data: ", createData);
		
		if (createData == VoxelandCreateDataType.create)
		{
			EditorGUILayout.LabelField("\tSize X: ", (chunksX*chunkSize).ToString());
			EditorGUILayout.LabelField("\tSize Y: ", sizeY.ToString());
			EditorGUILayout.LabelField("\tSize Z: ", (chunksX*chunkSize).ToString());
			
			var rect = GUILayoutUtility.GetRect (150, 20, "TextField");
			rect.x = 20; rect.width-=20;
			if (GUI.Button(rect, "Create Data In...")) CreateData();
			
		}
		else if (createData == VoxelandCreateDataType.assign)
		{
			data = EditorGUILayout.ObjectField("Data: ", data, VoxelandData, false);
			EditorGUILayout.Space();
			
			rect = GUILayoutUtility.GetRect (50, 18, "TextField"); rect.x+=30; rect.width-=60;
			if (GUI.Button(rect, "Get Size From Data") && !!data) 
			{
				chunksX = Mathf.CeilToInt(data.sizeX / chunkSize);
				chunksZ = Mathf.CeilToInt(data.sizeZ / chunkSize);
				sizeY = data.sizeY;
			}
		}
		
		EditorGUILayout.Space();
		
		chunkSize = EditorGUILayout.IntField("Chunk Size: ", chunkSize);
		EditorGUILayout.Space();
			
		chunksX = EditorGUILayout.IntField("Chunks X: ", chunksX);
		chunksZ = EditorGUILayout.IntField("Chunks Z: ", chunksZ);
		EditorGUILayout.Space();
		
		sizeY = EditorGUILayout.IntField("Size Y: ", sizeY);
		EditorGUILayout.Space();
		
		//fill[0] = EditorGUILayout.IntField("Fill Top: ", fill[0]);
		//fill[1] = EditorGUILayout.IntField("Fill Middle: ", fill[1]);
		//fill[2] = EditorGUILayout.IntField("Fill Bottom: ", fill[2]);
		//EditorGUILayout.Space();
		
		
		if (GUILayout.Button("Create Terrain")) 
		{ 
			if (createData == VoxelandCreateDataType.create) CreateData ();
			
			var terrainObj = new GameObject("Voxeland");
			var terrain = terrainObj.AddComponent(Voxeland);
			
			terrain.data = data;
			terrain.chunkSize = chunkSize;
			terrain.terrainChunksX = chunksX;
			terrain.terrainChunksZ = chunksZ;
			terrain.overlap = 2;
			
			terrain.landShader = Shader.Find("Voxeland/TerrainBump4");
			
			terrain.highlightMaterial = new Material( Shader.Find("Voxeland/Hightlight") );
			terrain.highlightMaterial.color = Color(0.6, 0.73, 1, 0.353);
			
			terrain.Rebuild();
		}
		
		if(GUILayout.Button("Cancel")) { this.Close(); }
	}
	
	
	function CreateData ()
	{
		var path = EditorUtility.SaveFilePanel(
					"Save Voxeland Data",
					"Assets",
					"NewTerrainData.asset",
					"asset");
		if (!path) return;
		path = path.Replace(Application.dataPath, "Assets");
				
		data = new ScriptableObject.CreateInstance(VoxelandData);
		data.New(chunksX*chunkSize, sizeY, chunksX*chunkSize, chunkSize, 2);
		AssetDatabase.CreateAsset (data, path);
				
		createData = VoxelandCreateDataType.assign;
	}
        
}