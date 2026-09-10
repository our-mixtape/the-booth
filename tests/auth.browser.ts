import { test, expect } from '@playwright/test';
import { mockBrowserAuth } from './browser-auth';

test('anonymous visitors can play; Astra and microphone stay gated; account sheet fits mobile', async ({ page }) => {
 await page.route('**/api/status', route => route.fulfill({ json: { available: true, message: 'Mock model availability' } }));
 const calls: string[] = []; page.on('request', req => { if (req.method() === 'POST') calls.push(req.url()); });
 await page.addInitScript(() => { Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => { throw Error('Unexpected microphone request'); } }); });
 await page.goto('/#play');
 await page.getByRole('button', { name: 'Start audio', exact: false }).click();
 await page.locator('.canvas-host canvas').focus(); await page.keyboard.press('q');
 await page.getByLabel('What would you like to try?').fill('A handoff please');
 await expect(page.getByRole('button', { name: 'Ask Astra ↗', exact: true })).toBeDisabled();
 await expect(page.getByRole('button', { name: 'Talk to voice', exact: false })).toBeDisabled();
 await page.getByRole('button', { name: 'Sign in', exact: true }).click();
 const account = page.getByRole('dialog'); await expect(account).toContainText('Sign-in is being set up');
 await account.screenshot({ path: 'docs/evidence/auth/account-unconfigured-desktop.png' });
 await page.setViewportSize({ width: 390, height: 844 });
 expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
 await account.screenshot({ path: 'docs/evidence/auth/account-unconfigured-mobile.png' });
 await page.keyboard.press('Escape'); await expect(account).not.toBeVisible();
 await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeFocused();
 await page.getByRole('button', { name: 'Track library & accessible controls', exact: false }).click();
 await expect(page.getByLabel('Deck A position')).toContainText('playing');
 expect(calls).toEqual([]);
});

test('sign-in unlocks requests with a bearer token; sign-out discards pending feedback and preserves the instrument', async ({ page }) => {
 await mockBrowserAuth(page, 'signed-out');
 await page.route('**/api/status', route => route.fulfill({ json: { available: true, message: 'Mock gateway ready' } }));
 const requests: string[] = []; let finish: (() => void) | undefined;
 await page.route('**/api/hint', async route => {
  requests.push(route.request().headers().authorization);
  const data = route.request().postDataJSON();
  if (requests.length === 2) await new Promise<void>(resolve => { finish = resolve; });
  await route.fulfill({ json: { hint: requests.length === 2 ? 'DISCARDED AFTER SIGN OUT' : 'Signed-in test recommendation', model: 'gpt-6-astra', revision: data.revision, requestId: data.ask.requestId } }).catch(() => {});
 });
 await page.goto('/#play');
 await page.getByRole('button', { name: 'Start audio', exact: false }).click();
 await page.locator('.canvas-host canvas').evaluate(canvas => canvas.setAttribute('data-continuity', 'same-instrument'));
 await page.locator('.canvas-host canvas').focus(); await page.keyboard.press('q');
 await page.getByRole('button', { name: 'Sign in to use Astra', exact: false }).click();
 await page.getByRole('button', { name: 'Complete simulated sign-in' }).click();
 await page.getByLabel('What would you like to try?').fill('Help with a handoff');
 await page.getByRole('button', { name: 'Ask Astra ↗', exact: true }).click();
 await expect(page.getByLabel('Ask Astra', { exact: true })).toContainText('Signed-in test recommendation');
 expect(requests).toEqual(['Bearer browser-fixture-token']);
 await page.getByRole('button', { name: 'Ask Astra ↗', exact: true }).click(); await expect.poll(() => requests.length).toBe(2);
 await page.getByRole('button', { name: 'Your account', exact: true }).click();
 await page.getByRole('dialog').screenshot({ path: 'docs/evidence/auth/account-simulated-signed-in.png' });
 await page.getByRole('button', { name: 'Sign out', exact: true }).click(); finish?.();
 await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
 await expect(page.getByLabel('Ask Astra', { exact: true })).not.toContainText('DISCARDED AFTER SIGN OUT');
 await expect(page.getByRole('button', { name: 'Ask Astra ↗', exact: true })).toBeDisabled();
 await expect(page.locator('.canvas-host canvas')).toHaveAttribute('data-continuity', 'same-instrument');
 await page.getByRole('button', { name: 'Track library & accessible controls', exact: false }).click();
 await expect(page.getByLabel('Deck A position')).toContainText('playing');
});

test('session expiry closes voice and microphone while manual playback continues', async ({ page }) => {
 await mockBrowserAuth(page);
 await page.route('**/api/status', route => route.fulfill({ json: { available: true, message: 'Mock voice ready' } }));
 await page.route('**/api/voice/session', route => { expect(route.request().headers().authorization).toBe('Bearer browser-fixture-token'); return route.fulfill({ contentType: 'application/sdp', body: 'mock-answer' }); });
 await page.addInitScript(() => {
  const metrics = { stops: 0, closes: 0 }; Object.assign(window, { authVoiceMetrics: metrics });
  Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => ({ getTracks: () => [{ stop: () => metrics.stops++ }] }) });
  class Peer { connectionState = 'new'; channel = { readyState: 'open', onopen: null as null | (() => void), send: () => {}, close: () => {} }; addTrack() {} createDataChannel() { return this.channel; } async createOffer() { return { sdp: 'mock-offer' }; } async setLocalDescription() {} async setRemoteDescription() { this.channel.onopen?.(); } close() { metrics.closes++; } }
  Object.defineProperty(window, 'RTCPeerConnection', { value: Peer });
 });
 await page.goto('/#play'); await page.getByRole('button', { name: 'Start audio', exact: false }).click();
 await page.locator('.canvas-host canvas').focus(); await page.keyboard.press('q');
 await page.getByRole('button', { name: 'Talk to voice', exact: false }).click();
 await expect(page.getByLabel('Ask Astra', { exact: true })).toContainText('Voice connected');
 await page.getByRole('button', { name: 'Expire test session' }).click();
 await expect(page.getByLabel('Ask Astra', { exact: true })).toContainText('microphone off');
 expect(await page.evaluate(() => Reflect.get(window, 'authVoiceMetrics'))).toEqual({ stops: 1, closes: 1 });
 await page.getByRole('button', { name: 'Track library & accessible controls', exact: false }).click();
 await expect(page.getByLabel('Deck A position')).toContainText('playing');
});

test('a rejected server session requires reauthentication without retrying the model', async ({ page }) => {
 await mockBrowserAuth(page); let calls = 0;
 await page.route('**/api/status', route => route.fulfill({ json: { available: true, message: 'Mock model ready' } }));
 await page.route('**/api/hint', route => { calls++; return route.fulfill({ status: 401, json: { code: 'sign_in_required' } }); });
 await page.goto('/#play'); await page.getByLabel('What would you like to try?').fill('Help please');
 await page.getByRole('button', { name: 'Ask Astra ↗', exact: true }).click();
 await expect(page.getByLabel('Ask Astra', { exact: true })).toContainText('Please sign in again');
 await expect(page.getByRole('button', { name: 'Ask Astra ↗', exact: true })).toBeDisabled(); expect(calls).toBe(1);
});
