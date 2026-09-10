import type { WebGLRenderer } from 'three';

/** Bounded local development measurements. Never sent to a service. */
export function createBoothDiagnostics(renderer: WebGLRenderer) {
  const enabled = import.meta.env.DEV && new URLSearchParams(location.search).get('boothStats') === '1';
  const intervals: number[] = [], cpu: number[] = [];
  let previous = 0, published = 0;
  const summary = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return { median: sorted[Math.floor(sorted.length * .5)] ?? 0, p95: sorted[Math.floor(sorted.length * .95)] ?? 0 };
  };
  return {
    frame(timestamp: number, started: number) {
      if (!enabled) return;
      if (previous) intervals.push(timestamp - previous);
      previous = timestamp;
      cpu.push(performance.now() - started);
      if (intervals.length > 120) intervals.shift();
      if (cpu.length > 120) cpu.shift();
      if (timestamp - published < 1000) return;
      published = timestamp;
      renderer.domElement.dataset.frameStats = JSON.stringify({
        samples: intervals.length, intervalMs: summary(intervals), renderCpuMs: summary(cpu),
        calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
        width: renderer.domElement.clientWidth, height: renderer.domElement.clientHeight,
        pixelRatio: renderer.getPixelRatio(),
      });
    },
  };
}
