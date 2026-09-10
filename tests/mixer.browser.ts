import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PerspectiveCamera, Vector3, MathUtils } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { bindMixerAsset } from '../src/scene/mixer-asset';
import { Session, TrackSchema } from '../src/domain/session';

async function project(page: Page, world: Vector3) {
  await page.locator('.canvas-host canvas').scrollIntoViewIfNeeded();
  const r = (await page.locator('.canvas-host canvas').boundingBox())!;
  const aspect = r.width / r.height, distance = Math.max(8, 17.3 / (2 * Math.tan(MathUtils.degToRad(18.5)) * aspect) + 1.5);
  const camera = new PerspectiveCamera(37, aspect, .1, 100);
  camera.position.set(0, distance * .84, distance * .543); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const p = world.clone().project(camera);
  return { x: r.x + (p.x + 1) * r.width / 2, y: r.y + (1 - p.y) * r.height / 2 };
}

test('all 21 exported hit regions dispatch the intended command and actual DSP parameter', async ({ page }) => {
  const bytes = await readFile('public/models/mixtape-mixer.glb');
  const root = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
  const asset = bindMixerAsset(root, JSON.parse(await readFile('public/models/mixtape-mixer.bindings.json', 'utf8')));
  asset.update(new Session(TrackSchema.array().parse(JSON.parse(await readFile('public/audio/manifest.json', 'utf8')))));
  root.updateMatrixWorld(true);
  await page.goto('/#play'); await page.getByRole('button', { name: 'Start audio', exact: false }).click();
  await expect(page.locator('.canvas-host canvas')).toHaveAttribute('data-mixer-asset', 'ready');
  const observations = [];
  for (const hit of asset.hits) {
    const p = await project(page, hit.getWorldPosition(new Vector3()));
    const target = hit.userData.hit as { kind: string; deck?: string };
    await page.mouse.move(p.x, p.y); await page.mouse.down();
    await expect(page.getByRole('button', { name: 'ALT · 2 turntables', exact: true })).toBeDisabled();
    await page.mouse.move(p.x + (target.kind === 'crossfader' ? 85 : 0), p.y + (target.kind === 'crossfader' ? 0 : 35), { steps: 4 }); await page.mouse.up();
    const observation = await page.evaluate(async () => {
      const path = '/src/audio/engine.ts'; const { getEngine } = await import(/* @vite-ignore */ path) as typeof import('../src/audio/engine'); const engine = await getEngine();
      await new Promise(resolve => setTimeout(resolve, 120));
      const last = engine.session.history.at(-1)!;
      const command = last.command;
      if (typeof command === 'string') throw new Error('Unexpected track load');
      let applied = 0;
      if (command.type === 'eq') applied = engine.channels[command.deck].eq[command.band].gain.value;
      if (command.type === 'filter') applied = engine.channels[command.deck].filter.frequency.value;
      if (command.type === 'gain') applied = engine.channels[command.deck].gain.gain.value;
      if (command.type === 'crossfader') applied = engine.channels.A.gain.gain.value;
      return { command, origin: last.origin, applied, state: engine.snapshot() };
    });
    expect(observation.origin).toBe('pointer');
    const eq = ['high', 'mid', 'low'].includes(target.kind);
    expect(observation.command).toMatchObject({ type: eq ? 'eq' : target.kind, ...(target.deck ? { deck: target.deck } : {}), ...(eq ? { band: target.kind } : {}) });
    const value = target.kind === 'crossfader' ? .5 : target.kind === 'gain' ? .55 : target.kind === 'filter' ? .75 : -6;
    if (!('value' in observation.command)) throw new Error('Expected a parameter command');
    // Browser pointer coordinates can be fractional device pixels.
    expect(observation.command.value).toBeCloseTo(value, 5);
    const deck = target.deck as 'A' | 'B' | 'C' | 'D';
    const cross = observation.state.crossfader;
    const crossGain = (id: string) => id === 'A' || id === 'C' ? Math.cos(cross * Math.PI / 2) : Math.sin(cross * Math.PI / 2);
    const dsp = eq ? value : target.kind === 'filter' ? 160 * 125 ** value : target.kind === 'gain' ? value * crossGain(deck) : observation.state.decks.A.gain * crossGain('A');
    expect(observation.applied).toBeCloseTo(dsp, target.kind === 'filter' ? -1 : 2);
    observations.push({ target: hit.userData.control_id, command: observation.command, applied: observation.applied });
  }
  await page.locator('.stage').screenshot({ path: 'docs/evidence/visual-iteration/mixer-controls-changed.png' });
  await writeFile('docs/evidence/visual-iteration/control-routing.json', JSON.stringify(observations, null, 2));
  asset.dispose();
});

