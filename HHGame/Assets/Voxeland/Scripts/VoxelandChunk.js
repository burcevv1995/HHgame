#pragma strict


static var ambientMatrixNew : float[,,]; //to avoid 'tails'

var trisBlockX : int[]; //per-tri array, block x-coords of every face
var trisBlockY : int[]; //not that they are per-face arrays. triNum=faceNum*2 or =faceNum*2+1
var trisBlockZ : int[]; //optimize: i need to rename them properly
var trisBlockD : int[];

@System.NonSerialized var faces : VoxelandFace[]; 

var terrainCoordsX : int;
var terrainCoordsZ : int;
var terrainStartX : int;
var terrainStartZ : int;	
var dimensionsX : int = 10;
var dimensionsY : int = 10;
var dimensionsZ : int = 10;

var filter : MeshFilter;
var collision : MeshCollider;

var relax1st:float=1f;
var relaxNth:float=1f;

var invisibleBorders : int;

//var usedTypes : System.Collections.Generic.List.<int> = new System.Collections.Generic.List.<int>();
var usedTypes : int[] = new int[4];

//mesh data
/*
static var verts : Vector3[];
static var normals : Vector3[];
static var tangents : Vector4[];
static var uvs : Vector2[];
static var colors : Color[];
static var tris : int[];

static var random:float[];
*/

var vertices : Vector3[]; //clones of static
var triangles : int[]; 

var visibleFacesNum : int;

@System.NonSerialized var objects : System.Collections.Generic.List.<VoxelandObject> = new System.Collections.Generic.List.<VoxelandObject>(); //just to store attached objs

var grassFilter : MeshFilter;

var needToRecalcCollision:boolean = false; //for freehand drawing, used by terrain only

var land : Voxeland;

var lightmapPadding : float;

var triToFace : int[];

class Dir
{
	static function GetOpposite (dir:int) : int
	{
		if (dir == 0 || dir == 2 || dir == 4) return dir+1;
		else return dir-1;
	}
	
	static function AddX (dir:int) : int { if (dir==2) return 1; if (dir==3) return -1; return 0;}
	static function AddY (dir:int) : int { if (dir==0) return 1; if (dir==1) return -1; return 0;}
	static function AddZ (dir:int) : int { if (dir==4) return 1; if (dir==5) return -1; return 0;}
}

function InRange(x:int, y:int, z:int):boolean
{
	return (x >= 0 && x<dimensionsX &&
		y >= 0 && y<dimensionsY &&
		z >= 0 && z<dimensionsZ);
}

static function Exists(type:int):boolean
{
	//sep fn cause new blocks could be added
	
	//return (type!=0 && type!=9 && type!=8 && type!=7);
	return (type==1 || type==2 || type==3);
}


class VoxelandVertex
{
	var edges : VoxelandEdge[] = new VoxelandEdge[7];
	
	var pos : Vector3; // = new Vector3(0,0,0);
	var normal : Vector3;
	var ambient : float;
	var relax : Vector3;
	var blend : Vector4;
	
	var normalCalculated : boolean = false;
	var ambientCalculated : boolean = false;
	var relaxCalculated : boolean = false;
	var relaxApplied : boolean = false;
	var blendCalculated : boolean = false;
	
	var coords : int; //xx yyy zz.
	var num : int;
	
	//var calculated : boolean = false;
	
	var twin : VoxelandVertex; //for tesselation

	function VoxelandVertex (v:VoxelandVertex)
	{
		coords = v.coords;
		pos = v.pos;
	}
	
	function VoxelandVertex (c:int) //creates vert using coords
	{
		coords = c;
		num = Random.Range(0, 65000);
		//edges = new VoxelandEdge[7];

		pos = new Vector3(0,0,0);
		pos.x = Mathf.Floor(c*0.0001);
		pos.y = Mathf.Floor(c*0.01) - pos.x*100;
		pos.z = c - pos.x*10000 - pos.y*100;
		
		//temp random: earthquake effect
		//pos += Vector3(Random.Range(-0.1, 0.1), Random.Range(-0.1, 0.1), Random.Range(-0.1, 0.1));
	}
	
	function VoxelandVertex (p:Vector3)
	{
		edges = new VoxelandEdge[7]; //optimize: such points do not have more than 4 edges
		pos = p;
		num = Random.Range(0, 65000);
	}
	
	function AddEdge (edge:VoxelandEdge)
	{
		//looking if this edge already added
		for (var e:int=0;e<7;e++)
			if (!!edges[e] && edges[e].Equals(edge)) return;
		
		for (e=0;e<7;e++)
			if (!edges[e]) { edges[e] = edge; return; }
		Debug.Log("Edge could not be added to vertex: " + coords);
	}
	
	
	function CalcAmbient ()
	{
		var sum:float = 0;
		var divider:int=0;
		
		for (var i:int=0;i<7;i++)
		{
			if (!edges[i]) break;

			for (var j:int=0;j<2;j++)
				if (!!edges[i].faces[j])
				{
					sum += edges[i].faces[j].ambient;
					divider++;
				}
		}
		ambient = sum/divider;
	}
	
	function CalcNormal ()
	{
		var sum:Vector3 = Vector3(0,0,0);
		var divider:int=0;
		
		for (var i:int=0;i<7;i++)
		{
			if (!edges[i]) break;

			for (var j:int=0;j<2;j++)
				if (!!edges[i].faces[j])
				{
					sum += edges[i].faces[j].normal;
					divider++;
				}

			//sum += edges[i].faces[0].normal + edges[i].faces[1].normal;
			//asum += edges[i].faces[0].ambient + edges[i].faces[1].ambient;
			//divider += 2; 
		}
		normal = (sum/divider).normalized;
	}
	
	function CalcRelax ()
	{
		var sum:Vector3 = Vector3(0,0,0);
		var divider:int=0;
		
		for (var i:int=0;i<7;i++)
		{
			if (!edges[i]) break;
			
			sum += edges[i].GetCenter() - pos;
			divider ++;
		}
		relax = (sum/divider)*2;
		
		//if (pos.x<0.1 || pos.x>13.9) relax.x = 0;
		//if (pos.x<1.1 || pos.x>12.9) relax.x = 0;
		
		//relax.x = Mathf.Round(relax.x*5) * 0.2;
		//relax.y = Mathf.Round(relax.y*5) * 0.2;
		//relax.z = Mathf.Round(relax.z*5) * 0.2;
	}
	
	function CalcBlend (usedTypes:int[])
	{
		//var type:int=edges[0].faces[0].type; //0-face is always in an edge
		
		blend = new Vector4(0,0,0,0);
		
		for (var i:int=0;i<7;i++)
		{
			if (!edges[i]) break;

			for (var j:int=0;j<2;j++)
				if (!!edges[i].faces[j])
				{
					switch (edges[i].faces[j].type)
					{
						case usedTypes[0]: blend.x=1; break;
						case usedTypes[1]: blend.y=1; break;
						case usedTypes[2]: blend.z=1; break;
						case usedTypes[3]: blend.w=1; break;
					}
				}
		}
		
		//blend = blend.normalized * 256;
		var sum = blend.x + blend.y + blend.z + blend.w;
		if (sum != 0) blend = blend / sum;
	}
	
	function IsBorder () //if one of the edges has invisible face
	{
		for (var i:int=0;i<7;i++)
		{
			if (!edges[i]) break;
			if (!edges[i].faces[1]) return true;
			if (edges[i].faces[0].invisible) return true;
			if (edges[i].faces[1].invisible) return true;
		}
		return false;
	}
}

