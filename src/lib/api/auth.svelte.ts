import { api } from './client';

let _invoke: any = null;
try {
  const tauriCore = await import('@tauri-apps/api/core');
  _invoke = tauriCore.invoke;
} catch {}

let loggedIn = $state(api.isLoggedIn());

function getSessionKey(): string | null {
  try { return sessionStorage.getItem('fatturehub_master_key'); } catch { return null; }
}
function setSessionKey(key: string | null) {
  try {
    if (key) sessionStorage.setItem('fatturehub_master_key', key);
    else sessionStorage.removeItem('fatturehub_master_key');
  } catch {}
}
function getSessionPassword(): string | null {
  try { return sessionStorage.getItem('fatturehub_session_password'); } catch { return null; }
}
function setSessionPassword(pw: string | null) {
  try {
    if (pw) sessionStorage.setItem('fatturehub_session_password', pw);
    else sessionStorage.removeItem('fatturehub_session_password');
  } catch {}
}

let _masterKey = $state<string | null>(loggedIn ? getSessionKey() : null);

export function isLoggedIn() {
  return loggedIn;
}

export function getMasterKey(): string | null {
  return _masterKey;
}

export async function login(email: string, password: string) {
  const data = await api.login(email, password);
  setSessionPassword(password);

  const encKey = data.user?.encrypted_master_key;
  if (encKey && _invoke) {
    try {
      _masterKey = await _invoke('unwrap_master_key', { password, encryptedB64: encKey });
    } catch {
      throw new Error('Password errata o chiave di cifratura non valida.');
    }
  } else if (_invoke) {
    _masterKey = await _invoke('generate_master_key');
    const wrapped = await _invoke('wrap_master_key', { password, masterKeyB64: _masterKey });
    await api.updateEncryptedKey(wrapped);
  } else {
    _masterKey = null;
  }

  if (_masterKey) setSessionKey(_masterKey);
  loggedIn = true;
  return data;
}

export async function tryRestoreMasterKey(): Promise<boolean> {
  const pw = getSessionPassword();
  if (!pw || !_invoke) return false;
  try {
    const me = await api.getMe();
    if (!me.encrypted_master_key) return false;
    _masterKey = await _invoke('unwrap_master_key', { password: pw, encryptedB64: me.encrypted_master_key });
    if (_masterKey) setSessionKey(_masterKey);
    return !!_masterKey;
  } catch {
    return false;
  }
}

export async function reloadMasterKey(password: string): Promise<boolean> {
  if (!_invoke) return false;
  try {
    const me = await api.getMe();
    if (!me.encrypted_master_key) return false;
    _masterKey = await _invoke('unwrap_master_key', { password, encryptedB64: me.encrypted_master_key });
    if (_masterKey) {
      setSessionKey(_masterKey);
      setSessionPassword(password);
    }
    return !!_masterKey;
  } catch {
    _masterKey = null;
    return false;
  }
}

export async function changePassword(oldPassword: string, newPassword: string) {
  if (!_masterKey || !_invoke) throw new Error('Nessuna chiave di cifratura');
  const wrapped = await _invoke('wrap_master_key', { password: newPassword, masterKeyB64: _masterKey });
  await api.changePassword(oldPassword, newPassword, wrapped);
  setSessionPassword(newPassword);
}

export async function logout() {
  await api.logout();
  loggedIn = false;
  _masterKey = null;
  setSessionKey(null);
  setSessionPassword(null);
}

export function getApi() {
  return api;
}
