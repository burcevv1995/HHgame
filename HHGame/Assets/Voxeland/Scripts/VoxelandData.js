
class VoxelandData extends ScriptableObject
{
	//var matrix : int[,,];
	//var ambientMatrix : float[,,];
	
	@HideInInspector var blocks : int[];
	@HideInInspector var ambient : float[];
	@HideInInspector var exists : boolean[];
	
	var sizeX : int;
	var sizeY : int;
	var sizeZ : int;
	var chunkSize : int = 10;
	var overlap : int = 2;
	
	function CheckBounds (x:int, y:int, z:int) : boolean
	{
		return (x>=0 && x<sizeX &&
				y>=0 && y<sizeY &&
				z>=0 && z<sizeZ);
	} 
	
	function GetBlock (x:int, y:int, z:int) : int 
	{
		//if (x<2 || z<2)  return 0;
		if (CheckBounds(x,y,z)) return blocks[ z*sizeY*sizeX + y*sizeX + x ];
		else return 0; 
	}
	function SetBlock (x:int, y:int, z:int, type:int, filled:boolean) 
	{ 
		var pos : int = z*sizeY*sizeX + y*sizeX + x;
		if (CheckBounds(x,y,z)) 
		{
			blocks[pos] = type; 
			exists[pos] = filled;
		}
		
		#if UNITY_EDITOR
		EditorUtility.SetDirty(this);
		#endif
	}
	
	function Exists (x:int, y:int, z:int) : boolean 
	{ 
		if (x<2 || z<2) return false;
		if (x>sizeX-3 || z>sizeZ-3) return false;
		if (CheckBounds(x,y,z)) return exists[ z*sizeY*sizeX + y*sizeX + x ];
		else return false;
	}
	function Exists (pos:int) : boolean { return exists[pos]; }
	
	function GetAmbient (x:int, y:int, z:int) : float 
		{ if (CheckBounds(x,y,z)) return ambient[ z*sizeY*sizeX + y*sizeX + x ]; 
		else return 1.0; }
	function SetAmbient (x:int, y:int, z:int, val:float) { if (CheckBounds(x,y,z)) ambient[ z*sizeY*sizeX + y*sizeX + x ] = val; }
	function IncrementAmbient (x:int, y:int, z:int, val:float) { if (CheckBounds(x,y,z)) ambient[ z*sizeY*sizeX + y*sizeX + x ] += val; }
	function MultiplyAmbient (x:int, y:int, z:int, val:float) { if (CheckBounds(x,y,z)) ambient[ z*sizeY*sizeX + y*sizeX + x ] *= val; }
	function BlurAmbient (x:int, y:int, z:int)
	{
		/*
		SetAmbient( x, y, z, GetAmbient(x,y,z)*0.25 );
		
		SetAmbient( x, y, z,  GetAmbient(x,y,z) + GetAmbient(x+1,y,z)*0.125 );
		SetAmbient( x, y, z,  GetAmbient(x,y,z) + GetAmbient(x-1,y,z)*0.125 );
		SetAmbient( x, y, z,  GetAmbient(x,y,z) + GetAmbient(x,y+1,z)*0.125 );
		SetAmbient( x, y, z,  GetAmbient(x,y,z) + GetAmbient(x,y-1,z)*0.125 );
		SetAmbient( x, y, z,  GetAmbient(x,y,z) + GetAmbient(x,y,z+1)*0.125 );
		SetAmbient( x, y, z,  GetAmbient(x,y,z) + GetAmbient(x,y,z-1)*0.125 );
		*/

		
		if (x-1<0 || x+1>sizeX-1 ||
			y-1<0 || y+1>sizeY-1 ||
			z-1<0 || z+1>sizeZ-1) return;

		
		var pos : int = z*sizeY*sizeX + y*sizeX + x;

		var val : float = ambient[pos]*2;
		var num : float = 2;
		
		if (!Exists(pos-1) ) { val += ambient[pos-1]; num++; }
		if (!Exists(pos+1) ) { val += ambient[pos+1]; num++; }

		if (!Exists(pos-sizeX) ) { val += ambient[pos-sizeX]; num++; }
		if (!Exists(pos+sizeX) ) { val += ambient[pos+sizeX]; num++; }
		if (!Exists(pos-sizeY*sizeX) ) { val += ambient[pos-sizeY*sizeX]; num++; }
		if (!Exists(pos+sizeY*sizeX) ) { val += ambient[pos+sizeY*sizeX]; num++; }
		
		ambient[pos] = val / num;
	}
	
	
	function HasBlockAbove (x:int, y:int, z:int)
	{
		for (var y2:int=sizeY-1; y2>=y; y2--)
			if (Exists(x,y2,z)) return true;
		return false;
	}
	
