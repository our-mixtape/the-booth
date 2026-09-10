import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { arch, cpus, platform } from 'node:os';

for (const label of ['before', 'after'] as const) test(`sample ${label === 'before' ? 'procedural' : 'Blender'} mixer timing with four playing decks`, async ({ page, browser }) => {
  if (label === 'before') await page.route('**/models/mixtape-mixer.glb', route => route.fulfill({ status: 503, body: 'Procedural comparison' }));
  await page.goto('/?boothStats=1#play');
  await page.getByRole('button', { name: 'Start audio', exact: false }).click();
  await expect(page.locator('.canvas-host canvas')).toHaveAttribute('data-mixer-asset', label === 'before' ? 'fallback' : 'ready');
  await page.locator('.canvas-host canvas').focus();
  for (const key of ['q', 'p', 'e', 'i']) await page.keyboard.press(key);
  await page.locator('.canvas-host canvas').scrollIntoViewIfNeeded();
  await expect.poll(async () => {
    const stats = await page.locator('.canvas-host canvas').getAttribute('data-frame-stats');
    return stats ? JSON.parse(stats).samples : 0;
  }, { timeout: 20000 }).toBe(120);
  const stats = JSON.parse((await page.locator('.canvas-host canvas').getAttribute('data-frame-stats'))!);
  await writeFile(`docs/evidence/visual-iteration/performance-${label}.json`, JSON.stringify({
    label, mixer: label === 'before' ? 'procedural fallback' : 'Blender export', measuredAt: new Date().toISOString(), browser: browser.version(), platform: platform(), arch: arch(),
    processor: cpus()[0]?.model, viewport: page.viewportSize(), layout: 'digital4', playingDecks: ['A', 'B', 'C', 'D'],
    ...stats, note: 'Headless Chromium on this laptop; bounded rendered-frame intervals and CPU submission time, not GPU completion or a live-audio latency budget.',
  }, null, 2));
  await page.locator('.stage').screenshot({ path: `docs/evidence/visual-iteration/mixer-${label}.png` });
  await page.getByRole('button', { name: 'Stop all decks', exact: false }).click();
});
