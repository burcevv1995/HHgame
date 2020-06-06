#pragma strict

//@script ExecuteInEditMode()

class VoxelandCoords
{
	var x:int=0;
	var y:int=0;
	var z:int=0;
	
	function VoxelandCoords (nx:int, ny:int, nz:int) { x=nx; y=ny; z=nz; }
	function VoxelandCoords (src:VoxelandCoords) { x=src.x; y=src.y; z=src.z; }
	function Clamp (max:VoxelandCoords) { x=Mathf.Clamp(x,0,max.x); y=Mathf.Clamp(y,0,max.y); z=Mathf.Clamp(z,0,max.z); }
	static function Equals (c1:VoxelandCoords, c2:VoxelandCoords) { return (c1.x==c2.x && c1.y==c2.y && c1.z==c2.z); }
}

class VoxelandObject
{
	var transform : Transform;
	var coords : VoxelandCoords;
}

class VoxelandBlockType
{
	var name : String;
	
	var filled : boolean;
	
	var texture : Texture;
	var bumpTexture : Texture;
	
	var hasGrassAbove : boolean;
	
	var object : Transform;
}


var data : VoxelandData;
var editorData : VoxelandData;

var types : VoxelandBlockType[];
var selected : int;

var chunkSize : int = 10;

var aimDir : Vector3;

@System.NonSerialized var terrain : VoxelandChunk[];
var terrainChunksX : int;
var terrainChunksZ : int;

var chunkPrefab : Transform;

var overlap : int;

var grassAnimState : float = 0.5;
var grassAnimSpeed : float = 0.75;
var grassAnimInEditor : boolean;

var hightlight : Transform;
var highlightMesh : Mesh;
var highlightMaterial : Material;

var brushSize : int = 0;

var playmodeEdit : boolean;
var independPlaymode : boolean;
var usingPlayData : boolean = false;

var landShader : Shader;
var grassMaterial : Material;
//var ambientOcclusion : float = 1;
var landAmbient : Color = new Color(0.5,0.5,0.5,1);
var landSpecular : Color = new Color(0,0,0,1);;
var landShininess : float;

var guiTypes : boolean = true;
var guiExport : boolean;
var guiSettings : boolean;
var guiRebuild : boolean = true;

@System.NonSerialized var oldAimFace : VoxelandFace;
@System.NonSerialized var oldAimFaces : VoxelandFace[];
@System.NonSerialized var oldAimObj : VoxelandObject;

var lightmapPadding : float = 0.1;



#if UNITY_EDITOR
//saving editor data
function OnEnable ()
{
	if (playmodeEdit && independPlaymode && !editorData)
	{
		editorData = ScriptableObject.CreateInstance.<VoxelandData>();
		editorData.New (data);
	}
}

function OnDisable ()
{
	if (playmodeEdit && independPlaymode && !!editorData)
	{
		data.New (editorData);
	}
}
#endif

