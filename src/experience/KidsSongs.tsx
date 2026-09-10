import { useState } from 'react';
import type { CrateEntry } from './crate';

type Props = { songs: CrateEntry[]; playlist: string[]; busy: boolean; error: string; onFiles: (files: File[]) => Promise<void>; onPlay: (pair: CrateEntry[]) => Promise<void> };
export function KidsSongs({ songs, playlist, busy, error, onFiles, onPlay }: Props) {
 const [choices, setChoices] = useState<[string, string]>(['', '']);
 const selected = choices.map((choice, index) => songs.find(song => song.track.id === (choice || playlist[index])) || songs[index]);
 const valid = selected.every(Boolean) && selected[0].track.id !== selected[1].track.id;
 return <section className="kids-song-picker" aria-label="Choose two songs">
  <p className="kids-eyebrow">1 / PICK TWO SONGS</p><h2>A little of this.<br/><em>A little of that.</em></h2>
  <p>We’ve put two original grooves on the shelf. Try them first, or bring a song you love.</p>
  <div className="kids-song-shelf">{(['A', 'B'] as const).map((deck, i) => <label key={deck} className={`kids-song-choice song-${deck}`}><span className="kids-disc" aria-hidden="true">{i === 0 ? '☀' : '☾'}</span><strong>Song {deck}</strong><select aria-label={`Choose song ${deck}`} disabled={busy || !songs.length} value={selected[i]?.track.id || ''} onChange={event => setChoices(current => i === 0 ? [event.target.value, current[1]] : [current[0], event.target.value])}>{songs.map(({ track }) => <option key={track.id} value={track.id}>{track.title}</option>)}</select><small>{selected[i]?.track.stems.length ? 'Try turning the musical parts on and off.' : 'Ready to play as one whole song.'}</small></label>)}</div>
  {error && <p className="journey-error" role="alert">{error}</p>}
  {!valid && songs.length > 0 && <p>Choose two different songs so you can hear them meet.</p>}
  <div className="experience-actions"><button className="experience-primary" disabled={!valid || busy} onClick={() => void onPlay(selected)}>{busy ? 'Getting your songs ready…' : 'Play these songs →'}</button><a href="#kids/play">Keep my current mix ↗</a></div>
  <small>These choices replace songs A and B. Press play when you’re ready.</small>
  <details className="kids-own-music"><summary>＋ Bring your own songs</summary><p>Choose audio from this device. Each file can be up to 25 MB and 10 minutes; your songs stay here in the browser.</p><label className="kids-file-picker">Choose music files<input type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac" multiple disabled={busy} aria-label="Add your own songs" onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void onFiles(files); }}/></label><p>New songs appear in the two menus above. You can mix them without waiting for analysis or separate parts.</p></details>
 </section>;
}
