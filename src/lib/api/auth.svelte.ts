import { api } from './client';

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
  if (encKey) {
    const { unwrapMasterKey } = await import('./crypto');
    try {
      _masterKey = await unwrapMasterKey(password, encKey);
    } catch {
      throw new Error('Password errata o chiave di cifratura non valida.');
    }
  } else {
    const { generateMasterKey, wrapMasterKey } = await import('./crypto');
    _masterKey = await generateMasterKey();
    const wrapped = await wrapMasterKey(password, _masterKey);
    await api.updateEncryptedKey(wrapped);
  }

  loggedIn = true;
  return data;
}

export async function reloadMasterKey(password: string): Promise<boolean> {
  try {
    const { unwrapMasterKey } = await import('./crypto');
    const me = await api.getMe();
    if (!me.encrypted_master_key) return false;
    _masterKey = await unwrapMasterKey(password, me.encrypted_master_key);
    return !!_masterKey;
  } catch {
    _masterKey = null;
    return false;
  }
}

export async function changePassword(oldPassword: string, newPassword: string) {
  if (!_masterKey) throw new Error('Nessuna chiave di cifratura');
  const { wrapMasterKey } = await import('./crypto');
  const wrapped = await wrapMasterKey(newPassword, _masterKey);
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
