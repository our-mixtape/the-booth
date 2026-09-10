import { Session, TrackSchema, crossGains, cutoff, deckIds, deckMap, position, type Command, type DeckId, type Origin, type StemName, type Track } from '../domain/session';
export type Buffers=Map<string,AudioBuffer>;
export function createChannel(ctx:BaseAudioContext,output:AudioNode){
 const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=20000;filter.Q.value=0.5;
 const gain=ctx.createGain();gain.gain.value=0;const analyser=ctx.createAnalyser();analyser.fftSize=256;
 const low=ctx.createBiquadFilter(),mid=ctx.createBiquadFilter(),high=ctx.createBiquadFilter();low.type='lowshelf';low.frequency.value=250;mid.type='peaking';mid.frequency.value=1000;mid.Q.value=0.7;high.type='highshelf';high.frequency.value=4000;
 filter.connect(low).connect(mid).connect(high).connect(gain).connect(analyser).connect(output);return {filter,gain,analyser,eq:{low,mid,high}};
}
export class AudioEngine {
 context:AudioContext;master:GainNode;capture:MediaStreamAudioDestinationNode;channels:Record<DeckId,ReturnType<typeof createChannel>>;
 sources:Record<DeckId,AudioBufferSourceNode[]>=deckMap(()=>[]);stemGains:Record<DeckId,Partial<Record<StemName,GainNode>>>=deckMap(()=>({}));
 buffers:Buffers=new Map();session:Session;loadVersions=deckMap(()=>0);
 constructor(fixtures:Track[]){
  this.context=new AudioContext({latencyHint:'interactive'});this.master=this.context.createGain();this.master.gain.value=0.35;
  this.capture=this.context.createMediaStreamDestination();this.master.connect(this.context.destination);this.master.connect(this.capture);
  this.channels=deckMap(()=>createChannel(this.context,this.master));this.session=new Session(fixtures);
 }
 async preload(){for(const t of this.session.fixtures){for(const s of t.stems){const response=await fetch(s.file);if(!response.ok)throw new Error('Fixture file unavailable');this.buffers.set(s.file,await this.context.decodeAudioData(await response.arrayBuffer()));}
  const buffers=t.stems.map(s=>this.buffers.get(s.file)!);if(!buffers.length||buffers.some(b=>b.length!==buffers[0].length||b.sampleRate!==buffers[0].sampleRate||Math.abs(b.duration-t.duration)>0.001))throw new Error('Fixture stem alignment failed');
 }this.sync();}
 async resume(){await this.context.resume();}
 stopSources(id:DeckId){for(const s of this.sources[id]){try{s.stop();}catch{/* already ended */}s.disconnect();}this.sources[id]=[];for(const gain of Object.values(this.stemGains[id]))gain.disconnect();this.stemGains[id]={};}
 startSources(id:DeckId,when=this.context.currentTime){
  this.stopSources(id);const d=this.session.decks[id];const files=d.track.stems.length?d.track.stems:[{name:undefined,file:d.track.original}];
  const offset=position(d,when);
  for(const file of files){const buffer=this.buffers.get(file.file);if(!buffer)throw new Error('Audio not prepared');const s=this.context.createBufferSource();s.buffer=buffer;s.loop=true;s.playbackRate.value=d.rate;
   const gain=this.context.createGain();gain.gain.value=file.name&&!d.stems[file.name]?0:1;s.connect(gain).connect(this.channels[id].filter);
   if(file.name)this.stemGains[id][file.name]=gain;else s.onended=()=>gain.disconnect();
   s.start(when,offset);this.sources[id].push(s);
  }
 }
 sync(){const now=this.context.currentTime,cross=crossGains(this.session.crossfader);for(const [i,id]of deckIds.entries()){
  const c=this.channels[id],d=this.session.decks[id];for(const band of ['low','mid','high'] as const){c.eq[band].gain.cancelAndHoldAtTime(now);c.eq[band].gain.setTargetAtTime(d.eq[band],now,0.012);}c.gain.gain.cancelAndHoldAtTime(now);c.gain.gain.setTargetAtTime(d.gain*cross[i%2],now,0.012);
  c.filter.frequency.cancelAndHoldAtTime(now);c.filter.frequency.setTargetAtTime(cutoff(d.filter),now,0.012);
  for(const [name,gain]of Object.entries(this.stemGains[id])){gain.gain.cancelAndHoldAtTime(now);gain.gain.setTargetAtTime(d.stems[name as StemName]?1:0,now,0.012);}
 }}
 async loadExercisePair(){
  const response=await fetch('/api/exercise');if(!response.ok)throw new Error('Prepared exercise is unavailable. Complete local pair validation first.');
  const data=await response.json();const tracks=TrackSchema.array().length(2).parse(data.tracks);
  if(!Array.isArray(data.positions)||!Array.isArray(data.rates)||data.positions.length!==2||data.rates.length!==2||data.positions.some((v:unknown,i:number)=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>=tracks[i].duration)||data.rates.some((v:unknown)=>typeof v!=='number'||!Number.isFinite(v)||v<.84||v>1.16))throw new Error('Invalid exercise settings');
  for(const [index,id] of (['A','B'] as const).entries()){
   await this.loadPrepared(id,tracks[index]);
   if(this.session.decks[id].track.id!==tracks[index].id)throw new Error('Exercise load was superseded.');
   this.command({type:'seek',deck:id,position:data.positions[index]});this.command({type:'rate',deck:id,value:data.rates[index]});
   this.command({type:'gain',deck:id,value:.8});this.command({type:'filter',deck:id,value:1});
   for(const band of ['low','mid','high'] as const)this.command({type:'eq',deck:id,band,value:0});
   for(const stem of tracks[index].stems)this.command({type:'stem',deck:id,stem:stem.name,enabled:true});
  }
  this.useLoadedExercise();
 }
 useLoadedExercise(){this.session.useLoadedExercise(this.context.currentTime);}
 useFixtureExercise(){this.session.useFixtureExercise();this.pruneImports();}
 pruneImports(){const active=new Set([...Object.values(this.session.decks),...Object.values(this.session.checkpoint.decks)].flatMap(d=>[d.track.original,...d.track.stems.map(s=>s.file)]));for(const key of this.buffers.keys())if((key.startsWith('local-')||key.startsWith('/api/library/'))&&!active.has(key))this.buffers.delete(key);}
 command(raw:Command,origin:Origin='accessible',id?:string){
  const now=this.context.currentTime;const before=deckMap(id=>this.session.decks[id].playing);
  const command=this.session.apply(raw,now,origin,id);if(!command)return false;
  if(command.type==='retry'){for(const id of deckIds){this.loadVersions[id]++;this.stopSources(id);}this.startSources('A',now);this.pruneImports();}
  else if(command.type==='stop'){for(const id of deckIds)this.stopSources(id);}
  else if('deck'in command){if(command.type==='play'&&!before[command.deck])this.startSources(command.deck,now);else if(command.type==='pause'||command.type==='cue')this.stopSources(command.deck);else if(command.type==='seek'&&before[command.deck])this.startSources(command.deck,now);else if(command.type==='rate'){for(const source of this.sources[command.deck])source.playbackRate.setValueAtTime(command.value,now);}}
  this.sync();return true;
 }
 loadFixture(id:DeckId,trackId:string){
  const track=this.session.fixtures.find(t=>t.id===trackId);if(!track)return;
  this.loadVersions[id]++;this.stopSources(id);
  this.session.decks[id]={...this.session.decks[id],track,playing:false,offset:0,startedAt:0};
  this.session.revision++;this.session.invalidate('A track was loaded. Retry restores the exercise.');this.pruneImports();
  this.session.history.push({id:crypto.randomUUID(),at:this.context.currentTime,origin:'accessible',command:`load ${id}: ${track.sha256}`,positions:deckMap(id=>position(this.session.decks[id],this.context.currentTime))});
 }
 async loadPrepared(id:DeckId,raw:unknown){
  const track=TrackSchema.parse(raw),version=++this.loadVersions[id];
  const files=track.stems.length?track.stems:[{file:track.original,sha256:track.originalSha256}];
  const decoded=new Map<string,AudioBuffer>();
  for(const file of files){
   if(!/^\/api\/library\/local-[a-f0-9]{64}\/(original|drums|bass|vocals|other)\.wav$/.test(file.file))throw new Error('Invalid local asset');
   const response=await fetch(file.file);if(!response.ok)throw new Error('Prepared audio unavailable');
   const bytes=await response.arrayBuffer();
   if(file.sha256){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==file.sha256)throw new Error('Prepared audio checksum failed');}
   const buffer=await this.context.decodeAudioData(bytes);
   if(version!==this.loadVersions[id])return;
   if(Math.abs(buffer.duration-track.duration)>.002||buffer.numberOfChannels!==track.channels)throw new Error('Prepared audio alignment failed');
   decoded.set(file.file,buffer);
  }
  const buffers=[...decoded.values()];if(buffers.some(b=>b.length!==buffers[0].length||b.sampleRate!==buffers[0].sampleRate))throw new Error('Stem alignment failed');
  if(version!==this.loadVersions[id])return;
  this.stopSources(id);for(const [key,buffer]of decoded)this.buffers.set(key,buffer);
  this.session.decks[id]={...this.session.decks[id],track,playing:false,offset:0,startedAt:0};
  this.session.revision++;this.session.invalidate('A local track was loaded. Retry restores the exercise.');this.pruneImports();
  this.session.history.push({id:crypto.randomUUID(),at:this.context.currentTime,origin:'accessible',command:`load ${id}: ${track.sha256}`,positions:deckMap(id=>position(this.session.decks[id],this.context.currentTime))});
 }
 async importTrack(id:DeckId,file:File){
  if(file.size>25*1024*1024)throw new Error('Choose an audio file smaller than 25 MB.');
  const version=++this.loadVersions[id],bytes=await file.arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
  const buffer=await this.context.decodeAudioData(bytes);if(buffer.duration>600)throw new Error('Choose a track shorter than 10 minutes.');
  if(version!==this.loadVersions[id])return;
  this.stopSources(id);
  const key=`local-${hash}`;this.buffers.set(key,buffer);
  const track=TrackSchema.parse({id:key,title:file.name.slice(0,100),duration:buffer.duration,sampleRate:buffer.sampleRate,channels:buffer.numberOfChannels,preparationVersion:1,sourceOrigin:0,cues:[0],provenance:'local import · analysis unknown',capabilities:['original-playable'],original:key,sha256:hash,stems:[]});
  this.session.decks[id]={...this.session.decks[id],track,playing:false,offset:0,startedAt:0};this.pruneImports();this.session.revision++;this.session.invalidate('A track was replaced. Retry loads the original fixtures.');this.session.history.push({id:crypto.randomUUID(),at:this.context.currentTime,origin:'accessible',command:`load ${id}: ${hash}`,positions:deckMap(id=>position(this.session.decks[id],this.context.currentTime))});
 }
 meter(id:DeckId){const data=new Float32Array(256);this.channels[id].analyser.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length);}
 snapshot(){return this.session.snapshot(this.context.currentTime);}
}
let enginePromise:Promise<AudioEngine>|undefined;
export function getEngine(){return enginePromise??=fetch('/audio/manifest.json').then(r=>{if(!r.ok)throw new Error('Track manifest unavailable');return r.json();}).then(async raw=>{const engine=new AudioEngine(TrackSchema.array().length(2).parse(raw));try{await engine.preload();return engine;}catch(error){await engine.context.close();enginePromise=undefined;throw error;}});}
