// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use regex::RegexBuilder;
use std::ffi::OsStr;
// use std::fs;
// use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::Manager; // makes .setup(|app|) work

mod read_notes;
use read_notes::FileSummaryResponse;

mod search;
use search::SearchResult;

mod open_in_filesystem;

#[derive(serde::Serialize)]
struct NotesResponse {
    data: Vec<FileSummaryResponse>,
}

#[derive(serde::Serialize)]
struct SearchResponse {
    data: Vec<SearchResult>,
}

#[tauri::command]
async fn read_notes_dir(window: tauri::Window) -> Result<NotesResponse, String> {
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
    read_notes::read_notes_in_dir(&mut vec, &path, 10);
    // vec.push(FileSummaryResponse {
    //     content:  String::from(""),
    //     filename: String::from(""),
    //     modified: 0,
    // });
    Ok(NotesResponse { data: vec })
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

    let needle = search_string.to_lowercase();
    let simple_search_re = RegexBuilder::new(needle.as_str())
        .case_insensitive(true)
        .build()
        .unwrap();
    // If needed, use "{{...}}" to escape "{...}" in format!
    let search_for_line_regex_string = format!(r".*{}.*\n?", needle);
    let search_for_line_re = RegexBuilder::new(search_for_line_regex_string.as_str())
        .case_insensitive(true)
        .build()
        .unwrap();

    // let filepaths_in_dir = fs::read_dir(dir_path).unwrap();
    // for path in filepaths_in_dir {

    let fileinfovec = read_notes::get_note_files_sorted(&dir_path);
    for fileinfo in fileinfovec {
        // let path_buf: PathBuf = path.unwrap().path();
        let full_path_as_str: &str = fileinfo.path_buf.to_str().unwrap();
        if full_path_as_str.ends_with(".json") {
            // let modified_time = file_modified_time_in_seconds(path_str);
            // let content: String = read_file(path_str);
            // let res = search::search(full_path_as_str, search_string.clone());
            let filename: &OsStr = fileinfo.path_buf.file_name().unwrap();
            let filename: &str = filename.to_str().unwrap();

            let res = search::search(
                full_path_as_str,
                filename,
                &simple_search_re,
                &search_for_line_re,
            );
            let res = res.unwrap();

            // println!(
            //     "FILENAME {} RES first: {} second: {}",
            //     res.filename, res.first_line_matches, res.second_line_matches
            // );

            if res.first_line_matches || res.second_line_matches {
                result_list.push(res);
            }
        }
    }

    // let full_path = dir_path + "/" + filepath;
    // let full_path = format!("{}/{}", dir_path, filename);
    // let full_path = full_path.as_str();

    Ok(SearchResponse { data: result_list })
}

// Menu testing that didn't work
// use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
// app.on_menu_event(move |app, event| {
//     println!("event triggered!");
// });

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            // let submenu = SubmenuBuilder::new(app, "Submenu")
            //     .text("test1", "Test1")
            //     .build()?;
            // let menu = MenuBuilder::new(app).item(&submenu).build()?;
            // let menu = Menu::default(app.app_handle())?;
            // app.set_menu(menu)?;
            // app.app_handle().set_menu(menu)?;
            // let window = app.get_webview_window("main").unwrap();
            // window.set_menu(menu)?;
            Ok(())
        })
        // .menu(menu)
        .invoke_handler(tauri::generate_handler![
            read_notes_dir,
            search_handler,
            open_in_filesystem::show_item_in_filesystem
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
