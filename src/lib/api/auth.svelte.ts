import { api } from './client';
import { setEncryptionKey } from './sync.svelte';

let loggedIn = $state(api.isLoggedIn());
let _password = $state<string | null>(null);

export function isLoggedIn() {
	return loggedIn;
}

export function setLoggedIn(value: boolean) {
	loggedIn = value;
}

export function getPassword(): string | null {
	return _password;
}

export async function login(email: string, password: string) {
	const data = await api.login(email, password);
	loggedIn = true;
	_password = password;
	setEncryptionKey(password);
	return data;
}

export async function logout() {
	await api.logout();
	loggedIn = false;
	_password = null;
	setEncryptionKey(null);
}

export function getApi() {
	return api;
}
