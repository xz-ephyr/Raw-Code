use portable_pty::{Child, MasterPty, NativePtySystem, PtyPair, PtySize, PtySystem};
use serde::Serialize;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Serialize, Clone)]
pub struct TerminalOutputPayload {
    pub data: String,
}

#[derive(Serialize, Clone)]
pub struct TerminalExitPayload {
    pub exit_code: i32,
}

pub struct TerminalSession {
    pub pty_pair: PtyPair,
    pub master: Arc<Mutex<MasterPty>>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub child: Arc<Mutex<Option<Box<dyn Child + Send>>>>,
    pub cols: u16,
    pub rows: u16,
}

pub struct TerminalManager {
    pub session: Arc<Mutex<Option<TerminalSession>>>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            session: Arc::new(Mutex::new(None)),
        }
    }

    pub fn is_running(&self) -> bool {
        self.session.lock().unwrap().is_some()
    }
}

#[tauri::command]
pub fn spawn_terminal(
    app: AppHandle,
    state: State<'_, TerminalManager>,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let pty_system = NativePtySystem::default();

    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let shell = if cfg!(target_os = "windows") {
        "cmd.exe"
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
    };

    let child = pair
        .slave
        .spawn_command(std::process::Command::new(shell))
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    let master = pair.master.clone();
    let mut reader = master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;
    let writer = master
        .try_clone_writer()
        .map_err(|e| format!("Failed to clone writer: {}", e))?;

    let session_arc = state.session.clone();

    let app_handle = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    let _ = app_handle.emit("terminal:exit", TerminalExitPayload { exit_code: 0 });
                    break;
                }
                Ok(n) => {
                    if let Ok(data) = String::from_utf8(buf[..n].to_vec()) {
                        let _ = app_handle.emit(
                            "terminal:output",
                            TerminalOutputPayload { data },
                        );
                    }
                }
                Err(_) => {
                    let _ = app_handle.emit("terminal:exit", TerminalExitPayload { exit_code: -1 });
                    break;
                }
            }
        }

        if let Ok(mut session) = session_arc.lock() {
            if let Some(s) = session.as_mut() {
                if let Some(mut child) = s.child.lock().unwrap().take() {
                    let _ = child.wait();
                }
            }
            *session = None;
        }
    });

    let mut session = state.session.lock().unwrap();
    *session = Some(TerminalSession {
        pty_pair: pair,
        master: Arc::new(Mutex::new(master)),
        writer: Arc::new(Mutex::new(writer)),
        child: Arc::new(Mutex::new(Some(child))),
        cols,
        rows,
    });

    Ok(())
}

#[tauri::command]
pub fn write_to_terminal(
    state: State<'_, TerminalManager>,
    input: String,
) -> Result<(), String> {
    let session = state.session.lock().unwrap();
    if let Some(ref s) = *session {
        let mut writer = s.writer.lock().unwrap();
        writer
            .write_all(input.as_bytes())
            .map_err(|e| format!("Failed to write to terminal: {}", e))?;
        writer
            .flush()
            .map_err(|e| format!("Failed to flush terminal: {}", e))?;
        Ok(())
    } else {
        Err("No active terminal session".to_string())
    }
}

#[tauri::command]
pub fn resize_terminal(
    state: State<'_, TerminalManager>,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let session = state.session.lock().unwrap();
    if let Some(ref s) = *session {
        let master = s.master.lock().unwrap();
        master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize terminal: {}", e))?;
        Ok(())
    } else {
        Err("No active terminal session".to_string())
    }
}

#[tauri::command]
pub fn kill_terminal(state: State<'_, TerminalManager>) -> Result<(), String> {
    let mut session = state.session.lock().unwrap();
    if let Some(s) = session.as_mut() {
        if let Some(mut child) = s.child.lock().unwrap().take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        *session = None;
        Ok(())
    } else {
        Err("No active terminal session".to_string())
    }
}
