import {test,expect} from '@playwright/test';
test('private library loads validated stems and has no original playing underneath',async({page,request})=>{
 test.setTimeout(90000);
 const response=await request.get('/api/library');const data=await response.json();
 const prepared=data.tracks?.find((t:{status:string})=>t.status==='stems-ready');test.skip(!prepared,'Requires one locally prepared track');
 expect((await request.get('/local-tracks/inventory.json')).status()).not.toBe(200);
 expect((await request.get('/api/library/not-a-track/original.wav')).status()).toBe(404);
 await page.goto('/');await page.getByRole('button',{name:'Start audio',exact:false}).click();await page.getByRole('button',{name:'Track library & accessible controls',exact:false}).click();
 await page.getByLabel('Track for A').selectOption(prepared.id);
 await expect(page.locator('#library-A .stems input')).toHaveCount(4,{timeout:60000});
 if(prepared.rekordbox){await expect(page.locator('#library-A')).toContainText('Rekordbox');await expect(page.locator('#library-A')).toContainText(`${prepared.bpm} BPM`);await expect(page.locator('#library-A')).toContainText('alignment unverified');}
 await expect(page.locator('#library-A .stems')).toContainText('vocals');await expect(page.locator('#library-A .stems')).not.toContainText('melody');
 await page.getByRole('button',{name:'Play A',exact:true}).click();await page.waitForTimeout(2000);
 const meter=()=>page.evaluate(async()=>{const {getEngine}=await import(/* @vite-ignore */ String('/src/audio/engine.ts'));return(await getEngine()).meter('A');});
 await expect.poll(meter).toBeGreaterThan(.001);
 for(const name of ['drums','bass','vocals','other'])await page.locator('#library-A').getByRole('checkbox',{name,exact:true}).uncheck();
 await expect.poll(meter).toBeLessThan(.0001);
 await page.locator('#library-A').getByRole('checkbox',{name:'drums',exact:true}).check();await expect.poll(meter).toBeGreaterThan(.001);
 await page.getByRole('button',{name:'ALT · 2 turntables',exact:true}).click();await expect(page.getByLabel('Deck A position')).toContainText('playing');
 await page.getByRole('button',{name:'Stop all decks',exact:false}).click();
});
