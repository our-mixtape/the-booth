import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
test('local prepared exercise captures a real handoff and restores its checkpoint',async({page,request})=>{
 test.setTimeout(120000);const response=await request.get('/api/exercise');test.skip(!response.ok(),'Private prepared pair is not installed');
 await page.goto('/');await page.getByRole('button',{name:'Start audio',exact:false}).click();await page.getByRole('button',{name:'Load prepared exercise',exact:true}).click();
 await expect(page.getByLabel('Transition practice')).toContainText('Starting cues and mixer settings saved',{timeout:60000});
 const evidence=await page.evaluate(async()=>{
  const path='/src/audio/engine.ts';const {getEngine}=await import(/* @vite-ignore */ path) as typeof import('../src/audio/engine');const e=await getEngine();
  const checkpoint=structuredClone(e.session.checkpoint);const chunks:Blob[]=[];const rec=new MediaRecorder(e.capture.stream);rec.ondataavailable=v=>chunks.push(v.data);rec.start();e.command({type:'retry'});
  const target=e.session.attempt.startedAt+e.session.exercise.entryAfter;while(e.context.currentTime<target)await new Promise(r=>setTimeout(r,5));
  e.command({type:'play',deck:'B'});e.command({type:'crossfader',value:.5});await new Promise(r=>setTimeout(r,1500));e.command({type:'crossfader',value:1});
  const result=structuredClone(e.session.attempt);await new Promise(r=>setTimeout(r,400));await new Promise<void>(r=>{rec.onstop=()=>r();rec.stop();});
  const blob=new Blob(chunks,{type:rec.mimeType});const url=URL.createObjectURL(blob);const buffer=await e.context.decodeAudioData(await blob.arrayBuffer());let peak=0,sum=0;for(const v of buffer.getChannelData(0)){peak=Math.max(peak,Math.abs(v));sum+=v*v;}
  e.command({type:'filter',deck:'A',value:.2});e.command({type:'rate',deck:'B',value:.9});e.command({type:'retry'});
  const restored=Object.entries(checkpoint.decks).every(([id,deck])=>{const actual=e.session.decks[id as 'A'|'B'|'C'|'D'];return actual.track.id===deck.track.id&&actual.track.preparationVersion===deck.track.preparationVersion&&actual.offset===deck.offset&&actual.rate===deck.rate&&actual.filter===deck.filter&&JSON.stringify(actual.stems)===JSON.stringify(deck.stems)&&JSON.stringify(actual.eq)===JSON.stringify(deck.eq);});e.command({type:'stop'});
  return {status:result.status,entryError:result.entryError,restored,peak,rms:Math.sqrt(sum/buffer.length),duration:buffer.duration,url,entryAfter:e.session.exercise.entryAfter,endAfter:e.session.exercise.endAfter};
 });
 expect(evidence.status).toBe('complete');expect(evidence.restored).toBe(true);expect(evidence.rms).toBeGreaterThan(.005);expect(evidence.peak).toBeLessThan(1);
 await mkdir('local-tracks/evidence',{recursive:true});await writeFile('local-tracks/evidence/exercise-audio.json',JSON.stringify({...evidence,url:undefined},null,2));
 const bytes=await page.evaluate(async(url)=>Array.from(new Uint8Array(await(await fetch(url)).arrayBuffer())),evidence.url);await writeFile('local-tracks/evidence/exercise-handoff.webm',Buffer.from(bytes));
 await page.getByLabel('Transition practice').scrollIntoViewIfNeeded();await page.screenshot({path:'local-tracks/evidence/exercise-browser.png'});
});
