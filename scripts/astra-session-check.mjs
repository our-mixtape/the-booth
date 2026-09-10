import { mkdir, writeFile } from 'node:fs/promises';
import { createAstraSession } from '../server/session-core.mjs';

if (!process.env.OPENAI_API_KEY) { console.error('A server API key is required; no request was sent.'); process.exit(1); }
const started = Date.now(), rows = [], aliases = new Map();
let responseNumber = 0, callNumber = 0;
const short = id => {
 if (!id) return '';
 if (!aliases.has(id)) aliases.set(id, id.startsWith('call_') ? `c${++callNumber}` : `r${++responseNumber}`);
 return `${aliases.get(id)}:${id.slice(0, 10)}…`;
};
const log = (event, detail = '') => { const row = `+${((Date.now() - started) / 1000).toFixed(2)}s ${event}${detail ? ` ${detail}` : ''}`; rows.push(row); console.log(row); };
let sawAccepted = false, sawSteered = false, successor, successorCompleted = false, reviewCreated = false, outputSent = false, settled = false;
let latestCompleted, distinctSuccessor = false, outputUsesLatest = false, reviewText = '', reviewChecks;
let steerTimer, deadline;
let finish;
const result = new Promise(resolve => { finish = resolve; });
class LoggedWebSocket extends globalThis.WebSocket {
 send(raw) {
  const event = JSON.parse(raw);
  if (event.type === 'response.create' && event.input?.[0]?.type === 'function_call_output') {
   outputSent = true; outputUsesLatest = event.previous_response_id === latestCompleted && event.previous_response_id === successor; log('response.create(function_call_output)', `previous=${short(event.previous_response_id)} call=${short(event.input[0].call_id)} measured=synthetic-fixture`);
  } else log(event.type, event.previous_response_id ? `previous=${short(event.previous_response_id)}` : 'gpt-6-astra store:false');
  super.send(raw);
 }
}
const end = success => { if (settled) return; settled = true; clearTimeout(deadline); clearTimeout(steerTimer); finish(success); };
const core = createAstraSession({ key: process.env.OPENAI_API_KEY, WebSocketImpl: LoggedWebSocket, onClose: () => end(false), onEvent: event => {
 switch (event.t) {
  case 'created':
   if (event.successorOf) { successor = event.responseId; distinctSuccessor = event.responseId !== event.successorOf; }
   if (outputSent) reviewCreated = true;
   log('response.created', `${short(event.responseId)}${event.successorOf ? ` successorOf=${short(event.successorOf)}` : ''}`); break;
  case 'delta': if (reviewCreated) reviewText += event.text; break; // Inspect in memory; never persist model text.
  case 'steer': sawAccepted ||= event.status === 'accepted'; log(`response.steer.${event.status}`); break;
  case 'steered': sawSteered = true; log('response.incomplete(steered)', short(event.responseId)); break;
  case 'tool_call':
   log('response.output_item.done(function_call)', `${event.name} async=${event.async} call=${short(event.callId)}`);
   try { core.toolOutput({ callId: event.callId, output: { status: 'complete', entryError: 0.12, handoffAt: 32, tolerance: 0.25 } }); log('tool_output.queued', 'synthetic entryError=0.12s handoffAt=32s tolerance=0.25s'); } catch { log('check.failed', 'tool result could not be queued'); end(false); }
   break;
  case 'completed':
   log('response.completed', `${short(event.responseId)} model=${event.model}`);
   latestCompleted = event.responseId;
   if (event.responseId === successor) successorCompleted = true;
   if (reviewCreated) {
    reviewChecks = { entryErrorCited: /0\.12|120\s*(?:ms|milliseconds)/i.test(reviewText), toleranceCited: /0\.25|250\s*(?:ms|milliseconds)/i.test(reviewText), limitationLanguageDetected: /does(?:n.t| not)|cannot|can.t|not verif|unverified|not (?:prove|confirm|assess)|no (?:audio|audible)|never heard/i.test(reviewText) };
    log('review.text-check', JSON.stringify(reviewChecks));
    log('transport.identity-check', JSON.stringify({ distinctSuccessor, outputUsesLatest }));
    end(sawAccepted && sawSteered && successorCompleted && outputSent && distinctSuccessor && outputUsesLatest);
   }
   break;
  case 'error': log('session.error', event.message); end(false); break;
 }
} });
const deck = { trackId: 'track-1', position: 0, playing: true, gain: 0.8, filter: 1, eq: { low: 0, mid: 0, high: 0 }, rate: 1, bpm: 120, provenance: 'fixture-known', rhythmWindow: null, stems: { drums: true, bass: true, melody: true } };
try {
 await core.brief({ state: { exercise: { entryAfter: 16, endAfter: 32 }, revision: 1, crossfader: 0, decks: { A: deck, B: { ...deck, trackId: 'track-2', playing: false }, C: { ...deck, trackId: 'track-3', playing: false, gain: 0 }, D: { ...deck, trackId: 'track-4', playing: false, gain: 0 } }, attempt: { status: 'running', startedAt: 0, elapsed: 0, assisted: false }, history: [] }, brief: 'I am about to attempt this handoff. Call watch_attempt once now, then keep coaching while it is pending. Plan six short steps with the fixture exercise-relative bar origin at zero; start B at bar 9 and hand over at bar 17.', effort: 'medium' });
 steerTimer = setTimeout(() => { try { core.steer('Delay B one bar and mute A drums at the handoff.'); } catch { log('check.failed', 'No in-flight response at steer time'); end(false); } }, 1200);
 deadline = setTimeout(() => { log('check.failed', 'Check timed out'); end(false); }, 120000);
} catch { log('check.failed', 'Session could not start'); end(false); }
const passed = await result; core.close();
const directory = new URL('../docs/evidence/astra-session/', import.meta.url); await mkdir(directory, { recursive: true });
const file = new URL(`check-${Math.floor(started / 1000)}.md`, directory);
await writeFile(file, `# Astra live session API check\n\nDate: ${new Date(started).toISOString()}\n\nTransport result: ${passed ? 'PASS' : 'FAIL'}\n\nReview text checks: ${reviewChecks ? JSON.stringify(reviewChecks) : 'No completed review to inspect.'} These are lexical checks, not semantic verification or proof that the musical advice is useful.\n\nReal gpt-6-astra Responses WebSocket, store:false, medium effort. The tool result is a synthetic fixture used to verify transport; it is not evidence of an auditioned or browser-performed mix. No audio, keys, raw provider errors, full response ids or model text are recorded.\n\n\`\`\`text\n${rows.join('\n')}\n\`\`\`\n`);
console.log(`Evidence: ${file.pathname}`); process.exitCode = passed ? 0 : 1;
