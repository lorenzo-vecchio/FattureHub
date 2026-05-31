import { api } from './client';

let _invokePromise: Promise<any> | null = null;
function getInvoke(): Promise<any> {
  if (!_invokePromise) {
    _invokePromise = (async () => {
      try {
        const tauriCore = await import('@tauri-apps/api/core');
        return tauriCore.invoke;
      } catch {
        return null;
      }
    })();
  }
  return _invokePromise;
}

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
  const invoke = await getInvoke();
  if (!invoke) return null;
  try {
    const me = await api.getMe();
    if (!me.encrypted_master_key) return null;
    return await invoke('unwrap_master_key', { password, encryptedB64: me.encrypted_master_key });
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

  const invoke = await getInvoke();
  const encKey = data.user?.encrypted_master_key;
  if (encKey && invoke) {
    try {
      _masterKey = await invoke('unwrap_master_key', { password, encryptedB64: encKey });
    } catch {
      throw new Error('Password errata o chiave di cifratura non valida.');
    }
  } else if (invoke) {
    _masterKey = await invoke('generate_master_key');
    const wrapped = await invoke('wrap_master_key', { password, masterKeyB64: _masterKey });
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
  if (!_masterKey) throw new Error('Nessuna chiave di cifratura');
  const invoke = await getInvoke();
  if (!invoke) throw new Error('Crittografia non disponibile in questa modalità');
  const wrapped = await invoke('wrap_master_key', { password: newPassword, masterKeyB64: _masterKey });
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