function Update () 
{ 
	//animating grass
	if (!!grassMaterial) 
	{
		grassAnimState += Time.deltaTime * grassAnimSpeed;
		grassAnimState = Mathf.Repeat(grassAnimState, 6.283185307179586476925286766559);
		grassMaterial.SetFloat("_AnimState", grassAnimState);
	}
	
	if (!playmodeEdit) return;
	
	
	//rebuilding mesh if no terrain data detected
	if (!terrain) Rebuild(false);
	
	//display highlight
	var aimRay : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
		
	var aimFace = GetFaceByRay(aimRay);
	var aimObj = GetObjectByRay(aimRay, aimFace);
	if ((!!aimFace && aimFace != oldAimFace) || (!!aimObj && aimObj != oldAimObj))
	{
		CheckHightlight();
			
		var aimFaces : VoxelandFace[];
		if (!!aimFace) aimFaces = GetNeigFaces(aimFace.parent, brushSize);
			
		DrawHighlight(aimFaces, aimObj);
		
		oldAimFace = aimFace;
		oldAimFaces = aimFaces;
		oldAimObj = aimObj;
	}
	
	//setting block
	if (Input.GetMouseButtonDown(0)) 
	{
		var filled : boolean = types[selected].filled;
		var hasObj : boolean = !!types[selected].object;
		
		//note that OldAimFaces used below:	
		if (!aimObj && (Input.GetKey(KeyCode.LeftShift)||Input.GetKey(KeyCode.RightShift))) SetBlocks( GetBlocksByFaces(oldAimFaces, true), 0 ); //digging
		else if (!aimObj && filled && (Input.GetKey(KeyCode.LeftControl)||Input.GetKey(KeyCode.RightControl))) SetBlocks( GetBlocksByFaces(oldAimFaces, true), selected ); //replacing
		else if (!aimObj && filled) SetBlocks( GetBlocksByFaces(oldAimFaces, false), selected ); //adding	
		else if (!!aimObj && (Input.GetKey(KeyCode.LeftShift)||Input.GetKey(KeyCode.RightShift))) SetBlock(aimObj.coords, 0); //removing obj
		else if (!filled && hasObj) 
				{ 
					var faces : VoxelandFace[] = new VoxelandFace[1]; faces[0] = aimFace;
					SetBlocks( GetBlocksByFaces(faces, false), selected ); //adding
				}
	}
	
	//Rebuild();
}


function Rebuild () { Rebuild(true); }
function Rebuild (recalcAmbient:boolean)
{
	//creating types array if no is defined
	if (!types)
	{
		types = new VoxelandBlockType[2];
		types[0] = new VoxelandBlockType();
		types[0].name = "Air";
		types[1] = new VoxelandBlockType();
		types[1].name = "Ground";
		types[1].filled = true;
		types[1].texture = new Texture2D(1,1);
		selected = 1;
		//types[1].texture.SetPixel (0, 0, Color(1,1,1,1) ); types[1].texture.Apply();
	}
	
	//calculating chunk sizes and chunk count
	var chunkSizeX : int = chunkSize; //terrain[0,0].dimensionsX-overlap*2;
	var chunkSizeY : int = data.sizeY; //terrain[0,0].dimensionsY;
	var chunkSizeZ : int = chunkSize; //terrain[0,0].dimensionsZ-overlap*2;
	
	terrainChunksX = data.sizeX/chunkSizeX;
	terrainChunksZ = data.sizeZ/chunkSizeZ;
	
	//re-calculating existance matrix
	data.RecalcExists(types);
	
	//ambient works with matrices only, so we can calculate it now
	if (recalcAmbient)
		VoxelandChunk.CalculateAmbient(data);
	
	//destroing old terrain
	if (!!terrain && terrain.length != 0)
		for (var x:int=0; x<terrainChunksX; x++)
			for (var z:int=0; z<terrainChunksZ; z++)
				if (terrain.length >= terrainChunksX*z+x && !!terrain[ terrainChunksX*z + x ]) DestroyImmediate(terrain[ terrainChunksX*z + x ].gameObject);
				
	//removing objects		
//	for(var i=objs.Count-1; i>=0; i--) if (!!objs[i]) DestroyImmediate(objs[i].gameObject);
//	objs.Clear();
	
	//and btw destroing everything
	for(var i=transform.childCount-1; i>=0; i--) DestroyImmediate(transform.GetChild(i).gameObject); 
	
	//creating new
	terrain = new VoxelandChunk[ terrainChunksZ*terrainChunksX ];

	for (x=0; x<terrainChunksX; x++)
		for (z=0; z<terrainChunksZ; z++)
	{
		var chunkObj : GameObject = new GameObject("Chunk");
		
		chunkObj.transform.parent = transform;
		chunkObj.transform.localPosition = Vector3(x*chunkSizeX, 0, z*chunkSizeZ);
		chunkObj.layer = gameObject.layer;

		var chunk = chunkObj.AddComponent(VoxelandChunk);
		chunk.invisibleBorders = overlap;
		terrain[ terrainChunksX*z + x ] = chunk;
		
		chunk.filter = chunkObj.AddComponent.<MeshFilter>();
		chunkObj.AddComponent.<MeshRenderer>();
		chunk.collision = chunkObj.AddComponent.<MeshCollider>();
		
		chunk.terrainCoordsX = x;
		chunk.terrainCoordsZ = z;
		chunk.terrainStartX = x*chunkSizeX;
		chunk.terrainStartZ = z*chunkSizeZ;
		chunk.dimensionsX = chunkSizeX + overlap*2;
		chunk.dimensionsY = chunkSizeY;
		chunk.dimensionsZ = chunkSizeZ + overlap*2;
		chunk.lightmapPadding = lightmapPadding;
		
		chunk.BuildMesh(data, types);
		chunk.BuildAmbient(data);
		chunk.BuildGrass(data, types);
	}
	
	//placing objects
	for (x=0; x<data.sizeX; x++)
		for (var y:int=0; y<data.sizeY; y++)
			for (z=0; z<data.sizeZ; z++)
			{
				var type = data.GetBlock(x,y,z);
				if (types.length > type && !!types[type].object) AddObject(new VoxelandCoords(x,y,z), types[type].object);
			}
}