class VoxelandEdge
{
	var num : int;
	
	var verts : VoxelandVertex[] = new VoxelandVertex[2];
	var faces : VoxelandFace[];
	
	var coords : int[];
	
	//for tesselation
	var midVert : VoxelandVertex;
	var subEdges : VoxelandEdge[];
	
	function VoxelandEdge () {num = Random.Range(0, 65000);}
	
	function VoxelandEdge (vert1:VoxelandVertex, vert2:VoxelandVertex)
	{
		num = Random.Range(0, 65000);
		
		verts = [vert1, vert2];
		coords = [vert1.coords, vert2.coords];
		
		//adding - without any tests
		for (var e:int=0;e<7;e++) if (!vert1.edges[e]) { vert1.edges[e] = this; break; }
		for (e=0;e<7;e++) if (!vert2.edges[e]) { vert2.edges[e] = this; break; }
	}
	
	function HasCoords (coord:int):boolean //optimize: delete this fn, it is too easy
	{
		if (coords[0]==coord || coords[1]==coord) return true;
		else return false;
	}
	
	function AddFace (face:VoxelandFace)
	{
		if (!faces) faces = new VoxelandFace[2];
		if (!faces[0]) faces[0]=face;
		else if (!faces[1]) faces[1]=face;
		else Debug.Log ("Cannot add face to edge");
	}
	
	function GetCenter() : Vector3 
		{ return (verts[0].pos + verts[1].pos)*0.5; }
		
	function Equals(to:VoxelandEdge):boolean
	{
		var result : boolean;
		
		//if bordrer-edge
		if (!faces[1] && !to.faces[1]) //if both has no second face
		{
			if (faces[0].num == to.faces[0].num) return true;
			else return false;
		}
		else if (!faces[1] || !to.faces[1]) return false; //if only one has no second face
		
		if ( (faces[0].num == to.faces[0].num && faces[1].num == to.faces[1].num) ||
			 (faces[1].num == to.faces[0].num && faces[0].num == to.faces[1].num) )
			 result= true;
		else result= false;
		return result;
	}
	
	function ConnectToVert (to:VoxelandVertex)
	{
		//looking if this edge already added
		for (var e:int=0;e<7;e++)
			if (!!to.edges[e] && Equals(to.edges[e])) return;
			
		//connecting
		if (coords[0]==to.coords) verts[0] = to;
		if (coords[1]==to.coords) verts[1] = to;
		
		//adding this edge to vert
		for (e=0;e<7;e++)
			if (!to.edges[e]) { to.edges[e] = this; return; }
	}
}

class VoxelandFace
{
	var verts : VoxelandVertex[];// = new VoxelandVertex[4];
	
	var edges : VoxelandEdge[] = new VoxelandEdge[4];
	//var block : Block;

	var coords : int[];
	var neigs : VoxelandFace[];
	
	var uvs : Vector2[];
	
	var normal : Vector3;
	 
	var num : int; //unique number for each face. Optimization: what is it for?
	
	var dir:int;
	
	var ambient : float;
	
	var tesselatedNeigs : VoxelandFace[];
	
	var type : int;
	
	var x:int;
	var y:int;
	var z:int;
	
	var dirX:int;
	var dirY:int;
	var dirZ:int;
	
	var invisible:boolean;
	
	var chunk:VoxelandChunk;
	
	var center:Vector3;
	
	var parent : VoxelandFace;
	var tesselated : VoxelandFace[];
	
	//var edgeDirs:int[]; //direction of edges as they have to be. In 50% cases is opposite to edge[x].dir
	
	static function GetCoords (x:int, y:int, z:int, dir:int)
	{
		return x*100000 + y*1000 + z*10 + dir;
	}
	
	function SetVertCoords (x:int, y:int, z:int) : int //optimize:must be vertex static fn 'GetCoords'
	{
		return x*10000 + y*100 + z;
	}
	
	
	function VoxelandFace(nx:int, ny:int, nz:int, dr:int, t:int, inv:boolean, ch:VoxelandChunk) 
	{ 
		//block = blk;
		x=nx; y=ny; z=nz;
		dir = dr;
		neigs = new VoxelandFace[4];
		ambient = 0;//Random.value;
		invisible = inv;
		chunk = ch;
		type = t;

		//generaging number
		//num = dir*1000000 + block.x*10000 + block.y*100 + block.z;
		num = GetCoords(x,y,z,dir);
		
		//generating coords
		coords = new int[4];
		switch (dir)
		{
			case 0: //normal = Vector3(0,1,0);
				coords[0] = SetVertCoords(x, y+1, z); coords[1] = SetVertCoords(x, y+1, z+1);
				coords[2] = SetVertCoords(x+1, y+1, z+1); coords[3] = SetVertCoords(x+1, y+1, z);
				break;
			case 1: //normal = Vector3(0,-1,0); 
				coords[0] = SetVertCoords(x, y, z); coords[1] = SetVertCoords(x+1, y, z);
				coords[2] = SetVertCoords(x+1, y, z+1); coords[3] = SetVertCoords(x, y, z+1);
				break;
			case 2: //normal = Vector3(1,0,0); 
				coords[0] = SetVertCoords(x+1, y, z); coords[1] = SetVertCoords(x+1, y+1, z);
				coords[2] = SetVertCoords(x+1, y+1, z+1); coords[3] = SetVertCoords(x+1, y, z+1);
				break;
			case 3: //normal = Vector3(-1,0,0); 
				coords[0] = SetVertCoords(x, y, z); coords[1] = SetVertCoords(x, y, z+1);
				coords[2] = SetVertCoords(x, y+1, z+1); coords[3] = SetVertCoords(x, y+1, z);
				break;
			case 4: //normal = Vector3(0,0,1); 
				coords[0] = SetVertCoords(x, y, z+1); coords[1] = SetVertCoords(x+1, y, z+1);
				coords[2] = SetVertCoords(x+1, y+1, z+1); coords[3] = SetVertCoords(x, y+1, z+1);
				break;
			case 5: //normal = Vector3(0,0,-1); 
				coords[0] = SetVertCoords(x, y, z); coords[1] = SetVertCoords(x, y+1, z);
				coords[2] = SetVertCoords(x+1, y+1, z); coords[3] = SetVertCoords(x+1, y, z);
				break;
		}
		
		//creating uvs
		Random.seed = x*1000 + y*100 + z*10 + dir;
		var uStep:float = (Mathf.Floor(Random.value*4)) * 0.25;
		var vStep:float = (Mathf.Floor(Random.value*4)) * 0.25;
		uvs = [ new Vector2(uStep+0.25,vStep), new Vector2(uStep,vStep), new Vector2(uStep,vStep+0.25), new Vector2(uStep+0.25,vStep+0.25) ];
	}
	
	function VoxelandFace (vert1:VoxelandVertex, vert2:VoxelandVertex, vert3:VoxelandVertex, vert4:VoxelandVertex) //in tesselation
	{
		verts = [vert1,vert2,vert3,vert4];
	}
	
	function AddNeig (neig:VoxelandFace)
	{
		for (var n:int=0;n<4;n++)
			if (!neigs[n]) { neigs[n] = neig; break; }
	}
	
