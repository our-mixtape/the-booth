import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { z } from 'zod';
import { deckIds, type DeckId, type DeckState } from '../domain/session';

export type MixerHit = { kind: 'gain' | 'filter' | 'crossfader' | 'low' | 'mid' | 'high'; deck?: DeckId };
export type MixerState = { crossfader: number; decks: Record<DeckId, Pick<DeckState, 'gain' | 'filter' | 'eq'>> };
export type MixerMeterLevels = Partial<Record<DeckId, number>>;
const axisSchema = z.enum(['x', 'y', 'z']);
const finite = z.number().finite();
const bindingSchema = z.object({
  id: z.string().regex(/^(?:[ABCD]\.(?:high|mid|low|filter|gain)|crossfader)$/),
  node: z.string().min(1),
  transform: z.object({ property: z.enum(['position', 'rotation']), axis: axisSchema, min: finite, max: finite }),
  input: z.object({ min: finite, max: finite }),
  hit: z.object({ node: z.string().min(1), size: z.tuple([finite.positive().max(3), finite.positive().max(3), finite.positive().max(3)]) }),
});
const manifestSchema = z.object({
  version: z.literal(2), asset: z.literal('mixtape-mixer.glb'), upAxis: z.literal('Y'),
  controls: z.array(bindingSchema).length(21),
  meters: z.array(z.object({ deck: z.enum(deckIds), node: z.string().min(1), axis: z.literal('z') })).length(4),
});
export type MixerManifest = z.infer<typeof manifestSchema>;
export type MixerMetrics = { meshes: number; primitives: number; triangles: number; hitRegions: number };
export interface MixerAsset {
  root: THREE.Group;
  hits: THREE.Object3D[];
  controls: ReadonlyMap<string, THREE.Object3D>;
  metrics: MixerMetrics;
  /** Effective session values only. Optional levels are actual engine RMS, not gain-derived meters. */
  update(state: MixerState, meterLevels?: MixerMeterLevels): void;
  dispose(): void;
}

const bands = ['high', 'mid', 'low', 'filter', 'gain'] as const;
const expectedIds = new Set([...deckIds.flatMap(deck => bands.map(band => `${deck}.${band}`)), 'crossfader']);
const originalName = (node: THREE.Object3D) => typeof node.userData.name === 'string' ? node.userData.name : node.name;
const unit = (value: number) => Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 0;

