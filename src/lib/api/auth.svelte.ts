import { invoke } from '@tauri-apps/api/core';
import { api } from './client';

let loggedIn = $state(api.isLoggedIn());

function loadStoredKey(): string | null {
	try {
		return localStorage.getItem('fatturehub_master_key');
	} catch { return null; }
}

function storeKey(key: string | null) {
	if (key) localStorage.setItem('fatturehub_master_key', key);
	else localStorage.removeItem('fatturehub_master_key');
}

let _masterKey = $state<string | null>(loggedIn ? loadStoredKey() : null);

export function isLoggedIn() {
	return loggedIn;
}

export function getMasterKey(): string | null {
	return _masterKey;
}

export async function login(email: string, password: string) {
	const data = await api.login(email, password);

	const encKey = data.user?.encrypted_master_key;
	if (encKey) {
		try {
			_masterKey = await invoke<string>('unwrap_master_key', { password, encryptedB64: encKey });
		} catch {
			throw new Error('Password errata o chiave di cifratura non valida. Se hai cambiato password su un altro dispositivo, usa la nuova password.');
		}
	} else {
		_masterKey = await invoke<string>('generate_master_key');
		const wrapped = await invoke<string>('wrap_master_key', { password, masterKeyB64: _masterKey });
		await api.updateEncryptedKey(wrapped);
	}

	if (_masterKey) storeKey(_masterKey);
	loggedIn = true;
	return data;
}

export async function reloadMasterKey(password: string): Promise<boolean> {
	try {
		const me = await api.getMe();
		if (!me.encrypted_master_key) return false;
		_masterKey = await invoke<string>('unwrap_master_key', { password, encryptedB64: me.encrypted_master_key });
		return true;
	} catch {
		_masterKey = null;
		return false;
	}
}

export async function changePassword(oldPassword: string, newPassword: string) {
	if (!_masterKey) throw new Error('Nessuna chiave di cifratura');
	const wrapped = await invoke<string>('wrap_master_key', { password: newPassword, masterKeyB64: _masterKey });
	await api.changePassword(oldPassword, newPassword, wrapped);
}

export async function logout() {
	await api.logout();
	loggedIn = false;
	_masterKey = null;
	storeKey(null);
}

export function getApi() {
	return api;
}
