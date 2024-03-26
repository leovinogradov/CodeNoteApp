// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;  // makes .setup(|app|) work
use tauri::path::BaseDirectory;
use std::fs;
use std::ffi::OsStr;
use std::path::PathBuf;

mod read_notes;
use read_notes::FileSummaryResponse;

mod search;

#[derive(serde::Serialize)]
struct NotesResponse {
    data: Vec<FileSummaryResponse>,
}

#[derive(serde::Serialize)]
struct SearchResult {
    filename: String,
    first_line_found: String
}

#[derive(serde::Serialize)]
struct SearchResponse {
    data: Vec<SearchResult>,
}

#[tauri::command]
async fn read_notes_dir(
    window: tauri::Window,
) -> Result<NotesResponse, String> {
    let app = window.app_handle();
    let path = app.path().resolve("notes", BaseDirectory::AppData).unwrap();
    let path = path.to_str().unwrap();
    println!("Reading notes; path is {}", path);

    // let result: Option<String> = some_other_function().await;
    // if let Some(message) = result { ...
    // } else {
    //     Err("No result".into())
    // }

    // search::typed_example();

    let mut vec: Vec<FileSummaryResponse> = Vec::new();
    read_notes::read_notes_in_dir(&mut vec, &path);
    // vec.push(FileSummaryResponse {
    //     content:  String::from(""),
    //     filename: String::from(""),
    //     modified: 0,
    // });
    Ok(NotesResponse {
        data: vec,
    })
}

#[tauri::command]
async fn search_handler(
    window: tauri::Window,
    search_string: String,
) -> Result<SearchResponse, String> {
    let app = window.app_handle();
    let dir_path = app.path().resolve("notes", BaseDirectory::AppData).unwrap();
    let dir_path = dir_path.to_str().unwrap();

    let mut result_list: Vec<SearchResult> = Vec::new();

    let filepaths_in_dir = fs::read_dir(dir_path).unwrap();
    for path in filepaths_in_dir {
        let path_buf: PathBuf = path.unwrap().path();
        let full_path_as_str: &str = path_buf.to_str().unwrap();
        if full_path_as_str.ends_with(".json") {
            // let modified_time = file_modified_time_in_seconds(path_str);
            // let content: String = read_file(path_str);
            let res = search::search(full_path_as_str, search_string.clone());
            let res = res.unwrap();

            let filename: &OsStr = path_buf.file_name().unwrap();
            let filename: &str = filename.to_str().unwrap();

            println!("FILENAME {} RES {}", filename, res);

            result_list.push(SearchResult {
                filename: String::from(filename),
                first_line_found: res,
            })
        }
    }

    // let full_path = dir_path + "/" + filepath;
    // let full_path = format!("{}/{}", dir_path, filename);
    // let full_path = full_path.as_str();
    
    
    
    Ok(SearchResponse {
        data: result_list,
    })
}


fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_notes_dir, search_handler])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
