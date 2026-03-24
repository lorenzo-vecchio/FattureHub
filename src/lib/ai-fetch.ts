import { invoke } from '@tauri-apps/api/core';

interface TauriHttpResponse {
  status: number;
  contentType: string;
  body: string;
}

/**
 * A fetch-compatible function that routes HTTP calls through Tauri's `http_post` Rust command,
 * bypassing CORS restrictions that apply to the Tauri WebView origin.
 */
export async function tauriFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

  const headers: Record<string, string> = {};
  if (init?.headers) {
    const h = new Headers(init.headers);
    h.forEach((v, k) => {
      headers[k] = v;
    });
  }

  const body = typeof init?.body === 'string' ? init.body : '';

  const result = await invoke<TauriHttpResponse>('http_post', { url, headers, body });

  return new Response(result.body, {
    status: result.status,
    headers: { 'content-type': result.contentType },
  });
}
