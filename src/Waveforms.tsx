import { useEffect, useRef, useState } from 'react';
import type { AudioEngine } from './audio/engine';
import { deckIds, type DeckId } from './domain/session';
import type { Layout } from './scene/booth';
import './waveforms.css';
import {beatMarkers} from './domain/beat-grid';
import { boothPalette as palette, deckColors as colors } from './booth-palette';
const cache=new WeakMap<AudioBuffer,Float32Array>();
export function Waveforms({engine,layout}:{engine:AudioEngine;layout:Layout}){
 const canvas=useRef<HTMLCanvasElement>(null);const [seconds,setSeconds]=useState(8);
 const [state,setState]=useState(()=>engine.snapshot());
 useEffect(()=>{
  const worker=new Worker(new URL('./audio/waveform.worker.ts',import.meta.url),{type:'module'}),pending=new WeakSet<AudioBuffer>(),requests=new Map<number,AudioBuffer>();let sequence=0;
  worker.onmessage=(event:MessageEvent<{id:number;peaks:Float32Array}>)=>{const key=requests.get(event.data.id);if(key){cache.set(key,event.data.peaks);requests.delete(event.data.id);}};
  let frame=0,last=0;const el=canvas.current!,ctx=el.getContext('2d')!;
  function draw(now:number){
   frame=requestAnimationFrame(draw);if(now-last<33||el.clientWidth===0)return;last=now;
   const snap=engine.snapshot();setState(snap);
   const ids:readonly DeckId[]=layout==='digital4'?deckIds:deckIds.filter(id=>id==='A'||id==='B'||snap.decks[id].playing);
   const width=el.clientWidth,height=ids.length*66,dpr=Math.min(devicePixelRatio,2);
   if(el.width!==Math.round(width*dpr)||el.height!==height*dpr){el.width=Math.round(width*dpr);el.height=height*dpr;el.style.height=`${height}px`;}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=palette.surface;ctx.fillRect(0,0,width,height);
   const head=width*.28,scale=width/seconds;
   let allReady=true;
   ids.forEach((id,row)=>{
    const deck=snap.decks[id],track=deck.track,y=row*66;
    const buffers=(track.stems.length?track.stems.map(s=>s.file):[track.original]).map(f=>engine.buffers.get(f)).filter((b):b is AudioBuffer=>!!b);
    const peaks=buffers[0]&&cache.get(buffers[0]);
    if(!peaks&&buffers.length&&!pending.has(buffers[0])){pending.add(buffers[0]);const id=++sequence;requests.set(id,buffers[0]);worker.postMessage({id,buffers:buffers.map(b=>({sampleRate:b.sampleRate,channels:Array.from({length:b.numberOfChannels},(_,i)=>b.getChannelData(i))}))});}
    ctx.fillStyle=row%2?palette.alternateSurface:palette.surface;ctx.fillRect(0,y,width,66);
    const start=deck.position-head/scale,end=start+seconds;
    for(const marker of beatMarkers(track,start,end)){
     const x=(marker.at-start)*scale;ctx.fillStyle=marker.beat===1?palette.strongLine:palette.line;ctx.fillRect(x,y,1,66);
     if(marker.beat===1){ctx.fillStyle=palette.muted;ctx.font='10px monospace';ctx.fillText(track.rekordbox?'1':`${Math.round(marker.at/(60/track.bpm!)/4)+1}`,x+4,y+12);}
    }
    for(const mark of track.rekordbox?.marks??[]){if(mark.at<start||mark.at>=end||mark.at<0)continue;const x=(mark.at-start)*scale;ctx.fillStyle=palette.cue;ctx.fillRect(x,y+17,2,45);ctx.font='9px monospace';ctx.fillText(mark.type===4?'LOOP':mark.number>=0?`C${mark.number+1}`:'M',x+3,y+25);}
    if(!peaks){allReady=false;ctx.fillStyle=palette.muted;ctx.font='10px monospace';ctx.fillText('Building waveform…',head+12,y+40);}
    if(peaks){ctx.strokeStyle=colors[id];ctx.lineWidth=1;ctx.beginPath();
     for(let x=0;x<width;x++){
      const t=start+x/scale;if(t<0||t>=track.duration)continue;
      let peak=0;for(let b=Math.floor(t*200);b<=Math.floor((t+1/scale)*200);b++)peak=Math.max(peak,peaks[b]??0);
      const amp=Math.min(1,peak)*24;ctx.moveTo(x,y+38-amp);ctx.lineTo(x,y+38+amp);
     }ctx.stroke();
    }
    ctx.fillStyle='#c3c9ff09';ctx.fillRect(0,y,head,66);
    ctx.fillStyle=palette.background;ctx.fillRect(0,y+65,width,1);
   });
   el.dataset.ready=String(allReady);
   ctx.fillStyle=palette.text;ctx.fillRect(head-1,0,2,height);
  }
  frame=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(frame);worker.terminate();};
 },[engine,layout,seconds]);
 const ids=layout==='digital4'?deckIds:deckIds.filter(id=>id==='A'||id==='B'||state.decks[id].playing);
 return <section className="waveforms" aria-label="Live track waveforms"><div className="waveform-heading"><strong>FOLLOW THE MIX <span>Source waveforms</span></strong><label>Window <select aria-label="Waveform time window" value={seconds} onChange={e=>setSeconds(+e.target.value)}><option value={8}>8 seconds</option><option value={16}>16 seconds</option></select></label></div><div className="waveform-body"><div className="waveform-labels">{ids.map(id=><div key={id} style={{borderLeftColor:colors[id]}}><b style={{color:colors[id]}}>{id}</b><span><strong>{state.decks[id].track.title}</strong><small>{state.decks[id].track.bpm?`${state.decks[id].track.bpm} BPM · ${state.decks[id].track.rekordbox?'Rekordbox':'fixture grid'}`:'Grid unknown'} · {state.decks[id].playing?'PLAY':'CUE'}</small><output aria-label={`Waveform ${id} position`}>{state.decks[id].position.toFixed(1)}s</output></span></div>)}</div><div className="waveform-traces"><span className="playhead-label">NOW</span><canvas ref={canvas} aria-label="Scrolling source amplitude waveforms with a shared playhead"/></div></div><p>Same time scale · Rekordbox: beat 1 + cue markers, alignment unverified · source audio before EQ & levels</p></section>;
}
