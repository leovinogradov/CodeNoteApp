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

#[cfg(target_os = "linux")]
use std::sync::Mutex;
#[cfg(target_os = "linux")]
pub struct DbusState(Mutex<Option<dbus::blocking::SyncConnection>>);

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

    let mut vec: Vec<FileSummaryResponse> = Vec::new();
    // Return all note filenames, most recent first
    // Read content of first 20 notes (the rest are lazy loaded when scrolled to)
    read_notes::read_notes_in_dir(&mut vec, &path, 20);

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

    let fileinfovec = read_notes::get_note_files_sorted(&dir_path);
    for fileinfo in fileinfovec {
        let full_path_as_str: &str = fileinfo.path_buf.to_str().unwrap();
        if full_path_as_str.ends_with(".json") {
            let filename: &OsStr = fileinfo.path_buf.file_name().unwrap();
            let filename: &str = filename.to_str().unwrap();
            // TODO: can optimize search for large amount of files
            let res = search::search(
                full_path_as_str,
                filename,
                &simple_search_re,
                &search_for_line_re,
            );
            let res = res.unwrap();

            if res.first_line_matches || res.second_line_matches {
                result_list.push(res);
            }
        }
    }

    Ok(SearchResponse { data: result_list })
}

// Menu testing that didn't work
// use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
// app.on_menu_event(move |app, event| {
//     println!("event triggered!");
// });

fn main() {
    #[allow(unused)]
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            #[cfg(target_os = "linux")]
            app.manage(DbusState(Mutex::new(dbus::blocking::SyncConnection::new_session().ok())));
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