	function AddEdge (edge:VoxelandEdge)
	{
		//for (var e:int=0;e<4;e++)
		//	if (!edges[e]) { edges[e] = edge; return; }
		
		//placing an ordered edge
		if (edge.HasCoords(coords[0]) && edge.HasCoords(coords[1])) { edges[0] = edge; return; }
		if (edge.HasCoords(coords[1]) && edge.HasCoords(coords[2])) { edges[1] = edge; return; }
		if (edge.HasCoords(coords[2]) && edge.HasCoords(coords[3])) { edges[2] = edge; return; }
		if (edge.HasCoords(coords[3]) && edge.HasCoords(coords[0])) { edges[3] = edge; return; }
			
		Debug.Log("VoxelandEdge could not be added to face: " + x + "," + y + "," + z + " dir:" + dir);
	}
	
	function Weld (with:VoxelandFace) //creates an edge between two faces, adds it to faces array
	{
		//looking if theese two faces are already welded
		for (var n:int=0;n<4;n++)
			if (!!neigs[n] && neigs[n].num==with.num) return;
		
		//finding coords to weld
		var coord1:int=-1; var coord2:int;
		for (var i:int=0;i<4;i++)
			for (var j:int=0;j<4;j++)
				if (coords[i]==with.coords[j])
				{
					if (coord1<0) coord1=coords[i];
					else coord2=coords[i];
				}
		
		//creating an edge
		var edge : VoxelandEdge = new VoxelandEdge();
		edge.coords = [coord1, coord2];
		edge.faces = [this, with];
		
		AddEdge(edge);
		with.AddEdge(edge);
		
		AddNeig(with);
		with.AddNeig(this);
	}
	
	function CreateVerts () //creating face's verts array, welding it with already created faces
	{
		verts = new VoxelandVertex[4];
		
		var vert:VoxelandVertex;
		
		//iterating in face edges
		for (var e:int=0;e<4;e++)
		{
			//generating prev edge number
			var pe:int = e-1;
			if (pe<0) pe=3;
		
			//determining edge corners for this vert
			var cthis: int = 0;
			var cprev: int = 0;
		
			if (edges[e].coords[1] == coords[e]) cthis = 1;
			if (edges[pe].coords[1] == coords[e]) cprev = 1;

			//if no vert - creating it
			if (!edges[e].verts[cthis] && !edges[pe].verts[cprev]) 
			{
				vert = new VoxelandVertex (coords[e]);
				verts[e] = vert;
				
				edges[e].verts[cthis] = vert;
				edges[pe].verts[cprev] = vert;
				vert.AddEdge(edges[e]);
				vert.AddEdge(edges[pe]);
			}
			
			//if one vert - using it
			else if (!edges[e].verts[cthis] || !edges[pe].verts[cprev]) 
			{
				if (!!edges[e].verts[cthis]) 
				{
					vert = edges[e].verts[cthis];
					verts[e] = vert;
					
					edges[pe].verts[cprev] = vert;
					vert.AddEdge(edges[pe]);
					
				}
				else
				{
					vert = edges[pe].verts[cprev];
					verts[e] = vert;
					
					edges[e].verts[cthis] = vert;
					vert.AddEdge(edges[e]);
				}
			}
			
			//if two verts - merging them
			else
			{
				vert = edges[e].verts[cthis];
				verts[e] = vert;
				
				var prevert : VoxelandVertex = edges[pe].verts[cprev];
				
				//adding prev-vert's edges to new one
				for (var e1:int=0;e1<7;e1++) 
					if (!!prevert.edges[e1])
						vert.AddEdge(prevert.edges[e1]);
				
				//changing prev-vert to vert in all vert's edges
				for (e1=0;e1<7;e1++)
				{
					if (!vert.edges[e1]) continue; 
					if (vert.edges[e1].coords[0] == vert.coords) vert.edges[e1].verts[0] = vert;
					if (vert.edges[e1].coords[1] == vert.coords) vert.edges[e1].verts[1] = vert;
				}
			}
			
		}//in face edges
	}//fn
	
	function CalcCenter() { center = (verts[0].pos+verts[1].pos+verts[2].pos+verts[3].pos)*0.25; }
	
	function CalcNormal ()
	{
		var vec1:Vector3 = (verts[1].pos-verts[0].pos) + (verts[2].pos-verts[3].pos);
		var vec2:Vector3 = (verts[2].pos-verts[1].pos) + (verts[3].pos-verts[0].pos);
		
		normal = Vector3.Cross(vec1, vec2);
	}
	
	function ToMesh (vertices:Vector3[], normals:Vector3[], tangents:Vector4[], uv:Vector2[], uv1:Vector2[], colors:Color[], tris:int[], triToFace:int[],
		num:int, lightmapTile:float, lightmapPadding:float)
	{
		var v:int = num*4;
		
		vertices[v] = verts[0].pos;
		vertices[v+1] = verts[1].pos;
		vertices[v+2] = verts[2].pos;
		vertices[v+3] = verts[3].pos;
		
		/*
		filter.sharedMesh.vertices[v] = verts[0].pos;
		filter.sharedMesh.vertices[v+1] = verts[1].pos;
		filter.sharedMesh.vertices[v+2] = verts[2].pos;
		filter.sharedMesh.vertices[v+3] = verts[3].pos;
		*/
		
		normals[v] = verts[0].normal;
		normals[v+1] = verts[1].normal;
		normals[v+2] = verts[2].normal;
		normals[v+3] = verts[3].normal;
	
		colors[v] = new Color(verts[0].blend.x, verts[0].blend.y, verts[0].blend.z, verts[0].ambient);
		colors[v+1] = new Color(verts[1].blend.x, verts[1].blend.y, verts[1].blend.z, verts[1].ambient);
		colors[v+2] = new Color(verts[2].blend.x, verts[2].blend.y, verts[2].blend.z, verts[2].ambient);
		colors[v+3] = new Color(verts[3].blend.x, verts[3].blend.y, verts[3].blend.z, verts[3].ambient);
		
		uv[v] = uvs[0];
		uv[v+1] = uvs[1];
		uv[v+2] = uvs[2];
		uv[v+3] = uvs[3];
		
		var step : float = 1.0/lightmapTile;
		var rowNum : int = Mathf.FloorToInt(num/lightmapTile);
		var lineNum : int = num-rowNum*lightmapTile;
		var padding : float = step*lightmapPadding; //step*0.2;
	
		uv1[v] = Vector2(lineNum*step+padding, rowNum*step+padding);
		uv1[v+1] = Vector2(lineNum*step+step-padding, rowNum*step+padding);
		uv1[v+2] = Vector2(lineNum*step+step-padding, rowNum*step+step-padding);
		uv1[v+3] = Vector2(lineNum*step+padding, rowNum*step+step-padding);
		
		var tangent:Vector4 = new Vector4 (  
			vertices[v].x-vertices[v+1].x, 
			vertices[v].y-vertices[v+1].y, 
			vertices[v].z-vertices[v+1].z, -1);
		
		tangents[v] = tangent;
		tangents[v+1] = tangent;
		tangents[v+2] = tangent;
		tangents[v+3] = tangent;
			
		var t:int = num*6; 	
		tris[t] = v; tris[t+1] = v+1; tris[t+2] = v+2;
		tris[t+3] = v+2; tris[t+4] = v+3; tris[t+5] = v;
		
		//t=num*2;
		//triToFace[t] = 
	}
}

class Block
{
	var exists : boolean; 
	var deep : boolean; //optimization: do not create Blocks without walls, called deep blocks
	
	var x:int; var y:int; var z:int;
	
	var hasFace : System.Collections.BitArray = new System.Collections.BitArray(6);
	var faces : VoxelandFace[] = new VoxelandFace[6];
	
	var type : int = 1;
	
	//var ambient : float;
	
