import { it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TrackSchema } from '../src/domain/session';
it('fixtures are complete aligned PCM, bounded and content-addressed',()=>{
 const tracks=TrackSchema.array().parse(JSON.parse(readFileSync('public/audio/manifest.json','utf8')));
 for(const track of tracks){let sum:Float64Array|undefined;for(const stem of track.stems){const bytes=readFileSync(`public${stem.file}`);expect(createHash('sha256').update(bytes).digest('hex')).toBe(stem.sha256);expect(bytes.readUInt32LE(24)).toBe(track.sampleRate);expect(bytes.readUInt16LE(22)).toBe(1);expect((bytes.length-44)/2).toBe(track.sampleRate*track.duration);sum??=new Float64Array((bytes.length-44)/2);let energy=0;for(let i=0;i<sum.length;i++){const v=bytes.readInt16LE(44+i*2)/32767;sum[i]+=v;energy+=v*v;}expect(energy/sum.length).toBeGreaterThan(.0001);}
 let peak=0;for(const v of sum!)peak=Math.max(peak,Math.abs(v));expect(peak).toBeLessThan(.95);
 }
});
