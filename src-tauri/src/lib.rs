#[tauri::command]
fn force_exit() {
  std::process::exit(0);
}

#[tauri::command]
async fn http_post(
  url: String,
  headers: std::collections::HashMap<String, String>,
  body: String,
) -> Result<serde_json::Value, String> {
  let client = reqwest::Client::new();
  let mut req = client.post(&url);
  for (k, v) in &headers {
    req = req.header(k.as_str(), v.as_str());
  }
  let resp = req.body(body).send().await.map_err(|e| e.to_string())?;
  let status = resp.status().as_u16();
  let ct = resp
    .headers()
    .get("content-type")
    .and_then(|v| v.to_str().ok())
    .unwrap_or("application/json")
    .to_string();
  let text = resp.text().await.map_err(|e| e.to_string())?;
  Ok(serde_json::json!({ "status": status, "contentType": ct, "body": text }))
}

#[tauri::command]
fn set_document_edited(webview_window: tauri::WebviewWindow, edited: bool) {
  #[cfg(target_os = "macos")]
  {
    if let Ok(ptr) = webview_window.ns_window() {
      unsafe {
        let ns_window = &*(ptr as *mut objc2_app_kit::NSWindow);
        ns_window.setDocumentEdited(edited);
      }
    }
  }
  #[cfg(not(target_os = "macos"))]
  let _ = (webview_window, edited);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![force_exit, set_document_edited, http_post])
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_process::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
