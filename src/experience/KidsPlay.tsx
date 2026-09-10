import { useEffect, useRef, useState } from 'react';
import type { AudioEngine } from '../audio/engine';
import type { Command, StemName } from '../domain/session';
import { advanceAdventure, beginAdventure, type Adventure } from './kids-adventure';
const lessons = [
 { title: 'Wake up a song.', hint: 'Tap Play on either song. Turn up its volume and slide the mix toward it.', concept: 'Each deck holds one song. You decide when it starts.', icon: '▶' },
 { title: 'Put a blanket on the sound.', hint: 'Move Muffled ↔ Clear on the song you can hear. What changes?', concept: 'A filter softens the bright sounds, like a blanket over a speaker.', icon: '☁' },
 { title: 'Let two worlds meet.', hint: 'Play both songs, then move the big mix slider toward the middle.', concept: 'The middle makes room for both songs. Try moving slowly.', icon: '↔' },
 { title: 'You made your first blend!', hint: 'What would you change next? Keep exploring, or try the discoveries again.', concept: 'You started a song, shaped its tone, and brought two songs together.', icon: '✳' },
];
const partLabels: Record<StemName, string> = { drums: '🥁 Drums', bass: '🎸 Bass', melody: '🎹 Tune', vocals: '🎤 Voice', other: '✳ Other sounds' };
type Props = { engine: AudioEngine; snapshot: ReturnType<AudioEngine['snapshot']>; ready: boolean; active: boolean; onStart: () => Promise<void>; send: (command: Command) => void };
export function KidsPlay({ engine, snapshot, ready, active, onStart, send }: Props) {
 const [activity, setActivity] = useState<Adventure | null>(null);
 const wasActive = useRef(active);
 useEffect(() => {
  if (!active) { wasActive.current = false; return; }
  const resumed = !wasActive.current; wasActive.current = true;
  setActivity(current => {
   if (!current) return current;
   if (resumed) { const checked = advanceAdventure(current, snapshot, engine.context.currentTime, { A: 0, B: 0 }); return beginAdventure(snapshot, engine.context.currentTime, checked.stage, checked.observations); }
   return advanceAdventure(current, snapshot, engine.context.currentTime, { A: engine.meter('A'), B: engine.meter('B') });
  });
 }, [snapshot, active, engine]);
 const lesson = lessons[activity?.stage || 0];
 return <section className="kids-play" hidden={!active} aria-label="Kids mixing playground">
  <div className={`kids-coach ${activity?.stage === 3 ? 'discovered' : ''}`}>
   <span className="kids-coach-icon" aria-hidden="true">{activity ? lesson.icon : '✳'}</span><div className="kids-coach-copy"><p className="kids-eyebrow">{activity ? 'YOUR SOUND ADVENTURE' : 'THREE LITTLE DISCOVERIES'}</p><div aria-live="polite"><h2>{activity ? lesson.title : 'Let’s find out what sound can do.'}</h2><p>{activity ? lesson.hint : 'Start a song. Change its sound. Mix it with another. We’ll try one thing at a time.'}</p>{activity && <small>{lesson.concept}</small>}</div>
    <ol className="kids-discoveries" aria-label="Sound discoveries">{['Start a song', 'Shape a sound', 'Make a blend'].map((label, index) => <li key={label} aria-current={activity?.stage === index ? 'step' : undefined} data-complete={!!activity && activity.stage > index}><span>{activity && activity.stage > index ? '✓' : index + 1}</span>{label}</li>)}</ol>
    {activity && activity.observations.length > 0 && <p className="kids-observation" role="status">{activity.observations.at(-1)}</p>}
   </div><div className="kids-coach-actions">{!ready ? <button disabled={!engine} onClick={() => void onStart()}>↗ Turn on sound</button> : <button onClick={() => setActivity(beginAdventure(snapshot, engine.context.currentTime))}>{activity ? '↻ Try the discoveries again' : 'Let’s try it →'}</button>}<small>Built-in tips · always available</small></div>
  </div>
  <div className="kids-decks">{(['A', 'B'] as const).map((id, index) => { const deck = snapshot.decks[id]; return <article className={`kids-deck song-${id}`} key={id} aria-label={`Song ${id} controls`}>
   <div className="kids-track-heading"><span className="kids-deck-token" aria-hidden="true">{index === 0 ? '☀' : '☾'}</span><div><p className="kids-eyebrow">SONG {id}</p><h3>{deck.track.title}</h3><output aria-label={`Song ${id} playback`}>{deck.playing ? 'Playing' : 'Paused'} · {Math.floor(deck.position / 60)}:{String(Math.floor(deck.position % 60)).padStart(2, '0')}</output></div></div>
   <div className="kids-transport"><button disabled={!ready} aria-pressed={deck.playing} onClick={() => send({ type: deck.playing ? 'pause' : 'play', deck: id })}>{deck.playing ? 'Ⅱ Pause' : '▶ Play'} {id}</button><button disabled={!ready} onClick={() => send({ type: 'cue', deck: id })}>↶ Back to start</button></div>
   <label>Volume <output>{Math.round(deck.gain * 100)}%</output><input aria-label={`Song ${id} volume`} disabled={!ready} type="range" min="0" max="1" step=".01" value={deck.gain} onChange={e => send({ type: 'gain', deck: id, value: +e.target.value })}/></label>
   <label>Muffled <span>↔ Clear</span><input aria-label={`Song ${id} sound`} disabled={!ready} type="range" min="0" max="1" step=".01" value={deck.filter} onChange={e => send({ type: 'filter', deck: id, value: +e.target.value })}/></label>
   <details className="kids-parts"><summary>✳ Play with the parts</summary><p>What happens when one part takes a break?</p><div>{deck.track.stems.length ? deck.track.stems.map(({ name }) => <button disabled={!ready} aria-pressed={deck.stems[name]} key={name} onClick={() => send({ type: 'stem', deck: id, stem: name, enabled: !deck.stems[name] })}>{partLabels[name]}</button>) : <p>This song is one whole mix. Try Volume and Muffled ↔ Clear instead.</p>}</div><small>{deck.track.capabilities.includes('fixture-grid') ? 'Original demo parts, made separately.' : 'Only prepared parts are shown.'}</small></details>
  </article>; })}</div>
  <div className="kids-blend"><div><h2>Mix the songs.</h2><p>Slide toward the song you want to hear more.</p></div><label><span>☀ More A</span><span>More B ☾</span><input aria-label="Mix the songs" type="range" min="0" max="1" step=".01" disabled={!ready} value={snapshot.crossfader} onChange={e => send({ type: 'crossfader', value: +e.target.value })}/></label></div>
  {(['C', 'D'] as const).some(id => snapshot.decks[id].playing) && <div className="kids-extra-songs"><p>Other songs from your Afterhours mix are still playing.</p><button onClick={() => { send({ type: 'pause', deck: 'C' }); send({ type: 'pause', deck: 'D' }); }}>Pause those other songs</button></div>}
  <div className="kids-play-links"><a href="#kids/session">♫ Choose different songs</a><button disabled={!ready} onClick={() => send({ type: 'stop' })}>Ⅱ Pause all songs</button></div>
 </section>;
}