	var invisible : boolean;
	
	function Block (nx:int, ny:int, nz:int) { x=nx; y=ny; z=nz; }
}


static function CalculateAmbient (data:VoxelandData)
	{ CalculateAmbient(data, 0,0,0, data.sizeX,data.sizeY,data.sizeZ); }
	//{ CalculateAmbient(matrix, ambientMatrix, 7,7,7, matrix.GetLength(0)-15,matrix.GetLength(1)-15,matrix.GetLength(2)-15); }
	//calculating whle given matrix

static function CalculateAmbient (data:VoxelandData, 
	startX:int, startY:int, startZ:int,
	sizeX:int, sizeY:int, sizeZ:int) : void
	//calculating only the part of given matrix
	
{
	var borderSize : int = 4; //todo:bring it to fn call
	
	var x:int; var y:int; var z:int; 
	var nx:int; var ny:int; var nz:int;
	
	var maxX:int = data.sizeX-1;
	var maxY:int = data.sizeY-1;
	var maxZ:int = data.sizeZ-1;
	
	//getting borders array to connect newly created ambient semlesly
	//optimize: maybe it should be static array
	var borders : float[,,] = new float[sizeX,sizeY,sizeZ];
	for (x=0; x<sizeX; x++) 
		for (y=0; y<sizeY; y++) 
			for (z=0; z<sizeZ; z++) 
				borders[x,y,z] = data.GetAmbient(startX+x, startY+y, startZ+z);

	
	//building full-bright blocks
	for (y=startY+sizeY; y>startY; y--) //from top to bottom
		for (x=startX; x<startX+sizeX; x++)
			for (z=startZ; z<startZ+sizeZ; z++)
	{
		//ignoring existing blocks
		if (data.Exists(x,y,z)) { data.SetAmbient(x,y,z,0);continue; }

		//placing photons from outer space
		else if (y>data.sizeY-borderSize ||
			y>data.sizeY-borderSize || y<borderSize ||
			z>data.sizeZ-borderSize || z<borderSize) data.SetAmbient(x,y,z,1);

		//building inverse-pyramids of illuminated blocks
		else if (data.GetAmbient(x,y+1,z) > 0.9 &&
			data.GetAmbient(x-1,y+1,z) > 0.9 &&
			data.GetAmbient(x,y+1,z-1) > 0.9 &&
			data.GetAmbient(x+1,y+1,z) > 0.9 &&
			data.GetAmbient(x,y+1,z+1) > 0.9) data.SetAmbient(x,y,z,1);
		
		//do not touch borders
		else if (y<=startY || y>=startY+sizeY-1 ||
				 x<=startX || x>=startX+sizeX-1 ||
				 z<=startZ || z>=startZ+sizeZ-1) continue;
		
		//resetting prev matrix
		else data.SetAmbient(x,y,z,0);
	}
	
	
	//fading blocks by dist
	for (var i:int=0; i<5; i++)
		for (x=startX+1; x<startX+sizeX-2; x++)
			for (y=startY+1; y<startY+sizeY-2; y++)
				for (z=startZ+1; z<startZ+sizeZ-2; z++)
	{
		if (data.Exists(x,y,z)) continue;
		
		if (data.GetAmbient(x,y,z) > 0.001) continue;
		
		var maxNear : float = data.GetAmbient(x-1,y,z);
		maxNear = Mathf.Max(data.GetAmbient(x+1,y,z), maxNear);
		maxNear = Mathf.Max(data.GetAmbient(x,y-1,z), maxNear);
		maxNear = Mathf.Max(data.GetAmbient(x,y+1,z), maxNear);
		maxNear = Mathf.Max(data.GetAmbient(x,y,z-1), maxNear);
		maxNear = Mathf.Max(data.GetAmbient(x,y,z+1), maxNear);

		data.SetAmbient(x,y,z,maxNear*0.5);
	}
	
	//blurring
	//for (i=0; i<2; i++)
		for (x=startX+1; x<startX+sizeX-1; x++)
			for (y=startY+1; y<startY+sizeY-1; y++)
				for (z=startZ+1; z<startZ+sizeZ-1; z++)
					data.BlurAmbient(x,y,z);
	
	//apply borders
	for (x=0; x<sizeX; x++) 
		for (y=0; y<sizeY; y++)
			for (z=0; z<sizeZ; z++) 
			{
				if (x<borderSize || x>=sizeX-borderSize ||
					//y<borderSize || y>=sizeY-borderSize ||
					z<borderSize || z>=sizeZ-borderSize)
						data.SetAmbient(startX+x, startY+y, startZ+z, borders[x,y,z]);
						
						//data.SetAmbient(startX+x, startY+y, startZ+z, 1);
			}
}
	
function BuildAmbient (data:VoxelandData) //note it is done after building a mesh
//building only the part of given matrix - that one that uses mesh
{
	//setting faces ambient
	var colors : Color[] = filter.sharedMesh.colors;
	
	for (var f:int=0; f<faces.length; f++)
	{
		//if (faces[f].invisible) continue;
		
		var face : VoxelandFace = faces[f];
		
		//setting face ambient
		var nx:int=face.x + Dir.AddX(face.dir); 
		var ny:int=face.y + Dir.AddY(face.dir); 
		var nz:int=face.z + Dir.AddZ(face.dir);
		
		if (InRange(nx, ny, nz)) face.ambient = data.GetAmbient(nx+terrainStartX,ny,nz+terrainStartZ);
		//optimize: do we need InRange here?
		
		//reset prev ambient calculations
		for (var v:int=0; v<4; v++)
			face.verts[v].ambientCalculated = false;
	}
	
	//writing ambient to mesh
	var num : int=0;
	for (f=0; f<faces.length; f++)
	{
		if (faces[f].invisible) continue;

		for (v=0; v<4; v++)
		{
			var vert : VoxelandVertex = faces[f].verts[v];
			if (!vert.ambientCalculated) vert.CalcAmbient();
			
			colors[num*4+v].a = vert.ambient;
		}
		
		num++;
	}
	
	filter.sharedMesh.colors = colors;
}


