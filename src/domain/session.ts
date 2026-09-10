import { z } from 'zod';
import { beatMarkers } from './beat-grid';
export const deckIds = ['A','B','C','D'] as const;
export const deckMap = <T>(make:(id:DeckId,index:number)=>T) => Object.fromEntries(deckIds.map((id,index)=>[id,make(id,index)])) as Record<DeckId,T>;
export type DeckId = typeof deckIds[number];
export const stemNames = ['drums','bass','melody','vocals','other'] as const;
export type StemName = typeof stemNames[number];
export const RekordboxSchema=z.object({source:z.literal('rekordbox-xml'),trackId:z.string(),exportSha256:z.string(),match:z.string(),alignmentVerified:z.boolean(),bpm:z.number(),key:z.string(),grid:z.array(z.object({at:z.number().nonnegative(),bpm:z.number().positive(),beat:z.number().int(),meter:z.string()})),marks:z.array(z.object({name:z.string(),type:z.number().int(),at:z.number(),number:z.number().int(),end:z.number().optional()}))});
export const TrackSchema = z.object({id:z.string().max(128),title:z.string().max(100),duration:z.number().positive().max(600),sampleRate:z.number().positive(),channels:z.number().int().min(1).max(8),preparationVersion:z.number().int(),sourceOrigin:z.number(),bpm:z.number().positive().optional(),beatOrigin:z.number().optional(),rekordbox:RekordboxSchema.optional(),rhythmVerification:z.object({start:z.number().nonnegative(),end:z.number().positive(),method:z.literal('decoded-onsets'),medianOffsetSeconds:z.number().finite(),p90ErrorSeconds:z.number().nonnegative(),matchedBeats:z.number().int().positive()}).optional(),cues:z.array(z.number()),provenance:z.string(),capabilities:z.array(z.string()),original:z.string(),originalSha256:z.string().optional(),sha256:z.string(),stems:z.array(z.object({name:z.enum(stemNames),file:z.string(),sha256:z.string()}))});
export type Track = z.infer<typeof TrackSchema>;
const deck=z.enum(deckIds), value=z.number().finite().min(0).max(1);
export const CommandSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('play'),deck}),z.object({type:z.literal('pause'),deck}),z.object({type:z.literal('cue'),deck}),
 z.object({type:z.literal('rate'),deck,value:z.number().finite().min(.84).max(1.16)}),z.object({type:z.literal('seek'),deck,position:z.number().finite().nonnegative()}),
 z.object({type:z.literal('eq'),deck,band:z.enum(['low','mid','high']),value:z.number().finite().min(-12).max(12)}),z.object({type:z.literal('gain'),deck,value}),z.object({type:z.literal('filter'),deck,value}),z.object({type:z.literal('crossfader'),value}),
 z.object({type:z.literal('stem'),deck,stem:z.enum(stemNames),enabled:z.boolean()}),z.object({type:z.literal('retry')}),z.object({type:z.literal('stop')})
]);
export type Command=z.infer<typeof CommandSchema>;
export type Origin='pointer'|'keyboard'|'accessible'|'agent';
export interface DeckState { track:Track; playing:boolean; rate:number; offset:number; startedAt:number; gain:number; filter:number; eq:Record<'low'|'mid'|'high',number>; stems:Record<StemName,boolean> }
export type Attempt={status:'idle'|'running'|'complete'|'retry'; startedAt:number; entryError?:number; observation:string; assisted:boolean; checkpoint?:{tracks:string[];crossfader:number}};
export type Event={id:string;at:number;origin:Origin;command:Command|string;positions:Record<DeckId,number>};
export const makeDeck=(track:Track):DeckState=>({track,playing:false,rate:1,offset:0,startedAt:0,gain:0.8,filter:1,eq:{low:0,mid:0,high:0},stems:{drums:true,bass:true,melody:true,vocals:true,other:true}});
export function elapsed(d:DeckState,now:number){return d.offset+(d.playing?Math.max(0,now-d.startedAt)*d.rate:0);}
export function position(d:DeckState,now:number){return elapsed(d,now)%d.track.duration;}
export function crossGains(value:number){return [Math.cos(value*Math.PI/2),Math.sin(value*Math.PI/2)] as const;}
export const cutoff=(value:number)=>160*Math.pow(125,value);
export type Exercise={title:string;entryAfter:number;endAfter:number;provenance:string};
export type Checkpoint={decks:Record<DeckId,DeckState>;crossfader:number};
export class Session {
 exercise:Exercise={title:'Bring B in on bar 5. Make it yours by bar 9.',entryAfter:8,endAfter:16,provenance:'Generated fixtures · known grid'};
 checkpoint:Checkpoint;
 useFixtureExercise(){
  this.exercise={title:'Bring B in on bar 5. Make it yours by bar 9.',entryAfter:8,endAfter:16,provenance:'Generated fixtures · known grid'};
  this.checkpoint={decks:deckMap((_id,i)=>makeDeck(this.fixtures[i%2])),crossfader:0};
  this.attempt={status:'idle',startedAt:0,observation:'Fixture exercise selected. Start practice when ready.',assisted:false};
 }
 useLoadedExercise(now:number){
  const a=this.decks.A,b=this.decks.B;
  for(const d of [a,b])if(!d.track.rekordbox?.alignmentVerified&&!d.track.rhythmVerification)throw new Error('Verify the exported grid against audio before creating a scored exercise. Free play and cue seeking remain available.');
  const startA=position(a,now),startB=position(b,now);
  const marks=beatMarkers(a.track,startA-.001,a.track.duration);
  const first=marks.findIndex(m=>m.beat===1&&Math.abs(m.at-startA)<.06);
  const bMarks=beatMarkers(b.track,startB-.06,startB+.06);
  if(first<0||!marks[first+32]||!bMarks.some(m=>m.beat===1))throw new Error('Pause both decks on verified downbeat cues with at least eight bars remaining on A.');
  if(a.playing||b.playing)throw new Error('Pause both decks at their starting cues before saving the exercise.');
  const entryAfter=(marks[first+16].at-startA)/a.rate,endAfter=(marks[first+32].at-startA)/a.rate;
  if(startB+endAfter*b.rate>=b.track.duration)throw new Error('Choose an earlier B cue; the exercise must not cross the file loop.');
  for(const [d,start] of [[a,startA],[b,startB]] as const){const v=d.track.rhythmVerification;if(!d.track.rekordbox?.alignmentVerified&&(!v||start<v.start-.06||start+endAfter*d.rate>v.end+.06||v.p90ErrorSeconds>.08))throw new Error('The exercise exceeds the audio-checked rhythm window. Choose the prepared exercise cues.');}
  const decks=structuredClone(this.decks);for(const id of deckIds){decks[id].playing=false;decks[id].startedAt=0;}
  this.checkpoint={decks,crossfader:0};this.exercise={title:'Bring B in after four bars. Complete the handoff within eight.',entryAfter,endAfter,provenance:'Local tracks · audio-checked rhythm window · exported bar labels · human audition pending'};
  this.attempt={status:'idle',startedAt:0,observation:'Starting cues and mixer settings saved. Start practice to hear A.',assisted:false};this.revision++;
 }