function AddObject (coords:VoxelandCoords, prefab:Transform)
{
	var objScript = new VoxelandObject();
	objScript.coords = coords;
	
	//getting chunk
	var chunk : VoxelandChunk;
	for (var c:int=0; c<terrain.length; c++)
	{
		if (coords.x >= terrain[c].terrainStartX && 
			coords.x < terrain[c].terrainStartX + terrain[c].dimensionsX &&
			coords.z >= terrain[c].terrainStartZ && 
			coords.z < terrain[c].terrainStartZ + terrain[c].dimensionsZ)
				{ chunk = terrain[c]; break; }
	}
	
	if (!chunk.objects) chunk.objects = new System.Collections.Generic.List.<VoxelandObject>();
	
	var objTfm : Transform = Instantiate (prefab, transform.position+Vector3(coords.x+0.5,coords.y,coords.z+0.5), Quaternion.identity);
	objTfm.parent = chunk.transform;
	objScript.transform = objTfm;
	objScript.coords = coords;
	
	chunk.objects.Add(objScript);
}


function RemoveObject (coords:VoxelandCoords)
{
	//getting chunk
	var chunk : VoxelandChunk;
	for (var c:int=0; c<terrain.length; c++)
	{
		if (coords.x >= terrain[c].terrainStartX && 
			coords.x < terrain[c].terrainStartX + terrain[c].dimensionsX &&
			coords.z >= terrain[c].terrainStartZ && 
			coords.z < terrain[c].terrainStartZ + terrain[c].dimensionsZ)
				{ chunk = terrain[c]; break; }
	}

	//delete
	for(var i:int=0; i<chunk.objects.Count; i++)
		if (VoxelandCoords.Equals(coords,chunk.objects[i].coords)) 
		{ 
			DestroyImmediate(chunk.objects[i].transform.gameObject);
			chunk.objects.RemoveAt(i); 
			break; 
		}
}


function SetBlock (x:int, y:int, z:int, type:int) { SetBlocks([new VoxelandCoords(x,y,z)], type); }
function SetBlock (coord:VoxelandCoords, type:int) { var ca = new VoxelandCoords[1]; ca[0] = coord; 
SetBlocks(ca, type); }

