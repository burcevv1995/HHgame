

@CustomEditor (VoxelandData) 
class VoxelandDataEditor extends Editor
{
	/*
	@MenuItem("Voxeland/eeNew Terrain Data")
	static function CreateNewStyle() 
	{
		var newasset = new ScriptableObject.CreateInstance(VoxelandData);
		newasset.New(100,50,100,10,2);
		//var path = PureGui.SearchFileDown ("Assets/", "VoxelandData.js");
		//path = path.Replace ("PureGuiElement.js", "NewStyle.asset");
		//var newasset = new VoxelandData(100,50,100,10,2);
		AssetDatabase.CreateAsset (newasset, "Assets/NewTerrainData.asset");
	}
	*/

	function OnInspectorGUI ()
	{
		EditorGUIUtility.LookLikeInspector ();
		DrawDefaultInspector ();
		
		//if (GUILayout.Button("SetMatrix")) { matrix = new int[10,10,10]; var x:int=1; matrix[x,x,x] = x; target.matrix = matrix; }
		if (GUILayout.Button("Load from Text")) 
		{ 
			var path : String = EditorUtility.OpenFilePanel("Load TXT","Assets","txt");	
			if (path.length != 0) Load(path);
		}
		
		//AutoSetBorders
	}
	
	function Load (from:String)
	{  
		if(!System.IO.File.Exists(from)) return;
	
		var reader = System.IO.File.OpenText(from); 
		
		reader.ReadLine();
		reader.ReadLine();
		reader.ReadLine();
		reader.ReadLine();
		reader.ReadLine();
		reader.ReadLine();
		
		/*
		controller.charTfm.position = Vector3(parseFloat(reader.ReadLine()), parseFloat(reader.ReadLine()), parseFloat(reader.ReadLine()));
		controller.cameraTfm.position = controller.charTfm.position+Vector3(0,1.5,0);
		
		controller.cameraTfm.eulerAngles = Vector3(parseFloat(reader.ReadLine()), parseFloat(reader.ReadLine()), parseFloat(reader.ReadLine()));
		controller.charTfm.localEulerAngles = new Vector3(0, controller.cameraTfm.localEulerAngles.y, 0);
		controller.rotationX = controller.cameraTfm.eulerAngles.y;
		controller.rotationY = -controller.cameraTfm.eulerAngles.x;
		*/
		
		target.sizeX = System.Int32.Parse(reader.ReadLine()); 
		target.sizeY = System.Int32.Parse(reader.ReadLine()); 
		target.sizeZ = System.Int32.Parse(reader.ReadLine());
		
		target.blocks = new int[target.sizeZ*target.sizeY*target.sizeX];
		target.ambient = new float[target.sizeZ*target.sizeY*target.sizeX];
		
		target.chunkSize = System.Int32.Parse(reader.ReadLine());
		//var chunkSizeY : int = 
		System.Int32.Parse(reader.ReadLine());
		//var chunkSizeZ : int = 
		System.Int32.Parse(reader.ReadLine());
		
		for (var x:int=0;x<target.sizeX;x++)
			for (var y:int=0;y<target.sizeY;y++)
				for (var z:int=0;z<target.sizeZ;z++)
					target.SetBlock(x,y,z,System.Int32.Parse(reader.ReadLine()));
	
		for (x=0;x<target.sizeX;x++)
			for (y=0;y<target.sizeY;y++)
				for (z=0;z<target.sizeZ;z++)
					target.SetAmbient(x,y,z,System.Int32.Parse(reader.ReadLine()));

		reader.Close(); 
	}
	
	/*
	function Save (to:String)
	{
		var writer = System.IO.File.CreateText(to); 
		
		//saving camera
		controller.charTfm.position = controller.cameraTfm.position - Vector3(0,1.5,0);
		controller.charTfm.localEulerAngles = new Vector3(0, controller.cameraTfm.localEulerAngles.y, 0);
		writer.WriteLine (controller.charTfm.position.x);
		writer.WriteLine (controller.charTfm.position.y);
		writer.WriteLine (controller.charTfm.position.z);
		writer.WriteLine (controller.cameraTfm.eulerAngles.x);
		writer.WriteLine (controller.cameraTfm.eulerAngles.y);
		writer.WriteLine (controller.cameraTfm.eulerAngles.z);
		
		//setting dimensions
		writer.WriteLine (land.matrix.GetLength(0));
		writer.WriteLine (land.matrix.GetLength(1));
		writer.WriteLine (land.matrix.GetLength(2));
		
		writer.WriteLine (land.terrain[0,0].dimensionsX-land.overlap*2);
		writer.WriteLine (land.terrain[0,0].dimensionsY);
		writer.WriteLine (land.terrain[0,0].dimensionsZ-land.overlap*2);
		
		for (var x:int=0; x<land.matrix.GetLength(0); x++)
			for (var y:int=0; y<land.matrix.GetLength(1); y++)
				for (var z:int=0; z<land.matrix.GetLength(2); z++) 
					writer.WriteLine (land.matrix[x,y,z]);
		
		for (x=0; x<land.matrix.GetLength(0); x++)
			for (y=0; y<land.matrix.GetLength(1); y++)
				for (z=0; z<land.matrix.GetLength(2); z++) 
					writer.WriteLine (Mathf.RoundToInt(land.ambientMatrix[x,y,z]*1000));
		
		writer.Close(); 
	}
	*/
}