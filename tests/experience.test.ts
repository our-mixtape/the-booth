import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TrackSchema } from '../src/domain/session';
import { moveTrack, readExperienceRoute, recommendPair } from '../src/experience/crate';

const tracks = TrackSchema.array().parse(JSON.parse(readFileSync('public/audio/manifest.json', 'utf8')));
it('only recognizes experience routes, preserving old booth and help anchors', () => {
 expect(readExperienceRoute('#kids')).toEqual({ audience: 'kids', screen: 'landing' });
 expect(readExperienceRoute('#advanced/play')).toEqual({ audience: 'advanced', screen: 'play' });
 for (const hash of ['#play', '#assist', '#kids/wrong', '#kids/name/extra']) expect(readExperienceRoute(hash)).toBeNull();
});
it('unknown imported tempo cannot produce a recommendation or borrow fixture timing', () => {
 const imported = { ...tracks[0], id: 'import', bpm: undefined, capabilities: ['original-playable'], stems: [] };
 expect(recommendPair([{ track: tracks[0] }, { track: imported }])).toBeUndefined();
 expect(imported.bpm).toBeUndefined();
});
it('only suggests distinct tracks within four percent of known source tempo', () => {
 expect(recommendPair(tracks.map(track => ({ track })))?.difference).toBe(0);
 expect(recommendPair([{ track: tracks[0] }, { track: { ...tracks[1], bpm: 150 } }])).toBeUndefined();
 expect(recommendPair([{ track: tracks[0] }, { track: tracks[0] }])).toBeUndefined();
});
it('reordering changes the first pair without losing queued tracks or wrapping at the ends', () => {
 const ids = ['one', 'two', 'three'];
 expect(moveTrack(ids, 'three', -1)).toEqual(['one', 'three', 'two']);
 expect(moveTrack(ids, 'one', -1)).toBe(ids);
 expect(moveTrack(ids, 'three', 1)).toBe(ids);
 expect(moveTrack(ids, 'missing', -1)).toBe(ids);
 expect(ids).toEqual(['one', 'two', 'three']);
});