function BuildMesh (data:VoxelandData, types:VoxelandBlockType[]) 
//building only the part of given matrix - that one that uses mesh
//do not forget to manually calculate ambient
{
	var x:int; var y:int; var z:int;
	var dirX:int; var dirY:int; var dirZ:int;
	
	if (!filter) filter = GetComponent(MeshFilter);
	if (!collision) collision = GetComponent(MeshCollider);
	
	filter.sharedMesh = new Mesh ();
	filter.sharedMesh.Clear();
	//AAAAAAA, Memory leak! Damn Unity! Has to use this:
	//filter.mesh.Clear();
	
	
	//creating exist matrix
	//var exists:boolean[,,] = new boolean[dimensionsX, dimensionsY, dimensionsZ];
	
	Profiler.BeginSample ("BuildMesh: creating exists matrix");
	var exists:boolean[,,] = new boolean[dimensionsX, dimensionsY, dimensionsZ];
	for (x=0; x<dimensionsX; x++)
		for (z=0; z<dimensionsZ; z++)
			for (y=0; y<dimensionsY; y++)
				exists[x,y,z] = data.Exists(terrainStartX+x, y, terrainStartZ+z);
	Profiler.EndSample ();
	
	
	//calculating facecount, and btw calculating used types array
	Profiler.BeginSample ("BuildMesh: calculating facecount");
	var faceCount:int = 0;
	var i : int = 0;
	for (x=0; x<dimensionsX; x++)
		for (z=0; z<dimensionsZ; z++)
			for (y=0; y<dimensionsY; y++)	
	{
		if (!data.Exists(terrainStartX+x,y,terrainStartZ+z)) continue;
		
		var addedFace : boolean;
		
		if (x>0 && !exists[x-1,y,z]) { addedFace=true; faceCount++; }
		if (x<dimensionsX-1 && !exists[x+1,y,z]) { addedFace=true; faceCount++; }
		if (y>0 && !exists[x,y-1,z]) { addedFace=true; faceCount++; }
		if (y<dimensionsY-1 && !exists[x,y+1,z]) { addedFace=true; faceCount++; }
		if (z>0 && !exists[x,y,z-1]) { addedFace=true; faceCount++; }
		if (z<dimensionsZ-1 && !exists[x,y,z+1]) { addedFace=true; faceCount++; }
		
		/*
		if (!data.Exists(terrainStartX+x-1,y,terrainStartZ+z)) { addedFace=true; faceCount++; }
		if (!data.Exists(terrainStartX+x+1,y,terrainStartZ+z)) { addedFace=true; faceCount++; }
		if (y<0 && !data.Exists(terrainStartX+x,y-1,terrainStartZ+z)) { addedFace=true; faceCount++; }
		if (!data.Exists(terrainStartX+x,y+1,terrainStartZ+z)) { addedFace=true; faceCount++; }
		if (!data.Exists(terrainStartX+x,y,terrainStartZ+z-1)) { addedFace=true; faceCount++; }
		if (!data.Exists(terrainStartX+x,y,terrainStartZ+z+1)) { addedFace=true; faceCount++; }
		*/
		
		if (addedFace)
		{
			var newType : boolean = true;
			var type : int = data.GetBlock(terrainStartX+x, y, terrainStartZ+z);
			for (var j:int=0; j<usedTypes.length; j++) 
				if (type == usedTypes[j]) newType = false;
			
			if (newType && i<usedTypes.length) { usedTypes[i] = type; i++; }
		}
	}
	Profiler.EndSample ();
	
	
	//creating faces. And btw creating coords-face dictionary for welding
	Profiler.BeginSample ("BuildMesh: creating faces");
	faces = new VoxelandFace[faceCount];
	var facesDict : System.Collections.Generic.Dictionary.<int,VoxelandFace> = new System.Collections.Generic.Dictionary.<int,VoxelandFace>();
	faceCount = 0;
	for (x=0; x<dimensionsX; x++)
		for (z=0; z<dimensionsZ; z++)
			for (y=0; y<dimensionsY; y++)
	{
		if (!data.Exists(terrainStartX+x,y,terrainStartZ+z)) continue;

		var invisible:boolean = (x<invisibleBorders || z<invisibleBorders 
			|| x>dimensionsX-invisibleBorders-1 || z>dimensionsZ-invisibleBorders-1);
		
		var face:VoxelandFace;
		
		
		if (x>0 && !exists[x-1,y,z])
			{ face = new VoxelandFace(x,y,z,3, data.GetBlock(terrainStartX+x,y,terrainStartZ+z), invisible, this); 
			faces[faceCount] = face; faceCount++; 
			facesDict.Add( VoxelandFace.GetCoords(x,y,z,3), face ); }
		
		if (x<dimensionsX-1 && !exists[x+1,y,z])
			{ face = new VoxelandFace(x,y,z,2, data.GetBlock(terrainStartX+x,y,terrainStartZ+z), invisible, this); 
			faces[faceCount] = face; faceCount++; 
			facesDict.Add( VoxelandFace.GetCoords(x,y,z,2), face ); }
			
		if (y>0 && !exists[x,y-1,z])
			{ face = new VoxelandFace(x,y,z,1, data.GetBlock(terrainStartX+x,y,terrainStartZ+z), invisible, this); 
			faces[faceCount] = face; faceCount++; 
			facesDict.Add( VoxelandFace.GetCoords(x,y,z,1), face ); }
			
		if (y<dimensionsY-1 && !exists[x,y+1,z])
			{ face = new VoxelandFace(x,y,z,0, data.GetBlock(terrainStartX+x,y,terrainStartZ+z), invisible, this); 
			faces[faceCount] = face; faceCount++; 
			facesDict.Add( VoxelandFace.GetCoords(x,y,z,0), face ); }
			
		if (z>0 && !exists[x,y,z-1])
			{ face = new VoxelandFace(x,y,z,5, data.GetBlock(terrainStartX+x,y,terrainStartZ+z), invisible, this); 
			faces[faceCount] = face; faceCount++; 
			facesDict.Add( VoxelandFace.GetCoords(x,y,z,5), face ); }
			
		if (z<dimensionsZ-1 && !exists[x,y,z+1])
			{ face = new VoxelandFace(x,y,z,4, data.GetBlock(terrainStartX+x,y,terrainStartZ+z), invisible, this); 
			faces[faceCount] = face; faceCount++; 
			facesDict.Add( VoxelandFace.GetCoords(x,y,z,4), face ); }
		
		/*
		if (!data.Exists(terrainStartX+x-1,y,terrainStartZ+z))
			{ face = new VoxelandFace(x,y,z,3, data.GetBlock(terrainStartX+x,y,terrainStartZ+z), invisible, this); 
			faces[faceCount] = face; faceCount++; 
			facesDict.Add( VoxelandFace.GetCoords(x,y,z,3), face ); }
		
		if (!data.Exists(terrainStartX+x+1,y,terrainStartZ+z))
			{ face = new VoxelandFace(x,y,z,2, data.GetBlock(terrainStartX+x,y,terrainStartZ+z), invisible, this); 
			faces[faceCount] = face; faceCount++; 
			facesDict.Add( VoxelandFace.GetCoords(x,y,z,2), face ); }
			
		if (y<0 && !data.Exists(terrainStartX+x,y-1,terrainStartZ+z))
			{ face = new VoxelandFace(x,y,z,1, data.GetBlock(terrainStartX+x,y,terrainStartZ+z), invisible, this); 
			faces[faceCount] = face; faceCount++; 
			facesDict.Add( VoxelandFace.GetCoords(x,y,z,1), face ); }
			
		if (!data.Exists(terrainStartX+x,y+1,terrainStartZ+z))
			{ face = new VoxelandFace(x,y,z,0, data.GetBlock(terrainStartX+x,y,terrainStartZ+z), invisible, this); 
			faces[faceCount] = face; faceCount++; 
			facesDict.Add( VoxelandFace.GetCoords(x,y,z,0), face ); }
			
		if (!data.Exists(terrainStartX+x,y,terrainStartZ+z-1))
			{ face = new VoxelandFace(x,y,z,5, data.GetBlock(terrainStartX+x,y,terrainStartZ+z), invisible, this); 
			faces[faceCount] = face; faceCount++; 
			facesDict.Add( VoxelandFace.GetCoords(x,y,z,5), face ); }
			
		if (!data.Exists(terrainStartX+x,y,terrainStartZ+z+1))
			{ face = new VoxelandFace(x,y,z,4, data.GetBlock(terrainStartX+x,y,terrainStartZ+z), invisible, this); 
			faces[faceCount] = face; faceCount++; 
			facesDict.Add( VoxelandFace.GetCoords(x,y,z,4), face ); }
		*/
		
	}
	Profiler.EndSample ();
	

	//welding faces - creating edges
	Profiler.BeginSample ("BuildMesh: welding faces");
	for (var f:int=0; f<faces.length; f++)
	{
		face = faces[f];
		var faceOppositeDir : int = Dir.GetOpposite(face.dir);

		//neig block coords
		var faceToWeld : VoxelandFace;
		
		for (i=0;i<6;i++) //looking sideways
		{
			if (i==face.dir || i==faceOppositeDir) continue;
			
			//convex cases
			if (facesDict.TryGetValue( VoxelandFace.GetCoords(face.x, face.y, face.z, i), faceToWeld))
				{ face.Weld(faceToWeld); continue; }
			
			//planar case
			if (facesDict.TryGetValue( VoxelandFace.GetCoords(
				face.x + Dir.AddX(i), 
				face.y + Dir.AddY(i), 
				face.z + Dir.AddZ(i),
				face.dir), faceToWeld))
					{ face.Weld(faceToWeld); continue; }
					
			//concave case
			if (facesDict.TryGetValue( VoxelandFace.GetCoords(
				face.x + Dir.AddX(i) + Dir.AddX(face.dir), 
				face.y + Dir.AddY(i) + Dir.AddY(face.dir), 
				face.z + Dir.AddZ(i) + Dir.AddZ(face.dir),
				Dir.GetOpposite(i)), faceToWeld))
					{ face.Weld(faceToWeld); continue; }
		}
		
		//creating edges for non-connected verts (borders)
		//do not need this if VoxelandChunk has closed topology
		for (i=0;i<4;i++)
			if (!face.edges[i]) 
			{
				face.edges[i] = new VoxelandEdge();
				face.edges[i].faces = [ face, null ];
				if (i==3) face.edges[3].coords = [ face.coords[3], face.coords[0] ];
				else face.edges[i].coords = [ face.coords[i], face.coords[i+1] ];
			}
	}
	Profiler.EndSample ();
	
	
	//welding edges - creating verts
	Profiler.BeginSample ("BuildMesh: welding edges");
	for (f=0; f<faces.length; f++)
		faces[f].CreateVerts();
	
	//re-creating faces verts (some of them lost in welding)
	var edge:VoxelandEdge;
	
	for (f=0; f<faces.length; f++)
		for (var e:int=0; e<4; e++)
	{
		edge = faces[f].edges[e];
		
		for (var c:int=0; c<4; c++)
		{
			if (edge.verts[0].coords == faces[f].coords[c]) faces[f].verts[c] = edge.verts[0];
			if (edge.verts[1].coords == faces[f].coords[c]) faces[f].verts[c] = edge.verts[1];
		}
	}
	Profiler.EndSample ();
	
	
	//tesselating, relaxin
	Profiler.BeginSample ("BuildMesh: relaxin 1");
	Relax (relax1st,true);
	Profiler.EndSample ();
	
	Profiler.BeginSample ("BuildMesh: tesselating");
	Tesselate ();
	Profiler.EndSample ();
	
	Profiler.BeginSample ("BuildMesh: relaxin 2");
	Relax (relaxNth,false);
	Profiler.EndSample ();
	
	
	//normals and vertex colors
	Profiler.BeginSample ("BuildMesh: normals");
	for (f=0; f<faces.length; f++) 
	{
		faces[f].CalcNormal();
		for (var v:int=0; v<4; v++) 
			if (!faces[f].verts[v].normalCalculated) 
			{
				faces[f].verts[v].CalcNormal();
				faces[f].verts[v].normalCalculated = true;
				
				faces[f].verts[v].CalcBlend(usedTypes);
				faces[f].verts[v].blendCalculated = true;
			}
	}
	Profiler.EndSample ();
	
	
	//creating tris (after all blocks are welded)
	Profiler.BeginSample ("BuildMesh: creating mesh");
	BuildMesh (true, true);
	Profiler.EndSample ();
	//optimize: remove edge data, we will not need it anymore
	
	//assigning materials
	var mat : Material = renderer.sharedMaterial;
	if (!land) land = transform.parent.GetComponent(Voxeland);
	if (!renderer.sharedMaterial) renderer.sharedMaterial = new Material(land.landShader); 

	renderer.sharedMaterial.SetTexture("_MainTex", types[usedTypes[0]].texture);
	renderer.sharedMaterial.SetTexture("_MainTex2", types[usedTypes[1]].texture);
	renderer.sharedMaterial.SetTexture("_MainTex3", types[usedTypes[2]].texture);
	renderer.sharedMaterial.SetTexture("_MainTex4", types[usedTypes[3]].texture);
	
	renderer.sharedMaterial.SetTexture("_BumpMap", types[usedTypes[0]].bumpTexture);
	renderer.sharedMaterial.SetTexture("_BumpMap2", types[usedTypes[1]].bumpTexture);
	renderer.sharedMaterial.SetTexture("_BumpMap3", types[usedTypes[2]].bumpTexture);
	renderer.sharedMaterial.SetTexture("_BumpMap4", types[usedTypes[3]].bumpTexture);
	
	//renderer.sharedMaterial.SetFloat("_AmbientOcclusion", land.ambientOcclusion);
	renderer.sharedMaterial.SetColor("_Ambient", land.landAmbient);
	renderer.sharedMaterial.SetColor("_SpecColor", land.landSpecular);
	renderer.sharedMaterial.SetFloat("_Shininess", land.landShininess);
}