test('failed GLB keeps a playable procedural mixer through layout changes', async ({ page }) => {
  await page.route('**/models/mixtape-mixer.glb', route => route.fulfill({ status: 503, body: 'Asset unavailable for fallback test' }));
  await page.goto('/#play'); await page.getByRole('button', { name: 'Start audio', exact: false }).click();
  await expect(page.locator('.canvas-host canvas')).toHaveAttribute('data-mixer-asset', 'fallback');
  await expect(page.locator('.stage')).toContainText('Standard mixer · asset unavailable');
  const p = await project(page, new Vector3(-.7, .38, 1.97));
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 85, p.y); await page.mouse.up();
  await page.keyboard.press('q');
  await page.getByRole('button', { name: 'ALT · 2 turntables', exact: true }).click();
  await expect(page.locator('.canvas-host canvas')).toHaveAttribute('data-mixer-asset', 'fallback');
  await page.locator('.stage').screenshot({ path: 'docs/evidence/visual-iteration/mixer-fallback.png' });
  await page.getByRole('button', { name: 'Track library & accessible controls', exact: false }).click();
  await expect(page.getByLabel('Deck A position')).toContainText('playing');
  await expect(page.getByLabel('Crossfader', { exact: true })).toHaveValue('0.5');
});

test('a late asset waits for grab release and cannot reset the blend', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/models/mixtape-mixer.glb', async route => { await gate; await route.continue(); });
  await page.goto('/#play'); await page.getByRole('button', { name: 'Start audio', exact: false }).click();
  const p = await project(page, new Vector3(-.7, .38, 1.97));
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  await expect(page.getByRole('button', { name: '4 CDJs', exact: true })).toBeDisabled();
  release(); await page.waitForResponse('**/models/mixtape-mixer.glb'); await page.waitForTimeout(400);
  await expect(page.locator('.canvas-host canvas')).toHaveAttribute('data-mixer-asset', 'loading');
  await page.mouse.move(p.x + 85, p.y); await page.mouse.up();
  await expect(page.locator('.canvas-host canvas')).toHaveAttribute('data-mixer-asset', 'ready');
  await page.getByRole('button', { name: 'Track library & accessible controls', exact: false }).click();
  await expect(page.getByLabel('Crossfader', { exact: true })).toHaveValue('0.5');
});

for(const fallback of [false,true])test(`${fallback?'fallback':'exported'} knobs lower left, raise right and keep the chosen drag axis`,async({page})=>{
 if(fallback)await page.route('**/models/mixtape-mixer.glb',route=>route.fulfill({status:503,body:'Fallback direction check'}));
 await page.goto('/#play');await page.getByRole('button',{name:'Start audio',exact:false}).click();
 await expect(page.locator('.canvas-host canvas')).toHaveAttribute('data-mixer-asset',fallback?'fallback':'ready');
 await page.getByRole('slider',{name:'Performance high EQ A',exact:true}).fill('0');
 await page.getByRole('slider',{name:'Performance filter A',exact:true}).fill('0.5');
 const observations=[];
 for(const kind of ['high','filter'] as const){
  const point=await project(page,new Vector3(fallback?-.91:-.90,.40,kind==='high'?-1.47:.17));
  const read=()=>page.evaluate(async kind=>{
   const path='/src/audio/engine.ts';const {getEngine}=await import(/* @vite-ignore */path) as typeof import('../src/audio/engine');const engine=await getEngine();
   return {value:kind==='high'?engine.session.decks.A.eq.high:engine.session.decks.A.filter,dsp:kind==='high'?engine.channels.A.eq.high.gain.value:engine.channels.A.filter.frequency.value};
  },kind);
  await page.mouse.move(point.x,point.y);await page.mouse.down();
  await page.mouse.move(point.x-35,point.y,{steps:4});
  const low=kind==='high'?-6:.25,high=kind==='high'?6:.75;
  await expect.poll(async()=>(await read()).value).toBeCloseTo(low,4);
  await expect.poll(async()=>(await read()).dsp).toBeCloseTo(kind==='high'?low:160*125**low,kind==='high'?2:0);
  observations.push({kind,direction:'left',...await read()});
  // Once horizontal is selected, a larger incidental vertical displacement must not reverse the value.
  await page.mouse.move(point.x+35,point.y+55,{steps:4});
  await expect.poll(async()=>(await read()).value).toBeCloseTo(high,4);
  await expect.poll(async()=>(await read()).dsp).toBeCloseTo(kind==='high'?high:160*125**high,kind==='high'?2:0);
  observations.push({kind,direction:'right with vertical drift',...await read()});
  await page.mouse.move(point.x,point.y);await page.mouse.up();
  await expect.poll(async()=>(await read()).value).toBeCloseTo(kind==='high'?0:.5,4);
  // Vertical input remains available; incidental sideways travel does not change its chosen axis.
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x,point.y-35,{steps:4});
  await page.mouse.move(point.x-55,point.y-35,{steps:4});
  await expect.poll(async()=>(await read()).value).toBeCloseTo(high,4);
  observations.push({kind,direction:'up with horizontal drift',...await read()});
  await page.mouse.up();
 }
 await mkdir('docs/evidence/knob-direction',{recursive:true});
 await page.locator('.stage').screenshot({path:`docs/evidence/knob-direction/${fallback?'fallback':'exported'}-clockwise.png`});
 await writeFile(`docs/evidence/knob-direction/${fallback?'fallback':'exported'}-routing.json`,JSON.stringify(observations,null,2)+'\n');
});
