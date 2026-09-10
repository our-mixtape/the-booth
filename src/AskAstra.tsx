import { useEffect, useRef, useState } from 'react';
import type { AudioEngine } from './audio/engine';
import { compactState } from './agent/hints';
import { VoiceSession } from './agent/voice';
import { sessionFetch, SignInRequiredError, useBoothSession } from './auth/session';
import { AccountButton } from './auth/Account';
const helpers=[['Handoff hint','Give me one focused hint for this handoff.'],['Two minutes left','With two minutes left, suggest a feasible transition using the loaded decks. State what timing information is missing.'],['Keep it restrained','Suggest a restrained next move using the loaded decks. Leave the controls to me.']] as const;
const kidHelpers=[['What can I try?', 'Give me one simple, playful thing to try with volume, filter or blend. Use short encouraging language.'],['Explain the blend', 'Explain the blend slider with a simple everyday comparison and one thing I can try.'],['Try a new sound', 'Suggest one playful filter or available stem change on the loaded songs. Keep it simple and leave the controls to me.']] as const;
export function AskAstra({engine,available,status,kidFriendly=false}:{engine:AudioEngine;available:boolean;status:string;kidFriendly?:boolean}){
 const session=useBoothSession();const [reauthRequired,setReauthRequired]=useState(false);const signedIn=session.phase==='signed-in';const canAsk=signedIn&&!reauthRequired&&available;
 const [text,setText]=useState('');const [source,setSource]=useState<'text'|'helper'>('text');const [answer,setAnswer]=useState('');const [pending,setPending]=useState(false);const [voiceStatus,setVoiceStatus]=useState('Voice off');const [voiceActive,setVoiceActive]=useState(false);
 const controller=useRef<AbortController|null>(null);const sequence=useRef(0);const voice=useRef<VoiceSession|null>(null);
 function cancel(){sequence.current++;controller.current?.abort();controller.current=null;setPending(false);}
 useEffect(()=>()=>{sequence.current++;controller.current?.abort();voice.current?.stop();},[]);
 useEffect(()=>{cancel();voice.current?.stop();setAnswer('');setReauthRequired(false);},[session.sessionId,signedIn]);
 useEffect(()=>{const stop=()=>{cancel();voice.current?.stop();setAnswer('');setReauthRequired(true);};window.addEventListener('booth:sign-out',stop);return()=>window.removeEventListener('booth:sign-out',stop);},[]);
 function expire(){cancel();voice.current?.stop();setReauthRequired(true);}
 async function ask(request:string,via:'text'|'helper'|'voice'){
  cancel();if(!canAsk)return {error:'Sign in to use Astra when it is available.'};
  const id=sequence.current,requestId=crypto.randomUUID(),abort=new AbortController();controller.current=abort;setPending(true);setAnswer('');
  const timeout=setTimeout(()=>abort.abort(),28000);
  try{
   const response=await sessionFetch(session.getToken,'/api/hint',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...compactState(engine),ask:{text:request,source:via,requestId}}),signal:abort.signal});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Astra unavailable');
   if(id!==sequence.current)return {error:'Request replaced by a newer brief'};
   const stale=engine.session.revision!==data.revision;
   if(stale){setAnswer('The decks changed while Astra was thinking. Ask again for a current recommendation.');return {error:'Deck state changed. Ask again before recommending.'};}
   if(typeof data.hint!=='string'||data.model!=='gpt-6-astra'||data.requestId!==requestId)throw new Error('Invalid recommendation response');
   setAnswer(`${data.model} · ${data.hint}`);engine.session.attempt.assisted=true;return {hint:data.hint,model:data.model};
  }catch(error){if(id===sequence.current){if(error instanceof SignInRequiredError)expire();else setAnswer(abort.signal.aborted?'Recommendation timed out. Try a shorter request.':error instanceof Error?error.message:'Astra unavailable');}return {error:'Recommendation unavailable. Try again.'};}
  finally{clearTimeout(timeout);if(id===sequence.current)setPending(false);}
 }
 function startVoice(){
  if(voiceActive){voice.current?.stop();cancel();return;}
  if(!canAsk)return;
  setVoiceActive(true);
  const connection=new VoiceSession(message=>{setVoiceStatus(message);if(message.includes('microphone off'))setVoiceActive(false);},spoken=>{setText(spoken);setSource('text');},request=>{setText(request);return ask(request,'voice');},session.getToken,expire);
  voice.current=connection;void connection.start();
 }
 return <section className="ask-astra" aria-label="Ask Astra" id="ask-astra"><div className="ask-heading"><div><p className="eyebrow">✳ ASTRA / YOUR NEXT MOVE</p><h3>{kidFriendly?'Want one more idea?':'Say it. Type it. Try a prompt.'}</h3></div><button disabled={!canAsk&&!voiceActive} aria-pressed={voiceActive} onClick={startVoice}>{voiceActive?'■ Stop voice':'◉ Talk to voice'}</button></div>{(!signedIn||reauthRequired)&&<div className="astra-sign-in"><p><strong>{reauthRequired?"Please sign in again.":"Bring Astra into your mix."}</strong>{reauthRequired?"Open your account, sign out, then sign in again. Your mix keeps playing.":"Sign in for next-move hints and voice. Free play is always open."}</p><AccountButton label="Sign in to use Astra ↗"/></div>}<form onSubmit={event=>{event.preventDefault();void ask(text.trim(),source);}}><label htmlFor="astra-request">What would you like to try?</label><textarea id="astra-request" maxLength={1000} rows={2} placeholder={kidFriendly?'What does this button do?':'Keep the energy low and leave the bass handoff to me…'} value={text} onChange={event=>{cancel();setText(event.target.value);setSource('text');}}/><div className="ask-actions"><div className="ask-helpers">{(kidFriendly?kidHelpers:helpers).map(([label,prompt])=><button key={label} type="button" onClick={()=>{cancel();setText(prompt);setSource('helper');}}>{label}</button>)}</div><button className="primary" disabled={!canAsk||!text.trim()||pending}>{pending?'Thinking…':'Ask Astra ↗'}</button></div></form><p className="ask-result" aria-live="polite">{answer||(signedIn&&!reauthRequired?status:session.phase==='loading'?'Checking sign-in…':reauthRequired?'Astra is paused until you sign in again.':'Your decks are ready to play. Sign-in is required for Astra and voice.')}</p><small>{voiceStatus}. Voice uses a separate OpenAI speech model; your microphone is sent to it for up to 2 minutes. Use headphones. The mix output is never connected. Requests share the current deck state; Astra never moves the controls.</small></section>;
}
