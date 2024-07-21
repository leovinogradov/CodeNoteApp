// Adapted from discussion in https://github.com/tauri-apps/plugins-workspace/issues/999

use std::process::Command;
use tauri::Manager;
// State is used by linux
use tauri::path::BaseDirectory;

#[cfg(not(target_os = "windows"))]
use std::path::PathBuf;

#[cfg(target_os = "linux")]
use tauri::State;
#[cfg(target_os = "linux")]
use crate::DbusState;
#[cfg(target_os = "linux")]
use std::time::Duration;

#[cfg(target_os = "linux")]
#[tauri::command]
pub fn show_item_in_filesystem(
    window: tauri::Window,
    dbus_state: State<DbusState>,
) -> Result<(), String> {
    let app = window.app_handle();
    let dir_path = app.path().resolve("notes", BaseDirectory::AppData).unwrap();
    let path = dir_path.into_os_string().into_string().unwrap();
    println!("Opening {} in filesystem", path);

    let dbus_guard = dbus_state.0.lock().map_err(|e| e.to_string())?;

    // see https://gitlab.freedesktop.org/dbus/dbus/-/issues/76
    if dbus_guard.is_none() || path.contains(",") {
        let mut path_buf = PathBuf::from(&path);
        let new_path = match path_buf.is_dir() {
            true => path,
            false => {
                path_buf.pop();
                path_buf.into_os_string().into_string().unwrap()
            }
        };
        Command::new("xdg-open")
            .arg(&new_path)
            .spawn()
            .map_err(|e| format!("{e:?}"))?;
    } else {
        // https://docs.rs/dbus/latest/dbus/
        let dbus = dbus_guard.as_ref().unwrap();
        let proxy = dbus.with_proxy(
            "org.freedesktop.FileManager1",
            "/org/freedesktop/FileManager1",
            Duration::from_secs(5),
        );
        let (_,): (bool,) = proxy
            .method_call(
                "org.freedesktop.FileManager1",
                "ShowItems",
                (vec![format!("file://{}", path)], ""),
            )
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(not(target_os = "linux"))]
#[tauri::command]
pub fn show_item_in_filesystem(window: tauri::Window) -> Result<(), String> {
    // Future: open specific note in filesystem
    let app = window.app_handle();
    let dir_path = app.path().resolve("notes", BaseDirectory::AppData).unwrap();
    let path = dir_path.into_os_string().into_string().unwrap();
    println!("Opening {} in filesystem", path);

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &path]) // The comma after select is not a typo
            // .args(["start", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        let path_buf = PathBuf::from(&path);
        if path_buf.is_dir() {
            Command::new("open")
                .args([&path])
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            Command::new("open")
                .args(["-R", &path])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