function BuildMesh (saveArrays:boolean, invisibleBorders:boolean)
{
	//calculating visible faces count
	visibleFacesNum = 0;
	for (var f:int=0; f<faces.length; f++) 
		if (!faces[f].invisible)
			visibleFacesNum++;
	
	var verts : Vector3[] = new Vector3[visibleFacesNum*4];
	var normals : Vector3[] = new Vector3[visibleFacesNum*4];
	var tangents : Vector4[] = new Vector4[visibleFacesNum*4];
	var uvs : Vector2[] = new Vector2[visibleFacesNum*4];
	var uv1 : Vector2[] = new Vector2[visibleFacesNum*4];
	var colors : Color[] = new Color[visibleFacesNum*4];
	var tris : int[] = new int[visibleFacesNum*6];

	triToFace = new int[visibleFacesNum*2];
	
	trisBlockX = new int[visibleFacesNum];
	trisBlockY = new int[visibleFacesNum];
	trisBlockZ = new int[visibleFacesNum];
	trisBlockD = new int[visibleFacesNum];
	
	//building
	var num:int = 0;
	for (f=0; f<faces.length; f++) 
	{
		if (faces[f].invisible) continue;
		
		faces[f].ToMesh(verts, normals, tangents, uvs, uv1, colors, tris, triToFace, num,  Mathf.Ceil(Mathf.Sqrt(visibleFacesNum)), lightmapPadding);
		triToFace[num*2] = f;
		triToFace[num*2+1] = f;
		
		
		//calculating trisBlock arrays
		if (saveArrays)
		{
			trisBlockX[num] = faces[f].x;
			trisBlockY[num] = faces[f].y;
			trisBlockZ[num] = faces[f].z;
			trisBlockD[num] = faces[f].dir;
		}
		
		num++;
	}

	filter.sharedMesh.vertices = verts; 
	filter.sharedMesh.normals = normals;
	filter.sharedMesh.uv = uvs;
	filter.sharedMesh.uv1 = uv1;
	filter.sharedMesh.tangents = tangents;
	filter.sharedMesh.colors = colors;
	filter.sharedMesh.triangles = tris;

	filter.sharedMesh.RecalculateBounds();
	
	collision.sharedMesh = null;
	collision.sharedMesh = filter.sharedMesh;
	
	if (saveArrays)
	{
		vertices = verts;
		triangles = tris;
	}
}

