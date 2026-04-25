import { invoke } from '@tauri-apps/api/core';

interface TauriHttpResponse {
  status: number;
  contentType: string;
  body: string;
}

/**
 * A fetch-compatible function that routes HTTP calls through Tauri's HTTP Rust command,
 * bypassing CORS restrictions that apply to the Tauri WebView origin.
 */
export async function tauriFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? 'GET').toUpperCase();

  const headers: Record<string, string> = {};
  if (init?.headers) {
    const h = new Headers(init.headers);
    h.forEach((v, k) => {
      headers[k] = v;
    });
  }

  const body = typeof init?.body === 'string' ? init.body : '';

  const signal = init?.signal;

  // Race the Rust HTTP call against the abort signal.
  // invoke() itself is not cancellable, but we reject as soon as abort fires
  // so the AI SDK stops processing and making further requests.
  const invokePromise = invoke<TauriHttpResponse>('http_request', { url, method, headers, body });

  const result = await (signal
    ? Promise.race([
        invokePromise,
        new Promise<never>((_, reject) => {
          if (signal.aborted) {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
            return;
          }
          signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          }, { once: true });
        }),
      ])
    : invokePromise);

  return new Response(result.body, {
    status: result.status,
    headers: { 'content-type': result.contentType },
  });
}