function SetBlocks (coords:VoxelandCoords[], type:int)
{
	if (!coords || coords.length==0) return;
	
	//removing object on this place
	Profiler.BeginSample ("RemovingObj");
	for (var i:int=0;i<coords.length;i++) RemoveObject(coords[i]);
	Profiler.EndSample ();
	
	//setting block
	var exists:boolean = false;
	if (types.length>type && types[type].filled) exists = true;
	
	for (i=0;i<coords.length;i++) data.SetBlock(coords[i].x, coords[i].y, coords[i].z, type, exists);

	//getting min and max
	var min : VoxelandCoords = new VoxelandCoords(data.sizeX,0,data.sizeZ);
	var max : VoxelandCoords = new VoxelandCoords(0,0,0);
	
	for (i=0;i<coords.length;i++) 
	{
		if (coords[i].x < min.x) min.x = coords[i].x;
		if (coords[i].z < min.z) min.z = coords[i].z;
		if (coords[i].x > max.x) max.x = coords[i].x;
		if (coords[i].z > max.z) max.z = coords[i].z;
	}

	//recalculating ambient 
	var aroundAmbientRecalc:int = 8;
	
	var ambientMin = new VoxelandCoords(min);
	var ambientMax = new VoxelandCoords(max);
	ambientMin.x -= aroundAmbientRecalc; ambientMin.z -= aroundAmbientRecalc; 
	ambientMax.x += aroundAmbientRecalc; ambientMax.z += aroundAmbientRecalc; 
	
	var dataMax = new VoxelandCoords(data.sizeX, data.sizeY, data.sizeZ);
	ambientMin.Clamp(dataMax); //clamps between 0 and dataMax
	ambientMax.Clamp(dataMax);

	Profiler.BeginSample ("CalculateAmbient");
	VoxelandChunk.CalculateAmbient( data,
		ambientMin.x+1, 0, ambientMin.z+1, 
		ambientMax.x-ambientMin.x-2, data.sizeY, ambientMax.z-ambientMin.z-2);
	Profiler.EndSample ();
	
	//placing objects
	if (!!types[type].object) 
		for (i=0;i<coords.length;i++) 
			AddObject (coords[i], types[type].object);
	
	//setting to blocks
	for (var blockX:int=0;blockX<terrainChunksX;blockX++)
		for (var blockZ:int=0;blockZ<terrainChunksZ;blockZ++)
	{
		var chunk : VoxelandChunk = terrain[ blockZ*terrainChunksX + blockX ];
		
		if (max.x >= chunk.terrainStartX && min.x < chunk.terrainStartX+chunk.dimensionsX &&
			max.z >= chunk.terrainStartZ && min.z < chunk.terrainStartZ+chunk.dimensionsZ)
				{ 
				Profiler.BeginSample ("BuildMesh");
				chunk.BuildMesh(data, types);
				Profiler.EndSample ();
				}
				
		if (max.x+aroundAmbientRecalc-overlap >= chunk.terrainStartX && min.x-aroundAmbientRecalc+overlap < chunk.terrainStartX+chunk.dimensionsX &&
			max.z+aroundAmbientRecalc-overlap >= chunk.terrainStartZ && min.z-aroundAmbientRecalc+overlap < chunk.terrainStartZ+chunk.dimensionsZ)
				{
				Profiler.BeginSample ("BuildAmbient");
				chunk.BuildAmbient(data);
				Profiler.EndSample ();
				}
		
		if (max.x >= chunk.terrainStartX && min.x < chunk.terrainStartX+chunk.dimensionsX &&
			max.z >= chunk.terrainStartZ && min.z < chunk.terrainStartZ+chunk.dimensionsZ)
				{ 
				Profiler.BeginSample ("BuildGrass");
				chunk.BuildGrass(data, types);
				Profiler.EndSample ();
				}
		
		
		/*			
		if (x-overlap >= chunk.terrainStartX && x+overlap < chunk.terrainStartX+chunk.dimensionsX &&
			z-overlap >= chunk.terrainStartZ && z+overlap < chunk.terrainStartZ+chunk.dimensionsZ)	
				{
				Profiler.BeginSample ("SetCollision");
				chunk.SetCollision();
				Profiler.EndSample ();
				} 
		*/
	}
	
	//System.GC.Collect();
}


function GetFaceByRay (ray:Ray) : VoxelandFace
{
	var hit : RaycastHit;
    if (Physics.Raycast(ray, hit)) 
    {
    	var chunk : VoxelandChunk = hit.collider.GetComponent(VoxelandChunk);
    	if (!!chunk)
    	{
    		return chunk.faces[ chunk.triToFace[hit.triangleIndex] ];
    	}
    }
    return null;
}

