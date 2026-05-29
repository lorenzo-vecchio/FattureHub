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

#[tauri::command]
pub fn encrypt_data(password: &str, data: &str) -> Result<String, String> {
    let salt = b"fatturehub-encryption-v1";

    let key = derive_key(password, salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("cipher init: {}", e))?;

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, data.as_bytes())
        .map_err(|e| format!("encrypt failed: {}", e))?;

    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(BASE64.encode(&result))
}

#[tauri::command]
pub fn decrypt_data(password: &str, encrypted_b64: &str) -> Result<String, String> {
    let salt = b"fatturehub-encryption-v1";

    let data = BASE64
        .decode(encrypted_b64)
        .map_err(|e| format!("base64 decode: {}", e))?;

    if data.len() < 12 {
        return Err("invalid encrypted data".to_string());
    }

    let (nonce_bytes, ciphertext) = data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let key = derive_key(password, salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("cipher init: {}", e))?;

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("decrypt failed: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("utf8 decode: {}", e))
}
