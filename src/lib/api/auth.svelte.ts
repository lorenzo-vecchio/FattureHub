import { api } from './client';

let _invoke: any = null;
try {
  const tauriCore = await import('@tauri-apps/api/core');
  _invoke = tauriCore.invoke;
} catch {}

let loggedIn = $state(api.isLoggedIn());
let _masterKey = $state<string | null>(null);

function getSessionPassword(): string | null {
  try { return sessionStorage.getItem('fatturehub_session_password'); } catch { return null; }
}
function setSessionPassword(pw: string | null) {
  try {
    if (pw) sessionStorage.setItem('fatturehub_session_password', pw);
    else sessionStorage.removeItem('fatturehub_session_password');
  } catch {}
}

async function deriveMasterKey(password: string): Promise<string | null> {
  if (!_invoke) return null;
  try {
    const me = await api.getMe();
    if (!me.encrypted_master_key) return null;
    return await _invoke('unwrap_master_key', { password, encryptedB64: me.encrypted_master_key });
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return loggedIn;
}

export function getMasterKey(): string | null {
  return _masterKey;
}

export async function ensureMasterKey(): Promise<string | null> {
  if (_masterKey) return _masterKey;
  const pw = getSessionPassword();
  if (!pw) return null;
  _masterKey = await deriveMasterKey(pw);
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
  }

  loggedIn = true;
  return data;
}

export async function reloadMasterKey(password: string): Promise<boolean> {
  _masterKey = await deriveMasterKey(password);
  if (_masterKey) setSessionPassword(password);
  return !!_masterKey;
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
  setSessionPassword(null);
}

export function getApi() {
  return api;
}
