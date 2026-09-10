export type CameraStatus = 'idle' | 'requesting' | 'live' | 'error';

export interface CameraState {
  status: CameraStatus;
  stream: MediaStream | null;
  message: string;
}

export interface CameraController {
  enable(): Promise<void>;
  disable(): void;
  dispose(): void;
}

export interface CameraDependencies {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  onChange: (state: CameraState) => void;
}

export const CAMERA_IDLE: CameraState = {
  status: 'idle', stream: null, message: 'Camera off · original sleeve',
};

function failureMessage(error: unknown): string {
  const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera permission was not granted. Your original sleeve is still here.';
  if (name === 'NotFoundError') return 'No camera found. Your original sleeve is still here.';
  if (name === 'NotReadableError') return 'Camera is busy or unavailable. Try again when it is free.';
  return 'Camera unavailable. Your original sleeve is still here.';
}

/** Owns only the stream obtained here; never receives or shares the voice stream. */
export function createCameraController({ getUserMedia, onChange }: CameraDependencies): CameraController {
  let generation = 0;
  let disposed = false;
  let pending = false;
  let stream: MediaStream | null = null;
  let removeEndedListeners = () => {};

  function stopOwnedStream() {
    removeEndedListeners();
    removeEndedListeners = () => {};
    const owned = stream;
    stream = null;
    // getUserMedia requested no audio. Also release any unexpected track a broken
    // implementation returned; no other component's stream is reachable here.
    owned?.getTracks().forEach(track => track.stop());
  }

  function disable() {
    if (disposed) return;
    generation++;
    pending = false;
    stopOwnedStream();
    onChange({ ...CAMERA_IDLE });
  }

  async function enable() {
    if (disposed || pending || stream) return;
    const request = ++generation;
    pending = true;
    onChange({ status: 'requesting', stream: null, message: 'Waiting for camera permission…' });
    try {
      const acquired = await getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640, max: 1280 },
          height: { ideal: 640, max: 1280 },
          frameRate: { ideal: 24, max: 24 },
        },
      });
      if (disposed || request !== generation) {
        acquired.getTracks().forEach(track => track.stop());
        return;
      }
      pending = false;
      stream = acquired;
      const tracks = acquired.getVideoTracks();
      if (!tracks.length || tracks.some(track => track.readyState === 'ended') || acquired.getAudioTracks().length) {
        stopOwnedStream();
        onChange({ status: 'error', stream: null, message: 'Camera did not provide usable video. Your original sleeve is still here.' });
        return;
      }
      const ended = () => {
        if (disposed || request !== generation) return;
        generation++;
        stopOwnedStream();
        onChange({ status: 'error', stream: null, message: 'Camera disconnected. Your original sleeve is still here.' });
      };
      tracks.forEach(track => track.addEventListener('ended', ended));
      removeEndedListeners = () => tracks.forEach(track => track.removeEventListener('ended', ended));
      onChange({ status: 'live', stream: acquired, message: 'Live sleeve · camera on' });
    } catch (error) {
      if (disposed || request !== generation) return;
      pending = false;
      stopOwnedStream();
      onChange({ status: 'error', stream: null, message: failureMessage(error) });
    }
  }

  return {
    enable,
    disable,
    dispose() {
      if (disposed) return;
      disposed = true;
      generation++;
      pending = false;
      stopOwnedStream();
    },
  };
}
