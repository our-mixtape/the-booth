import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
test('real engine rate and seek retain synchronized stems and audible output',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Start audio',exact:false}).click();
 const evidence=await page.evaluate(async()=>{
  const modulePath='/src/audio/engine.ts';const {getEngine}=await import(/* @vite-ignore */ modulePath) as typeof import('../src/audio/engine');const engine=await getEngine();
  const chunks:Blob[]=[];const recorder=new MediaRecorder(engine.capture.stream);recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();
  engine.command({type:'play',deck:'A'});await new Promise(r=>setTimeout(r,300));
  const before=engine.snapshot().decks.A.position;engine.command({type:'rate',deck:'A',value:1.1});const after=engine.snapshot().decks.A.position;
  await new Promise(r=>setTimeout(r,500));const rates=engine.sources.A.map(s=>s.playbackRate.value);
  const advanced=engine.snapshot().decks.A.position-after;engine.command({type:'seek',deck:'A',position:8});
  const seek=engine.snapshot().decks.A.position,playing=engine.session.decks.A.playing;
  await new Promise(r=>setTimeout(r,500));engine.command({type:'pause',deck:'A'});const paused=engine.snapshot().decks.A.position;
  await new Promise(r=>setTimeout(r,100));const pausedLater=engine.snapshot().decks.A.position;
  engine.command({type:'cue',deck:'A'});const cue=engine.snapshot().decks.A.position;
  await new Promise<void>(r=>{recorder.onstop=()=>r();recorder.stop();});
  const buffer=await engine.context.decodeAudioData(await new Blob(chunks).arrayBuffer());const data=buffer.getChannelData(0);let sum=0,peak=0;for(const v of data){sum+=v*v;peak=Math.max(peak,Math.abs(v));}
  return {before,after,rates,advanced,seek,playing,paused,pausedLater,cue,rms:Math.sqrt(sum/data.length),peak,duration:buffer.duration};
 });
 expect(Math.abs(evidence.after-evidence.before)).toBeLessThan(.04);expect(evidence.rates).toHaveLength(3);for(const rate of evidence.rates)expect(rate).toBeCloseTo(1.1);expect(evidence.advanced).toBeGreaterThan(.48);expect(evidence.advanced).toBeLessThan(.7);expect(evidence.seek).toBeCloseTo(8,1);expect(evidence.playing).toBe(true);expect(evidence.pausedLater).toBe(evidence.paused);expect(evidence.cue).toBe(0);expect(evidence.rms).toBeGreaterThan(.005);expect(evidence.peak).toBeLessThan(1);
 await writeFile('docs/evidence/rate-seek-audio.json',JSON.stringify(evidence,null,2));
});
test('opposite-polarity stem pair nulls through rate and seek, and becomes audible when one is muted',async({page})=>{
 await page.goto('/');const result=await page.evaluate(async()=>{
  const path='/src/audio/engine.ts';const {AudioEngine}=await import(/* @vite-ignore */ path) as typeof import('../src/audio/engine');
  const track={id:'null-test',title:'Original phase test',duration:2,sampleRate:48000,channels:1,preparationVersion:1,sourceOrigin:0,cues:[0],provenance:'fixture-known',capabilities:[],original:'test',sha256:'test',stems:[{name:'drums' as const,file:'positive',sha256:'test'},{name:'bass' as const,file:'negative',sha256:'test'}]};const e=new AudioEngine([track,track]);await e.resume();
  for(const [i,stem] of track.stems.entries()){const b=e.context.createBuffer(1,e.context.sampleRate*2,e.context.sampleRate),data=b.getChannelData(0);for(let n=0;n<data.length;n++)data[n]=.4*Math.sin(n*2*Math.PI*333/e.context.sampleRate)*(i?-1:1);e.buffers.set(stem.file,b);}
  e.command({type:'play',deck:'A'});await new Promise(r=>setTimeout(r,100));const initial=e.meter('A');e.command({type:'rate',deck:'A',value:1.13});await new Promise(r=>setTimeout(r,100));const rate=e.meter('A');e.command({type:'seek',deck:'A',position:.712});await new Promise(r=>setTimeout(r,100));const seek=e.meter('A');e.command({type:'stem',deck:'A',stem:'bass',enabled:false});await new Promise(r=>setTimeout(r,100));const solo=e.meter('A');e.command({type:'stop'});await e.context.close();return {initial,rate,seek,solo};
 });expect(result.initial).toBeLessThan(.00001);expect(result.rate).toBeLessThan(.00001);expect(result.seek).toBeLessThan(.00001);expect(result.solo).toBeGreaterThan(.1);await writeFile('docs/evidence/stem-null-check.json',JSON.stringify(result,null,2));
});
test('late prepared loads and checksum failures cannot replace the current deck',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Start audio',exact:false}).click();
 await page.route('**/api/library/local-aaaaaaaa*/original.wav',async route=>{await new Promise(r=>setTimeout(r,200));await route.fulfill({path:'public/audio/amber.wav',contentType:'audio/wav'});});
 const result=await page.evaluate(async()=>{
  const path='/src/audio/engine.ts';const {getEngine}=await import(/* @vite-ignore */ path) as typeof import('../src/audio/engine');const e=await getEngine();const id='local-'+'a'.repeat(64),track={...e.session.fixtures[0],id,original:`/api/library/${id}/original.wav`,originalSha256:undefined,stems:[]};
  e.command({type:'play',deck:'B'});const pending=e.loadPrepared('A',track);e.loadFixture('A',e.session.fixtures[1].id);await pending;const staleKept=e.session.decks.A.track.id===e.session.fixtures[1].id;
  let failed=false;try{await e.loadPrepared('A',{...track,originalSha256:'bad-hash'});}catch{failed=true;}const failedKept=e.session.decks.A.track.id===e.session.fixtures[1].id,manualContinues=e.session.decks.B.playing;e.command({type:'stop'});return {staleKept,failed,failedKept,manualContinues};
 });expect(result).toEqual({staleKept:true,failed:true,failedKept:true,manualContinues:true});
});
