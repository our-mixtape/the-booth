/** A build-time destination only: never accept a gateway URL from page/query/track input. */
export function gatewayOrigin(value = import.meta.env.VITE_ASTRA_GATEWAY_ORIGIN || '', allowLoopback = import.meta.env.DEV): string {
 if (!value.trim()) return '';
 const url = new URL(value.trim());
 const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
 if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || (url.protocol !== 'https:' && !(allowLoopback && loopback && url.protocol === 'http:'))) throw new Error('Invalid Astra gateway origin');
 return url.origin;
}

export function sessionEndpoint(path: string): string {
 return path.startsWith('/api/session/') ? `${gatewayOrigin()}${path}` : path;
}

export async function sessionAvailability(signal: AbortSignal): Promise<boolean> {
 const response = await fetch(`${gatewayOrigin()}/api/status`, { signal, credentials: 'same-origin', redirect: 'error' });
 if (!response.ok) return false;
 const status = await response.json();
 return status.session?.available === true;
}
