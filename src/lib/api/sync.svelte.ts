import { invoke } from '@tauri-apps/api/core';
import { isLoggedIn, getApi } from './auth.svelte';

let syncing = $state(false);
let syncLabel = $state('');
let _encryptionKey = $state<string | null>(null);

export function getSyncState() {
  return {
    get syncing() { return syncing; },
    get syncLabel() { return syncLabel; },
  };
}

export function setEncryptionKey(key: string | null) {
  _encryptionKey = key;
}

function deriveKey(password: string): string {
  return password;
}

export async function encryptData(password: string, data: string): Promise<string> {
  return await invoke<string>('encrypt_data', { password, data });
}

export async function decryptData(password: string, encrypted: string): Promise<string> {
  return await invoke<string>('decrypt_data', { password, encrypted });
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

export async function syncUploadProject(name: string, data: any, password: string): Promise<any> {
  return syncCall('Salvataggio progetto...', async () => {
    const encrypted = await encryptData(password, JSON.stringify(data));
    const api = getApi();
    return await api.createProject(name, { encrypted });
  });
}

export async function syncUpdateProject(id: string, name: string, data: any, password: string): Promise<any> {
  return syncCall('Aggiornamento progetto...', async () => {
    const encrypted = await encryptData(password, JSON.stringify(data));
    const api = getApi();
    return await api.updateProject(id, name, { encrypted });
  });
}

export async function syncUploadFatture(fatture: any[], projectId: string | undefined, password: string): Promise<any> {
  return syncCall('Salvataggio fatture...', async () => {
    const encrypted = await encryptData(password, JSON.stringify(fatture));
    const api = getApi();
    return await api.syncFatture([{ data: { encrypted }, project_id: projectId }]);
  });
}

export async function syncDownloadProjects(password: string): Promise<{ id: string; name: string; data: any }[]> {
  return syncCall('Caricamento progetti...', async () => {
    const api = getApi();
    const projects = await api.getProjects();
    const decrypted = [];
    for (const p of projects) {
      try {
        const raw = p.data?.encrypted;
        if (raw) {
          const json = await decryptData(password, raw);
          p.data = JSON.parse(json);
        }
      } catch { /* keep as-is */ }
      decrypted.push(p);
    }
    return decrypted;
  });
}

export async function syncDownloadFatture(password: string, projectId?: string): Promise<any[]> {
  return syncCall('Caricamento fatture...', async () => {
    const api = getApi();
    const fatture = await api.getFatture(projectId);
    for (const f of fatture) {
      try {
        const raw = f.data?.encrypted;
        if (raw) {
          const json = await decryptData(password, raw);
          f.data = JSON.parse(json);
        }
      } catch { /* keep as-is */ }
    }
    return fatture;
  });
}