 decks:Record<DeckId,DeckState>;crossfader=0;revision=0;history:Event[]=[];owners:Record<string,Origin>={};seen=new Set<string>();
 attempt:Attempt={status:'idle',startedAt:0,observation:'Start a practice attempt, or play freely.',assisted:false};
 constructor(public fixtures:Track[]){this.decks=deckMap((_id,i)=>makeDeck(fixtures[i%2]));this.checkpoint={decks:structuredClone(this.decks),crossfader:0};}
 apply(raw:unknown,now:number,origin:Origin='accessible',id:string=crypto.randomUUID()):Command|null{
  const parsed=CommandSchema.safeParse(raw);if(!parsed.success||origin==='agent'||this.seen.has(id))return null;
  const command=parsed.data;
  if(command.type==='seek'&&command.position>=this.decks[command.deck].track.duration)return null;
  if(command.type==='stem'&&!this.decks[command.deck].track.stems.some(s=>s.name===command.stem))return null;
  if('deck' in command&&(command.deck==='C'||command.deck==='D')&&command.type==='play')this.invalidate('Extra decks were used. Retry restores the two-track exercise.');
  this.seen.add(id);if(this.seen.size>2048)this.seen.delete(this.seen.values().next().value!);
  const d='deck'in command?this.decks[command.deck]:undefined;
  this.owners['deck'in command?`${command.deck}.${command.type}`:command.type]=origin;
  if(command.type==='retry'){
   this.decks=structuredClone(this.checkpoint.decks);this.crossfader=this.checkpoint.crossfader;this.owners={};
   this.decks.A.playing=true;this.decks.A.startedAt=now;
   this.attempt={status:'running',startedAt:now,observation:`Start B at ${this.exercise.entryAfter.toFixed(2)} seconds. Fade fully to B before ${this.exercise.endAfter.toFixed(2)} seconds.`,assisted:false,checkpoint:{tracks:[this.decks.A.track.sha256,this.decks.B.track.sha256],crossfader:0}};
  }else if(command.type==='stop'){
   for(const d of Object.values(this.decks)){d.offset=position(d,now);d.playing=false;}
   this.invalidate('Playback stopped. Retry for the same starting point.');
  }else if(command.type==='crossfader')this.crossfader=command.value;
  else if(d){
   if(command.type==='play'&&!d.playing){
    d.startedAt=now;d.playing=true;
    if(command.deck==='B'&&this.attempt.status==='running'&&this.attempt.entryError===undefined){
     this.attempt.entryError=now-this.attempt.startedAt-this.exercise.entryAfter;
     this.attempt.observation=`B started ${Math.abs(this.attempt.entryError).toFixed(2)}s ${this.attempt.entryError<0?'early':'late'}. Fade to B before A reaches bar 9.`;
    }
   }else if(command.type==='pause'||command.type==='cue'){
    d.offset=command.type==='cue'?0:position(d,now);d.playing=false;
    this.invalidate('Transport changed during the attempt. Retry restores both cues.');
   }else if(command.type==='rate'||command.type==='seek'){
    d.offset=command.type==='seek'?command.position:position(d,now);d.startedAt=now;
    if(command.type==='rate')d.rate=command.value;
    this.invalidate('Tempo or source position changed. Retry restores the saved musical starting point.');
   }else if(command.type==='gain')d.gain=command.value;
   else if(command.type==='filter')d.filter=command.value;
   else if(command.type==='eq')d.eq[command.band]=command.value;
   else if(command.type==='stem'){
    if(!d.track.stems.some(s=>s.name===command.stem))return null;
    d.stems[command.stem]=command.enabled;
   }
  }
  this.history.push({id,at:now,origin,command,positions:deckMap(id=>position(this.decks[id],now))});this.history=this.history.slice(-512);this.revision++;this.evaluate(now);return command;
 }
 invalidate(message:string){if(this.attempt.status==='running'){this.attempt.status='retry';this.attempt.observation=message;}}
 evaluate(now:number){
  const a=this.attempt;if(a.status!=='running')return;
  const time=now-a.startedAt,b=this.decks.B;
  if(a.entryError===undefined&&this.crossfader>=0.98){this.invalidate('A was faded out before B started. Retry and keep A audible until the entry.');return;}
  if(time>this.exercise.endAfter){a.status='retry';a.observation='The four-bar handoff window ended. Retry, start B at bar 5, and move the crossfader right before bar 9.';}
  else if(time>=this.exercise.entryAfter&&this.crossfader>=0.98&&b.playing&&b.gain>=0.2&&b.filter>=0.25&&(!b.track.stems.length||b.track.stems.some(s=>b.stems[s.name]))&&a.entryError!==undefined){
   a.status=Math.abs(a.entryError)<=0.25?'complete':'retry';
   a.observation=`Handoff at ${time.toFixed(2)}s. B started ${Math.abs(a.entryError).toFixed(2)}s ${a.entryError<0?'early':'late'} (target ±0.25s). ${a.status==='complete'?'Timing objective complete.':'Retry and focus on the bar-5 entry.'}`;
  }
 }
 snapshot(now:number){this.evaluate(now);return {exercise:{...this.exercise},revision:this.revision,crossfader:this.crossfader,decks:Object.fromEntries(deckIds.map(id=>[id,{...this.decks[id],position:position(this.decks[id],now)}])) as Record<DeckId,DeckState&{position:number}>,attempt:{...this.attempt},owners:{...this.owners},history:this.history.slice(-20)};}
}
