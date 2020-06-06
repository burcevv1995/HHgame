using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class skPlayer : MonoBehaviour
{
    public float MaxSpeed = 10f;
    public float move;
    public float jumpForce = 500f;
    bool facingRight = true;

    public Transform groundCheck;
    public Transform groundCheck2;
    public float groundRadius = 0.2f;
    public LayerMask whatIsGround;
    public bool grounded;
    public bool grounded2;


    // Start is called before the first frame update
    void Start()
    {
        
    }

    void FixedUpdate() {

        move = Input.GetAxis("Horizontal");
        grounded = Physics2D.OverlapCircle(groundCheck.position, groundRadius, whatIsGround);
        grounded2 = Physics2D.OverlapCircle(groundCheck2.position, groundRadius, whatIsGround);
    }

    // Update is called once per frame
    void Update()
    {
        GetComponent<Rigidbody2D>().velocity = new Vector2(move * MaxSpeed, GetComponent<Rigidbody2D>().velocity.y);

        if (facingRight && move < 0) {
            flip();
        }
        else if (move > 0 && !facingRight)
            flip();

        if (Input.GetKeyDown(KeyCode.UpArrow) && (grounded || grounded2))
        {
            GetComponent<Rigidbody2D>().AddForce(new Vector2(0f, jumpForce));
            GetComponent<Rigidbody2D>().velocity = new Vector2(0, 0);
        }
        /*if (Input.GetKeyDown(KeyCode.R))
            Application.LoadLevel(Application.LoadLevel);*/


    }

    void flip() {

        facingRight = !facingRight;
        Vector3 theScale = transform.localScale;
        theScale.x *= -1;
        transform.localScale = theScale;

    }

    void OnCollisionEnter2D(Collision2D collision) {

        if (collision.gameObject.tag == "Loot")
            Destroy(collision.gameObject);

    }
}
