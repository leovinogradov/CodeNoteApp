use regex::Regex;
use regex::RegexBuilder;
use serde::{Deserialize, Serialize};
use serde_json::Result;
// use regex::RegexBuilder;

use crate::note_handling::read_file;
// use read_notes::read_file;

#[derive(Serialize, Deserialize)]
struct Person {
    name: String,
    age: u8,
    phones: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct QuillDelta {
    insert: String,
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

pub fn search(
    path: &str,
    filename: &str,
    simple_re: &Regex,
    line_search_re: &Regex,
) -> Result<SearchResult> {
    let res = read_file(path);
    let json_content = res.unwrap();

    let d: QuillFile = serde_json::from_str(&json_content)?;
    let mut content = String::new();
    for op in d.ops.iter() {
        content += &op.insert;
    }

    // Future: test if String.find is noticably faster than regex find
    // Can return match + ~25 chars before and after match, and let JS side pretty it up

    let first_line: &str;
    let rest_of_content: &str;
    let first_line_matches: bool;
    let second_line_matches: bool;

    // Step 1. Get and search first line
    match content.find('\n') {
        Some(idx) => {
            first_line = &content[..idx];
            rest_of_content = &content[idx..];
        }
        None => {
            first_line = &content;
            rest_of_content = "";
        }
    }

    match simple_re.find(first_line) {
        Some(_m) => {
            first_line_matches = true;
        }
        None => {
            first_line_matches = false;
        }
    }

    // Step 2. Search rest of file
    let mut second_line: String;

    match line_search_re.find(rest_of_content) {
        Some(m) => {
            // Match for search string in rest of content
            // This match will be the second_line
            second_line = String::from(m.as_str());
            second_line.pop(); // remove the last /n character
            second_line_matches = true;
        }
        None => {
            // No match for search string in rest of content
            // Just get the first line of rest_of_content as the second_line
            // Note: this might be possible with a simple for loop?
            let search_for_second_line_re = RegexBuilder::new("[A-z -_]+\n")
                .build()
                .unwrap();
            match search_for_second_line_re.find(rest_of_content) {
                Some(m) => {
                    second_line = String::from(m.as_str());
                    second_line.pop(); // remove the last /n character
                    // second_line_matches = true;
                }
                None => {
                    second_line = (&rest_of_content).to_string();
                }
            }
            second_line_matches = false;
        }
    }

    Ok(SearchResult {
        first_line: String::from(first_line),
        second_line: second_line,
        first_line_matches: first_line_matches,
        second_line_matches: second_line_matches,
        filename: String::from(filename),
    })
    // indexes will be m.start and m.end
}
