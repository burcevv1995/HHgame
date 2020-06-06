#pragma strict

@script ExecuteInEditMode()

function OnEnable ()
{
	var filter : MeshFilter = GetComponent(MeshFilter);
	if (!filter || !filter.sharedMesh) return;
	filter.sharedMesh.bounds = new Bounds(Vector3.zero, Vector3(1000,1000,1000));
}

function OnDisable ()
{
	var filter : MeshFilter = GetComponent(MeshFilter);
	if (!filter || !filter.sharedMesh) return;
	filter.sharedMesh.RecalculateBounds();
}