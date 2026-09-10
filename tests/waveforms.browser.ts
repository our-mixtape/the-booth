import {test,expect} from '@playwright/test';
test('waveforms follow transport and retain playing decks across ALT',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Start audio',exact:false}).click();
 await expect(page.getByLabel('Live track waveforms')).toBeVisible();
 await page.locator('.canvas-host canvas').focus();await page.keyboard.press('e');await expect.poll(async()=>parseFloat((await page.getByLabel('Waveform C position').textContent())!)).toBeGreaterThan(.2);
 await page.getByRole('button',{name:'ALT · 2 turntables',exact:true}).click();await expect(page.getByLabel('Waveform C position')).toBeVisible();
 await page.locator('.canvas-host canvas').focus();await page.keyboard.press('e');await expect(page.getByLabel('Waveform C position')).toHaveCount(0);
 await page.keyboard.press('q');await expect.poll(async()=>parseFloat((await page.getByLabel('Waveform A position').textContent())!)).toBeGreaterThan(.2);
 await page.keyboard.press('w');await expect(page.getByLabel('Waveform A position')).toHaveText('0.0s');
 await page.getByLabel('Waveform time window').selectOption('16');
 await page.getByRole('button',{name:'4 CDJs',exact:true}).click();
 await page.screenshot({path:'docs/evidence/live-waveforms.png',fullPage:true});
});
