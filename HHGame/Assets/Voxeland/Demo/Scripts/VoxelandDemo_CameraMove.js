#pragma strict

var moveSpeed : float = 10;
var rotateSpeed : float = 0.1;

private var oldMousePos : Vector2;

var rotationX : float;
var rotationY : float;

var cameraTfm : Transform;
//var motor : CharacterMotor;

function Start ()
{
	//Screen.lockCursor = true;
}

function OnFocus()
{
	//Screen.lockCursor = true;
}

function Update () 
{
	/*
		if (walkMode)
	{
		//motor.inputMoveDirection = motor.transform.rotation * Vector3(Input.GetAxis("MoveSideways"), 0, Input.GetAxis("MoveForward")).normalized;
		//motor.inputJump = Input.GetButton("Jump");
		
		var newPos:Vector3 = charTfm.localPosition;
		
		if (Input.GetKey (KeyCode.W)) newPos += charTfm.forward*walkSpeed*Time.deltaTime;
		if (Input.GetKey (KeyCode.S)) newPos -= charTfm.forward*walkSpeed*Time.deltaTime;
		if (Input.GetKey (KeyCode.D)) newPos += charTfm.right*walkSpeed*Time.deltaTime;
		if (Input.GetKey (KeyCode.A)) newPos -= charTfm.right*walkSpeed*Time.deltaTime;
		if (Input.GetKey (KeyCode.R)) newPos += charTfm.up*walkSpeed*Time.deltaTime;
		if (Input.GetKey (KeyCode.F)) newPos -= charTfm.up*walkSpeed*Time.deltaTime;
		
		//falling down on ground
		var floor:Vector3;
		var closestFloorDist:float = Mathf.Infinity;

		for (var x:int=0;x<land.terrain.GetLength(0);x++)
			for (var y:int=0;y<land.terrain.GetLength(1);y++)
		{
			var chunk : BlockMesh = land.terrain[x,y];
			
			if (chunk.terrainStartX+chunk.dimensionsX-land.overlap+0.5<newPos.x ||
				chunk.terrainStartZ+chunk.dimensionsZ-land.overlap+0.5<newPos.z ||
				chunk.terrainStartX+land.overlap-0.5>newPos.x ||
				chunk.terrainStartZ+land.overlap-0.5>newPos.z) continue;
			
			Profiler.BeginSample ("Flooring"); 
			
			var min:Vector3 = new Vector3(newPos.x-chunk.terrainStartX-0.8,
										  newPos.y-5, //larger vertical range
										  newPos.z-chunk.terrainStartZ-0.8);
			var max:Vector3 = new Vector3(newPos.x-chunk.terrainStartX+0.8,
										  newPos.y+20,
										  newPos.z-chunk.terrainStartZ+0.8);						  

			var modVector : Vector3 = Vector3(chunk.terrainStartX,0,chunk.terrainStartZ);
			
			for (var f:int=0;f<chunk.faces.length;f++)
			{
				var face:Face = chunk.faces[f];
				if (face.invisible) continue;
				if (face.dir==1) continue;
				
				if (face.center.x < min.x || face.center.x > max.x ||
					face.center.y < min.y || face.center.y > max.y ||
					face.center.z < min.z || face.center.z > max.z) continue;
				
				if (VoxelandIntersections.IsOnLeftXZ(face.verts[0].pos+modVector, face.verts[1].pos+modVector, newPos) &&
					VoxelandIntersections.IsOnLeftXZ(face.verts[1].pos+modVector, face.verts[2].pos+modVector, newPos) &&
					VoxelandIntersections.IsOnLeftXZ(face.verts[2].pos+modVector, face.verts[3].pos+modVector, newPos) &&
					VoxelandIntersections.IsOnLeftXZ(face.verts[3].pos+modVector, face.verts[0].pos+modVector, newPos) )
					{
						//getting tri
						var p1:Vector3; var p2:Vector3; var p3:Vector3;
						if (!VoxelandIntersections.IsOnLeftXZ(face.verts[0].pos+modVector, face.verts[2].pos+modVector, newPos))
							{p1=face.verts[0].pos+modVector; p2=face.verts[1].pos+modVector; p3=face.verts[2].pos+modVector;}
						else
							{p1=face.verts[0].pos+modVector; p2=face.verts[2].pos+modVector; p3=face.verts[3].pos+modVector;}

						//getting bary coords - in XZ coordsys
						var baryCoords:Vector3 = VoxelandIntersections.GetBaryCoords(Vector2(p1.x,p1.z), Vector2(p2.x,p2.z), Vector2(p3.x,p3.z), Vector2(newPos.x,newPos.z));
						
						//getting floor point
						var newFloor = 
							p1*baryCoords.x +
							p2*baryCoords.y +
							p3*baryCoords.z;
						
						//determining if it is closest floor
						var newDist:float = Mathf.Abs(newFloor.y - newPos.y+0.5);
						if (newDist<closestFloorDist)
							{ floor = newFloor; closestFloorDist=newDist; }
					}
			}
			
			Profiler.EndSample ();
		}
		newPos.y = floor.y;
		
		
		//clamping speed
		if (Input.GetKey (KeyCode.W))
		{
			var moveVector = newPos-charTfm.localPosition;
			var temp:boolean;
		}
		newPos = charTfm.position + Vector3.ClampMagnitude((newPos-charTfm.localPosition),walkSpeed*Time.deltaTime);
		
		//setting position
		charTfm.localPosition = newPos;
		
		rotationX += Input.GetAxis("LookHorizontal");
		rotationY += Input.GetAxis("LookVertical");
		
		cameraTfm.localEulerAngles = new Vector3(-rotationY, rotationX, 0);
		charTfm.localEulerAngles = new Vector3(0, rotationX, 0);
		
		cameraTfm.position = charTfm.position + Vector3(0,1.5,0);
		
		//if (charTfm.position.y<-10) motor.transform.position.y = 100;
	}
	*/
	
	var shiftMod : float = 1;
	if (Input.GetKey (KeyCode.LeftShift) || Input.GetKey (KeyCode.RightShift)) shiftMod = 3;
	
	if (Input.GetKey (KeyCode.W)) transform.localPosition += transform.forward*moveSpeed*shiftMod*Time.deltaTime;
	if (Input.GetKey (KeyCode.S)) transform.localPosition -= transform.forward*moveSpeed*shiftMod*Time.deltaTime;
	if (Input.GetKey (KeyCode.D)) transform.localPosition += transform.right*moveSpeed*shiftMod*Time.deltaTime;
	if (Input.GetKey (KeyCode.A)) transform.localPosition -= transform.right*moveSpeed*shiftMod*Time.deltaTime;
	if (Input.GetKey (KeyCode.R)) transform.localPosition += transform.up*moveSpeed*shiftMod*Time.deltaTime;
	if (Input.GetKey (KeyCode.F)) transform.localPosition -= transform.up*moveSpeed*shiftMod*Time.deltaTime;
	
	
	//if (Input.GetMouseButtonDown(1)) oldMousePos = Input.mousePosition;
	
	
	if (Input.GetMouseButton(1))
	{
		rotationX += Input.GetAxis("Mouse X");
		rotationY += Input.GetAxis("Mouse Y");

		transform.localEulerAngles = new Vector3(-rotationY, rotationX, 0);
	}
	
	
	//movement
//	motor.inputMoveDirection = transform.rotation * Vector3(Input.GetAxis("MoveSideways"), 0, Input.GetAxis("MoveForward")).normalized;
//	motor.inputJump = Input.GetButton("Jump");
	
	/*
	//mouselook
	if (Screen.lockCursor)
	{
		rotationX += Input.GetAxis("LookHorizontal");
		rotationY += Input.GetAxis("LookVertical");
	
		//cameraTfm.localEulerAngles = new Vector3(-rotationY, 0, 0);
		//transform.localEulerAngles = new Vector3(0, rotationX, 0);
		transform.localEulerAngles = new Vector3(-rotationY, rotationX, 0);
	}
	
	
	if (Input.GetKeyDown(KeyCode.Escape)) Screen.lockCursor = !Screen.lockCursor;
	
	if (Input.GetMouseButtonDown(0) ||
		Input.GetMouseButtonDown(1) ||
		Input.GetMouseButtonDown(2))
			 Screen.lockCursor = true;
	*/
}