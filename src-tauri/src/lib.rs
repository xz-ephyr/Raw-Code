mod db;

use db::{AppConfig, ChatSession, Database, Message, Project};
use std::path::PathBuf;
use tauri::Manager;

fn db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("xz.db"))
}

// --- Projects ---

#[tauri::command]
fn get_projects(db: tauri::State<'_, Database>) -> Result<Vec<Project>, String> {
    db.get_projects()
}

#[tauri::command]
fn create_project(
    db: tauri::State<'_, Database>,
    name: String,
    path: String,
    existing_id: Option<String>,
) -> Result<Project, String> {
    let id = existing_id.unwrap_or_else(|| uuid_v4());
    let created_at = chrono_now();
    db.create_project(&id, &name, &path, created_at)
}

#[tauri::command]
fn delete_project(db: tauri::State<'_, Database>, id: String) -> Result<(), String> {
    db.delete_project(&id)
}

// --- Sessions ---

#[tauri::command]
fn get_sessions(
    db: tauri::State<'_, Database>,
    project_id: Option<String>,
) -> Result<Vec<ChatSession>, String> {
    match project_id {
        Some(ref id) => db.get_sessions(Some(id)),
        None => db.get_sessions(None),
    }
}

#[tauri::command]
fn get_all_sessions(db: tauri::State<'_, Database>) -> Result<Vec<ChatSession>, String> {
    db.get_all_sessions()
}

#[tauri::command]
fn get_session(db: tauri::State<'_, Database>, id: String) -> Result<Option<ChatSession>, String> {
    db.get_session(&id)
}

#[tauri::command]
fn create_session(
    db: tauri::State<'_, Database>,
    title: String,
    last_message: Option<String>,
    project_id: Option<String>,
    existing_id: Option<String>,
) -> Result<ChatSession, String> {
    let id = existing_id.unwrap_or_else(|| uuid_v4());
    let created_at = chrono_now();
    db.create_session(
        &id,
        &title,
        last_message.as_deref(),
        project_id.as_deref(),
        created_at,
    )
}

#[tauri::command]
fn update_session(
    db: tauri::State<'_, Database>,
    id: String,
    title: Option<String>,
    last_message: Option<String>,
    archived: Option<bool>,
) -> Result<(), String> {
    db.update_session(&id, title.as_deref(), last_message.as_deref(), archived)
}

#[tauri::command]
fn delete_session(db: tauri::State<'_, Database>, id: String) -> Result<(), String> {
    db.delete_session(&id)
}

// --- Messages ---

#[tauri::command]
fn get_messages(
    db: tauri::State<'_, Database>,
    session_id: String,
) -> Result<Vec<Message>, String> {
    db.get_messages(&session_id)
}

#[tauri::command]
fn save_messages(
    db: tauri::State<'_, Database>,
    session_id: String,
    messages: Vec<Message>,
) -> Result<(), String> {
    db.save_messages(&session_id, messages)
}

// --- App Config ---

#[tauri::command]
fn get_app_config(
    db: tauri::State<'_, Database>,
    key: String,
) -> Result<Option<String>, String> {
    db.get_config(&key)
}

#[tauri::command]
fn set_app_config(
    db: tauri::State<'_, Database>,
    key: String,
    value: String,
) -> Result<(), String> {
    db.set_config(&key, &value)
}

fn uuid_v4() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let nanos = now.as_nanos();
    let rand_part: u64 = rand_ish();
    format!(
        "{:08x}-{:04x}-4{:03x}-{:04x}-{:012x}",
        (nanos >> 32) as u32,
        (nanos >> 16) as u16 as u16,
        (nanos & 0xfff) as u16,
        (rand_part >> 48) as u16 | 0x8000,
        rand_part & 0xffffffffffff,
    )
}

fn rand_ish() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos() as u64
        ^ 0xdeadbeefcafe
}

fn chrono_now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let path = db_path(&app.handle())?;
            let database = Database::new(&path).expect("Failed to initialize database");
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_projects,
            create_project,
            delete_project,
            get_sessions,
            get_all_sessions,
            get_session,
            create_session,
            update_session,
            delete_session,
            get_messages,
            save_messages,
            get_app_config,
            set_app_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
