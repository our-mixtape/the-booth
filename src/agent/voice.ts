import { sessionFetch, SignInRequiredError } from '../auth/session';
/** Realtime speech is a separate input/output surface; it never receives the mix bus. */
export class VoiceSession {
 private peer?: RTCPeerConnection;
 private stream?: MediaStream;
 private channel?: RTCDataChannel;
 private audio = new Audio();
 private abort = new AbortController();
 private timer?: ReturnType<typeof setTimeout>;
 private authTimer?: ReturnType<typeof setInterval>;
 private stopped = false;
 private calls = new Set<string>();
 constructor(private onStatus:(status:string)=>void, private onTranscript:(text:string)=>void, private ask:(text:string)=>Promise<unknown>, private getToken:()=>Promise<string|null>, private onAuthFailure:()=>void) {}
 stop(message='Voice stopped · microphone off') {
  if(this.stopped)return;
  this.stopped=true;this.abort.abort();clearTimeout(this.timer);clearInterval(this.authTimer);
  this.stream?.getTracks().forEach(track=>track.stop());this.channel?.close();this.peer?.close();
  this.audio.pause();this.audio.srcObject=null;this.onStatus(message);
 }
 async start(){
  try {
   if(!await this.getToken())throw new SignInRequiredError();
   if(this.stopped)return;
   if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)throw new Error('Voice needs a browser with microphone and WebRTC support.');
   this.onStatus('Waiting for microphone permission…');
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   if(this.stopped){stream.getTracks().forEach(track=>track.stop());return;}
   this.stream=stream;const peer=new RTCPeerConnection();this.peer=peer;
   this.timer=setTimeout(()=>this.stop('Voice ended after 2 minutes · microphone off'),120000);
   this.authTimer=setInterval(()=>{void this.getToken().then(token=>{if(!token&&!this.stopped){this.onAuthFailure();this.stop('Sign-in expired · microphone off');}}).catch(()=>this.stop('Sign-in connection lost · microphone off'));},30000);
   peer.ontrack=event=>{this.audio.srcObject=event.streams[0];void this.audio.play().catch(()=>this.stop('Voice playback blocked · try starting voice again'));};
   peer.onconnectionstatechange=()=>{if(peer.connectionState==='failed'||peer.connectionState==='disconnected')this.stop('Voice disconnected · microphone off');};
   stream.getTracks().forEach(track=>peer.addTrack(track,stream));
   const channel=peer.createDataChannel('oai-events');this.channel=channel;
   channel.onopen=()=>{if(!this.stopped)this.onStatus('Voice connected · listening');};
   channel.onclose=()=>this.stop();
   channel.onmessage=event=>{void this.receive(event.data);};
   const offer=await peer.createOffer();await peer.setLocalDescription(offer);
   this.onStatus('Connecting voice…');
   const response=await sessionFetch(this.getToken,'/api/voice/session',{method:'POST',headers:{'Content-Type':'application/sdp'},body:offer.sdp,signal:this.abort.signal});
   if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Voice service unavailable');}
   const sdp=await response.text();if(this.stopped)return;
   await peer.setRemoteDescription({type:'answer',sdp});
  }catch(error){if(!this.stopped){if(error instanceof SignInRequiredError)this.onAuthFailure();this.stop(error instanceof Error?`${error.message} · microphone off`:'Voice unavailable · microphone off');}}
 }
 private send(value:unknown){if(!this.stopped&&this.channel?.readyState==='open')this.channel.send(JSON.stringify(value));}
 private async receive(raw:string){
  if(this.stopped)return;
  try{
   const event=JSON.parse(raw);
   if(event.type==='error'){this.stop('Voice service error · microphone off');return;}
   if(event.type==='conversation.item.input_audio_transcription.completed'&&typeof event.transcript==='string')this.onTranscript(event.transcript);
   if(event.type!=='response.function_call_arguments.done'||event.name!=='ask_astra'||typeof event.call_id!=='string'||this.calls.has(event.call_id))return;
   this.calls.add(event.call_id);
   let result:unknown;
   try{const args=JSON.parse(event.arguments);if(typeof args.text!=='string'||!args.text.trim()||args.text.length>1000)throw new Error('Please ask a shorter question.');result=await this.ask(args.text);}catch{result={error:'Recommendation unavailable. Ask again or use text.'};}
   this.send({type:'conversation.item.create',item:{type:'function_call_output',call_id:event.call_id,output:JSON.stringify(result)}});
   this.send({type:'response.create'});
  }catch{/* Ignore malformed or unrelated events; no instrument commands are dispatched. */}
 }
}
