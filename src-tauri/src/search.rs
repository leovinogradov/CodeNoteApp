use serde::{Deserialize, Serialize};
use serde_json::Result;
use regex::Regex;

use crate::read_notes::read_file;
// use read_notes::read_file;

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

pub fn search(path: &str, needle: String) -> Result<String> {
    let res = read_file(path);
    let json_content = res.unwrap();

    let d: QuillFile = serde_json::from_str(&json_content)?;
    let mut content = String::new();
    for op in d.ops.iter() {
        content += &op.insert;
    }

    // TODO: return first line regardless of match

    // let filepaths_in_dir = fs::read_dir(dir_path).unwrap();
    // for path in filepaths_in_dir {
    // let path_buf: PathBuf = path.unwrap().path();
    // Goal: use regex to match line with searchString inside, go from there

    // let re = Regex::new(r"^.*\bMYWORD\b.*$").unwrap();
    // let re = Regex::new(r".*MYWORD.*\n?").unwrap();
    
    let content = content.to_lowercase();
    let needle = needle.to_lowercase();
    
    // If needed, use "{{...}}" to escape "{...}" in format!
    let formatted = format!(r".*{}.*\n?", needle);
    let re = Regex::new(formatted.as_str()).unwrap();
    // let content = "";
    // let m = re.find(&content)
    match re.find(&content) {
        Some(m) => {
            Ok(String::from(m.as_str()))
        }
        None => {
            Ok(String::new())
        }
    }
    // indexes will be m.start and m.end
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