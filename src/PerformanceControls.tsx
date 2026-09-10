import type { AudioEngine } from './audio/engine';
import type { Command, DeckId } from './domain/session';

type Props = { snapshot: ReturnType<AudioEngine['snapshot']>; ready: boolean; send: (command: Command) => void; onLoad: (id: DeckId) => void };
export function PerformanceControls({ snapshot, ready, send, onLoad }: Props) {
 return <section className="performance-controls" aria-label="Essential performance controls">
  {(['A','B'] as const).map(id=>{
   const deck=snapshot.decks[id];
   const cues=deck.track.rekordbox?.marks.filter(mark=>mark.at>=0&&mark.at<deck.track.duration)??[];
   return <article className="performance-deck" key={id} aria-label={`Deck ${id} performance`}>
    <header><strong>{id}</strong><div><h3>{deck.track.title}</h3><output>{deck.position.toFixed(1)} s · {deck.playing?'playing':'paused'}</output></div><button onClick={()=>onLoad(id)}>Load {id} ↗</button></header>
    <div className="performance-transport"><button disabled={!ready} aria-pressed={deck.playing} onClick={()=>send({type:deck.playing?'pause':'play',deck:id})}>{deck.playing?'Ⅱ Pause':'▶ Play'} {id}</button><button disabled={!ready} onClick={()=>send({type:'cue',deck:id})}>Reset {id} · 0:00</button></div>
    <div className="performance-knobs">{(['gain','filter'] as const).map(control=><label key={control}>{control==='gain'?'Level':'Filter'} <output>{Math.round(deck[control]*100)}%</output><input aria-label={`Performance ${control} ${id}`} type="range" min="0" max="1" step="0.01" disabled={!ready} value={deck[control]} onChange={e=>send({type:control,deck:id,value:+e.target.value})}/></label>)}</div>
    <div className="eq-controls">{(['low','mid','high'] as const).map(band=><label key={band}>{band.toUpperCase()} <output>{deck.eq[band].toFixed(1)} dB</output><input aria-label={`Performance ${band} EQ ${id}`} type="range" min="-12" max="12" step="0.5" disabled={!ready} value={deck.eq[band]} onChange={e=>send({type:'eq',deck:id,band,value:+e.target.value})}/></label>)}</div>
    <label className="tempo-control">Tempo <output>{deck.track.bpm?`${(deck.track.bpm*deck.rate).toFixed(1)} BPM · `:''}{((deck.rate-1)*100).toFixed(1)}%</output><input aria-label={`Tempo ${id}`} type="range" min="0.84" max="1.16" step="0.001" disabled={!ready} value={deck.rate} onChange={e=>send({type:'rate',deck:id,value:+e.target.value})}/></label>
    <div className="performance-stems">{deck.track.stems.length?deck.track.stems.map(({name})=><button key={name} disabled={!ready} aria-label={`${name} stem ${id}`} aria-pressed={deck.stems[name]} onClick={()=>send({type:'stem',deck:id,stem:name,enabled:!deck.stems[name]})}>{name}</button>):<small>Original mix · no prepared stems</small>}</div>
    <div className="performance-cues" aria-label={`Exported cues ${id}`}>{cues.length?cues.map((cue,index)=><button key={`${cue.at}-${index}`} disabled={!ready} title={cue.type!==0?'Jump to marker start; does not create a loop':'Jump to exported cue'} onClick={()=>send({type:'seek',deck:id,position:cue.at})}>{cue.name||`Cue ${index+1}`} · {cue.at.toFixed(1)}s</button>):<small>No exported cue markers</small>}</div>
   </article>;
  })}
  <div className="performance-cross"><label>Blend A → B <output>{Math.round(snapshot.crossfader*100)}% B</output><input aria-label="Performance crossfader" type="range" min="0" max="1" step="0.01" disabled={!ready} value={snapshot.crossfader} onChange={e=>send({type:'crossfader',value:+e.target.value})}/></label><small>Tempo changes pitch · no key lock. Cue markers seek; reset stops the deck.</small></div>
 </section>;
}
