use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;

fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| format!("key derivation failed: {}", e))?;
    Ok(key)
}

fn aes_encrypt(key: &[u8; 32], data: &[u8]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| format!("cipher init: {}", e))?;
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, data)
        .map_err(|e| format!("encrypt failed: {}", e))?;
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

fn aes_decrypt(key: &[u8; 32], data: &[u8]) -> Result<Vec<u8>, String> {
    if data.len() < 12 {
        return Err("invalid encrypted data".to_string());
    }
    let (nonce_bytes, ciphertext) = data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| format!("cipher init: {}", e))?;
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("decrypt failed: {}", e))
}

const SALT: &[u8] = b"fatturehub-encryption-v1";

#[tauri::command]
pub async fn generate_master_key() -> String {
    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    BASE64.encode(&key)
}

#[tauri::command]
pub async fn wrap_master_key(password: &str, master_key_b64: &str) -> Result<String, String> {
    let mk = BASE64
        .decode(master_key_b64)
        .map_err(|e| format!("base64 decode: {}", e))?;
    let key = derive_key(password, SALT)?;
    let encrypted = aes_encrypt(&key, &mk)?;
    Ok(BASE64.encode(&encrypted))
}

#[tauri::command]
pub async fn unwrap_master_key(password: &str, encrypted_b64: &str) -> Result<String, String> {
    let data = BASE64
        .decode(encrypted_b64)
        .map_err(|e| format!("base64 decode: {}", e))?;
    let key = derive_key(password, SALT)?;
    let plain = aes_decrypt(&key, &data)?;
    Ok(BASE64.encode(&plain))
}

#[tauri::command]
pub async fn encrypt_with_key(key_b64: &str, data: &str) -> Result<String, String> {
    let key_bytes = BASE64
        .decode(key_b64)
        .map_err(|e| format!("base64 decode: {}", e))?;
    if key_bytes.len() != 32 {
        return Err("invalid key length".to_string());
    }
    let mut key = [0u8; 32];
    key.copy_from_slice(&key_bytes);
    let encrypted = aes_encrypt(&key, data.as_bytes())?;
    Ok(BASE64.encode(&encrypted))
}

#[tauri::command]
pub async fn decrypt_with_key(key_b64: &str, encrypted_b64: &str) -> Result<String, String> {
    let data = BASE64
        .decode(encrypted_b64)
        .map_err(|e| format!("base64 decode: {}", e))?;
    let key_bytes = BASE64
        .decode(key_b64)
        .map_err(|e| format!("base64 decode: {}", e))?;
    if key_bytes.len() != 32 {
        return Err("invalid key length".to_string());
    }
    let mut key = [0u8; 32];
    key.copy_from_slice(&key_bytes);
    let plain = aes_decrypt(&key, &data)?;
    String::from_utf8(plain).map_err(|e| format!("utf8 decode: {}", e))
}
