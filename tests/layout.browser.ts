import { test,expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
test('four decks, EQ, ALT and retained playback',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'Start audio',exact:false}).click();await page.getByRole('button',{name:'Track library & accessible controls',exact:false}).click();
 await page.getByRole('button',{name:'Play C',exact:true}).click();await page.getByRole('button',{name:'Play D',exact:true}).click();await page.getByLabel('Crossfader',{exact:true}).fill('0.5');await page.getByLabel('low EQ C',{exact:true}).fill('-6');await page.waitForTimeout(800);
 // Capture established playback so pre-play click/scroll time is not mistaken for a dropout.
 await page.getByRole('button',{name:'Capture mix',exact:false}).click();
 const before=parseFloat((await page.getByLabel('Deck C position').textContent())!);expect(before).toBeGreaterThan(.5);
 await page.getByRole('button',{name:'ALT · 2 turntables',exact:true}).click();await page.waitForTimeout(400);expect(parseFloat((await page.getByLabel('Deck C position').textContent())!)).toBeGreaterThan(before);await expect(page.getByLabel('low EQ C',{exact:true})).toHaveValue('-6');
 await page.getByLabel('Track for A').selectOption('afterglow');await page.getByRole('button',{name:'Play A',exact:true}).click();
 await page.getByRole('button',{name:'4 CDJs',exact:true}).click();await expect(page.getByRole('heading',{name:'Deck A Afterglow Steps'})).toBeVisible();await expect(page.getByLabel('Deck A position')).toContainText('playing');
 await page.getByRole('button',{name:'Track library & accessible controls',exact:false}).click();await page.screenshot({path:'docs/evidence/four-cdjs.png',fullPage:true});
 await page.getByRole('button',{name:'ALT · 2 turntables',exact:true}).click();await page.screenshot({path:'docs/evidence/turntables.png',fullPage:true});
 await page.getByRole('button',{name:'Finish capture',exact:false}).click();const link=page.getByRole('link',{name:'Save audio',exact:false});await expect(link).toBeVisible();const url=(await link.getAttribute('href'))!;const signal=await page.evaluate(async url=>{const b=await(await fetch(url)).arrayBuffer();const ctx=new OfflineAudioContext(1,24000,24000),audio=await ctx.decodeAudioData(b),samples=audio.getChannelData(0);let zero=0,longest=0,energy=0;for(let i=Math.floor(.5*audio.sampleRate);i<samples.length;i++){energy+=samples[i]*samples[i];zero=Math.abs(samples[i])<.00001?zero+1:0;longest=Math.max(longest,zero);}return{rms:Math.sqrt(energy/samples.length),longestSilence:longest/audio.sampleRate};},url);await writeFile('docs/evidence/layout-continuity.json',JSON.stringify(signal,null,2));expect(signal.rms).toBeGreaterThan(.01);expect(signal.longestSilence).toBeLessThan(.1);const download=page.waitForEvent('download');await link.click();await(await download).saveAs('docs/evidence/layout-continuity.webm');await page.getByRole('button',{name:'Stop all decks',exact:false}).click();expect(errors).toEqual([]);
});
test('a held physical control blocks ALT until released',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Start audio',exact:false}).click();
 await page.locator('.canvas-host canvas').scrollIntoViewIfNeeded();
 const rect=await page.locator('.canvas-host canvas').boundingBox();expect(rect).not.toBeNull();
 const THREE=await import('three');const r=rect!,aspect=r.width/r.height,distance=Math.max(8,17.3/(2*Math.tan(THREE.MathUtils.degToRad(18.5))*aspect)+1.5);
 const camera=new THREE.PerspectiveCamera(37,aspect,.1,100);camera.position.set(0,distance*.84,distance*.543);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const p=new THREE.Vector3(-.7,.38,1.97).project(camera);await page.mouse.move(r.x+(p.x+1)*r.width/2,r.y+(1-p.y)*r.height/2);await page.mouse.down();
 await expect(page.getByRole('button',{name:'ALT · 2 turntables',exact:true})).toBeDisabled();await page.keyboard.press('Alt');await expect(page.getByRole('button',{name:'4 CDJs',exact:true})).toHaveAttribute('aria-pressed','true');await page.mouse.up();
 await expect(page.getByRole('button',{name:'ALT · 2 turntables',exact:true})).toBeEnabled();await page.keyboard.press('Alt');await expect(page.getByRole('button',{name:'ALT · 2 turntables',exact:true})).toHaveAttribute('aria-pressed','true');
});
