import { mockBrowserAuth } from './browser-auth';
import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('camera is opt-in; denial and reduced motion preserve manual playback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { cameraRequests: [] });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async (constraints: MediaStreamConstraints) => {
      Reflect.get(window, 'cameraRequests').push(constraints);
      throw new DOMException('Denied for lifecycle test', 'NotAllowedError');
    } });
  });
  await page.goto('/#play');
  await expect(page.getByRole('region', { name: 'Living sleeve preview' })).toHaveCount(0);
  await page.goto('/?livingSleeve=1#play');
  const sleeve = page.getByRole('region', { name: 'Living sleeve preview' });
  await expect(sleeve).toHaveAttribute('data-camera-status', 'idle');
  expect(await page.evaluate(() => Reflect.get(window, 'cameraRequests'))).toEqual([]);
  await page.getByRole('button', { name: 'Start audio', exact: false }).click();
  await page.locator('.canvas-host canvas').focus(); await page.keyboard.press('q');
  await page.getByRole('button', { name: 'Put me in the mix', exact: true }).click();
  await expect(sleeve).toHaveAttribute('data-camera-status', 'error');
  await expect(sleeve).toContainText('permission was not granted');
  const calls = await page.evaluate(() => Reflect.get(window, 'cameraRequests'));
  expect(calls).toHaveLength(1); expect(calls[0].audio).toBe(false);
  await sleeve.screenshot({ path: 'docs/evidence/visual-iteration/camera-denied.png' });
  await page.getByRole('button', { name: 'Track library & accessible controls', exact: false }).click();
  await expect(page.getByLabel('Deck A position')).toContainText('playing');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('checkbox', { name: 'Still artwork' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Put me in the mix', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Deck A position')).toContainText('playing');
});

