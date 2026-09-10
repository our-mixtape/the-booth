// Original deterministic synthesis. No samples, model audio, or separated vocals.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const rate=24000, duration=32, size=rate*duration;
await mkdir('public/audio',{recursive:true});
const tracks=[];
function wav(data){const b=Buffer.alloc(44+data.length*2); b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(data.length*2,40);data.forEach((v,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));return b;}
for(const [variant,title] of ['Amber Current','Afterglow Steps'].entries()){
 let seed=527+variant;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
 const stems={drums:new Float32Array(size),bass:new Float32Array(size),melody:new Float32Array(size)};
 const notes=variant?[0,7,10,14,12,10,7,3]:[0,3,7,10,7,3,12,7];
 for(let i=0;i<size;i++){
  const t=i/rate, beat=t%0.5, eighth=t%0.25, beatNo=Math.floor(t/0.5);
  const kick=0.48*Math.sin(2*Math.PI*(49*beat+8*(1-Math.exp(-beat*30))))*Math.exp(-beat*19);
  const hat=noise()*0.065*Math.exp(-eighth*110)*(1-Math.exp(-eighth*1500));
  const clap=beatNo%2===1?noise()*0.11*Math.exp(-beat*38):0;
  stems.drums[i]=kick+hat+clap;
  const bassT=(t+0.25)%0.5,freq=55*Math.pow(2,(Math.floor(t/4)%4===3?3:0)/12);
  stems.bass[i]=0.18*(Math.sin(2*Math.PI*freq*t)+0.2*Math.sin(2*Math.PI*freq*2*t))*Math.min(1,bassT*140)*Math.exp(-bassT*7);
  const note=notes[Math.floor(t/(variant?0.25:0.5))%notes.length]; const mt=t%(variant?0.25:0.5), hz=220*Math.pow(2,note/12);
  stems.melody[i]=(variant?0.095:0.12)*(Math.sin(2*Math.PI*hz*mt)+0.3*Math.sin(2*Math.PI*hz*2*mt))*Math.min(1,mt*120)*Math.exp(-mt*(variant?13:7));
  // Tiny endpoint taper keeps the 16-bar repeat click-free.
  const edge=Math.min(1,t/0.005,(duration-t)/0.005); for(const s of Object.values(stems))s[i]*=edge;
 }
 const id=variant?'afterglow':'amber', files=[];
 for(const [name,data]of Object.entries(stems)){const bytes=wav(data),file=`/audio/${id}-${name}.wav`;await writeFile(`public${file}`,bytes);files.push({name,file,sha256:createHash('sha256').update(bytes).digest('hex')});}
 const original=new Float32Array(size);for(let i=0;i<size;i++) original[i]=stems.drums[i]+stems.bass[i]+stems.melody[i];
 const bytes=wav(original);await writeFile(`public/audio/${id}.wav`,bytes);
 tracks.push({id,title,duration,sampleRate:rate,channels:1,preparationVersion:1,sourceOrigin:0,bpm:120,beatOrigin:0,cues:[0,8,16,24],provenance:'fixture-known · original procedural synthesis',capabilities:['original-playable','fixture-grid','stems-available'],original:`/audio/${id}.wav`,sha256:createHash('sha256').update(bytes).digest('hex'),stems:files});
}
await writeFile('public/audio/manifest.json',JSON.stringify(tracks,null,2));console.log('Generated two original 16-bar tracks and six aligned PCM stems (24 kHz mono).');
