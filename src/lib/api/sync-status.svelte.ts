export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

let status = $state<SyncStatus>('idle');
let lastError = $state<string | null>(null);

export function getSyncStatus() {
  return {
    get status() { return status; },
    get lastError() { return lastError; },
  };
}

export function setSyncStatus(s: SyncStatus) {
  status = s;
  if (s !== 'error') lastError = null;
}

export function setSyncError(msg: string) {
  status = 'error';
  lastError = msg;
}
