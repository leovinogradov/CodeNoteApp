use std::ffi::OsStr;
use std::fs;
use std::fs::File;
use std::io::{self, BufRead};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

fn file_modified_time_in_seconds(path: &str) -> u64 {
    let dur: std::time::Duration = fs::metadata(path)
        .unwrap()
        .modified()
        .unwrap()
        .duration_since(UNIX_EPOCH)
        .unwrap();
    return (dur.as_secs() * 1000) + u64::from(dur.subsec_millis());
}

// fn read_first_n_lines(filepath: &str, num: u32) -> Result<String, Box<dyn std::error::Error>> {
//     let mut ret = String::from("");
//     if let Ok(lines) = read_lines(filepath) {
//         // Consumes the iterator, returns an (Optional) String
//         let mut count = 0;
//         for line_result in lines {
//             if let Ok(line) = line_result {
//                 ret.push_str(&line);
//                 ret.push('\n');
//                 count += 1;
//                 if count >= num {
//                     break;
//                 }
//             }
//         }
//     }
//     return Ok(ret);
// }

pub fn read_file(filepath: &str) -> Result<String, Box<dyn std::error::Error>> {
    let mut ret = String::from("");

    if let Ok(lines) = read_lines(filepath) {
        // Consumes the iterator, returns an (Optional) String
        for line_result in lines {
            if let Ok(line) = line_result {
                ret.push_str(&line);
                ret.push('\n');
            }
        }
    }

    return Ok(ret);
}

// The output is wrapped in a Result to allow matching on errors
// Returns an Iterator to the Reader of the lines of the file.
fn read_lines<P>(filename: P) -> io::Result<io::Lines<io::BufReader<File>>>
where
    P: AsRef<Path>,
{
    let file = File::open(filename)?;
    Ok(io::BufReader::new(file).lines())
}

pub struct FileInfo {
    pub path_buf: PathBuf,
    pub modified: u64,
}

pub fn get_note_files_sorted(dir_path: &str) -> Vec<FileInfo> {
    let filepaths_in_dir = fs::read_dir(dir_path).unwrap();
    let mut fileinfovec: Vec<FileInfo> = Vec::new();
    for path in filepaths_in_dir {
        let path_buf: PathBuf = path.unwrap().path();
        let path_str: &str = path_buf.to_str().unwrap();
        if path_str.ends_with(".json") {
            let modified_time = file_modified_time_in_seconds(path_str);
            fileinfovec.push(FileInfo {
                path_buf: path_buf,
                modified: modified_time,
            })
        }
    }
    fileinfovec.sort_by(|a: &FileInfo, b: &FileInfo| b.modified.cmp(&a.modified));
    return fileinfovec;
}

#[derive(serde::Serialize)]
pub struct FileSummaryResponse {
    content: String,
    filename: String,
    modified: u64,
}

pub fn read_notes_in_dir(vec: &mut Vec<FileSummaryResponse>, dir_path: &str, read_limit: usize) {
    let fileinfovec = get_note_files_sorted(&dir_path);

    for fileinfo in fileinfovec {
        let filename: &OsStr = fileinfo.path_buf.file_name().unwrap();
        let filename: &str = filename.to_str().unwrap();

        let content: String;
        if vec.len() <= read_limit {
            // populate the content of the first x notes
            let path_str: &str = fileinfo.path_buf.to_str().unwrap();
            let res = read_file(path_str);
            content = res.unwrap();
        } else {
            content = String::new();
        }
        vec.push(FileSummaryResponse {
            content: content,
            filename: String::from(filename),
            modified: fileinfo.modified,
        })
    }
}
