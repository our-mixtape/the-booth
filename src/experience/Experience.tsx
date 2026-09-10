import { useEffect, useRef, useState } from 'react';
import type { AudioEngine } from '../audio/engine';
import type { Track } from '../domain/session';
import { inspectLocalTrack, moveTrack, readExperienceRoute, recommendPair, type Audience, type CrateEntry, type ExperienceRoute } from './crate';
import './experience.css';
import { KidsSongs } from './KidsSongs';
import { DJNameFlow } from './DJNameFlow';

export function useExperienceRoute() {
 const [route, setRoute] = useState(() => readExperienceRoute(location.hash));
 useEffect(() => { const change = () => setRoute(readExperienceRoute(location.hash)); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
 return route;
}

const steps = ['Upload music', 'Analyze music', 'Create stems', 'Recommend', 'Playlist', 'Play'];
const stepNotes = ['Build your crate', 'Know your tracks', 'Explore the parts', 'Find a starting pair', 'Line up your set', 'Make the mix'];
const nameKey = 'mixtape.dj-name.v1';
function savedName() { try { return sessionStorage.getItem(nameKey)?.slice(0, 64) || ''; } catch { return ''; } }

type Props = { route: ExperienceRoute | null; engine?: AudioEngine; library: Track[]; onLoadPair: (entries: CrateEntry[]) => Promise<void> };
export function Experience({ route, engine, library, onLoadPair }: Props) {
 // Keep this component mounted across navigation: names, crate, and playlist belong to the session.
 const [djName, setDjName] = useState(savedName);
 const [entries, setEntries] = useState<CrateEntry[]>([]), [playlist, setPlaylist] = useState<string[]>([]), [step, setStep] = useState(0);
 const [busy, setBusy] = useState(false), [error, setError] = useState('');
 const fileInput = useRef<HTMLInputElement>(null), heading = useRef<HTMLHeadingElement>(null);
 useEffect(() => { if (route && route.screen !== 'play') { window.scrollTo({ top: 0, behavior: 'instant' }); heading.current?.focus({ preventScroll: true }); } }, [route?.audience, route?.screen]);
 if (!route) return null;
 const { audience, screen } = route, kids = audience === 'kids';
 const go = (next: ExperienceRoute['screen']) => { location.hash = `${audience}${next === 'landing' ? '' : `/${next}`}`; };
 const add = (incoming: CrateEntry[]) => setEntries(current => [...current, ...incoming.filter(e => !current.some(c => c.track.id === e.track.id))].slice(0, 12));
 const demos = () => { if (engine) add(engine.session.fixtures.map(track => ({ track }))); };
 const acceptName = (alias: string) => { setDjName(alias); try { sessionStorage.setItem(nameKey, alias); } catch { /* Session still works without storage. */ } go('session'); };
 const addToPlaylist = (ids: string[]) => setPlaylist(current => [...new Set([...current, ...ids])]);
 async function upload(files: File[]) {
  if (!engine || busy) return;
  setBusy(true); setError('');
  try {
   if (entries.length + files.length > 12) throw new Error('This crate holds up to 12 tracks. Add a smaller batch.');
   const totalBytes = entries.reduce((sum, entry) => sum + (entry.file?.size || 0), 0) + files.reduce((sum, file) => sum + file.size, 0);
   if (totalBytes > 100 * 1024 * 1024) throw new Error('Keep this local crate under 100 MB. Add a smaller batch.');
   for (const file of files) add([await inspectLocalTrack(file, engine.context)]);
  } catch (e) { setError(e instanceof Error ? e.message : 'Could not add music.'); }
  finally { setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
 }
 async function loadSet(chosen?: CrateEntry[]) {
  const pair = chosen || playlist.slice(0, 2).map(id => entries.find(entry => entry.track.id === id)).filter((entry): entry is CrateEntry => !!entry);
  if (pair.length !== 2 || busy) return;
  setBusy(true); setError('');
  if (chosen) { add(chosen); setPlaylist(current => [...chosen.map(entry => entry.track.id), ...current.filter(id => !chosen.some(entry => entry.track.id === id))]); }
  const startedRoute = location.hash;
  try { await onLoadPair(pair); if (location.hash === startedRoute) go('play'); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load this pair.'); }
  finally { setBusy(false); }
 }
 const suggestion = recommendPair(entries);
 const setTracks = playlist.map(id => entries.find(entry => entry.track.id === id)).filter((entry): entry is CrateEntry => !!entry);

 return <section className={`experience experience-${audience}`} aria-label={`${kids ? 'Kids' : 'Afterhours'} experience`}>
  {screen === 'landing' && kids && <div className="experience-hero">
   <div className="experience-hero-copy"><p className="experience-kicker">{kids ? '🎧 A DJ booth you can play' : 'MIXTAPE PRESENTS · AFTERHOURS'}</p>
    <h1 ref={heading} tabIndex={-1}>{kids ? <>Make the<br/><em>music</em> move.</> : <>Your music.<br/><em>Your set.</em></>}</h1>
    <p>{kids ? 'Pick a DJ name. Choose your songs. Slide between two grooves and make something that sounds like you.' : 'Bring your tracks, line up a set, and step behind the decks. Your next mix starts here.'}</p>
    <div className="experience-actions"><button className="experience-primary" onClick={() => go(djName ? 'session' : 'name')}>{djName ? `Continue as ${djName} →` : kids ? 'Create my DJ name →' : 'Enter the booth →'}</button><button onClick={() => go('play')}>Jump into free play ↗</button></div>
    <small>Free play is open. Sound starts when you do.</small>
   </div><div className="experience-rig"><img src="/art/booth-illustration.svg" alt="Illustration of two players and the shared Mixtape mixer"/><span>✳ Always your hands</span></div>
  </div>}

  {screen === 'name' && <DJNameFlow kids={kids} djName={djName} onAccept={acceptName} onSkip={() => go('session')}/>}

  {(screen === 'session' || screen === 'play') && <div className="session-journey">
   <div className="session-welcome"><div><p className="experience-kicker">{kids ? 'YOUR NEXT GREAT NOISE' : 'YOUR SESSION · AFTERHOURS'}</p><h1 ref={heading} tabIndex={-1}>{djName || (kids ? 'Let’s make some noise.' : 'Your music. Your set.')}</h1></div><div className="experience-actions"><button onClick={() => go('name')}>{djName ? 'Change DJ name' : kids ? 'Create DJ name' : 'Choose DJ name'}</button>{screen !== 'play' && <button onClick={() => go('play')}>Jump into free play ↗</button>}</div></div>
   {!kids&&<><nav className="journey-steps" aria-label="Music workflow">{steps.map((label, index) => <button key={label} aria-current={(screen === 'play' ? 5 : step) === index ? 'step' : undefined} onClick={() => { if (index === 5) go('play'); else { setStep(index); go('session'); } }}><span>{String.fromCharCode(65 + index)}</span><strong>{label}</strong><small>{stepNotes[index]}</small></button>)}</nav>
   {screen === 'play' && <p className="journey-play-note">{kids ? 'Press play on A. Try the blend slider. Then bring in B.' : 'Your live session continues below.'} <a href={`#${audience}/session`}>Back to your crate ↑</a></p>}
   </>}
   {kids&&<nav className="kids-journey" aria-label="Your Kids session"><a aria-current={screen==='session'?'step':undefined} href="#kids/session">♫ Choose songs</a><a aria-current={screen==='play'?'step':undefined} href="#kids/play">✳ Make a mix</a></nav>}
   {kids&&screen==='session'&&<KidsSongs songs={[...entries,...(engine?.session.fixtures||[]).filter(track=>!entries.some(entry=>entry.track.id===track.id)).map(track=>({track}))]} playlist={playlist} busy={busy} error={error} onFiles={upload} onPlay={loadSet}/>}
   <div hidden={kids||screen === 'play'} className="journey-panel">
    {error && <p role="alert" className="journey-error">{error}</p>}
    {step === 0 && <><p className="experience-kicker">A / UPLOAD MUSIC</p><h2>{kids ? 'Pick your songs.' : 'Build your crate.'}</h2><p>Add audio from your device. Files stay in this browser; nothing is uploaded to a server. Up to 12 tracks, 25 MB and 10 minutes each.</p><div className="crate-drop"><span aria-hidden="true">↥</span><h3>Your next mix starts with a song.</h3><div className="experience-actions"><button className="experience-primary" disabled={!engine || busy} onClick={() => fileInput.current?.click()}>{busy ? 'Reading audio…' : 'Choose music files'}</button><button disabled={!engine || busy || entries.length >= 12} onClick={demos}>Use demo tracks</button></div><input ref={fileInput} type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" multiple aria-label="Add music to crate" hidden onChange={e => void upload(Array.from(e.target.files || []))}/><small>Browser-supported audio · crate resets when this page reloads</small></div>
     <CrateList entries={entries}/>{library.length > 0 && <details className="prepared-library"><summary>Add from the prepared local library</summary>{library.map(track => <button key={track.id} disabled={busy || entries.length >= 12 || entries.some(e => e.track.id === track.id)} onClick={() => add([{ track }])}>＋ {track.title} · {track.stems.length ? `${track.stems.length} stems` : 'Original'}</button>)}</details>}
    </>}
    {step === 1 && <><p className="experience-kicker">B / ANALYZE MUSIC</p><h2>Know what’s in the groove.</h2><p>Duration and audio format are read from your files. Automatic tempo and key analysis is not connected yet. You can keep going with the original audio.</p><div className="analysis-table"><table><thead><tr><th>Track</th><th>Duration</th><th>BPM / source</th><th>Key / source</th></tr></thead><tbody>{entries.map(({ track }) => <tr key={track.id}><th>{track.title}<small>{track.sampleRate.toLocaleString()} Hz · {track.channels} channel{track.channels === 1 ? '' : 's'}</small></th><td>{track.duration.toFixed(1)}s</td><td>{track.bpm ? `${track.bpm} · ${track.capabilities.includes('fixture-grid') ? 'fixture-known' : 'imported metadata'}` : 'Unknown'}</td><td>{track.rekordbox?.key ? `${track.rekordbox.key} · Rekordbox metadata` : 'Unknown'}</td></tr>)}</tbody></table></div>{!entries.length && <p>Add music or demo tracks to see their information.</p>}<p className="journey-note">An imported BPM or key is metadata, not a new analysis. Beat alignment needs its own check.</p></>}
    {step === 2 && <><p className="experience-kicker">C / CREATE STEMS</p><h2>{kids ? 'Meet the parts.' : 'Find room in the mix.'}</h2><p>Stems let you turn drums, bass, and other parts on and off. Creation from new uploads is not connected to this screen yet; original audio remains playable.</p><div className="stem-readiness">{entries.map(({ track }) => <article key={track.id}><h3>{track.title}</h3><p>{track.stems.length ? track.stems.map(stem => stem.name).join(' · ') : 'Original mix only · stems unavailable'}</p><small>{track.capabilities.includes('fixture-grid') ? 'Original generated components; not source separation.' : track.stems.length ? 'Prepared stems · alignment and files checked again when loaded.' : 'You can skip this step and keep mixing.'}</small></article>)}</div>{!entries.length && <p>Add tracks first. The demo tracks already include generated parts.</p>}<p className="journey-note">Use the demo tracks to try switching parts on and off, or continue with your original songs.</p></>}
    {step === 3 && <><p className="experience-kicker">D / RECOMMEND</p><h2>A place to start.</h2><p>A simple tempo comparison can suggest a starting pair. Your ears decide whether the blend works.</p>{suggestion ? <article className="pair-suggestion"><span>SIMILAR TEMPO · LOCAL RULE</span><h3>{suggestion.a.track.title}<em>→</em>{suggestion.b.track.title}</h3><p>{suggestion.a.track.bpm} → {suggestion.b.track.bpm} BPM · {suggestion.difference.toFixed(1)} BPM apart.</p><p>{[suggestion.a, suggestion.b].every(entry => entry.track.capabilities.includes('fixture-grid')) ? 'Uses fixture-known timing from the original demo tracks.' : 'Uses imported tempo metadata; beat alignment is unverified.'} Key compatibility has not been assessed.</p><button className="experience-primary" onClick={() => { addToPlaylist([suggestion.a.track.id, suggestion.b.track.id]); setStep(4); }}>Add pair to playlist →</button></article> : <p className="journey-note">No close-tempo pair is available from known metadata. Pick your own order in Playlist, or add the demo tracks.</p>}<p className="journey-note">This is a local tempo comparison. Astra can help once tracks are on the decks; recommendations for your whole crate are still to come.</p></>}
    {step === 4 && <><p className="experience-kicker">E / PLAYLIST</p><h2>{kids ? 'Your songs. Your order.' : 'Line up your set.'}</h2><p>Choose the first two tracks for A and B. Keep the rest here for your next handoff.</p><ol className="playlist">{setTracks.map(({ track }, i) => <li key={track.id}><span className="playlist-number">{String(i + 1).padStart(2, '0')}</span><div><strong>{track.title}</strong><small>{i < 2 ? `First pair · deck ${i === 0 ? 'A' : 'B'}` : 'In your set'}</small></div><div className="playlist-actions"><button disabled={busy || i === 0} aria-label={`Move ${track.title} up`} onClick={() => setPlaylist(ids => moveTrack(ids, track.id, -1))}>↑</button><button disabled={busy || i === setTracks.length - 1} aria-label={`Move ${track.title} down`} onClick={() => setPlaylist(ids => moveTrack(ids, track.id, 1))}>↓</button><button disabled={busy} aria-label={`Remove ${track.title}`} onClick={() => setPlaylist(ids => ids.filter(id => id !== track.id))}>×</button></div></li>)}</ol>{!setTracks.length && <p className="journey-note">Your playlist is open. Add a song below.</p>}<div className="playlist-crate"><h3>Add from your crate</h3>{entries.map(({ track }) => <button key={track.id} disabled={busy || playlist.includes(track.id)} onClick={() => addToPlaylist([track.id])}>{playlist.includes(track.id) ? '✓' : '＋'} {track.title}</button>)}{!entries.length && <button onClick={() => setStep(0)}>Add music →</button>}</div><div className="experience-actions"><button className="experience-primary" disabled={!engine || busy || setTracks.length < 2} onClick={() => void loadSet()}>{busy ? 'Loading your pair…' : 'Load first two & open booth →'}</button><small>Replaces A/B with your first pair, paused. Press play when ready. Later tracks load manually.</small></div></>}
    <div className="journey-next"><button disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>← Back</button>{step < 4 && <button disabled={busy} onClick={() => setStep(step + 1)}>Next · {steps[step + 1]} →</button>}{step === 4 && <button onClick={() => go('play')}>Keep current decks & play ↗</button>}</div>
   </div>
  </div>}
 </section>;
}

function CrateList({ entries }: { entries: CrateEntry[] }) { return <div className="crate-list"><h3>In your crate <span>{entries.length} / 12</span></h3>{entries.length ? entries.map(({ track }) => <div key={track.id}><strong>{track.title}</strong><small>{track.duration.toFixed(1)}s · {track.stems.length ? `${track.stems.length} parts prepared` : 'Original playable'}</small></div>) : <p>No songs yet. Your first two are waiting in the demos.</p>}</div>; }

export function ExperienceSwitch({ route }: { route: ExperienceRoute | null }) {
 const target: Audience = route?.audience === 'kids' ? 'advanced' : 'kids';
 return <a className="experience-switch" href={`#${target}${route && route.screen !== 'landing' ? `/${route.screen}` : ''}`}>{target === 'kids' ? 'KIDS' : 'Afterhours'}</a>;
}
