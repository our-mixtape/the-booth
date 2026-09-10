import {it,expect} from 'vitest';
import {beatMarkers} from '../src/domain/beat-grid';
import type {Track} from '../src/domain/session';
it('respects exported beat phase and switches at a new tempo anchor',()=>{
 const track={duration:10,rekordbox:{grid:[{at:.25,bpm:120,beat:4,meter:'4/4'},{at:1.25,bpm:60,beat:2,meter:'4/4'}]}} as Track;
 expect(beatMarkers(track,0,3)).toEqual([{at:.25,beat:4},{at:.75,beat:1},{at:1.25,beat:2},{at:2.25,beat:3}]);
});
it('does not invent a beat grid from average BPM alone',()=>{
 expect(beatMarkers({duration:10,bpm:120,provenance:'local original'} as Track,0,3)).toEqual([]);
});
