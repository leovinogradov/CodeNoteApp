// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;  // makes .setup(|app|) work
use tauri::path::BaseDirectory;

mod read_notes;
use read_notes::FileSummaryResponse;

mod search;

#[derive(serde::Serialize)]
struct NotesResponse {
    data: Vec<FileSummaryResponse>,
}

#[derive(serde::Serialize)]
struct SearchResponse {
    data: String,
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
    
    Ok(SearchResponse {
        data: search_string,
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