	function ValidateSize (size:int, chunkSize:int) : boolean { return Mathf.RoundToInt((size*1.0)/(chunkSize*1.0))*chunkSize == size; }
	
	function New (newX:int, newY:int, newZ:int, newChunk:int, newOverlap:int)
	{
		if (!ValidateSize(newX,newChunk)) { Debug.Log("Size X must be divisible by chunk size"); return; }
		if (!ValidateSize(newZ,newChunk)) { Debug.Log("Size Z must be divisible by chunk size"); return; }
		
		sizeX = newX; sizeY = newY; sizeZ = newZ;
		blocks = new int[sizeZ*sizeY*sizeX];
		ambient = new float[sizeZ*sizeY*sizeX];
		exists = new boolean[sizeZ*sizeY*sizeX];
		
		for (var x:int=0; x<sizeX; x++)
			for (var z:int=0; z<sizeZ; z++)
				for (var y:int=0; y<sizeY; y++)
		{
			if (y>sizeY*0.4) 
			{ 
				SetBlock(x,y,z,0,false); 
				SetAmbient(x,y,z,1); 
			}
			else 
			{ 
				SetBlock(x,y,z,1,true); 
				SetAmbient(x,y,z,0); 
			}
		}
	}
	
	function New (oldData:VoxelandData)
	{
		sizeX = oldData.sizeX; sizeY = oldData.sizeY; sizeZ = oldData.sizeZ;
		
		if (!blocks || blocks.length != oldData.blocks.length)
		{
			blocks = new int[sizeZ*sizeY*sizeX];
			ambient = new float[sizeZ*sizeY*sizeX];
			exists = new boolean[sizeZ*sizeY*sizeX];
		}
		
		for (var i:int=0; i<blocks.length; i++)
		{
			blocks[i] = oldData.blocks[i];
			ambient[i] = oldData.ambient[i];
			exists[i] = oldData.exists[i];
		}
	}
	
	/*
	function New (oldData:VoxelandData, newX:int, newY:int, newZ:int, newChunk:int, newOverlap:int)
	{
		if (!ValidateSize(newX,newChunk)) { Debug.Log("Size X must be divisible by chunk size"); return; }
		if (!ValidateSize(newZ,newChunk)) { Debug.Log("Size Z must be divisible by chunk size"); return; }
		
		sizeX = newX; sizeY = newY; sizeZ = newZ;
		blocks = new int[sizeZ*sizeY*sizeX + sizeY*sizeX + sizeX];
		ambient = new float[sizeZ*sizeY*sizeX + sizeY*sizeX + sizeX];
		exists = new boolean[sizeZ*sizeY*sizeX + sizeY*sizeX + sizeX];
		
		for (var x:int=0; x<newX; x++)
			//etc
		{
			//SetBlock(x, y, z, oldData.GetBlock(x,y,z) );
		}
	}
	*/
	
	function RecalcExists (types:VoxelandBlockType[]) 
	{
		if (!exists || exists.length != sizeZ*sizeY*sizeX) exists = new boolean[sizeZ*sizeY*sizeX];

		for (var x=0; x<sizeX; x++) 
			for (var y=0; y<sizeY; y++)
				for (var z=0; z<sizeZ; z++) 
		{
			var type : int = GetBlock (x, y, z);
			if (types.length > type) exists[ z*sizeY*sizeX + y*sizeX + x ] = types[type].filled;
			else exists[ z*sizeY*sizeX + y*sizeX + x ] = false;
		}
	}
}