import type { AudioEngine } from '../audio/engine';
import { CommandSchema } from '../domain/session';

/** Only operational state leaves the browser; imported names, paths and hashes stay local. */
export function compactState(engine:AudioEngine){
 const s=engine.snapshot();
 const trackIds=[...new Set(Object.values(s.decks).map(d=>d.track.id))];
 return {
  revision:s.revision,crossfader:s.crossfader,
  exercise:{entryAfter:s.exercise.entryAfter,endAfter:s.exercise.endAfter},
  decks:Object.fromEntries(Object.entries(s.decks).map(([id,d])=>[id,{
   trackId:`track-${trackIds.indexOf(d.track.id)+1}`,position:d.position,playing:d.playing,
   gain:d.gain,filter:d.filter,eq:d.eq,rate:d.rate,
   bpm:d.track.bpm??null,
   provenance:d.track.rekordbox?(d.track.rekordbox.alignmentVerified?'rekordbox-verified':'rekordbox-unverified'):d.track.capabilities.includes('fixture-grid')?'fixture-known':'unknown',
   rhythmWindow:d.track.rhythmVerification?{start:d.track.rhythmVerification.start,end:d.track.rhythmVerification.end}:null,
   stems:Object.fromEntries(d.track.stems.map(stem=>[stem.name,d.stems[stem.name]])),
  }])),
  attempt:{status:s.attempt.status,startedAt:s.attempt.startedAt,elapsed:s.attempt.status==='idle'?null:Math.max(0,engine.context.currentTime-s.attempt.startedAt),entryError:s.attempt.entryError,assisted:s.attempt.assisted},
  history:s.history.slice(-8).flatMap(event=>{
   const command=CommandSchema.safeParse(event.command);
   return command.success?[{at:event.at,origin:event.origin,command:command.data,positions:event.positions}]:[];
  }),
 };
}