test('video and mocked voice own separate tracks; stopping either preserves the other and audio', async ({ page }) => {
  await mockBrowserAuth(page);
  const outgoing: { url: string; body: string | null }[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.method() === 'POST') outgoing.push({ url: request.url(), body: request.postData() }); });
  await page.route('**/api/status', route => route.fulfill({ json: { available: true, message: 'Mock voice transport for lifecycle test' } }));
  await page.route('**/api/voice/session', route => route.fulfill({ contentType: 'application/sdp', body: 'mock-answer' }));
  await page.addInitScript(() => {
    const metrics = { requests: [] as MediaStreamConstraints[], video: [] as MediaStreamTrack[], audio: [] as MediaStreamTrack[], peerTracks: [] as string[], closes: 0 };
    Object.assign(window, { cameraVoiceMetrics: metrics });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async (constraints: MediaStreamConstraints) => {
      metrics.requests.push(constraints);
      if (constraints.video) {
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext('2d')!;
        const draw = () => {
          ctx.fillStyle = '#f0ddad'; ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#651c2e'; ctx.fillRect(150, 80, 340, 320);
          ctx.fillStyle = '#f8ebd1'; ctx.font = '28px Arial'; ctx.textAlign = 'center'; ctx.fillText('SYNTHETIC CAMERA', 320, 240);
        };
        draw(); const timer = setInterval(draw, 50);
        const stream = canvas.captureStream(20);
        stream.getVideoTracks().forEach(track => { const stop = track.stop.bind(track); track.stop = () => { clearInterval(timer); stop(); }; metrics.video.push(track); });
        return stream;
      }
      const context = new AudioContext(), stream = context.createMediaStreamDestination().stream;
      metrics.audio.push(...stream.getAudioTracks());
      return stream;
    } });
    class Peer {
      connectionState = 'new';
      channel = { readyState: 'open', onopen: null as null | (() => void), onclose: null as null | (() => void), send: () => {}, close: () => {} };
      addTrack(track: MediaStreamTrack) { metrics.peerTracks.push(track.kind); }
      createDataChannel() { return this.channel; }
      async createOffer() { return { sdp: 'mock-offer' }; }
      async setLocalDescription() {}
      async setRemoteDescription() { this.channel.onopen?.(); }
      close() { metrics.closes++; }
    }
    Object.defineProperty(window, 'RTCPeerConnection', { value: Peer });
  });
  await page.goto('/?livingSleeve=1#play');
  const sleeve = page.getByRole('region', { name: 'Living sleeve preview' });
  await page.getByRole('button', { name: 'Start audio', exact: false }).click();
  await page.getByRole('button', { name: 'Capture mix', exact: false }).click();
  await page.locator('.canvas-host canvas').focus(); await page.keyboard.press('q');
  await page.getByRole('button', { name: 'Put me in the mix', exact: true }).click();
  await expect(sleeve).toHaveAttribute('data-camera-status', 'live');
  await expect(sleeve.locator('canvas')).toBeVisible();
  await sleeve.screenshot({ path: 'docs/evidence/visual-iteration/sleeve-synthetic-video.png' });
  expect(outgoing).toHaveLength(0);
  await page.getByRole('button', { name: 'Talk to voice', exact: false }).click();
  await expect(page.getByRole('region', { name: 'Ask Astra', exact: true })).toContainText('Voice connected');
  await page.getByRole('button', { name: 'Turn camera off', exact: true }).click();
  const read = () => page.evaluate(() => {
    const m = Reflect.get(window, 'cameraVoiceMetrics');
    return { requests: m.requests, video: m.video.map((t: MediaStreamTrack) => t.readyState), audio: m.audio.map((t: MediaStreamTrack) => t.readyState), peerTracks: m.peerTracks, closes: m.closes };
  });
  expect(await read()).toMatchObject({ video: ['ended'], audio: ['live'], peerTracks: ['audio'], closes: 0 });
  await page.getByRole('button', { name: 'Put me in the mix', exact: true }).click();
  await expect(sleeve).toHaveAttribute('data-camera-status', 'live');
  await page.getByRole('button', { name: 'Stop voice', exact: false }).click();
  expect(await read()).toMatchObject({ video: ['ended', 'live'], audio: ['ended'], closes: 1 });
  await expect(sleeve).toHaveAttribute('data-camera-status', 'live');
  await page.getByRole('checkbox', { name: 'Still artwork' }).check();
  await expect(sleeve).toHaveAttribute('data-camera-status', 'idle');
  expect(await read()).toMatchObject({ video: ['ended', 'ended'] });
  await page.getByRole('button', { name: 'Track library & accessible controls', exact: false }).click();
  await expect(page.getByLabel('Deck A position')).toContainText('playing');
  await page.getByRole('button', { name: 'Finish capture', exact: false }).click();
  const link = page.getByRole('link', { name: 'Save audio', exact: false }); await expect(link).toBeVisible();
  const url = (await link.getAttribute('href'))!;
  const signal = await page.evaluate(async url => {
    const context = new OfflineAudioContext(1, 24000, 24000);
    const buffer = await context.decodeAudioData(await (await fetch(url)).arrayBuffer());
    const samples = buffer.getChannelData(0); let energy = 0, peak = 0;
    for (const sample of samples) { energy += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
    return { rms: Math.sqrt(energy / samples.length), peak, duration: buffer.duration, channels: buffer.numberOfChannels };
  }, url);
  expect(signal.rms).toBeGreaterThan(.01); expect(signal.peak).toBeLessThan(1);
  const download = page.waitForEvent('download'); await link.click();
  await (await download).saveAs('docs/evidence/visual-iteration/camera-voice-manual-audio.webm');
  expect(outgoing).toHaveLength(1); expect(outgoing[0].url).toContain('/api/voice/session'); expect(outgoing[0].body).toBe('mock-offer');
  expect(errors).toEqual([]);
  await writeFile('docs/evidence/visual-iteration/camera-voice-lifecycle.json', JSON.stringify({ ...await read(), outgoing, signal, note: 'Synthetic canvas video, synthetic microphone track and mocked voice peer/SDP; actual booth master-bus fixture recording. No physical camera, microphone, or genuine voice conversation verified.' }, null, 2));
  await page.getByRole('button', { name: 'Stop all decks', exact: false }).click();
});
