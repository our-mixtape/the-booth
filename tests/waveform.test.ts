import {expect,it} from 'vitest';
import {sourceEnvelope} from '../src/audio/waveform';
const buffer=(channels:number[][])=>({sampleRate:4,length:channels[0].length,numberOfChannels:channels.length,getChannelData:(i:number)=>new Float32Array(channels[i])}) as AudioBuffer;
it('sums aligned stems before measuring peaks and preserves stereo transients',()=>{
 expect([...sourceEnvelope([buffer([[.5,-.5,0,0]]),buffer([[-.5,.5,0,0]])],2)]).toEqual([0,0]);
 expect([...sourceEnvelope([buffer([[0,0,0,0],[0,.8,0,.3]])],2)]).toEqual([expect.closeTo(.8),expect.closeTo(.3)]);
});
