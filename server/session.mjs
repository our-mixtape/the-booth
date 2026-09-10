import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAstraSession } from './session-core.mjs';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/);
const resultSchema = z.object({ status: z.enum(['complete', 'retry', 'timeout', 'cancelled']), entryError: z.number().finite().min(-600).max(600).optional(), handoffAt: z.number().finite().nonnegative().max(600).optional(), tolerance: z.number().finite().nonnegative().max(10).optional() }).strict();
const steerSchema = z.object({ sessionId: id, text: z.string().trim().min(1).max(500) }).strict();
const toolSchema = z.object({ sessionId: id, callId: id, output: resultSchema }).strict();
export const sessionPaths = new Set(['/api/session/brief', '/api/session/steer', '/api/session/tool']);

/** SSE ownership is scoped to both the authenticated user and their app session. */
export function createSessionRoute({ key, model, env, stateSchema, WebSocketImpl }) {
 const sessions = new Map();
 const briefSchema = stateSchema.extend({ brief: z.string().trim().min(1).max(1000), requestId: id, effort: z.enum(['low', 'medium']).optional(), sessionId: id.optional() });
 return async (req, res, identity) => {
  if (!sessionPaths.has(req.url)) return false;
  const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); return true; };
  if (req.method !== 'POST') return reply(405, { error: 'Use POST for Astra sessions.' });
  if (env.VERCEL) return reply(503, { error: 'Astra session is available on the local booth only. Manual playback continues.' });
  if (!key) return reply(503, { error: 'Astra unavailable · no server API key. Manual playback continues.' });
  if (!identity?.userId || !identity?.sessionId) return reply(401, { error: 'Sign in to use Astra sessions.' });
  if (!req.headers['content-type']?.startsWith('application/json')) return reply(415, { error: 'Expected JSON' });
  let body = '';
  try {
   if (req.body !== undefined) body = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
   else for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > 16000) return reply(413, { error: 'State too large' }); }
   if (Buffer.byteLength(body) > 16000) return reply(413, { error: 'State too large' });
  } catch { return reply(400, { error: 'Unable to read request' }); }
  let input;
  try { input = (req.url.endsWith('/brief') ? briefSchema : req.url.endsWith('/steer') ? steerSchema : toolSchema).parse(JSON.parse(body)); }
  catch { return reply(400, { error: 'Invalid Astra session request' }); }
  const owner = JSON.stringify([identity.userId, identity.sessionId]);
  const existing = input.sessionId ? sessions.get(input.sessionId) : null;
  if (input.sessionId && (!existing || existing.owner !== owner)) return reply(404, { error: 'Astra session not found.' });
  const briefArgs = () => ({ state: stateSchema.parse(input), brief: input.brief, effort: input.effort });
  if (existing) {
   try {
    if (req.url.endsWith('/brief')) {
     if (existing.requests.has(input.requestId)) return reply(409, { error: 'This brief request was already submitted.' });
     await existing.core.brief(briefArgs()); existing.requests.add(input.requestId);
    } else if (req.url.endsWith('/steer')) existing.core.steer(input.text);
    else existing.core.toolOutput({ callId: input.callId, output: input.output, effort: 'medium' });
    return reply(202, { accepted: true });
   } catch { return reply(409, { error: 'Astra session cannot accept this action now. Wait for the response or start another session.' }); }
  }
  if (!req.url.endsWith('/brief')) return reply(404, { error: 'Astra session not found.' });
  if (sessions.size >= 16 || [...sessions.values()].filter(session => session.owner === owner).length >= 2) return reply(429, { error: 'Close an existing Astra session before starting another.' });
  const sessionId = randomUUID();
  let heartbeat, core;
  const cleanup = () => { clearTimeout(heartbeat); sessions.delete(sessionId); core?.close(); if (!res.writableEnded) res.end(); };
  const send = event => {
   if (res.destroyed || res.writableEnded) return cleanup();
   // Bound buffered output for disconnected or stalled readers.
   if (!res.write(`data: ${JSON.stringify(event)}\n\n`)) cleanup();
  };
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders?.();
  core = createAstraSession({ key, model, WebSocketImpl, onEvent: send, onClose: cleanup });
  sessions.set(sessionId, { owner, core, requests: new Set([input.requestId]) });
  res.on('close', cleanup);
  send({ t: 'session', sessionId });
  const beat = () => { if (res.destroyed || res.writableEnded) return cleanup(); if (!res.write(': heartbeat\n\n')) return cleanup(); heartbeat = setTimeout(beat, 15000); heartbeat.unref?.(); };
  heartbeat = setTimeout(beat, 15000); heartbeat.unref?.();
  try { await core.brief(briefArgs()); } catch { send({ t: 'error', message: 'Astra session could not start. Manual playback continues.' }); cleanup(); }
  return true;
 };
}
