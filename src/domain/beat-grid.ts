import type {Track} from './session';
/** Piecewise 4/4 anchors. No extrapolation before the first exported anchor. */
export function beatMarkers(track:Track,start:number,end:number){
 const anchors=track.rekordbox?.grid??(track.provenance.startsWith('fixture-known')&&track.bpm?[{at:track.beatOrigin??0,bpm:track.bpm,beat:1,meter:'4/4'}]:[]);
 const markers:{at:number;beat:number}[]=[];
 anchors.forEach((a,i)=>{
  if(a.meter!=='4/4'||a.beat<1||a.beat>4)return;
  const stop=Math.min(end,track.duration,anchors[i+1]?.at??Infinity),step=60/a.bpm;
  for(let n=Math.max(0,Math.ceil((start-a.at)/step));a.at+n*step<stop;n++)markers.push({at:a.at+n*step,beat:(a.beat-1+n)%4+1});
 });return markers;
}
