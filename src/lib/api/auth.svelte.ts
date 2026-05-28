import { api } from './client';

let loggedIn = $state(api.isLoggedIn());

export function isLoggedIn() {
	return loggedIn;
}

export function setLoggedIn(value: boolean) {
	loggedIn = value;
}

export async function login(email: string, password: string) {
	const data = await api.login(email, password);
	loggedIn = true;
	return data;
}

export async function logout() {
	await api.logout();
	loggedIn = false;
}

export function getApi() {
	return api;
}