function GetObjectByRay (ray:Ray, face:VoxelandFace) : VoxelandObject
{
	var dist : float = Mathf.Infinity;
	if (!!face) dist = (face.center - ray.origin).magnitude;
	
	var hit : RaycastHit;
    if (Physics.Raycast(ray, hit, dist) && !!hit.collider.transform.parent) 
    {
    	var chunk : VoxelandChunk = hit.collider.transform.parent.GetComponent(VoxelandChunk);
    	if (!!chunk)
    		for (var i:int=0;i<chunk.objects.Count;i++)
    			if (chunk.objects[i].transform == hit.collider.transform) return chunk.objects[i];
    }
    return null;
}

function CheckHightlight ()
{
	var faceCount : int = 400;
	var vertCount : int = faceCount*4;
	
	if (!highlightMesh) 
	{
		highlightMesh = new Mesh();
		
		highlightMesh.vertices = new Vector3[vertCount];
		highlightMesh.normals = new Vector3[vertCount];
		highlightMesh.uv = new Vector2[vertCount];
		highlightMesh.triangles = new int[faceCount*6];
		
		for (var i:int=0;i<vertCount;i++)
		{
			highlightMesh.vertices[i] = new Vector3(0,0,0);
			highlightMesh.normals[i] = new Vector3(0,0,0);
			highlightMesh.uv[i] = new Vector2(0.5,0.5);
		}
		
		var tris:int[] = new int[faceCount*6];
		for (i=0;i<faceCount;i++)
		{
			tris[i*6+0]=i*4+0; 
			tris[i*6+1]=i*4+1; 
			tris[i*6+2]=i*4+2;
			tris[i*6+3]=i*4+0; 
			tris[i*6+4]=i*4+2; 
			tris[i*6+5]=i*4+3;
		}
		highlightMesh.triangles = tris;
		//Debug.Log (highlightMesh.triangles[0] + " " + highlightMesh.triangles[1] + " " + highlightMesh.triangles[2]);
	}
	if (!highlightMaterial) highlightMaterial = new Material( Shader.Find("wShaders/AdditiveOffset"));
	
	if (!hightlight)
	{
		var hlObj : GameObject = new GameObject ("Highlight");
		hlObj.transform.parent = this.transform;
		var filter : MeshFilter = hlObj.AddComponent.<MeshFilter>();
		filter.sharedMesh = highlightMesh;
    	var render : MeshRenderer = hlObj.AddComponent.<MeshRenderer>();
    	render.material = highlightMaterial;
    	render.castShadows = false;
    	render.receiveShadows = false;
    	hightlight = hlObj.transform;
    	hightlight.transform.localPosition = Vector3(0,0,0);
	}
	
	hightlight.renderer.material = highlightMaterial;
}

function GetNeigFaces (aimFace:VoxelandFace, iterations:int) : VoxelandFace[]
{
	if (iterations<1) 
	{
		var result:VoxelandFace[]=new VoxelandFace[1]; 
		result[0]=aimFace; 
		return result; 
	}
	
	var oldFaces : System.Collections.Generic.List.<VoxelandFace> = new System.Collections.Generic.List.<VoxelandFace>();
	var newFaces : System.Collections.Generic.List.<VoxelandFace> = new System.Collections.Generic.List.<VoxelandFace>();
	var resultFaces : System.Collections.Generic.List.<VoxelandFace> = new System.Collections.Generic.List.<VoxelandFace>();
	oldFaces.Add(aimFace);
	resultFaces.Add(aimFace);
	
	//getting neig faces
	for (var i:int=0;i<iterations;i++) 
	{
		newFaces.Clear();
		for (var f:int=0;f<oldFaces.Count;f++) 
			for (var n=0;n<oldFaces[f].neigs.length;n++)
				if (!!oldFaces[f].neigs[n]) newFaces.Add(oldFaces[f].neigs[n]);
		oldFaces.Clear();
		
		//passing two-times values to result
		for (f=0;f<newFaces.Count;f++)
		{
			oldFaces.Add(newFaces[f]);
			
			//checking if this face already added
			var alreadyInResult : boolean = false;
			for (var j:int=0; j<resultFaces.Count; j++) if (newFaces[f]==resultFaces[j]) { alreadyInResult=true; break; }
			if (alreadyInResult) continue;
			
			//finding how many times neig face was added to array
			var foundNum : int = 0;
			for (j=0; j<newFaces.Count; j++) if (newFaces[f]==newFaces[j]) foundNum++;
			
			//adding to result
			if (foundNum >= 1) resultFaces.Add(newFaces[f]);
		}
	}
	
	//gathering array
	result = new VoxelandFace[resultFaces.Count];
	for (f=0;f<resultFaces.Count;f++) result[f] = resultFaces[f];
	return result;
}

