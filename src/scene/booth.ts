import * as THREE from 'three';
import { createBoothDiagnostics } from './diagnostics';
import { loadMixerAsset, type MixerAsset } from './mixer-asset';
import type { AudioEngine } from '../audio/engine';
import { deckIds, type Command, type DeckId } from '../domain/session';
import { boothPalette as palette, deckColors } from '../booth-palette';
export type Layout='digital2'|'digital4'|'vinyl';
type Hit={kind:'play'|'cue'|'gain'|'filter'|'crossfader'|'load'|'low'|'mid'|'high';deck?:DeckId};
export function createBooth(host:HTMLDivElement,engine:AudioEngine,send:(c:Command)=>void,onHover:(s:string)=>void,layout:Layout,onGrab:(held:boolean)=>void,onLoad:(id:DeckId)=>void,onMixerStatus:(status:string)=>void=()=>{}){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(palette.background,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=false;
 renderer.domElement.setAttribute('aria-label','Interactive 3D DJ booth. Play buttons, filters, channel faders and crossfader. Keyboard alternatives below.');renderer.domElement.tabIndex=0;host.append(renderer.domElement);
 const diagnostics=createBoothDiagnostics(renderer);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(37,1,0.1,100);camera.position.set(0,9.2,8.8);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xe9ecff,0x41465f,1.6));const light=new THREE.DirectionalLight(0xf2f5ff,2.4);light.position.set(-4,8,3);light.castShadow=true;light.shadow.mapSize.set(1024,1024);scene.add(light);
 const fill=new THREE.PointLight(0x8f9dff,8);fill.position.set(5,4,-3);scene.add(fill);
 const hits:THREE.Object3D[]=[],caps:Record<string,THREE.Mesh>={},jogs:Partial<Record<DeckId,THREE.Mesh>>={},meters:Partial<Record<DeckId,THREE.Mesh>>={},displays:{canvas:HTMLCanvasElement;texture:THREE.CanvasTexture;id:DeckId}[]=[];
 const mat=(color:THREE.ColorRepresentation,metalness=0.3)=>new THREE.MeshStandardMaterial({color,roughness:0.5,metalness});
 function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:THREE.ColorRepresentation){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
 function cylinder(name:string,x:number,y:number,z:number,r:number,h:number,color:THREE.ColorRepresentation){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,64),mat(color,0.7));mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;scene.add(mesh);return mesh;}
 function label(text:string,x:number,z:number,w=1,y=0.31,color=palette.print){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=180;const c=canvas.getContext('2d')!;c.fillStyle=color;c.font=`600 ${Math.min(150,750/text.length)}px monospace`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,90);
  const texture=new THREE.CanvasTexture(canvas),mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,w*180/512),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);scene.add(mesh);
 }
 function bind(mesh:THREE.Mesh,hit:Hit){mesh.userData.hit=hit;hits.push(mesh);}
 const vinyl=layout==='vinyl',four=layout==='digital4';
 const visible:readonly DeckId[]=four?deckIds:['A','B'];
 const deckX=(id:DeckId)=>four?({A:-6.4,B:-3.05,C:3.05,D:6.4}[id]):(id==='A'?-1:1)*(vinyl?3.35:3.05);
 const rigWidth=four?16.3:vinyl?11.5:10.9;
 const platterZ=vinyl?0:0.35;
 box('booth.table',0,-0.34,0,rigWidth,0.35,5.1,palette.surface);box('booth.front',0,-0.51,2.43,rigWidth,0.08,0.1,0x656f9e);
 function ring(name:string,x:number,y:number,z:number,r:number,tube:number,color:THREE.ColorRepresentation){const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,tube,8,96),mat(color,0.8));mesh.name=name;mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);scene.add(mesh);return mesh;}
 function dots(name:string,positions:number[][],r:number,color:number){const mesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(r,r,.012,8),mat(color,.6),positions.length);mesh.name=name;const m=new THREE.Matrix4();positions.forEach((p,i)=>{m.makeTranslation(p[0],p[1],p[2]);mesh.setMatrixAt(i,m);});scene.add(mesh);}
 function arm(name:string,points:number[][]){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number])));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,24,0.042,8,false),mat(0xb9bec1,0.85));mesh.name=name;scene.add(mesh);}
 for(const id of visible){
  const x=deckX(id),color=deckColors[id],prefix=`deck.${id}`;
  box(`${prefix}.body`,x,0,0,vinyl?4.1:3.35,0.48,4.65,vinyl?0x424656:palette.body);
  box(`${prefix}.face`,x,0.25,0,vinyl?4.02:3.27,0.04,4.56,vinyl?0x626779:palette.face);
  for(const dx of [-1,1])for(const dz of [-1,1]){cylinder(`${prefix}.foot`,x+dx*(vinyl?1.8:1.4),-0.23,dz*1.96,.16,.19,0x080909);cylinder(`${prefix}.screw`,x+dx*(vinyl?1.91:1.52),.28,dz*2.13,.028,.012,0x7c8286);}
  if(!vinyl){
   box(`${prefix}.screen.stand`,x,0.53,-1.52,2.8,.48,.28,0x101113);
   const panel=box(`${prefix}.screen.housing`,x,.81,-1.46,2.95,.12,1.27,0x080a0c);panel.rotation.x=.43;
   const canvas=document.createElement('canvas');canvas.width=768;canvas.height=320;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
   const screen=new THREE.Mesh(new THREE.PlaneGeometry(2.76,1.10),new THREE.MeshBasicMaterial({map:texture}));screen.rotation.x=-Math.PI/2+.43;screen.position.set(x,.88,-1.46);scene.add(screen);displays.push({canvas,texture,id});
   label(`DIGITAL PLAYER / ${id}`,x,-2.12,2.1,.3);
   const load=box(`${prefix}.load`,x+1.27,.34,-.62,.45,.1,.35,0x34383b);bind(load,{kind:'load',deck:id});label('LOAD',x+1.27,-.62,.42,.405);
   cylinder(`${prefix}.jog.rim`,x-.14,.35,platterZ,1.23,.16,palette.metal);
   cylinder(`${prefix}.jog.grip`,x-.14,.46,platterZ,1.16,.12,palette.face);
   ring(`${prefix}.jog.inner-ring`,x-.14,.535,platterZ,1.02,.017,color);
   const jog=cylinder(`${prefix}.jog.disc`,x-.14,.53,platterZ,.99,.055,palette.background);jogs[id]=jog;
   dots(`${prefix}.jog.grip-detail`,Array.from({length:36},(_,n)=>{const a=n*Math.PI*2/36;return [x-.14+Math.sin(a)*1.12,.531,platterZ+Math.cos(a)*1.12];}),.033,0x111416);
   cylinder(`${prefix}.jog.center`,x-.14,.57,platterZ,.33,.028,palette.surface);ring(`${prefix}.jog.center-ring`,x-.14,.593,platterZ,.33,.019,color);label(id,x-.14,platterZ,.32,.6,color);
   const tick=box(`${prefix}.jog.marker`,0,0,0,.024,.01,.13,color);scene.remove(tick);jog.add(tick);tick.position.set(0,.034,-.84);
   label('JOG · TRANSPORT',x-.14,1.5,1.25,.31);
  }else{
   const px=x-.38;
   cylinder(`${prefix}.platter.strobe`,px,.38,0,1.62,.2,0xb3b6b4);ring(`${prefix}.platter.edge`,px,.49,0,1.56,.027,0xe2e3dd);
   dots(`${prefix}.strobe-dot`,Array.from({length:180},(_,i)=>{const row=Math.floor(i/90),a=(i%90)*Math.PI*2/90;return [px+Math.sin(a)*(1.59-row*.055),.49,Math.cos(a)*(1.59-row*.055)];}),.014,0x161a18);
   const record=cylinder(`${prefix}.vinyl`,px,.5,0,1.49,.025,0x111312);jogs[id]=record;
   for(let r=.53;r<1.47;r+=.075)ring(`${prefix}.record.groove`,px,.518,0,r,.0035,0x30332f);
   cylinder(`${prefix}.record.label`,px,.525,0,.46,.01,color);label(`SIDE ${id}`,px,0,.64,.54,'#16191c');cylinder(`${prefix}.spindle`,px,.56,0,.037,.065,0xd2d5d3);
   const mark=box(`${prefix}.record.marker`,0,0,0,.025,.008,.11,0xeee5cc);scene.remove(mark);record.add(mark);mark.position.set(0,.03,.32);
   cylinder(`${prefix}.arm.base`,x+1.33,.37,-1.17,.47,.16,0x202322);ring(`${prefix}.arm.gimbal`,x+1.33,.60,-1.17,.29,.055,0xb0b5af);cylinder(`${prefix}.arm.pivot`,x+1.33,.65,-1.17,.12,.27,0x333937);
   arm(`${prefix}.tonearm`,[[x+1.33,.77,-1.36],[x+1.33,.77,-.6],[x+1.26,.69,.1],[x+.96,.62,.67],[x+.62,.57,.99]]);
   box(`${prefix}.headshell`,x+.59,.57,1.04,.17,.09,.36,0x121514).rotation.y=.5;
   cylinder(`${prefix}.counterweight`,x+1.33,.76,-1.64,.18,.27,0xabadab).rotation.x=Math.PI/2;
   box(`${prefix}.pitch.track`,x+1.72,.29,.65,.05,.02,1.43,0x161a18);box(`${prefix}.pitch.cap`,x+1.72,.33,.65,.28,.09,.10,0xd3d6d0);label('FIXED SPEED',x+1.61,1.64,.7,.3);
   cylinder(`${prefix}.power`,x-1.73,.37,-1.82,.16,.18,0xb1b6b4);label('33⅓ · DISPLAY',x,-1.97,1.4,.30);
   const load=box(`${prefix}.load`,x+.15,.34,1.91,1.06,.1,.34,0x212625);bind(load,{kind:'load',deck:id});label('LOAD VINYL',x+.15,1.91,.95,.403);
   label(`TURNTABLE / ${id}`,x+.63,-2.17,1.72,.30);
  }
  const bx=x-(vinyl?1.55:1.26);
  const playZ=1.96,cueZ=vinyl?1.45:1.39;
  cylinder(`${prefix}.play.ring`,bx,.33,playZ,.24,.09,0x54b785);const play=cylinder(`${prefix}.play`,bx,.395,playZ,.19,.065,0x242a2d);bind(play,{kind:'play',deck:id});caps[`${id}.play`]=play;label('PLAY',bx,playZ,.37,.435,'#d8eee2');
  cylinder(`${prefix}.cue.ring`,bx,.33,cueZ,.22,.09,0xdab950);const cue=cylinder(`${prefix}.cue`,bx,.395,cueZ,.17,.065,0x272c2d);bind(cue,{kind:'cue',deck:id});label('CUE',bx,cueZ,.31,.435,'#e8dcaf');
  if(!vinyl)label('MIXTAPE',x+.5,2.04,1.4,.3,'#d4d8db');
 }
 const playerObjects=new Set(scene.children),playerHitCount=hits.length;
 box('mixer.body',0,0,0,2.55,.50,4.66,palette.body);box('mixer.face',0,.27,0,2.49,.035,4.57,palette.face);label('MIXTAPE / FOUR CHANNEL',0,-2.1,2.20, .30);
 const channels=deckIds;
 for(const [i,id]of channels.entries()){
  const x=-.91+i*.60;label(id,x,-1.80,.35,.32);
  for(const [j,band]of (['high','mid','low']as const).entries()){
   const z=-1.47+j*.49;const knob=cylinder(`deck.${id}.${band}`,x,.38,z,.115,.19,0x454c50);bind(knob,{kind:band,deck:id});caps[`${id}.${band}`]=knob;
   const mark=box(`deck.${id}.${band}.mark`,0,0,0,.02,.012,.071,0xe0e2da);scene.remove(mark);knob.add(mark);mark.position.set(0,.104,-.064);label(band.toUpperCase(),x,z+.18,.40,.31);
  }
  const knob=cylinder(`deck.${id}.filter`,x,.38,.17,.145,.20,0x929895);bind(knob,{kind:'filter',deck:id});caps[`${id}.filter`]=knob;
  const mark=box(`deck.${id}.filter.mark`,0,0,0,.024,.012,.095,0x111718);scene.remove(mark);knob.add(mark);mark.position.set(0,.11,-.07);label('FILTER',x,.43,.46,.31);
  box(`deck.${id}.gain.track`,x,.3,1.02,.053,.02,.97,0x040707);
  for(let n=0;n<9;n++)box(`deck.${id}.scale`,x-.14,.3,.57+n*.112,.1,.008,.008,0x81888b);
  const target=box(`deck.${id}.gain.hit`,x,.31,1.02,.4,.01,1.05,0x000000);(target.material as THREE.Material).transparent=true;(target.material as THREE.Material).opacity=0;bind(target,{kind:'gain',deck:id});
  const fader=box(`deck.${id}.gain`,x,.38,1,.32,.12,.15,0xc0c4c5);bind(fader,{kind:'gain',deck:id});caps[`${id}.gain`]=fader;label(`LEVEL ${id}`,x,1.65,.48,.31);
  meters[id]=box(`deck.${id}.meter`,x+.23,.315,1.02,.034,.018,.95,0x6cc596);
 }
 box('mixer.crossfader.track',0,.30,1.97,1.70,.04,.07,0x030708);const cross=box('mixer.crossfader',-.7,.38,1.97,.19,.12,.28,0xbac0c1);bind(cross,{kind:'crossfader'});caps.crossfader=cross;
 const crossHit=box('mixer.crossfader.hit',0,.31,1.97,1.82,.012,.40,0x000000);(crossHit.material as THREE.Material).transparent=true;(crossHit.material as THREE.Material).opacity=0;bind(crossHit,{kind:'crossfader'});label('A+C  ←  →  B+D',0,2.24,1.80,.31);
 const fallbackMixer=new THREE.Group();fallbackMixer.name='mixer.procedural-fallback';
 for(const object of [...scene.children])if(!playerObjects.has(object))fallbackMixer.add(object);
 scene.add(fallbackMixer);
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let drag:{hit:Hit;x:number;y:number;value:number;pointer:number}|undefined;
 let disposed=false,mixer: MixerAsset|undefined,pendingMixer: MixerAsset|undefined;
 const assetRequest=new AbortController();
 renderer.domElement.dataset.mixerAsset='loading';onMixerStatus('Loading editable mixer · controls ready');
 function activateMixer(){
  if(!pendingMixer||drag||disposed)return;
  mixer=pendingMixer;pendingMixer=undefined;mixer.update(engine.session);
  scene.add(mixer.root);fallbackMixer.visible=false;
  hits.splice(playerHitCount,hits.length-playerHitCount,...mixer.hits);
  renderer.domElement.dataset.mixerAsset='ready';onMixerStatus('Editable mixer');
 }
 void loadMixerAsset({signal:assetRequest.signal}).then(asset=>{
  if(disposed){asset?.dispose();return;}
  if(!asset){renderer.domElement.dataset.mixerAsset='fallback';onMixerStatus('Standard mixer · asset unavailable');return;}
  // Runtime finish on authored material names; bindings and editable source geometry stay intact.
  const finishes:Record<string,string>={
   'Forest powder coat':palette.body,'Satin forest face':palette.face,
   'Dark recessed rubber':palette.background,'Warm ivory print':palette.print,
   'Brushed warm aluminum':palette.metal,
  };
  asset.root.traverse(node=>{
   if(!(node instanceof THREE.Mesh))return;
   for(const material of Array.isArray(node.material)?node.material:[node.material]){
    const finish=finishes[material.name];
    if(finish&&material instanceof THREE.MeshStandardMaterial)material.color.set(finish);
   }
  });
  pendingMixer=asset;activateMixer();
 });
 function pick(e:PointerEvent){const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);return ray.intersectObjects(hits)[0]?.object.userData.hit as Hit|undefined;}
 function down(e:PointerEvent){const hit=pick(e);if(!hit)return;renderer.domElement.focus();const d=hit.deck&&engine.session.decks[hit.deck];
  if(hit.kind==='load'&&hit.deck){onLoad(hit.deck);return;}
  if(hit.kind==='play'&&hit.deck&&d){send({type:d.playing?'pause':'play',deck:hit.deck});return;}
  if(hit.kind==='cue'&&hit.deck){send({type:'cue',deck:hit.deck});return;}
  const value=hit.kind==='crossfader'?engine.session.crossfader:hit.kind==='gain'?d?d.gain:0:hit.kind==='filter'?d?d.filter:0:d&&(hit.kind==='low'||hit.kind==='mid'||hit.kind==='high')?(d.eq[hit.kind]+12)/24:0;
  onGrab(true);drag={hit,x:e.clientX,y:e.clientY,value,pointer:e.pointerId};renderer.domElement.setPointerCapture(e.pointerId);renderer.domElement.style.cursor='grabbing';
 }
 function move(e:PointerEvent){if(drag){const delta=drag.hit.kind==='crossfader'?(e.clientX-drag.x)/170:(drag.y-e.clientY)/140;const value=Math.max(0,Math.min(1,drag.value+delta));
   if(drag.hit.deck&&(drag.hit.kind==='low'||drag.hit.kind==='mid'||drag.hit.kind==='high'))send({type:'eq',deck:drag.hit.deck,band:drag.hit.kind,value:value*24-12});else if(drag.hit.kind==='crossfader')send({type:'crossfader',value});else if(drag.hit.deck&&(drag.hit.kind==='gain'||drag.hit.kind==='filter'))send({type:drag.hit.kind,deck:drag.hit.deck,value});
  }else {const h=pick(e);renderer.domElement.style.cursor=h?'grab':'default';onHover(h?`${h.deck?`Deck ${h.deck} · `:''}${h.kind}${h.kind==='play'||h.kind==='cue'||h.kind==='load'?' · click':' · drag'}`:'Drag a fader or filter. Click PLAY / CUE.');}}
 function up(){const held=drag;drag=undefined;onGrab(false);if(held&&renderer.domElement.hasPointerCapture(held.pointer))renderer.domElement.releasePointerCapture(held.pointer);renderer.domElement.style.cursor='default';activateMixer();}
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.addEventListener('lostpointercapture',up);window.addEventListener('blur',up);
 const resize=new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();if(width<=0||height<=0)return;renderer.setSize(width,height);camera.aspect=width/height;const distance=Math.max(8,(rigWidth+1)/(2*Math.tan(THREE.MathUtils.degToRad(18.5))*camera.aspect)+1.5);camera.position.set(0,distance*0.84,distance*0.543);camera.lookAt(0,0,0);camera.updateProjectionMatrix();});resize.observe(host);
 let frame=0,last=0,lastFrame=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function render(t:number){frame=requestAnimationFrame(render);if(t-lastFrame<33||host.clientWidth===0)return;lastFrame=t;const started=performance.now();const state=engine.snapshot();
  const levels={A:engine.meter('A'),B:engine.meter('B'),C:engine.meter('C'),D:engine.meter('D')};
  if(mixer)mixer.update(state,levels);else caps.crossfader.position.x=-0.7+state.crossfader*1.4;
  for(const id of deckIds){const d=state.decks[id];if(!mixer){caps[`${id}.gain`].position.z=1.5-d.gain*.94;caps[`${id}.filter`].rotation.y=(d.filter-.5)*4.5;for(const band of ['low','mid','high'] as const)caps[`${id}.${band}`].rotation.y=d.eq[band]/12*2.2;}
   const jog=jogs[id];if(jog&&!reduced.matches)jog.rotation.y=-d.position*Math.PI*(vinyl?1.111:0.6);
   const play=caps[`${id}.play`];if(play){const material=play.material as THREE.MeshStandardMaterial;material.emissive.setHex(d.playing?0x287c49:0);material.emissiveIntensity=d.playing?.7:0;}
   const meter=meters[id];if(meter&&!mixer)meter.scale.z=Math.max(.01,Math.min(1,levels[id]*7));
  }
  if(t-last>100){last=t;for(const display of displays){const d=state.decks[display.id],c=display.canvas.getContext('2d')!;c.fillStyle=palette.surface;c.fillRect(0,0,768,320);c.fillStyle=deckColors[display.id];c.font='500 34px Archivo,Arial,sans-serif';c.fillText(d.track.title.slice(0,27),26,47);c.font='bold 50px monospace';c.fillText(d.track.bpm?`${d.track.bpm}.0`:'— BPM',26,111);c.fillStyle=palette.print;c.font='24px monospace';c.fillText(`${d.playing?'PLAYING':'CUED'}  ${d.position.toFixed(1)} / ${d.track.duration.toFixed(0)}s`,290,104);c.fillText(d.track.rekordbox?'REKORDBOX · ALIGNMENT UNVERIFIED':d.track.bpm?`BAR ${Math.floor(d.position/2)+1} · BEAT ${Math.floor(d.position/0.5)%4+1}   FIXTURE GRID`:'LOCAL FILE · ANALYSIS UNKNOWN',26,157);c.fillStyle=palette.line;c.fillRect(26,186,716,6);c.fillStyle=deckColors[display.id];c.fillRect(26,186,716*d.position/d.track.duration,6);const file=d.track.stems.find(s=>s.name==='drums')?.file??d.track.original,buffer=engine.buffers.get(file);if(buffer){const samples=buffer.getChannelData(0);c.strokeStyle=deckColors[display.id];c.lineWidth=2;c.beginPath();for(let n=0;n<240;n++){let peak=0;const index=Math.floor(n/240*samples.length);for(let k=0;k<64;k++)peak=Math.max(peak,Math.abs(samples[Math.min(samples.length-1,index+k*13)]));const x=26+n*2.98;c.moveTo(x,255-peak*62);c.lineTo(x,255+peak*62);}c.stroke();c.fillStyle=palette.text;c.fillRect(26+716*d.position/d.track.duration,210,2,89);c.font='18px monospace';c.fillText(d.track.stems.length?'DRUM BUFFER · AMPLITUDE':'SOURCE BUFFER · AMPLITUDE',26,315);}display.texture.needsUpdate=true;}}
  renderer.render(scene,camera);
  diagnostics.frame(t,started);
 }
 frame=requestAnimationFrame(render);
 return ()=>{disposed=true;assetRequest.abort();up();pendingMixer?.dispose();if(mixer){scene.remove(mixer.root);mixer.dispose();}cancelAnimationFrame(frame);resize.disconnect();window.removeEventListener('blur',up);renderer.domElement.remove();scene.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();const materials=Array.isArray(obj.material)?obj.material:[obj.material];for(const m of materials){if('map'in m)(m.map as THREE.Texture|null)?.dispose();m.dispose();}}});renderer.dispose();};
}
