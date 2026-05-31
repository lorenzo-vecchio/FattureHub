import { isLoggedIn, getApi } from './auth.svelte';
import { setSyncStatus, setSyncError } from './sync-status.svelte';

async function syncCall<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!isLoggedIn()) throw new Error('Not logged in');
  setSyncStatus('syncing');
  try {
    return await fn();
  } catch (e) {
    setSyncError(e instanceof Error ? e.message : String(e));
    throw e;
  } finally {
    setSyncStatus('idle');
  }
}

export async function syncUploadProject(name: string, data: any): Promise<any> {
  return syncCall('Salvataggio progetto...', async () => {
    const api = getApi();
    return await api.createProject(name, data);
  });
}

export async function syncUpdateProject(id: string, name: string, data: any): Promise<any> {
  return syncCall('Aggiornamento progetto...', async () => {
    const api = getApi();
    return await api.updateProject(id, name, data);
  });
}

export async function syncUploadFatture(fatture: any[], projectId: string | undefined): Promise<any> {
  return syncCall('Salvataggio fatture...', async () => {
    const api = getApi();
    return await api.syncFatture(fatture.map(f => ({
      data: f,
      project_id: projectId,
    })));
  });
}

export async function syncDownloadProjects(): Promise<any[]> {
  return syncCall('Caricamento progetti...', async () => {
    const api = getApi();
    return await api.getProjects();
  });
}

export async function syncDownloadFatture(projectId?: string): Promise<any[]> {
  return syncCall('Caricamento fatture...', async () => {
    const api = getApi();
    return await api.getFatture(projectId);
  });
}

export async function syncDeleteProject(id: string): Promise<any> {
  return syncCall('Eliminazione progetto...', async () => {
    const api = getApi();
    return await api.deleteProject(id);
  });
}
