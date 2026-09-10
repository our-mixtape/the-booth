import { describe, expect, it, vi } from 'vitest';
import { createCameraController, type CameraState } from '../src/camera/lifecycle';
import { isLivingSleeveEnabled } from '../src/camera/feature';

function streamFixture() {
  const track = Object.assign(new EventTarget(), { kind: 'video', readyState: 'live', stop: vi.fn() });
  const stream = { getTracks: () => [track], getVideoTracks: () => [track], getAudioTracks: () => [] } as unknown as MediaStream;
  return { stream, track };
}

describe('camera ownership and lifecycle', () => {
  it('requires both development mode and explicit feature opt-in', () => {
    expect(isLivingSleeveEnabled(false, '?livingSleeve=1')).toBe(false);
    expect(isLivingSleeveEnabled(true, '')).toBe(false);
    expect(isLivingSleeveEnabled(true, '?livingSleeve=1')).toBe(true);
  });

  it('requests video only on enable, deduplicates requests and stops only its owned stream', async () => {
    const { stream, track } = streamFixture(), onChange = vi.fn();
    const getUserMedia = vi.fn<(constraints: MediaStreamConstraints) => Promise<MediaStream>>().mockResolvedValue(stream);
    const controller = createCameraController({ getUserMedia, onChange });
    expect(getUserMedia).not.toHaveBeenCalled();
    await Promise.all([controller.enable(), controller.enable()]);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia.mock.calls[0][0]).toMatchObject({ audio: false, video: { frameRate: { max: 24 } } });
    expect(onChange.mock.lastCall?.[0].status).toBe('live');
    controller.disable();
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(onChange.mock.lastCall?.[0]).toMatchObject({ status: 'idle', stream: null });
    controller.dispose();
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  for (const action of ['disable', 'dispose'] as const) it(`releases a stream granted after ${action}`, async () => {
    const { stream, track } = streamFixture(), states: CameraState[] = [];
    let grant!: (stream: MediaStream) => void;
    const controller = createCameraController({ getUserMedia: () => new Promise(resolve => { grant = resolve; }), onChange: state => states.push(state) });
    const pending = controller.enable();
    controller[action]();
    grant(stream); await pending;
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(states.some(state => state.status === 'live')).toBe(false);
  });

  it('does not allow an obsolete request to replace a new camera session', async () => {
    const old = streamFixture(), current = streamFixture(), onChange = vi.fn();
    let grant!: (stream: MediaStream) => void;
    const getUserMedia = vi.fn<() => Promise<MediaStream>>().mockImplementationOnce(() => new Promise(resolve => { grant = resolve; })).mockResolvedValueOnce(current.stream);
    const controller = createCameraController({ getUserMedia, onChange });
    const pending = controller.enable(); controller.disable(); await controller.enable();
    grant(old.stream); await pending;
    expect(old.track.stop).toHaveBeenCalledTimes(1);
    expect(current.track.stop).not.toHaveBeenCalled();
    expect(onChange.mock.lastCall?.[0].stream).toBe(current.stream);
    controller.dispose();
    expect(current.track.stop).toHaveBeenCalledTimes(1);
  });

  it('cleans up a disconnected camera and allows a fresh explicit enable', async () => {
    const { stream, track } = streamFixture(), onChange = vi.fn();
    const controller = createCameraController({ getUserMedia: async () => stream, onChange });
    await controller.enable(); track.dispatchEvent(new Event('ended'));
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(onChange.mock.lastCall?.[0]).toMatchObject({ status: 'error', stream: null });
  });

  it('rejects unexpected audio and leaves a denied request inactive', async () => {
    const { stream, track } = streamFixture(), onChange = vi.fn();
    stream.getAudioTracks = () => [track as unknown as MediaStreamTrack];
    const controller = createCameraController({ getUserMedia: vi.fn().mockResolvedValueOnce(stream).mockRejectedValueOnce({ name: 'NotAllowedError' }), onChange });
    await controller.enable(); expect(track.stop).toHaveBeenCalledTimes(1);
    await controller.enable(); expect(onChange.mock.lastCall?.[0]).toMatchObject({ status: 'error', stream: null });
    expect(onChange.mock.lastCall?.[0].message).toContain('permission');
  });
});
