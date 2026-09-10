import { useEffect, useRef, useState } from 'react';
import type { AudioEngine } from './audio/engine';
import { compactState } from './agent/hints';
import { AstraSession as LiveSession, type Phase } from './agent/session';
import { useBoothSession } from './auth/session';
import './astra-session.css';

const briefs = [
 ['Plan the handoff', 'I am about to attempt the timed handoff. Plan it and watch my attempt.'],
 ["Keep A's vocal longer", "Keep A's vocal longer only if verified vocal information supports that. Plan a restrained handoff and state what is unknown."],
 ['Hint, not a plan', 'I am about to attempt the handoff. Give one focused hint, not a plan, and watch my attempt.'],
] as const;
const steers = ['Delay B one bar', 'Mute A drums at the handoff', 'Keep it restrained'];
const labels: Record<Phase, string> = { idle: 'Idle', thinking: 'Thinking', streaming: 'Streaming', 'steer-queued': 'Steer queued', steered: 'Steered', revising: 'Revising', 'waiting-attempt': 'Waiting for attempt', reviewing: 'Reviewing', done: 'Done', error: 'Error' };
const shortId = (id: string) => `${id.slice(0, 15)}…`;

export function AstraSession({ engine, snap }: { engine: AudioEngine; snap: ReturnType<AudioEngine['snapshot']> }) {
 const auth = useBoothSession(), signedIn = auth.phase === 'signed-in';
 const live = useRef<LiveSession | null>(null);
 const [view, setView] = useState(() => new LiveSession().state);
 const [reauthRequired, setReauthRequired] = useState(false);
 const [brief, setBrief] = useState(''), [steer, setSteer] = useState(''), [now, setNow] = useState(Date.now());
 useEffect(() => { const session = new LiveSession(setView); live.current = session; return () => { session.stop(); live.current = null; }; }, []);
 useEffect(() => { live.current?.stop(); setReauthRequired(false); }, [auth.sessionId, signedIn]);
 useEffect(() => { if (view.signInRequired) setReauthRequired(true); }, [view.signInRequired]);
 useEffect(() => { const stop = () => { live.current?.stop(); setReauthRequired(true); }; window.addEventListener('booth:sign-out', stop); return () => window.removeEventListener('booth:sign-out', stop); }, []);
 useEffect(() => {
  live.current?.observeAttempt(snap.attempt);
  if (signedIn && snap.attempt.status === 'running' && (view.pendingCall || view.responses.some(response => response.text))) engine.session.attempt.assisted = true;
 }, [snap, engine, signedIn, view.pendingCall, view.responses]);
 useEffect(() => { if (view.phase === 'idle' || view.phase === 'done' || view.phase === 'error') return; const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, [view.phase]);
 const canUse = signedIn && !reauthRequired && !view.signInRequired;
 const busy = !!view.inFlightResponseId || view.requestPending || !!view.pendingCall;
 const canSteer = canUse && !!view.inFlightResponseId && view.phase !== 'steer-queued';
 const latest = view.responses.at(-1);
 const elapsed = latest ? Math.max(0, (latest.completedAt ?? now) - latest.startedAt) / 1000 : 0;
 const doSteer = (text: string) => { if (canSteer) { setSteer(text); void live.current?.steer(text); } };
 return <section className="astra-session" aria-label="Astra session">
  <div className="astra-session-heading"><div><p className="eyebrow">✳ ASTRA / LIVE SESSION</p><h3>Make a plan. Change your mind. Try it.</h3></div><button type="button" disabled={view.phase === 'idle'} onClick={() => live.current?.stop()}>Stop session</button></div>
  {!canUse && <p className="astra-session-notice">{reauthRequired || view.signInRequired ? 'Please sign in again to use the live session.' : 'Sign in to brief Astra. Your decks stay ready to play.'}</p>}
  <form onSubmit={event => { event.preventDefault(); if (canUse && !busy) void live.current?.start({ state: compactState(engine), brief, getToken: auth.getToken }); }}>
   <label htmlFor="astra-session-brief">Brief for this session</label><textarea id="astra-session-brief" rows={2} maxLength={1000} placeholder="I’m about to try the handoff. Watch my timing…" value={brief} onChange={event => setBrief(event.target.value)} />
   <div className="astra-session-actions"><div className="astra-session-chips">{briefs.map(([label, value]) => <button key={label} type="button" onClick={() => setBrief(value)}>{label}</button>)}</div><button className="primary" disabled={!canUse || busy || !brief.trim()}>Brief Astra ↗</button></div>
  </form>
  <ol className="astra-session-lifecycle" aria-label="Session lifecycle">{(view.history.length ? view.history : [{ phase: 'idle' as const, at: now }]).map((item, index) => <li key={`${item.at}-${index}`} aria-current={index === view.history.length - 1 || !view.history.length ? 'step' : undefined}><strong>{labels[item.phase]}</strong>{item.responseId && <small>{shortId(item.responseId)}</small>}<span>{(Math.max(0, item.at - (view.history[0]?.at ?? item.at)) / 1000).toFixed(1)}s</span></li>)}</ol>
  <p className="astra-session-current" role="status">{labels[view.phase]}{latest && ` · ${Math.max(0, elapsed).toFixed(1)}s`}</p>
  <div className="astra-session-responses" aria-label="Astra response history">{view.responses.map((response, index) => <article key={response.id} className={response.id === latest?.id ? 'current-response' : 'previous-response'}><p className="astra-session-response-label">{response.kind === 'review' ? 'Attempt review' : response.successorOf ? 'Revised plan' : `Response ${index + 1}`} · {shortId(response.id)}{response.successorOf && ` · follows ${shortId(response.successorOf)}`}{response.steered && ' · steered'}</p><p className="astra-session-plan">{response.text || 'Astra is thinking…'}</p></article>)}</div>
  {view.pendingCall && <p className="astra-session-wait" role="status">Waiting for your attempt · hands on the mixer</p>}
  {view.reviewPending && view.inFlightResponseId && <p className="astra-session-wait" role="status">Attempt result queued · Astra will review it after this response</p>}
  <form className="astra-session-steer" onSubmit={event => { event.preventDefault(); doSteer(steer); }}>
   <label htmlFor="astra-session-steer">Steer while Astra responds</label><div className="astra-session-chips">{steers.map(text => <button type="button" disabled={!canSteer} key={text} onClick={() => doSteer(text)}>{text}</button>)}</div>
   <div className="astra-session-steer-input"><input id="astra-session-steer" maxLength={500} value={steer} disabled={!canSteer} placeholder="Change the direction of this response…" onChange={event => setSteer(event.target.value)} /><button type="submit" disabled={!canSteer || !steer.trim()}>Queue steer ↗</button></div>
  </form>
  {view.error && <p role="alert" className="astra-session-notice">{view.error}</p>}
  <p className="astra-session-meta">{latest?.completedAt ? view.meta.model : 'gpt-6-astra (requested)'}{latest && ` · ${shortId(latest.id)}`} · {Math.max(0, (latest?.completedAt ? view.meta.latencyMs ?? elapsed * 1000 : elapsed * 1000) / 1000).toFixed(1)}s · read-only · you keep the controls</p>
  <small>Astra reads the measured deck state, never audio, and cannot move a control. A steer is queued on the same response and applied automatically.</small>
 </section>;
}
