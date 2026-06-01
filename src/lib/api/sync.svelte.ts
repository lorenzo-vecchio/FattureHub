import { isLoggedIn, getMasterKey, getApi } from './auth.svelte';
import { setSyncStatus, setSyncError } from './sync-status.svelte';

async function syncCall<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!isLoggedIn()) throw new Error('Not logged in');
  setSyncStatus('syncing');
  let error: unknown;
  try {
    return await fn();
  } catch (e) {
    error = e;
    setSyncError(e instanceof Error ? e.message : String(e));
    throw e;
  } finally {
    if (!error) setSyncStatus('idle');
  }
}

async function ensureEncrypt(): Promise<(data: string) => Promise<string>> {
  let key = getMasterKey();
  if (!key) {
    const { initMasterKey } = await import('./auth.svelte');
    const ok = await initMasterKey();
    if (ok) key = getMasterKey();
  }
  if (!key) throw new Error('Chiave di cifratura non disponibile.');
  const { encryptWithKey } = await import('./crypto');
  return (data: string) => encryptWithKey(key, data);
}

async function ensureDecrypt(): Promise<(data: string) => Promise<string>> {
  let key = getMasterKey();
  if (!key) {
    const { initMasterKey } = await import('./auth.svelte');
    const ok = await initMasterKey();
    if (ok) key = getMasterKey();
  }
  if (!key) throw new Error('Chiave di cifratura non disponibile.');
  const { decryptWithKey } = await import('./crypto');
  return (data: string) => decryptWithKey(key, data);
}

export async function syncCreateProject(name: string, data: any, projectId?: string): Promise<any> {
  return syncCall('Salvataggio progetto...', async () => {
    const enc = await ensureEncrypt();
    const encrypted = await enc(JSON.stringify(data));
    const api = getApi();
    return await api.createProject(name, { encrypted }, projectId);
  });
}

export async function syncUpdateProject(id: string, name: string, data: any): Promise<any> {
  return syncCall('Aggiornamento progetto...', async () => {
    const enc = await ensureEncrypt();
    const encrypted = await enc(JSON.stringify(data));
    const api = getApi();
    return await api.updateProject(id, name, { encrypted });
  });
}

export async function syncUploadFatture(fatture: any[], projectId: string | undefined): Promise<any> {
  return syncCall('Salvataggio fatture...', async () => {
    const enc = await ensureEncrypt();
    const api = getApi();
    const encrypted = await Promise.all(fatture.map(f => enc(JSON.stringify(f))));
    const items = fatture.map((f, i) => ({ id: f.id, encrypted: encrypted[i] }));
    return await api.syncFatture(items, projectId);
  });
}

export async function syncDownloadProjects(): Promise<any[]> {
  return syncCall('Caricamento progetti...', async () => {
    const dec = await ensureDecrypt();
    const api = getApi();
    const projects = await api.getProjects();
    for (const p of projects) {
      try {
        const raw = p.data?.encrypted;
        if (raw) p.data = JSON.parse(await dec(raw));
      } catch { /* fallback to raw */ }
    }
    return projects;
  });
}

export async function syncDownloadFatture(projectId?: string): Promise<any[]> {
  return syncCall('Caricamento fatture...', async () => {
    const dec = await ensureDecrypt();
    const api = getApi();
    const fatture = await api.getFatture(projectId);
    for (const f of fatture) {
      try {
        const raw = f.data?.encrypted;
        if (raw) f.data = JSON.parse(await dec(raw));
      } catch { /* fallback to raw */ }
    }
    return fatture;
  });
}

export async function syncDeleteProject(id: string): Promise<any> {
  return syncCall('Eliminazione progetto...', async () => {
    const api = getApi();
    return await api.deleteProject(id);
  });
}
