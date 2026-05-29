import { invoke } from '@tauri-apps/api/core';
import { api } from './client';

let loggedIn = $state(api.isLoggedIn());
let _masterKey = $state<string | null>(null);

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
		_masterKey = await invoke<string>('unwrap_master_key', { password, encryptedB64: encKey });
	} else {
		_masterKey = await invoke<string>('generate_master_key');
		const wrapped = await invoke<string>('wrap_master_key', { password, masterKeyB64: _masterKey });
		await api.updateEncryptedKey(wrapped);
	}

	loggedIn = true;
	return data;
}

export async function changePassword(oldPassword: string, newPassword: string) {
	if (!_masterKey) throw new Error('No encryption key');
	const wrapped = await invoke<string>('wrap_master_key', { password: newPassword, masterKeyB64: _masterKey });
	await api.changePassword(oldPassword, newPassword, wrapped);
}

export async function logout() {
	await api.logout();
	loggedIn = false;
	_masterKey = null;
}

export function getApi() {
	return api;
}
