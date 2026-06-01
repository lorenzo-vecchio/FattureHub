use keyring::Entry;

const SERVICE_NAME: &str = "fatturehub";

#[tauri::command]
pub async fn store_master_key(user_id: String, key_b64: String) -> Result<(), String> {
    let label = format!("master_key_{}", user_id);
    let entry = Entry::new(SERVICE_NAME, &label).map_err(|e| e.to_string())?;
    entry.set_password(&key_b64).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_master_key(user_id: String) -> Result<Option<String>, String> {
    let label = format!("master_key_{}", user_id);
    let entry = Entry::new(SERVICE_NAME, &label).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn delete_master_key(user_id: String) -> Result<(), String> {
    let label = format!("master_key_{}", user_id);
    let entry = Entry::new(SERVICE_NAME, &label).map_err(|e| e.to_string())?;
    entry.delete_credential().map_err(|e| e.to_string())
}
