import { test, expect, type Page } from '@playwright/test';
import { mockBrowserAuth } from './browser-auth';
import { mkdir, writeFile } from 'node:fs/promises';

const sse = (...events: unknown[]) => events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('');
async function emit(page: Page, ...events: unknown[]) {
 await page.evaluate(data => window.dispatchEvent(new CustomEvent('test:astra-sse', { detail: data })), sse(...events));
}
/** Keep the mocked SSE open, like the gateway, after Playwright supplies its initial event fixture. */
async function keepMockStreamOpen(page: Page) {
 await page.addInitScript(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
   const response = await originalFetch(...args);
   if (String(args[0]) !== '/api/session/brief' || !response.headers.get('content-type')?.includes('text/event-stream') || !response.body) return response;
   const reader = response.body.getReader(), encoder = new TextEncoder();
   let cleanup = () => {};
   const stream = new ReadableStream<Uint8Array>({
    start(controller) {
     const emit = (event: Event) => controller.enqueue(encoder.encode((event as CustomEvent<string>).detail));
     const signal = args[1]?.signal;
     const abort = () => { cleanup(); controller.error(new DOMException('Aborted', 'AbortError')); };
     cleanup = () => { window.removeEventListener('test:astra-sse', emit); signal?.removeEventListener('abort', abort); };
     window.addEventListener('test:astra-sse', emit); signal?.addEventListener('abort', abort, { once: true });
     void (async () => { try { while (true) { const item = await reader.read(); if (item.done) break; controller.enqueue(item.value); } } catch (error) { cleanup(); controller.error(error); } })();
    },
    cancel() { cleanup(); return reader.cancel(); },
   });
   return new Response(stream, { status: response.status, headers: response.headers });
  };
 });
}
async function ready(page: Page) {
 await mockBrowserAuth(page);
 await page.route('**/api/status', route => route.fulfill({ json: { available: true, message: 'Test gateway ready', session: { available: true } } }));
}

