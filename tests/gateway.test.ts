import { authEnv, sessionToken } from './auth-fixture';
import { afterEach, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { readFileSync } from 'node:fs';
// @ts-expect-error The gateway runs directly as Node ESM.
import { createGateway, createHandler } from '../server/index.mjs';
import { compactState } from '../src/agent/hints';
import { Session,TrackSchema } from '../src/domain/session';
import type { AudioEngine } from '../src/audio/engine';
const servers:Server[]=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(server=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());})));});
async function gateway(options:Record<string,unknown>){
 const server:Server=createGateway({...options,env:{...authEnv,...options.env as Record<string,string>}});servers.push(server);
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();if(!address||typeof address==='string')throw Error('Missing address');
 return `http://127.0.0.1:${address.port}`;
}
function state(){
 const tracks=TrackSchema.array().parse(JSON.parse(readFileSync('public/audio/manifest.json','utf8')));
 const session=new Session(tracks);
 session.decks.A.track={...tracks[0],id:'/private/audio/secret.wav',title:'Private song',original:'/private/audio/secret.wav'};
 session.apply({type:'play',deck:'A'},0);
 session.history.push({id:'private-event',at:1,origin:'accessible',command:'Loaded /private/audio/secret.wav',positions:{A:1,B:0,C:0,D:0}});
 return compactState({context:{currentTime:2},snapshot:()=>session.snapshot(2)} as AudioEngine);
}
it('sends only bounded operational state, never local track names, paths, hashes or load history',()=>{
 const payload=state();const json=JSON.stringify(payload);
 expect(json).not.toContain('private');expect(json).not.toContain('Private song');expect(json).not.toContain('sha256');
 expect(payload.decks.A.trackId).toBe('track-1');expect(payload.decks.A.provenance).toBe('fixture-known');expect(payload.history).toHaveLength(1);
});
it('reports missing access without attempting a model request',async()=>{
 const request=vi.fn();const url=await gateway({key:'',request});
 expect(await(await authenticatedFetch(`${url}/api/status`)).json()).toMatchObject({available:false,verified:false,model:'gpt-6-astra'});
 const response=await authenticatedFetch(`${url}/api/hint`,{method:'POST'});expect(response.status).toBe(503);expect(request).not.toHaveBeenCalled();
});
it('bounds feedback and marks verification only after a completed exact-model response',async()=>{
 const request=vi.fn<(_url:string,_options:{body:string})=>Promise<unknown>>(async()=>({ok:true,json:async()=>({status:'completed',model:'gpt-6-astra',id:'resp_mock',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({observation:'Deck A is playing.',nextAction:'Start a practice retry.'})}]}]})}));
 const url=await gateway({key:'test-only',request});
 const response=await authenticatedFetch(`${url}/api/hint`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state())});
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({observation:'Deck A is playing.',nextAction:'Start a practice retry.',responseId:'resp_mock'});
 const body=JSON.parse(request.mock.calls[0]![1].body);expect(body.model).toBe('gpt-6-astra');expect(body.store).toBe(false);expect(body.tools).toBeUndefined();expect(body.text.format.strict).toBe(true);
 expect(await(await authenticatedFetch(`${url}/api/status`)).json()).toMatchObject({verified:true});
});
it.each(['incomplete','wrong-model','bad-feedback','network'])('contains %s failure without reporting a verified hint',async(mode)=>{
 const request=vi.fn(async()=>{if(mode==='network')throw Error('test network failure');return {ok:true,json:async()=>({status:mode==='incomplete'?'incomplete':'completed',model:mode==='wrong-model'?'other':'gpt-6-astra',output:[{type:'message',content:[{type:'output_text',text:'invalid'}]}]})};});
 const url=await gateway({key:'test-only',request});
 expect((await authenticatedFetch(`${url}/api/hint`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state())})).status).toBe(502);
 expect(await(await authenticatedFetch(`${url}/api/status`)).json()).toMatchObject({verified:false});
});
it('rejects unbounded state and strips unrecognized metadata before the model boundary',async()=>{
 const request=vi.fn<(_url:string,_options:{body:string})=>Promise<unknown>>(async()=>({ok:true,json:async()=>({status:'incomplete'})}));
 const url=await gateway({key:'test-only',request});
 const invalid=state();invalid.decks.A.rate=3;
 const post=(payload:unknown)=>authenticatedFetch(`${url}/api/hint`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 expect((await post(invalid)).status).toBe(400);expect(request).not.toHaveBeenCalled();
 const payload=state();
 expect((await post({...payload,privatePath:'/private/never-send.wav',history:[{...payload.history[0],privateMetadata:'/private/never-send.wav'}]})).status).toBe(502);
 expect(request.mock.calls[0]![1].body).not.toContain('never-send');
});

it('reports available stem buffers only and uses the audio clock for elapsed attempt time',()=>{
 const tracks=TrackSchema.array().parse(JSON.parse(readFileSync('public/audio/manifest.json','utf8')));
 const session=new Session(tracks);
 const engine={context:{currentTime:14},snapshot:()=>session.snapshot(14)} as AudioEngine;
 expect(compactState(engine).attempt.elapsed).toBeNull();
 session.apply({type:'retry'},10);
 session.decks.A.track={...tracks[0],stems:[]};
 session.decks.B.track={...tracks[1],stems:[tracks[1].stems[0]]};
 session.decks.B.stems[tracks[1].stems[0].name]=false;
 const payload=compactState(engine);
 expect(payload.decks.A.stems).toEqual({});
 expect(payload.decks.B.stems).toEqual({[tracks[1].stems[0].name]:false});
 expect(payload.attempt.elapsed).toBe(4);
});

it('routes each ask source through Astra and echoes the request identity',async()=>{
 for(const source of ['text','helper','voice']){
  const request=vi.fn<(_url:string,_options:{body:string})=>Promise<unknown>>(async()=>({ok:true,json:async()=>({status:'completed',model:'gpt-6-astra',id:'resp_mock',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({observation:'A is playing.',nextAction:'Lower the crossfader.'})}]}]})}));
  const url=await gateway({key:'test-only',request});
  const response=await authenticatedFetch(`${url}/api/hint`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...state(),ask:{text:'How do I hand over?',source,requestId:'ask-123'}})});
  expect(await response.json()).toMatchObject({requestId:'ask-123'});
  expect(JSON.parse(request.mock.calls[0]![1].body).input).toContain('How do I hand over?');
 }
});
it('rejects invalid and oversized asks before any paid request',async()=>{
 const request=vi.fn();const url=await gateway({key:'test-only',request});
 for(const ask of [{text:'a'.repeat(1001),source:'text',requestId:'ask-1'},{text:'',source:'voice',requestId:'ask-1'},{text:'Help',source:'external',requestId:'ask-1'}]){
  expect((await authenticatedFetch(`${url}/api/hint`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...state(),ask})})).status).toBe(400);
 }
 expect(request).not.toHaveBeenCalled();
});
it('accepts configured hosted origins and hides all private audio in Vercel',async()=>{
 const url=await gateway({key:'',env:{VERCEL:'1',VERCEL_URL:'booth-preview.vercel.app',APP_ORIGIN:'https://booth.ourmixtape.org'}});
 expect((await authenticatedFetch(`${url}/api/status`,{headers:{Origin:'https://booth-preview.vercel.app'}})).status).toBe(200);
 expect((await authenticatedFetch(`${url}/api/status`,{headers:{Origin:'https://booth.ourmixtape.org'}})).status).toBe(200);
 expect((await authenticatedFetch(`${url}/api/status`,{headers:{Origin:'https://attacker.example',Host:'attacker.example'}})).status).toBe(403);
 expect(await(await authenticatedFetch(`${url}/api/library`)).json()).toMatchObject({tracks:[]});
 expect((await authenticatedFetch(`${url}/api/exercise`)).status).toBe(503);
 expect((await authenticatedFetch(`${url}/api/library/local-${'a'.repeat(64)}/original.wav`)).status).toBe(404);
});
it('exchanges SDP with a separate voice model without returning the server key',async()=>{
 const request=vi.fn<(_url:string,_options:{body:FormData})=>Promise<unknown>>(async()=>({ok:true,text:async()=> 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n'}));
 const url=await gateway({key:'test-only-secret',request});
 const response=await authenticatedFetch(`${url}/api/voice/session`,{method:'POST',headers:{'Content-Type':'application/sdp'},body:'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n'});
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('application/sdp');
 expect(await response.text()).not.toContain('test-only-secret');
 const [endpoint,options]=request.mock.calls[0]!;
 expect(endpoint).toBe('https://api.openai.com/v1/realtime/calls');
 const session=JSON.parse(String(options.body.get('session')));
 expect(session.model).toBe('gpt-realtime-2.1');expect(session.tools.map((tool:{name:string})=>tool.name)).toEqual(['ask_astra']);
 expect(session.max_output_tokens).toBe(500);
});
it('rejects missing-key, malformed, oversized and failed voice sessions honestly',async()=>{
 const request=vi.fn(async()=>({ok:false,status:401}));
 const missing=await gateway({key:'',request});
 expect((await authenticatedFetch(`${missing}/api/voice/session`,{method:'POST'})).status).toBe(503);
 const url=await gateway({key:'test-only',request});
 const post=(body:string)=>authenticatedFetch(`${url}/api/voice/session`,{method:'POST',headers:{'Content-Type':'application/sdp'},body});
 expect((await post('invalid')).status).toBe(400);
 expect((await post('v=0 m=audio'+'x'.repeat(32000))).status).toBe(413);
 expect(request).not.toHaveBeenCalled();
 const response=await post('v=0\r\nm=audio 9 RTP/AVP 0');expect(response.status).toBe(502);
 expect(await response.text()).not.toContain('test-only');
});


it('supports Vercel preparsed JSON and SDP bodies without reading the consumed stream',async()=>{
 const request=vi.fn(async(url:string)=>url.endsWith('/calls')?{ok:true,text:async()=> 'v=0\r\nm=audio 9 RTP/AVP 0'}:{ok:true,json:async()=>({status:'completed',model:'gpt-6-astra',id:'mock',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({observation:'A plays.',nextAction:'Try a handoff.'})}]}]})});
 for(const [url,contentType,body] of [['/api/hint','application/json',state()],['/api/voice/session','application/sdp','v=0\r\nm=audio 9 RTP/AVP 0']] as const){
  const res={setHeader:vi.fn(),writeHead:vi.fn(),end:vi.fn()};
  await createHandler({key:'test-only',request,env:authEnv})({method:'POST',url,headers:{'content-type':contentType,authorization:`Bearer ${sessionToken()}`},body},res);
  expect(res.writeHead.mock.calls[0][0]).toBe(200);expect(res.end).toHaveBeenCalled();
 }
});

function authenticatedFetch(url:string,init:RequestInit={}){const headers=new Headers(init.headers);headers.set("Authorization",`Bearer ${sessionToken()}`);return globalThis.fetch(url,{...init,headers});}
