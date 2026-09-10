import { TrackSchema, type Track } from '../domain/session';

export type CrateEntry = { track: Track; file?: File };
export type Audience = 'kids' | 'advanced';
export type ExperienceRoute = { audience: Audience; screen: 'landing' | 'name' | 'session' | 'play' };

export function readExperienceRoute(hash: string): ExperienceRoute | null {
 const match = /^#(kids|advanced)(?:\/(name|session|play))?$/.exec(hash);
 return match ? { audience: match[1] as Audience, screen: (match[2] || 'landing') as ExperienceRoute['screen'] } : null;
}

// Decode for real technical metadata only. No estimated BPM, key, or stems are invented.
export async function inspectLocalTrack(file: File, context: BaseAudioContext): Promise<CrateEntry> {
 if (!file.size || file.size > 25 * 1024 * 1024) throw new Error('Choose a non-empty audio file under 25 MB.');
 const bytes = await file.arrayBuffer();
 const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(b => b.toString(16).padStart(2, '0')).join('');
 let audio: AudioBuffer;
 try { audio = await context.decodeAudioData(bytes); } catch { throw new Error(`Could not read ${file.name.slice(0, 100)} as audio. Try WAV or MP3.`); }
 if (audio.duration > 600) throw new Error('Choose a track shorter than 10 minutes.');
 const id = `local-${hash}`;
 return { file, track: TrackSchema.parse({ id, title: file.name.slice(0, 100), duration: audio.duration,
  sampleRate: audio.sampleRate, channels: audio.numberOfChannels, preparationVersion: 1, sourceOrigin: 0,
  cues: [0], provenance: 'local import · analysis unknown', capabilities: ['original-playable'], original: id, sha256: hash, stems: [] }) };
}

export function recommendPair(entries: CrateEntry[]) {
 let best: { a: CrateEntry; b: CrateEntry; difference: number } | undefined;
 for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
  const a = entries[i], b = entries[j];
  if (!a.track.bpm || !b.track.bpm || a.track.id === b.track.id) continue;
  const difference = Math.abs(a.track.bpm - b.track.bpm);
  if (difference / Math.min(a.track.bpm, b.track.bpm) > .04) continue;
  if (!best || difference < best.difference) best = { a, b, difference };
 }
 return best;
}

export function moveTrack(ids: string[], id: string, direction: -1 | 1) {
 const index = ids.indexOf(id), next = index + direction;
 if (index < 0 || next < 0 || next >= ids.length) return ids;
 const result = [...ids];
 [result[index], result[next]] = [result[next], result[index]];
 return result;
}
