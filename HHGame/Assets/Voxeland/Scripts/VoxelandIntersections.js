
#pragma strict

var lineStartTfm : Transform;
var lineEndTfm : Transform;

var posTfm0:Transform;
var posTfm1:Transform;
var posTfm2:Transform;
var posTfm3:Transform;



static function GetVectorMatrix (vec:Vector3) : Matrix4x4
{
	var vecQuat : Quaternion = new Quaternion();
	vecQuat.SetLookRotation(vec);

	var vecMatrix : Matrix4x4 = new Matrix4x4();
	vecMatrix.SetTRS (
		Vector3(0,0,0), //pos
		vecQuat, //rot
		Vector3(1,1,1)); //scale
	
	return vecMatrix.inverse;
}

static function IsOnLeft (a:Vector3, b:Vector3, p:Vector3) : boolean //in 2D xy plane
{
	return ((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x) > 0);
}

static function IsOnLeftXZ (a:Vector3, b:Vector3, p:Vector3) : boolean //the same in xz plane
{
	return ((b.z-a.z)*(p.x-a.x)-(b.x-a.x)*(p.z-a.z) > 0);
}

static function IsZeroOnLeft (a:Vector3, b:Vector3) : boolean //is center of coords is left from a-b line. In 2D xy plane
{
	return ((b.x-a.x)*(a.y)-(b.y-a.y)*(a.x) > 0);
}

static function GetBaryCoords (p1:Vector2, p2:Vector2, p3:Vector2, from:Vector2) : Vector3
{
	var bc:Vector3 = Vector3(
		((p2.y-p3.y)*(from.x-p3.x) + (p3.x-p2.x)*(from.y-p3.y)) / ((p2.y-p3.y)*(p1.x-p3.x) + (p3.x-p2.x)*(p1.y-p3.y)),
		((p3.y-p1.y)*(from.x-p3.x) + (p1.x-p3.x)*(from.y-p3.y)) / ((p2.y-p3.y)*(p1.x-p3.x) + (p3.x-p2.x)*(p1.y-p3.y)),
		0);
	bc.z = 1-bc.x-bc.y;
	return bc;
}



//testing
function OnDrawGizmos ()
{
	Gizmos.DrawLine (lineStartTfm.position, lineEndTfm.position);
	

	var r:Ray = new Ray(lineStartTfm.position, lineStartTfm.position - lineEndTfm.position);
	
	var m:Matrix4x4 = GetVectorMatrix(r.direction.normalized);

	var z0:Vector3 = m.MultiplyPoint3x4(posTfm0.position-r.origin);
	var z1:Vector3 = m.MultiplyPoint3x4(posTfm1.position-r.origin);
	var z2:Vector3 = m.MultiplyPoint3x4(posTfm2.position-r.origin);
	var z3:Vector3 = m.MultiplyPoint3x4(posTfm3.position-r.origin);
	
	Gizmos.color = Color.red;
	
	if (IsZeroOnLeft(z0, z1) &&
		IsZeroOnLeft(z1, z2) &&
		IsZeroOnLeft(z2, z3) &&
		IsZeroOnLeft(z3, z0) )
			Gizmos.color = Color.green;
	/*
	if (IsOnLeftXZ(posTfm0.position, posTfm1.position, lineStartTfm.position) &&
		IsOnLeftXZ(posTfm1.position, posTfm2.position, lineStartTfm.position) &&
		IsOnLeftXZ(posTfm2.position, posTfm3.position, lineStartTfm.position) &&
		IsOnLeftXZ(posTfm3.position, posTfm0.position, lineStartTfm.position) )
			Gizmos.color = Color.green;
	*/
	Gizmos.DrawLine (posTfm0.position, posTfm1.position);
	Gizmos.DrawLine (posTfm1.position, posTfm2.position);
	Gizmos.DrawLine (posTfm2.position, posTfm3.position);
	Gizmos.DrawLine (posTfm3.position, posTfm0.position);
	Gizmos.DrawLine (posTfm0.position, posTfm2.position);

	Gizmos.color = Color.gray;
	Gizmos.DrawLine (z0, z1);
	Gizmos.DrawLine (z1, z2);
	Gizmos.DrawLine (z2, z3);
	Gizmos.DrawLine (z3, z0);
	Gizmos.DrawLine (z0, z2);
	/*
	Debug.Log( GetBaryCoords(
		Vector2(posTfm0.position.x, posTfm0.position.z),
		Vector2(posTfm1.position.x, posTfm1.position.z),
		Vector2(posTfm2.position.x, posTfm2.position.z),
		Vector2(lineStartTfm.position.x, lineStartTfm.position.z)));
	*/
}