test('live steering preserves response history and async retry supplies the measured tool result', async ({ page }) => {
 await ready(page); await keepMockStreamOpen(page);
 const briefPosts: Record<string, unknown>[] = [], steerPosts: Record<string, unknown>[] = [], toolPosts: Record<string, unknown>[] = [];
 await page.route('**/api/session/brief', route => {
  expect(route.request().headers().authorization).toBe('Bearer browser-fixture-token');
  const body = route.request().postDataJSON(); briefPosts.push(body);
  return body.sessionId ? route.fulfill({ status: 202, json: {} }) : route.fulfill({ contentType: 'text/event-stream', body: sse({ t: 'session', sessionId: 'test-live-session' }, { t: 'created', responseId: 'resp_original_plan' }, { t: 'delta', responseId: 'resp_original_plan', text: '1. Bar 5: start deck B.\n' }, { t: 'delta', responseId: 'resp_original_plan', text: '2. Bar 8: blend to B.' }) });
 });
 await page.route('**/api/session/steer', route => { steerPosts.push(route.request().postDataJSON()); return route.fulfill({ status: 202, json: {} }); });
 await page.route('**/api/session/tool', route => { toolPosts.push(route.request().postDataJSON()); return route.fulfill({ status: 202, json: {} }); });
 await page.goto('/#play'); const panel = page.getByRole('region', { name: 'Astra session', exact: true });
 await expect(panel.getByLabel('Steer while Astra responds')).toBeDisabled();
 await panel.getByRole('button', { name: 'Plan the handoff', exact: true }).click();
 await panel.getByRole('button', { name: 'Brief Astra ↗', exact: true }).click();
 await expect(panel).toContainText('2. Bar 8: blend to B.');
 await expect(panel.getByLabel('Steer while Astra responds')).toBeEnabled();
 await panel.getByRole('button', { name: 'Delay B one bar', exact: true }).click();
 await expect.poll(() => steerPosts.length).toBe(1);
 expect(steerPosts[0]).toEqual({ sessionId: 'test-live-session', text: 'Delay B one bar' });
 await emit(page, { t: 'steer', status: 'accepted' }, { t: 'steered', responseId: 'resp_original_plan' });
 await expect(panel.getByLabel('Steer while Astra responds')).toBeDisabled();
 await emit(page, { t: 'created', responseId: 'resp_revised_plan', successorOf: 'resp_original_plan' }, { t: 'delta', responseId: 'resp_revised_plan', text: '1. Bar 6: start deck B.\n2. Bar 8: blend to B.' }, { t: 'tool_call', responseId: 'resp_revised_plan', callId: 'call_watch_browser', name: 'watch_attempt', args: { reason: 'Watch the measured attempt' }, async: true }, { t: 'completed', responseId: 'resp_revised_plan', model: 'gpt-6-astra' });
 await expect(panel).toContainText('Waiting for your attempt · hands on the mixer');
 await expect(panel.getByLabel('Session lifecycle')).toContainText('Steer queued');
 await expect(panel.getByLabel('Session lifecycle')).toContainText('Steered');
 await expect(panel.getByLabel('Session lifecycle')).toContainText('Revising');
 await expect(panel).toContainText('1. Bar 5: start deck B.');
 await expect(panel).toContainText('1. Bar 6: start deck B.');
 await expect(panel.getByLabel('Steer while Astra responds')).toBeDisabled(); expect(toolPosts).toEqual([]);
 await page.getByRole('button', { name: 'Start audio', exact: false }).click();
 await page.getByRole('button', { name: 'Start practice', exact: true }).click();
 await expect(page.getByLabel('Live handoff controls')).toBeVisible();
 await page.locator('.canvas-host canvas').focus(); await page.keyboard.press('Space');
 await expect.poll(() => toolPosts.length).toBe(1);
 expect(toolPosts[0]).toEqual({ sessionId: 'test-live-session', callId: 'call_watch_browser', output: { status: 'retry', tolerance: 0.25 } });
 await emit(page, { t: 'created', responseId: 'resp_attempt_review' }, { t: 'delta', responseId: 'resp_attempt_review', text: 'Attempt stopped before a measured B entry.\nThis does not verify a completed handoff or blend quality.' }, { t: 'completed', responseId: 'resp_attempt_review', model: 'gpt-6-astra' });
 await expect(panel).toContainText('Attempt review'); await expect(panel.getByLabel('Session lifecycle')).toContainText('Done');
 await expect(panel.getByLabel('Steer while Astra responds')).toBeDisabled();
 await panel.getByRole('button', { name: 'Brief Astra ↗', exact: true }).click();
 await expect.poll(() => briefPosts.length).toBe(2); expect(briefPosts[1].sessionId).toBe('test-live-session');
 await emit(page, { t: 'created', responseId: 'resp_followup' }, { t: 'delta', responseId: 'resp_followup', text: '1. Bar 5: try the B play control again.' }, { t: 'completed', responseId: 'resp_followup', model: 'gpt-6-astra' });
 await expect(panel).toContainText('try the B play control again'); await expect(panel).toContainText('Attempt stopped before a measured B entry.');
 await mkdir('docs/evidence/astra-session', { recursive: true });
 await panel.screenshot({ path: 'docs/evidence/astra-session/mock-session-desktop.png' });
 await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
 await panel.screenshot({ path: 'docs/evidence/astra-session/mock-session-mobile.png' });
});

test('completed SSE disables steering and the panel only mounts for local session availability', async ({ page }) => {
 await ready(page);
 await page.route('**/api/session/brief', route => route.fulfill({ contentType: 'text/event-stream', body: sse({ t: 'session', sessionId: 'test-completed' }, { t: 'created', responseId: 'resp_complete' }, { t: 'delta', responseId: 'resp_complete', text: '1. Bar 5: use deck B play.' }, { t: 'completed', responseId: 'resp_complete', model: 'gpt-6-astra' }) }));
 await page.goto('/#play'); const panel = page.getByRole('region', { name: 'Astra session', exact: true });
 await panel.getByRole('button', { name: 'Plan the handoff', exact: true }).click(); await panel.getByRole('button', { name: 'Brief Astra ↗', exact: true }).click();
 await expect(panel).toContainText('1. Bar 5: use deck B play.'); await expect(panel.getByLabel('Steer while Astra responds')).toBeDisabled();
 await page.route('**/api/status', route => route.fulfill({ json: { available: true, message: 'Hosted hints ready', session: { available: false } } }));
 await page.reload(); await expect(panel).toHaveCount(0); await expect(page.getByRole('region', { name: 'Ask Astra', exact: true })).toBeVisible();
});

