import { invoke } from '@tauri-apps/api/core';
import { isLoggedIn, getMasterKey, getApi } from './auth.svelte';

let syncing = $state(false);
let syncLabel = $state('');

export function getSyncState() {
  return {
    get syncing() { return syncing; },
    get syncLabel() { return syncLabel; },
  };
}

async function syncCall<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!isLoggedIn()) throw new Error('Not logged in');
  syncing = true;
  syncLabel = label;
  try {
    return await fn();
  } finally {
    syncing = false;
    syncLabel = '';
  }
}

function requireKey(): string {
  const key = getMasterKey();
  if (!key) throw new Error('Encryption key not available. Re-login required.');
  return key;
}

export async function encryptData(data: string): Promise<string> {
  const key = requireKey();
  return await invoke<string>('encrypt_with_key', { keyB64: key, data });
}

export async function decryptData(encrypted: string): Promise<string> {
  const key = requireKey();
  try {
    return await invoke<string>('decrypt_with_key', { keyB64: key, encryptedB64: encrypted });
  } catch {
    throw new Error('Impossibile decifrare i dati. La chiave di cifratura potrebbe essere cambiata (password modificata su un altro dispositivo?). Effettua di nuovo il login.');
  }
}

export async function syncUploadProject(name: string, data: any): Promise<any> {
  return syncCall('Salvataggio progetto...', async () => {
    const encrypted = await encryptData(JSON.stringify(data));
    const api = getApi();
    return await api.createProject(name, { encrypted });
  });
}

export async function syncUpdateProject(id: string, name: string, data: any): Promise<any> {
  return syncCall('Aggiornamento progetto...', async () => {
    const encrypted = await encryptData(JSON.stringify(data));
    const api = getApi();
    return await api.updateProject(id, name, { encrypted });
  });
}

export async function syncUploadFatture(fatture: any[], projectId: string | undefined): Promise<any> {
  return syncCall('Salvataggio fatture...', async () => {
    const encrypted = await encryptData(JSON.stringify(fatture));
    const api = getApi();
    return await api.syncFatture([{ data: { encrypted }, project_id: projectId }]);
  });
}

export async function syncDownloadProjects(): Promise<{ id: string; name: string; data: any }[]> {
  return syncCall('Caricamento progetti...', async () => {
    const api = getApi();
    const projects = await api.getProjects();
    for (const p of projects) {
      try {
        const raw = p.data?.encrypted;
        if (raw) {
          const json = await decryptData(raw);
          p.data = JSON.parse(json);
        }
      } catch { /* keep as-is */ }
    }
    return projects;
  });
}

export async function syncDownloadFatture(projectId?: string): Promise<any[]> {
  return syncCall('Caricamento fatture...', async () => {
    const api = getApi();
    const fatture = await api.getFatture(projectId);
    for (const f of fatture) {
      try {
        const raw = f.data?.encrypted;
        if (raw) {
          const json = await decryptData(raw);
          f.data = JSON.parse(json);
        }
      } catch { /* keep as-is */ }
    }
    return fatture;
  });
}
