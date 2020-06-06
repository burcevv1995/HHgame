#pragma strict

var fpsText : GUIText;
var measureTime : float = 0.5;

private var framesPassed : int;
private var timePassed : float;

function Update () 
{
	framesPassed++;
	timePassed += Time.deltaTime;
	
	if (timePassed>=measureTime) 
	{
		fpsText.text = (Mathf.RoundToInt(framesPassed/timePassed)).ToString();
		framesPassed = 0;
		timePassed = 0;
	}
}