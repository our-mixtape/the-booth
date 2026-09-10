import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { Box3, Vector3, Mesh, Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { bindMixerAsset, loadMixerAsset } from '../src/scene/mixer-asset';
import { Session, TrackSchema } from '../src/domain/session';

const manifest = JSON.parse(await readFile('public/models/mixtape-mixer.bindings.json', 'utf8'));
const bytes = await readFile('public/models/mixtape-mixer.glb');
const fixtures = TrackSchema.array().parse(JSON.parse(await readFile('public/audio/manifest.json', 'utf8')));
const parse = async () => (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;

describe('actual exported Blender mixer contract', () => {
  it('moves attached surfaces through effective command ranges without changing session state', async () => {
    const asset = bindMixerAsset(await parse(), manifest), session = new Session(fixtures);
    const size = new Box3().setFromObject(asset.root).getSize(new Vector3());
    expect(size.x).toBeCloseTo(2.55, 2); expect(size.z).toBeCloseTo(4.66, 2);
    expect(asset.metrics.hitRegions).toBe(21);
    for (const id of ['A', 'B', 'C', 'D'] as const) {
      session.apply({ type: 'gain', deck: id, value: 0 }, 0);
      session.apply({ type: 'filter', deck: id, value: 0 }, 0);
      for (const band of ['low', 'mid', 'high'] as const) session.apply({ type: 'eq', deck: id, band, value: -12 }, 0);
    }
    asset.update(session);
    const surface = asset.controls.get('A.gain')!.children.find(node => node instanceof Mesh)!;
    asset.root.updateMatrixWorld(true); const before = surface.getWorldPosition(new Vector3());
    session.apply({ type: 'gain', deck: 'A', value: 1 }, 1);
    session.apply({ type: 'eq', deck: 'A', band: 'high', value: 12 }, 1);
    session.apply({ type: 'crossfader', value: 1 }, 1);
    const original = JSON.stringify(session.snapshot(1));
    asset.update(session, { A: .1 }); asset.root.updateMatrixWorld(true);
    expect(surface.getWorldPosition(new Vector3()).z - before.z).toBeCloseTo(-.94, 4);
    expect(asset.controls.get('A.high')!.rotation.y).toBeCloseTo(2.2);
    expect(asset.controls.get('B.high')!.rotation.y).toBeCloseTo(-2.2);
    expect(asset.controls.get('A.filter')!.rotation.y).toBeCloseTo(-2.25);
    expect(asset.controls.get('crossfader')!.position.x).toBeCloseTo(.7);
    expect(asset.root.getObjectByName('A.meter')!.scale.z).toBeCloseTo(.7);
    expect(JSON.stringify(session.snapshot(1))).toBe(original);
    const high = asset.controls.get('A.high')!;
    const mesh = high.children.find(node => node instanceof Mesh) as Mesh;
    const geometryDisposed = vi.fn(); mesh.geometry.addEventListener('dispose', geometryDisposed);
    asset.dispose(); asset.dispose(); expect(geometryDisposed).toHaveBeenCalledTimes(1);
  });

  it('rejects incomplete, misaddressed and duplicate bindings before replacing the fallback', async () => {
    const invalid = structuredClone(manifest); invalid.controls[0].node = invalid.controls[1].node;
    expect(() => bindMixerAsset(new Group(), manifest)).toThrow();
    const root = await parse(); expect(() => bindMixerAsset(root, invalid)).toThrow('incompatible');
    const duplicate = structuredClone(manifest); duplicate.controls[0] = duplicate.controls[1];
    expect(() => bindMixerAsset(root, duplicate)).toThrow('duplicated');
    bindMixerAsset(root, manifest).dispose();
  });

  it('returns fallback on failed fetch or malformed export', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('missing', { status: 404 }));
    const onError = vi.fn();
    try { expect(await loadMixerAsset({ onError })).toBeNull(); expect(onError).toHaveBeenCalledOnce(); }
    finally { fetchMock.mockRestore(); }
  });
});
