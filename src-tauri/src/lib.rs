use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;
use serde_json::{json, Value};

fn find_python_script() -> Option<PathBuf> {
    // 1. Current working directory
    let direct = Path::new("backPro.py");
    if direct.exists() {
        return Some(direct.to_path_buf());
    }

    // 2. Parent directory (e.g. running from src-tauri during dev)
    let parent = Path::new("../backPro.py");
    if parent.exists() {
        return Some(parent.to_path_buf());
    }

    // 3. Executable directory
    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let next_to_exe = exe_dir.join("backPro.py");
            if next_to_exe.exists() {
                return Some(next_to_exe);
            }
            let resource_dir = exe_dir.join("../Resources/backPro.py");
            if resource_dir.exists() {
                return Some(resource_dir);
            }
        }
    }

    None
}

fn run_python_backend(args: &[&str]) -> Value {
    let script_path = match find_python_script() {
        Some(p) => p,
        None => {
            return json!({
                "status": "error",
                "message": "backPro.py backend script could not be located on disk."
            });
        }
    };

    let python_cmds: &[&str] = if cfg!(target_os = "windows") {
        &["python", "py", "python3"]
    } else {
        &["python3", "python"]
    };

    let mut last_error = String::new();

    for cmd in python_cmds {
        let mut command = Command::new(cmd);
        command.arg(&script_path);
        for arg in args {
            command.arg(arg);
        }

        match command.output() {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

                if output.status.success() {
                    if let Ok(parsed) = serde_json::from_str::<Value>(&stdout) {
                        return parsed;
                    }
                    return json!({
                        "status": "success",
                        "raw": stdout
                    });
                } else {
                    last_error = if !stderr.is_empty() {
                        stderr
                    } else {
                        format!("Process exited with status code: {:?}", output.status.code())
                    };
                }
            }
            Err(e) => {
                last_error = e.to_string();
            }
        }
    }

    json!({
        "status": "error",
        "message": format!("Could not find a working Python installation to run backPro.py. Details: {}", last_error)
    })
}

#[tauri::command]
fn backend_init() -> Value {
    run_python_backend(&["--action", "init"])
}

#[tauri::command]
fn backend_load() -> Value {
    run_python_backend(&["--action", "load"])
}

#[tauri::command]
fn backend_add_update(record: Value) -> Value {
    let van_type = record.get("van_type").and_then(|v| v.as_str()).unwrap_or("Big van");
    let guide = record.get("guide").and_then(|v| v.as_str()).unwrap_or("");
    let driver = record.get("driver").and_then(|v| v.as_str()).unwrap_or("");
    let pax = record.get("pax").and_then(|v| v.as_str()).unwrap_or("?");
    let quads = record.get("quads").and_then(|v| v.as_str()).unwrap_or("?");
    let camels = record.get("camels").and_then(|v| v.as_str()).unwrap_or("?");
    let date = record.get("date").and_then(|v| v.as_str()).unwrap_or("");
    let time = record.get("time").and_then(|v| v.as_str()).unwrap_or("");

    let mut args: Vec<&str> = vec![
        "--action", "add_or_update",
        "--van_type", van_type,
        "--guide", guide,
        "--driver", driver,
        "--pax", pax,
        "--quads", quads,
        "--camels", camels,
        "--date", date,
        "--time", time,
    ];

    let id_str;
    if let Some(id_val) = record.get("id") {
        if let Some(id_num) = id_val.as_i64() {
            id_str = id_num.to_string();
            args.push("--id");
            args.push(&id_str);
        } else if let Some(id_s) = id_val.as_str() {
            args.push("--id");
            args.push(id_s);
        }
    }

    run_python_backend(&args)
}

#[tauri::command]
fn backend_delete(id: Value) -> Value {
    let id_str = if let Some(id_num) = id.as_i64() {
        id_num.to_string()
    } else if let Some(id_s) = id.as_str() {
        id_s.to_string()
    } else {
        id.to_string()
    };

    run_python_backend(&["--action", "delete", "--id", &id_str])
}

#[tauri::command]
fn backend_sync() -> Value {
    run_python_backend(&["--action", "sync"])
}

#[tauri::command]
fn backend_check_today() -> Value {
    run_python_backend(&["--action", "check_today"])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            backend_init,
            backend_load,
            backend_add_update,
            backend_delete,
            backend_sync,
            backend_check_today,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
