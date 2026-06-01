import { api } from './client';

let loggedIn = $state(api.isLoggedIn());
let _masterKey = $state<string | null>(null);
let _userId: string | null = null;

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

async function persistMasterKey(key: string | null) {
  if (!_userId) {
    try {
      const user = JSON.parse(localStorage.getItem('fatturehub_user') || '{}');
      _userId = user?.id || null;
    } catch { _userId = null; }
  }
  if (!_userId) return;
  const { storeMasterKey, deleteMasterKeyFromStorage } = await import('./crypto');
  if (key) await storeMasterKey(_userId, key);
  else await deleteMasterKeyFromStorage(_userId);
}

async function loadMasterKey(): Promise<string | null> {
  if (!_userId) {
    try {
      const user = JSON.parse(localStorage.getItem('fatturehub_user') || '{}');
      _userId = user?.id || null;
    } catch { _userId = null; }
  }
  if (!_userId) return null;
  const { getMasterKeyFromStorage } = await import('./crypto');
  return await getMasterKeyFromStorage(_userId);
}

export async function initMasterKey(): Promise<boolean> {
  if (_masterKey) return true;
  const key = await loadMasterKey();
  if (key) { _masterKey = key; return true; }
  return false;
}

export async function login(email: string, password: string) {
  const data = await api.login(email, password);
  setSessionPassword(password);
  _userId = data.user?.id || null;

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

  await persistMasterKey(_masterKey);
  loggedIn = true;
  return data;
}

export async function logout() {
  await api.logout();
  loggedIn = false;
  _masterKey = null;
  setSessionPassword(null);
  await persistMasterKey(null);
}

export function getApi() {
  return api;
}
