use serde::{Deserialize, Serialize};
use serde_json::Result;
use regex::Regex;
// use regex::RegexBuilder;

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

#[derive(Serialize)]
pub struct SearchResult {
    pub first_line: String,
    pub second_line: String,
    pub first_line_matches: bool,
    pub second_line_matches: bool,
    pub filename: String,
}

// pub fn search(path: &str, needle: String) -> Result<String> {
pub fn search(path: &str, filename: &str, simple_re: &Regex, line_search_re: &Regex) -> Result<SearchResult> {
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
    
    // let content = content.to_lowercase();
    
    
    
    let first_line: &str;
    let rest_of_content: &str;
    let first_line_matches: bool;
    let second_line_matches: bool;
    

    // Step 1. Get and search first line
    match content.find('\n') {
        Some(idx) => {
            first_line = &content[..idx];
            rest_of_content = &content[idx..];
            println!("TEST1 idx: {} first line: '{}'", idx, first_line);
            
        }
        None => {
            first_line = &content;
            rest_of_content = "";
            // return Ok(String::new());
        }
    }

    match simple_re.find(first_line) {
        Some(_m) => {
            println!("TEST2 match in first line");
            first_line_matches = true;
            // return Ok(String::from(first_line));
        }
        None => {
            first_line_matches = false;
        }
    }


    // Step 2. Search rest of file
    let mut second_line: String;
    
    match line_search_re.find(rest_of_content) {
        Some(m) => {
            // Ok(String::from(m.as_str()))
            second_line = String::from(m.as_str());
            second_line.pop(); // remove the last /n character
            second_line_matches = true;
        }
        None => {
            // Ok(String::new())
            second_line = String::new();
            second_line_matches = false;
        }
    }

    Ok(SearchResult {
        first_line: String::from(first_line),
        second_line: second_line,
        first_line_matches: first_line_matches,
        second_line_matches: second_line_matches,
        filename: String::from(filename)
    })
    // indexes will be m.start and m.end
}


/*
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
*/