test('sign-out closes a pending watcher, discards late events, and leaves manual audio available', async ({ page }) => {
 await ready(page); await keepMockStreamOpen(page); let tools = 0;
 await page.route('**/api/session/brief', route => route.fulfill({ contentType: 'text/event-stream', body: sse({ t: 'session', sessionId: 'test-signout' }, { t: 'created', responseId: 'resp_pending' }, { t: 'tool_call', responseId: 'resp_pending', callId: 'call_cancelled', name: 'watch_attempt', args: {}, async: true }, { t: 'completed', responseId: 'resp_pending', model: 'gpt-6-astra' }) }));
 await page.route('**/api/session/tool', route => { tools++; return route.fulfill({ status: 202 }); });
 await page.goto('/#play'); const panel = page.getByRole('region', { name: 'Astra session', exact: true });
 await panel.getByRole('button', { name: 'Plan the handoff', exact: true }).click(); await panel.getByRole('button', { name: 'Brief Astra ↗', exact: true }).click(); await expect(panel).toContainText('Waiting for your attempt');
 await page.getByRole('button', { name: 'Start audio', exact: false }).click(); await page.getByRole('button', { name: 'Start practice', exact: true }).click();
 await page.getByRole('button', { name: 'Expire test session', exact: true }).click();
 await expect(panel.getByRole('button', { name: 'Brief Astra ↗', exact: true })).toBeDisabled(); await expect(panel).not.toContainText('Waiting for your attempt');
 await emit(page, { t: 'delta', responseId: 'resp_pending', text: 'LATE PRIVATE TEXT' });
 await page.locator('.canvas-host canvas').focus(); await page.keyboard.press('Space'); await expect(panel).not.toContainText('LATE PRIVATE TEXT'); expect(tools).toBe(0);
 await expect(page.getByRole('button', { name: 'Audio enabled', exact: false })).toBeVisible();
});

test('a model failure closes assistance while the actual master bus and manual controls keep working', async ({ page }) => {
 await ready(page); await keepMockStreamOpen(page);
 await page.route('**/api/session/brief', route => route.fulfill({ contentType: 'text/event-stream', body: sse({ t: 'session', sessionId: 'failure-test' }, { t: 'created', responseId: 'resp_failing' }) }));
 await page.goto('/#play');
 await page.getByRole('button', { name: 'Start audio', exact: false }).click();
 await page.getByRole('button', { name: '▶ Play A', exact: true }).click();
 await page.getByRole('button', { name: 'Capture mix', exact: false }).click();
 const panel = page.getByRole('region', { name: 'Astra session', exact: true });
 await panel.getByRole('button', { name: 'Plan the handoff', exact: true }).click();
 await panel.getByRole('button', { name: 'Brief Astra ↗', exact: true }).click();
 await expect(panel.getByLabel('Steer while Astra responds')).toBeEnabled();
 await emit(page, { t: 'error', message: 'Astra could not complete the session response. Manual playback continues.' });
 await expect(panel.getByRole('alert')).toContainText('Your mix keeps playing');
 await expect(panel.getByLabel('Steer while Astra responds')).toBeDisabled();
 await page.getByRole('slider', { name: 'Performance filter A', exact: true }).fill('0.8');
 await expect(page.getByRole('region', { name: 'Essential performance controls', exact: true })).toContainText('playing');
 await page.waitForTimeout(1200);
 await page.getByRole('button', { name: 'Finish capture', exact: false }).click();
 const link = page.getByRole('link', { name: 'Save audio', exact: false }); await expect(link).toBeVisible();
 const signal = await page.evaluate(async url => {
  const ctx = new OfflineAudioContext(1, 24000, 24000);
  const audio = await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
  const samples = audio.getChannelData(0).slice(-24000);
  return { rmsLastSecond: Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length), duration: audio.duration, simulatedModelFailure: true };
 }, (await link.getAttribute('href'))!);
 expect(signal.rmsLastSecond).toBeGreaterThan(0.005);
 await mkdir('docs/evidence/hosted-gateway', { recursive: true });
 await writeFile('docs/evidence/hosted-gateway/simulated-failure-audio.json', JSON.stringify(signal, null, 2));
 await page.getByRole('button', { name: 'Stop all decks', exact: false }).click();
});