function Relax (val:float, dontRelaxBorders:boolean)
{
	var face:VoxelandFace;
	
	//calculatin relax vectors
	for (var f:int=0; f<faces.length; f++) 
	{
		face = faces[f];
		for (var v:int=0;v<4;v++) 
			if (!face.verts[v].relaxCalculated) 
			{
				face.verts[v].CalcRelax();
				face.verts[v].relaxCalculated = true;
			}
	}
	
	//apply relax
	for (f=0; f<faces.length; f++) 
	{
		face = faces[f];
		
		for (v=0;v<4;v++)
			if (!face.verts[v].relaxApplied)
			{
				face.verts[v].pos += faces[f].verts[v].relax * val;
				face.verts[v].relaxApplied = true;
			}
		
		//calculating face centers after relax
		face.CalcCenter();
	}
	
	
}

function Tesselate () //(faces:VoxelandFace[])
{
	var newFaces : VoxelandFace[] = new VoxelandFace[faces.length*4];
	
	var face:VoxelandFace;
	for (var f:int=0; f<faces.length; f++)
	{
		face = faces[f];
		
		//creating verts
		Profiler.BeginSample ("Creating Verts");
		//face.CalcCenter();
		var centerVert:VoxelandVertex = new VoxelandVertex( face.center );
		centerVert.coords = face.verts[0].coords + face.verts[1].coords + face.verts[2].coords + face.verts[3].coords; //for random

		for (var v:int=0; v<4; v++)
			if (!face.verts[v].twin)
				face.verts[v].twin = new VoxelandVertex (face.verts[v]);
		Profiler.EndSample ();
		
		
		//creating edges
		Profiler.BeginSample ("Creating Edges");
		var subEdges:VoxelandEdge[] = new VoxelandEdge[8]; //gathering array of ordered subedges
		
		for (var e:int=0; e<4; e++)
		{
			var edge:VoxelandEdge = face.edges[e];
			
			//mid-vert
			if (!edge.midVert) 
			{ 
				edge.midVert = new VoxelandVertex( edge.GetCenter() ); 
				edge.midVert.coords = edge.verts[0].coords+edge.verts[1].coords; //for random
			}
			
			if (!edge.verts[1].twin)
			{
				Debug.Log("haha");
			}
			
			//creating sub-edges if they do not exist
			if (!edge.subEdges)
				edge.subEdges = [ new VoxelandEdge(edge.verts[0].twin, edge.midVert), new VoxelandEdge(edge.midVert, edge.verts[1].twin) ];
				
			//getting edge dir
			if (edge.verts[0]==face.verts[e]) { subEdges[e*2]=edge.subEdges[0]; subEdges[e*2+1]=edge.subEdges[1]; } //if correspond
			else if (edge.verts[1]==face.verts[e]) { subEdges[e*2]=edge.subEdges[1]; subEdges[e*2+1]=edge.subEdges[0]; }
			else Debug.Log ("VoxelandEdge neither correspond nor opposite");
			//optimize:remove strict comparsion. And debug message.
		}
		Profiler.EndSample ();
		
		
		//creating internal edges
		Profiler.BeginSample ("Creating Internal Edges");
		var internalEdges:VoxelandEdge[] = 
			[ new VoxelandEdge(face.edges[0].midVert, centerVert),
			  new VoxelandEdge(face.edges[1].midVert, centerVert),
			  new VoxelandEdge(face.edges[2].midVert, centerVert),
			  new VoxelandEdge(face.edges[3].midVert, centerVert)];
		Profiler.EndSample ();
			  
			  	  	  
		//creating faces
		Profiler.BeginSample ("Creating Faces 1");
		var nf : int = f*4;
		
		newFaces[nf] = new VoxelandFace(face.verts[0].twin, face.edges[0].midVert, centerVert, face.edges[3].midVert);
		newFaces[nf].edges = [subEdges[0],internalEdges[0],internalEdges[3],subEdges[7]];
		
		newFaces[nf+1] = new VoxelandFace(face.edges[0].midVert, face.verts[1].twin, face.edges[1].midVert, centerVert);
		newFaces[nf+1].edges = [subEdges[1],subEdges[2],internalEdges[1],internalEdges[0]];
		
		newFaces[nf+2] = new VoxelandFace(centerVert, face.edges[1].midVert, face.verts[2].twin, face.edges[2].midVert);
		newFaces[nf+2].edges = [internalEdges[1],subEdges[3],subEdges[4],internalEdges[2]];
		
		newFaces[nf+3] = new VoxelandFace(face.edges[3].midVert, centerVert, face.edges[2].midVert, face.verts[3].twin);
		newFaces[nf+3].edges = [internalEdges[3],internalEdges[2],subEdges[5],subEdges[6]];
		
		Profiler.EndSample ();
		Profiler.BeginSample ("Creating Faces 2");
		
		//common params
		face.tesselated = new VoxelandFace[4];
		for (var i:int=0;i<4;i++)
		{
			newFaces[nf+i].x = face.x; 
			newFaces[nf+i].y = face.y; 
			newFaces[nf+i].z = face.z; 
			newFaces[nf+i].dir = face.dir;
			newFaces[nf+i].type = face.type;
			newFaces[nf+i].invisible = face.invisible; 
			newFaces[nf+i].chunk = face.chunk;
			newFaces[nf+i].parent = face;
			face.tesselated[i] = newFaces[nf+i];
		}
		
		Profiler.EndSample ();
		Profiler.BeginSample ("Creating Faces 3");
		
		//writing tesseleted neig faces
		newFaces[nf].tesselatedNeigs = [newFaces[nf+1], newFaces[nf+2], newFaces[nf+3]];
		newFaces[nf+1].tesselatedNeigs = [newFaces[nf], newFaces[nf+2], newFaces[nf+3]];
		newFaces[nf+2].tesselatedNeigs = [newFaces[nf], newFaces[nf+1], newFaces[nf+3]];
		newFaces[nf+3].tesselatedNeigs = [newFaces[nf], newFaces[nf+2], newFaces[nf+1]];
		
		Profiler.EndSample ();
		Profiler.BeginSample ("Creating Faces 4");
		
		//setting uvs
		for (i=0;i<4;i++) newFaces[nf+i].uvs = new Vector2[4];
		for (i=0;i<4;i++)
		{
			newFaces[nf].uvs[i] = (face.uvs[i] + face.uvs[1])*0.5 + Vector2(0.125,0) ;
			newFaces[nf+1].uvs[i] = (face.uvs[i] + face.uvs[1])*0.5;
			newFaces[nf+2].uvs[i] = (face.uvs[i] + face.uvs[1])*0.5 + Vector2(0,0.125); 
			newFaces[nf+3].uvs[i] = (face.uvs[i] + face.uvs[1])*0.5 + Vector2(0.125,0.125);  
		}
		
		Profiler.EndSample ();
		Profiler.BeginSample ("Creating Faces 5");
		
		//setting ambient
		for (i=0;i<4;i++) newFaces[nf+i].ambient = face.ambient;
		
		//adding faces to edges
		internalEdges[0].faces = [newFaces[nf], newFaces[nf+1]];
		internalEdges[1].faces = [newFaces[nf+1], newFaces[nf+2]];
		internalEdges[2].faces = [newFaces[nf+2], newFaces[nf+3]];
		internalEdges[3].faces = [newFaces[nf+3], newFaces[nf]];
		
		Profiler.EndSample ();
		Profiler.BeginSample ("Creating Faces 6");
		
		subEdges[0].AddFace(newFaces[nf]); subEdges[7].AddFace(newFaces[nf]);
		subEdges[1].AddFace(newFaces[nf+1]); subEdges[2].AddFace(newFaces[nf+1]);
		subEdges[3].AddFace(newFaces[nf+2]); subEdges[4].AddFace(newFaces[nf+2]);
		subEdges[5].AddFace(newFaces[nf+3]); subEdges[6].AddFace(newFaces[nf+3]);
		
		Profiler.EndSample ();
	}
	
	faces = newFaces;
}

