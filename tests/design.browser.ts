import {test,expect} from '@playwright/test';
test('Afterhours home enters the working booth and fits mobile',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 await expect(page.getByRole('heading',{name:'Step into the mix.'})).toBeVisible();
 await expect(page.locator('main')).toHaveClass('afterhours-site');await page.screenshot({path:'docs/evidence/experience/afterhours-home.png'});
 await page.locator('.hero .ink-link').click();await page.getByRole('button',{name:'Skip for now →',exact:true}).click();await page.getByRole('button',{name:'Jump into free play ↗',exact:true}).click();await expect(page.getByRole('button',{name:'Start audio',exact:false})).toBeInViewport();
 await expect(page.locator('.waveform-traces canvas')).toHaveAttribute('data-ready','true');
 await page.screenshot({path:'docs/evidence/experience/home-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 await expect(page.locator('.waveform-traces canvas')).toHaveAttribute('data-ready','true');
 await page.screenshot({path:'docs/evidence/experience/home-mobile.png',fullPage:true});
 await page.locator('.hero .ink-link').click();await page.getByRole('button',{name:'Skip for now →',exact:true}).click();await page.getByRole('button',{name:'Jump into free play ↗',exact:true}).click();await page.getByRole('button',{name:'Start audio',exact:false}).click();
 await page.getByRole('button',{name:'Track library & accessible controls',exact:false}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});
