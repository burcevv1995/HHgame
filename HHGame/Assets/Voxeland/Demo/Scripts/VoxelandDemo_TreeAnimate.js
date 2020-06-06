#pragma strict

var leafsMat : Material;
var leafsFilter : MeshFilter;
var animSpeed : float;
var animStrength : float;
var animState : float;


function Awake ()
{
	var cols = leafsFilter.sharedMesh.colors;
	for (var i=0;i<cols.length;i++) cols[i] = new Color(Random.value,Random.value,Random.value,0.5);
	leafsFilter.sharedMesh.colors = cols;
}


function Update () 
{
	animState += Time.deltaTime * animSpeed;
	animState = Mathf.Repeat(animState, 6.283185307179586476925286766559);
	leafsMat.SetFloat("_AnimState", animState);
}