function BuildGrass (data:VoxelandData, types:VoxelandBlockType[])
{
	//calculating number of grass bushes
	var num:int = 0;
	for (var f:int=0; f<faces.length; f++)
	{
		if (faces[f].invisible) continue;
		if (faces[f].verts[0].normal.y<0.3 || faces[f].verts[1].normal.y<0.3 ||
			faces[f].verts[2].normal.y<0.3 || faces[f].verts[3].normal.y<0.3) continue;
		if (!types[faces[f].type].hasGrassAbove) continue;
		
		num++;
	}
	
	//adding or deleting grass mesh
	if (num!=0 && !grassFilter)
	{
		var grassObj : GameObject = new GameObject("Grass");
		grassObj.transform.parent = transform;
		grassObj.transform.localPosition = Vector3(0,0,0);
		grassFilter = grassObj.AddComponent(MeshFilter);
		grassObj.AddComponent(MeshRenderer);
		grassFilter.sharedMesh = new Mesh ();
		grassObj.renderer.castShadows = false;
		
		if (!land) land = transform.parent.GetComponent(Voxeland);
		if (!!land) grassObj.renderer.material = land.grassMaterial;
		
		if (!!land.grassMaterial) land.grassMaterial.SetColor("_Ambient", land.landAmbient);
	}
	if (num==0 && !!grassFilter) { DestroyImmediate(grassFilter.gameObject); }
	if (num==0) return;
	
	
	grassFilter.sharedMesh = new Mesh ();
	grassFilter.sharedMesh.Clear();
	/*
	#if UNITY_EDITOR
	if (!Application.isPlaying) grassFilter.sharedMesh.Clear();
	else grassFilter.mesh.Clear();
	//using sharedmesh will make a memory leak... And not vice versa!
	#else
	grassFilter.mesh.Clear();
	#endif
	*/

	
	//init arrays
	var grassVerts : Vector3[] = new Vector3[num*6];
	var grassNormals : Vector3[] = new Vector3[num*6];
	var grassColors : Color[] = new Color[num*6];
	var grassUvs : Vector2[] = new Vector2[num*6];
	var grassTris : int[] = new int[num*6];

	//creating bushes
	num = 0;
	for (f=0; f<faces.length; f++) 
	{
		if (faces[f].invisible) continue;
		if (faces[f].verts[0].normal.y<0.3 || faces[f].verts[1].normal.y<0.3 ||
			faces[f].verts[2].normal.y<0.3 || faces[f].verts[3].normal.y<0.3) continue;
		if (!types[faces[f].type].hasGrassAbove) continue;
		
		var face:VoxelandFace = faces[f];
		
		//checking if upper block has grass
		var upType:int=0;
		switch (face.dir)
		{
			case 0: upType = data.GetBlock(terrainStartX+face.x,face.y+1,terrainStartZ+face.z); break;
			case 2: upType = data.GetBlock(terrainStartX+face.x+1,face.y,terrainStartZ+face.z); break;
			case 3: upType = data.GetBlock(terrainStartX+face.x-1,face.y,terrainStartZ+face.z); break;
			case 4: upType = data.GetBlock(terrainStartX+face.x,face.y,terrainStartZ+face.z+1); break;
			case 5: upType = data.GetBlock(terrainStartX+face.x,face.y,terrainStartZ+face.z-1); break;
		}

		Random.seed = face.x*1000 + face.y*100 + face.z*10 + face.dir + face.verts[0].coords;
		
		//if (Random.value>0.33) continue;

		grassVerts[num] = face.verts[0].pos + (face.verts[0].pos-face.verts[2].pos)*1.2 + Vector3(0,-0.1,0);
		grassVerts[num+1] = (face.verts[0].pos+face.verts[2].pos)*0.5 + Vector3(0,0.5+Random.value*0.4,0);
		grassVerts[num+2] = face.verts[2].pos + (face.verts[2].pos-face.verts[0].pos)*1.2 + Vector3(0,-0.1,0);
		
		grassVerts[num+3] = face.verts[1].pos + (face.verts[1].pos-face.verts[3].pos)*1.2 + Vector3(0,-0.1,0);
		grassVerts[num+4] = (face.verts[1].pos+face.verts[3].pos)*0.5 + Vector3(0,0.5+Random.value*0.4,0);
		grassVerts[num+5] = face.verts[3].pos + (face.verts[3].pos-face.verts[1].pos)*1.2 + Vector3(0,-0.1,0);
		
		//uvs
		var uStep:float = (Mathf.Floor(Random.value*2)) * 0.5;
		var vStep:float = (Mathf.Floor(Random.value*2)) * 0.5;
		
		grassUvs[num] = Vector2(uStep,vStep); 
		grassUvs[num+1] = Vector2(uStep+0.5,vStep); 
		grassUvs[num+2] = Vector2(uStep+0.5,vStep+0.5); 
		
		uStep = (Mathf.Floor(Random.value*2)) * 0.5;
		vStep = (Mathf.Floor(Random.value*2)) * 0.5;
		
		grassUvs[num+3] = Vector2(uStep+0.5,vStep+0.5);
		grassUvs[num+4] = Vector2(uStep,vStep+0.5);
		grassUvs[num+5] = Vector2(uStep,vStep);
		
		for (var i:int=0;i<6;i++)
		{
			grassNormals[num+i] = face.normal;
			grassTris[num+i] = num+i;
			if (i==1) grassColors[num+i] = new Color(Random.value*0.5+0.5,Random.value,Random.value*0.5+0.5,face.ambient);
			else if (i==4) grassColors[num+i] = new Color(Random.value*0.5,Random.value,Random.value*0.5+0.5,face.ambient);
			else grassColors[num+i] = new Color(0.5,0,0.5,face.ambient);
		}
		num+=6;
	}
	
	grassFilter.sharedMesh.vertices = grassVerts; 
	grassFilter.sharedMesh.normals = grassNormals;
	grassFilter.sharedMesh.colors = grassColors;
	grassFilter.sharedMesh.uv = grassUvs;
	grassFilter.sharedMesh.triangles = grassTris;
}


function GetBlockByTri (triNum:int)
{
	var faceNum:int = Mathf.FloorToInt(triNum*0.5);
	return [trisBlockX[faceNum], trisBlockY[faceNum], trisBlockZ[faceNum], trisBlockD[faceNum]];
}

function GetTrisByBlock (x:int, y:int, z:int) //returns only one tri, another is +1
{
	var result : System.Collections.BitArray = new System.Collections.BitArray(trisBlockX.length);

	for (var i:int=0;i<trisBlockX.length;i++)
	{
		if (trisBlockX[i] == x &&
			trisBlockY[i] == y &&
			trisBlockZ[i] == z)
				result[i] = true;
		//else result[i] = false;
	}
	
	return result;
}



/*
function OnPreRender () 
{
 	revertFogState = RenderSettings.fog;
 	RenderSettings.fog = enabled;
}

function OnPostRender () 
{
	RenderSettings.fog = revertFogState;
}
*/