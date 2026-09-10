/** Explicit origins are shared by CORS and Clerk's authorized-party check. */
export function gatewayConfig(env = process.env) {
 const persistent = env.GATEWAY_MODE === 'persistent';
 const production = persistent || env.NODE_ENV === 'production' || !!env.VERCEL;
 const origins = new Set(production ? [] : [`http://localhost:${Number(env.PORT) || 5173}`, `http://127.0.0.1:${Number(env.PORT) || 5173}`]);
 const candidates = [env.APP_ORIGIN, ...(env.ALLOWED_ORIGINS || '').split(','), ...[env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map(host => `https://${host}`)];
 for (const candidate of candidates) {
  if (!candidate?.trim()) continue;
  try {
   const url = new URL(candidate.trim());
   if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && (production || url.protocol !== 'http:'))) throw new Error();
   origins.add(url.origin);
  } catch {
   // The existing Vercel adapter ignores invalid optional origins; persistent startup fails closed.
   if (persistent) throw new Error('APP_ORIGIN and ALLOWED_ORIGINS must contain exact HTTPS origins, without paths or credentials.');
  }
 }
 const rawPort = env.GATEWAY_PORT || (persistent ? env.PORT : undefined) || '8787';
 const port = Number(rawPort);
 if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Gateway port must be an integer from 1 to 65535.');
 if (persistent && !origins.size) throw new Error('Configure at least one HTTPS APP_ORIGIN or ALLOWED_ORIGINS for the persistent gateway.');
 if (persistent && env.VERCEL) throw new Error('The persistent gateway requires one owning Node process; Vercel functions must use the stateless adapter.');
 return { persistent, production, origins, port, host: env.GATEWAY_HOST || (persistent ? '0.0.0.0' : '127.0.0.1') };
}

export function validateGatewayCredentials(env) {
 for (const name of ['OPENAI_API_KEY', 'CLERK_SECRET_KEY']) if (!env[name]?.trim()) throw new Error(`Configure ${name} in the gateway secret store.`);
 if (!(env.CLERK_PUBLISHABLE_KEY || env.VITE_CLERK_PUBLISHABLE_KEY)) throw new Error('Configure the matching Booth CLERK_PUBLISHABLE_KEY.');
}
