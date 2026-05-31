let _invoke: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;
let _loaded = false;

async function ensureInvoke() {
  if (_loaded) return _invoke;
  _loaded = true;
  try {
    const tauriCore = await import('@tauri-apps/api/core');
    _invoke = tauriCore.invoke;
  } catch {
    _invoke = null;
  }
  return _invoke;
}

export async function encryptWithKey(keyB64: string, data: string): Promise<string> {
  const invoke = await ensureInvoke();
  if (!invoke) throw new Error('Crittografia non disponibile');
  return await invoke('encrypt_with_key', { keyB64, data }) as string;
}

export async function decryptWithKey(keyB64: string, encryptedB64: string): Promise<string> {
  const invoke = await ensureInvoke();
  if (!invoke) throw new Error('Crittografia non disponibile');
  return await invoke('decrypt_with_key', { keyB64, encryptedB64 }) as string;
}

export async function generateMasterKey(): Promise<string> {
  const invoke = await ensureInvoke();
  if (!invoke) throw new Error('Crittografia non disponibile');
  return await invoke('generate_master_key') as string;
}

export async function wrapMasterKey(password: string, masterKeyB64: string): Promise<string> {
  const invoke = await ensureInvoke();
  if (!invoke) throw new Error('Crittografia non disponibile');
  return await invoke('wrap_master_key', { password, masterKeyB64 }) as string;
}

export async function unwrapMasterKey(password: string, encryptedB64: string): Promise<string> {
  const invoke = await ensureInvoke();
  if (!invoke) throw new Error('Crittografia non disponibile');
  return await invoke('unwrap_master_key', { password, encryptedB64 }) as string;
}
