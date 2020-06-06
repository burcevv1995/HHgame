#pragma strict

var land : Voxeland;
var text : GUIText;

function Update ()
{
	if (!land) land = GameObject.FindObjectOfType(Voxeland);
	if (!text) text = GetComponent(GUIText);


	//switching block
	var selected : int = -1;
	
	if (Input.GetKey("1")) selected = 1;
	if (Input.GetKey("2")) selected = 2;
	if (Input.GetKey("3")) selected = 3;
	if (Input.GetKey("4")) selected = 4;
	if (Input.GetKey("5")) selected = 5;
	if (Input.GetKey("6")) selected = 6;
	if (Input.GetKey("7")) selected = 7;
	if (Input.GetKey("8")) selected = 8;
	if (Input.GetKey("9")) selected = 9;
	if (Input.GetKey("0")) selected = 0;
	
	if (selected > 0 && selected < land.types.length)
	{
		land.selected = selected;
		text.text = "Selected: " + land.types[land.selected].name;
	}
}