import { mockBrowserAuth } from './browser-auth';
import { test,expect } from '@playwright/test';
test.beforeEach(async({page})=>{await mockBrowserAuth(page);});
test('text and helpers share the request; typing does not play decks',async({page})=>{
 await page.route('**/api/status',route=>route.fulfill({json:{available:true,message:'Test gateway ready'}}));
 const asks:{text:string;source:string}[]=[];
 await page.route('**/api/hint',async route=>{const data=route.request().postDataJSON();asks.push(data.ask);await route.fulfill({json:{model:'gpt-6-astra',hint:'Test recommendation only',revision:data.revision,requestId:data.ask.requestId}});});
 await page.goto('/');await page.getByRole('button',{name:'Start audio',exact:false}).click();
 const ask=page.getByRole('region',{name:'Ask Astra',exact:true});
 await ask.getByRole('button',{name:'Handoff hint',exact:true}).click();
 await ask.getByRole('button',{name:'Ask Astra ↗',exact:true}).click();
 await expect(ask).toContainText('Test recommendation only');expect(asks[0].source).toBe('helper');
 await page.getByLabel('What would you like to try?').fill('');await page.getByLabel('What would you like to try?').pressSequentially('q p r keep quiet');
 await ask.getByRole('button',{name:'Ask Astra ↗',exact:true}).click();await expect.poll(()=>asks.length).toBe(2);expect(asks[1]).toMatchObject({source:'text',text:'q p r keep quiet'});
 await page.getByRole('button',{name:'Track library & accessible controls',exact:false}).click();await expect(page.getByLabel('Deck A position')).toContainText('paused');await expect(page.getByLabel('Deck B position')).toContainText('paused');
});
test('editing a pending ask discards its result; missing key keeps voice off',async({page})=>{
 await page.route('**/api/status',route=>route.fulfill({json:{available:true,message:'Test gateway ready'}}));
 await page.route('**/api/hint',async route=>{const data=route.request().postDataJSON();await new Promise(resolve=>setTimeout(resolve,300));await route.fulfill({json:{model:'gpt-6-astra',hint:'OBSOLETE RESPONSE',revision:data.revision}}).catch(()=>{});});
 await page.goto('/');const input=page.getByLabel('What would you like to try?');await input.fill('First brief');await page.getByRole('button',{name:'Ask Astra ↗',exact:true}).click();await input.fill('Revised brief');await page.waitForTimeout(500);await expect(page.getByLabel('Ask Astra',{exact:true})).not.toContainText('OBSOLETE RESPONSE');
 await page.route('**/api/status',route=>route.fulfill({json:{available:false,message:'Astra unavailable · configure Vercel secret'}}));await page.reload();await expect(page.getByRole('button',{name:'Talk to voice',exact:false})).toBeDisabled();await expect(page.getByLabel('Ask Astra',{exact:true})).toContainText('configure Vercel secret');
});
test('microphone permission failure leaves manual instrument available',async({page})=>{
 await page.route('**/api/status',route=>route.fulfill({json:{available:true,message:'Test gateway ready'}}));
 await page.addInitScript(()=>{Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{throw new Error('Permission denied');}});});
 await page.goto('/');await page.getByRole('button',{name:'Talk to voice',exact:false}).click();await expect(page.getByLabel('Ask Astra',{exact:true})).toContainText('Permission denied · microphone off');await expect(page.getByRole('button',{name:'Talk to voice',exact:false})).toHaveAttribute('aria-pressed','false');await page.getByRole('button',{name:'Start audio',exact:false}).click();await expect(page.getByRole('button',{name:'Audio enabled',exact:false})).toBeVisible();
});
test('stopping voice releases the microphone and peer connection',async({page})=>{
 await page.route('**/api/status',route=>route.fulfill({json:{available:true,message:'Test gateway ready'}}));
 await page.route('**/api/voice/session',route=>route.fulfill({contentType:'application/sdp',body:'mock-answer'}));
 await page.addInitScript(()=>{
  const metrics={stops:0,closes:0};Object.assign(window,{voiceMetrics:metrics});
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>({getTracks:()=>[{stop:()=>metrics.stops++}]})});
  class Peer{connectionState='new';channel={readyState:'open',onopen:null as null|(()=>void),onclose:null as null|(()=>void),send:()=>{},close:()=>{}};addTrack(){}createDataChannel(){return this.channel;}async createOffer(){return {sdp:'mock-offer'};}async setLocalDescription(){}async setRemoteDescription(){this.channel.onopen?.();}close(){metrics.closes++;}}
  Object.defineProperty(window,'RTCPeerConnection',{value:Peer});
 });
 await page.goto('/');await page.getByRole('button',{name:'Talk to voice',exact:false}).click();await expect(page.getByLabel('Ask Astra',{exact:true})).toContainText('Voice connected');await page.getByRole('button',{name:'Stop voice',exact:false}).click();await expect(page.getByLabel('Ask Astra',{exact:true})).toContainText('microphone off');expect(await page.evaluate(()=>Reflect.get(window,'voiceMetrics'))).toEqual({stops:1,closes:1});
 await page.getByLabel('Ask Astra',{exact:true}).screenshot({path:'docs/evidence/unified-ask-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.getByLabel('Ask Astra',{exact:true}).screenshot({path:'docs/evidence/unified-ask-mobile.png'});
});