function GetBlocksByFaces (faces:VoxelandFace[], deep:boolean)
{
	if (!faces) return;
	var blocks:VoxelandCoords[] = new VoxelandCoords[faces.length];
	
	for (var f:int=0;f<faces.length;f++) 
	{
		blocks[f] = new VoxelandCoords(
			faces[f].x+faces[f].chunk.terrainStartX, 
			faces[f].y, 
			faces[f].z+faces[f].chunk.terrainStartZ);
			
		if (!deep)
		{
			blocks[f].x = blocks[f].x + Dir.AddX(faces[f].dir);
			blocks[f].y = blocks[f].y + Dir.AddY(faces[f].dir);
			blocks[f].z = blocks[f].z + Dir.AddZ(faces[f].dir);
		}
	}	
	
	return blocks;
}

function DrawHighlight (aimFaces:VoxelandFace[], aimObj:VoxelandObject)
{
	//populating vert list
	//highlightVertList.Clear();
	
	var verts = new Vector3[1600];
	
	//highliting faces
	if (!aimObj)
	for (var f:int=0; f<aimFaces.length; f++)
	{
		if (!aimFaces[f]) continue;
		if (aimFaces[f].invisible) continue;
		
		var addVector = Vector3(aimFaces[f].chunk.terrainStartX, 0, aimFaces[f].chunk.terrainStartZ);
		
		for (var i=0; i<4; i++)
		{
			var face:VoxelandFace = aimFaces[f].tesselated[i];
									
			verts[f*16+i*4] = face.verts[0].pos + addVector; 
			verts[f*16+i*4+1] = face.verts[1].pos + addVector;
			verts[f*16+i*4+2] = face.verts[2].pos + addVector; 
			verts[f*16+i*4+3] = face.verts[3].pos + addVector;
		}
	}
	
	//higliting objs
	else
	{
		var b : Bounds = aimObj.transform.collider.bounds;
		b.min = transform.InverseTransformPoint(b.min);
		b.max = transform.InverseTransformPoint(b.max);
						
		verts[0] = Vector3(b.min.x,b.min.y,b.max.z); verts[1] = Vector3(b.min.x,b.max.y,b.max.z); verts[2] = b.max; verts[3] = Vector3(b.max.x,b.min.y,b.max.z);
		verts[4] = b.min; verts[5] = Vector3(b.min.x,b.max.y,b.min.z); verts[6] = Vector3(b.min.x,b.max.y,b.max.z); verts[7] = Vector3(b.min.x,b.min.y,b.max.z);
		verts[8] = Vector3(b.max.x,b.min.y,b.min.z); verts[9] = Vector3(b.max.x,b.max.y,b.min.z); verts[10] = Vector3(b.min.x,b.max.y,b.min.z); verts[11] = b.min;
		verts[12] = Vector3(b.max.x,b.min.y,b.max.z); verts[13] = b.max; verts[14] = Vector3(b.max.x,b.max.y,b.min.z); verts[15] = Vector3(b.max.x,b.min.y,b.min.z);
	}
	
	highlightMesh.vertices = verts;
	highlightMesh.RecalculateBounds();
}

function BuildColliders ()
{
	for (var c:int=0; c<terrain.length; c++)
	{
		var collider : MeshCollider = terrain[c].GetComponent(MeshCollider);
		var filter : MeshFilter = terrain[c].GetComponent(MeshFilter);
		if (!collider) collider = terrain[c].gameObject.AddComponent.<MeshCollider>();
		
		if (!!filter && !!filter.sharedMesh)
		{
			collider.sharedMesh = null;
			collider.sharedMesh = filter.sharedMesh;
		}
	}
}