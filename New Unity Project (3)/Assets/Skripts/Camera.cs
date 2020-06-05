using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class Camera : MonoBehaviour
{
	public float dampTime = 0.15f;
	private Vector3 velocity = Vector3.zero;
	public Transform traget;
    // Start is called before the first frame update
    void Start()
    {
        
    }

    // Update is called once per frame
    void Update()
    {
        	Vector3 point = GetComponent<UnityEngine.Camera>().WorldToViewportPoint(new Vector3(traget.position.x,traget.position.y+0.75f,traget.position.z));
        	Vector3 delta = new Vector3(traget.position.x,traget.position.y+0.75f,traget.position.z) - GetComponent<UnityEngine.Camera>().ViewportToWorldPoint(new Vector3(0.5f, 0.5f,point.z)); //(new Vector3(0.5, 0.5, point.z));
        	Vector3 destination = transform.position + delta;

        	transform.position = Vector3.SmoothDamp(transform.position, destination, ref velocity,dampTime);
    }
}
