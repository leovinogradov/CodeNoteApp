use serde::{Deserialize, Serialize};
use serde_json::Result;

#[derive(Serialize, Deserialize)]
struct Person {
    name: String,
    age: u8,
    phones: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct QuillDelta {
    insert: String
}

#[derive(Serialize, Deserialize)]
struct QuillFile {
    ops: Vec<QuillDelta>,
}

pub fn typed_example() -> Result<()> {
    // Some JSON input data as a &str. Maybe this comes from the user.
    // let data = r#"
    //     {
    //         "name": "John Doe",
    //         "age": 43,
    //         "phones": [
    //             "+44 1234567",
    //             "+44 2345678"
    //         ]
    //     }"#;

    let data = r#"
    {
        "ops": [
            {
                "insert": "sometexthere"
            },
            {
                "attributes": {
                    "code-block": true
                },
                "insert": "insert2\n"
            },
            {
                "insert": "  pass"
            },
            {
                "attributes": {
                    "code-block": true
                },
                "insert": "\n"
            }
        ]
    }"#;

    // Parse the string of data into a Person object. This is exactly the
    // same function as the one that produced serde_json::Value above, but
    // now we are asking it for a Person as output.
    // let p: Person = serde_json::from_str(data)?;
    let p: QuillFile = serde_json::from_str(data)?;

    // Do things just like with any other Rust data structure.
    // println!("Please call {} at the number {}", p.name, p.phones[0]);
    println!("Json test {}", p.ops[1].insert);

    Ok(())
}