/** Reject incomplete exports before the procedural mixer is replaced. Does not own audio state. */
export function bindMixerAsset(root: THREE.Group, rawManifest: unknown): MixerAsset {
  const manifest = manifestSchema.parse(rawManifest);
  if (new Set(manifest.controls.map(item => item.id)).size !== expectedIds.size ||
      manifest.controls.some(item => !expectedIds.has(item.id)) ||
      new Set(manifest.meters.map(item => item.deck)).size !== 4) throw new Error('Mixer bindings are incomplete or duplicated.');
  const nodes = new Map<string, THREE.Object3D[]>();
  root.traverse(node => { const name = originalName(node); nodes.set(name, [...nodes.get(name) ?? [], node]); });
  const requireNode = (name: string) => {
    const matches = nodes.get(name);
    if (matches?.length !== 1) throw new Error(`Mixer node ${name} is missing or ambiguous.`);
    return matches[0];
  };
  const bindings = manifest.controls.map(binding => {
    const node = requireNode(binding.node), hitNode = requireNode(binding.hit.node);
    const [deck, parameter] = binding.id.split('.') as [DeckId, Exclude<MixerHit['kind'], 'crossfader'>];
    const kind: MixerHit['kind'] = binding.id === 'crossfader' ? 'crossfader' : parameter;
    const rotational = kind === 'high' || kind === 'mid' || kind === 'low' || kind === 'filter';
    const eq = kind === 'high' || kind === 'mid' || kind === 'low';
    if (node.userData.control_id !== binding.id || hitNode.userData.hit_control_id !== binding.id ||
        binding.transform.property !== (rotational ? 'rotation' : 'position') ||
        binding.transform.axis !== (rotational ? 'y' : kind === 'crossfader' ? 'x' : 'z') ||
        binding.input.min !== (eq ? -12 : 0) || binding.input.max !== (eq ? 12 : 1) ||
        Math.abs(binding.transform.min) > 3 || Math.abs(binding.transform.max) > 3 ||
        binding.transform.min === binding.transform.max || node === hitNode) throw new Error(`Mixer binding ${binding.id} is incompatible.`);
    let hasSurface = false;
    node.traverse(child => { if (child instanceof THREE.Mesh) hasSurface = true; });
    if (!hasSurface) throw new Error(`Mixer control ${binding.id} has no visible surface.`);
    const hit: MixerHit = kind === 'crossfader' ? { kind } : { kind, deck };
    return { binding, node, hitNode, hit, deck, kind };
  });
  const meterNodes = manifest.meters.map(binding => ({ ...binding, object: requireNode(binding.node) }));
  const metrics: MixerMetrics = { meshes: 0, primitives: 0, triangles: 0, hitRegions: bindings.length };
  root.traverse(node => {
    // GLTFLoader sanitizes punctuation for animation tracks; expose authored semantic names again.
    node.name = originalName(node);
    if (node instanceof THREE.Mesh) {
      metrics.meshes++;
      metrics.primitives += Array.isArray(node.material) ? Math.max(1, node.geometry.groups.length) : 1;
      metrics.triangles += (node.geometry.index?.count ?? node.geometry.getAttribute('position')?.count ?? 0) / 3;
    }
  });
  const hits: THREE.Object3D[] = [];
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false, depthWrite: false });
  for (const { binding, hitNode, hit } of bindings) {
    // material.visible=false skips rendering without disabling Raycaster intersection.
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...binding.hit.size), hitMaterial);
    mesh.name = `${binding.id}.pointer-region`;
    mesh.userData.hit = hit;
    mesh.userData.control_id = binding.id;
    hitNode.add(mesh);
    hits.push(mesh);
  }
  let disposed = false;
  return {
    root, hits, metrics,
    controls: new Map(bindings.map(item => [item.binding.id, item.node])),
    update(state, meterLevels = {}) {
      if (disposed) return;
      for (const { binding, node, deck, kind } of bindings) {
        const value = kind === 'crossfader' ? state.crossfader : kind === 'gain' || kind === 'filter' ? state.decks[deck][kind] : state.decks[deck].eq[kind];
        if (!Number.isFinite(value)) continue; // A malformed frame must not move a control to a surprise value.
        const normalized = unit((value - binding.input.min) / (binding.input.max - binding.input.min));
        node[binding.transform.property][binding.transform.axis] = THREE.MathUtils.lerp(binding.transform.min, binding.transform.max, normalized);
      }
      for (const meter of meterNodes) meter.object.scale[meter.axis] = Math.max(.01, unit((meterLevels[meter.deck] ?? 0) * 7));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      disposeMixerScene(root);
      hits.length = 0;
    },
  };
}

function disposeMixerScene(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  });
  for (const material of materials) for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) {
    texture.dispose();
    const image = texture.source.data as { close?: () => void } | null;
    image?.close?.();
  }
}

export type MixerLoadOptions = { baseUrl?: string; signal?: AbortSignal; onError?: (error: unknown) => void };
/** Embedded GLB only; no decoders, external textures, or additional dependencies. Null means keep fallback. */
export async function loadMixerAsset({ baseUrl = '/models', signal, onError }: MixerLoadOptions = {}): Promise<MixerAsset | null> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timeout = setTimeout(abort, 15000);
  let root: THREE.Group | undefined;
  try {
    const prefix = baseUrl.replace(/\/$/, '');
    const [modelResponse, manifestResponse] = await Promise.all([
      fetch(`${prefix}/mixtape-mixer.glb`, { signal: controller.signal }),
      fetch(`${prefix}/mixtape-mixer.bindings.json`, { signal: controller.signal }),
    ]);
    if (!modelResponse.ok || !manifestResponse.ok) throw new Error('Mixer asset fetch failed.');
    const [buffer, manifest] = await Promise.all([modelResponse.arrayBuffer(), manifestResponse.json() as Promise<unknown>]);
    root = (await new GLTFLoader().parseAsync(buffer, `${prefix}/`)).scene;
    if (controller.signal.aborted) throw new Error('Mixer asset load cancelled.');
    return bindMixerAsset(root, manifest);
  } catch (error) {
    controller.abort();
    if (root) disposeMixerScene(root);
    if (!signal?.aborted) onError?.(error);
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
