import { useEffect, useRef, useState } from 'react';
import { CAMERA_IDLE, createCameraController, type CameraController, type CameraState } from './lifecycle';
import { createSleevePortrait } from './portrait';
import './living-sleeve.css';

/** Integration: render only when isLivingSleeveEnabled(import.meta.env.DEV, location.search). */
export function LivingSleeve() {
  const portraitHost = useRef<HTMLDivElement>(null);
  const controller = useRef<CameraController | null>(null);
  const [camera, setCamera] = useState<CameraState>(CAMERA_IDLE);
  const [renderError, setRenderError] = useState('');
  const [still, setStill] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const owned = createCameraController({
      getUserMedia: constraints => {
        if (!navigator.mediaDevices?.getUserMedia) return Promise.reject(new Error('Camera unavailable'));
        return navigator.mediaDevices.getUserMedia(constraints);
      },
      onChange: setCamera,
    });
    controller.current = owned;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => {
      if (motion.matches) {
        owned.disable();
        setStill(true);
      }
    };
    motion.addEventListener('change', changed);
    const pageHide = () => owned.disable();
    window.addEventListener('pagehide', pageHide);
    return () => {
      motion.removeEventListener('change', changed);
      window.removeEventListener('pagehide', pageHide);
      owned.dispose();
      controller.current = null;
    };
  }, []);

  useEffect(() => {
    if (!camera.stream || !portraitHost.current || still) return;
    const fail = () => {
      controller.current?.disable();
      setRenderError('Live artwork could not start. Your original sleeve is still here.');
    };
    try {
      return createSleevePortrait(portraitHost.current, camera.stream, fail);
    } catch {
      fail();
    }
  }, [camera.stream, still]);

  const active = camera.status === 'live' || camera.status === 'requesting';
  function toggleCamera() {
    setRenderError('');
    if (active) controller.current?.disable();
    else if (!still) void controller.current?.enable();
  }

  return <section className="living-sleeve" aria-label="Living sleeve preview" data-camera-status={camera.status}>
    <div className="living-sleeve__art" role="img" aria-label={camera.status === 'live' ? 'Your local portrait in a warm halftone record sleeve' : 'Original Mixtape record sleeve in ivory, amber and oxblood'}>
      <div className="living-sleeve__disc">
        <div className="living-sleeve__print"><span>mixtape</span><b>you,<br/><em>in the mix.</em></b><small>SIDE A / YOUR OWN FEEL</small></div>
        <div ref={portraitHost} className={`living-sleeve__portrait ${camera.status === 'live' ? 'is-live' : ''}`}/>
        <i className="living-sleeve__spindle"/>
      </div>
      <span className="living-sleeve__edition">THE BOOTH / PERSONAL PRESSING</span>
    </div>
    <div className="living-sleeve__copy">
      <p className="living-sleeve__kicker">LIVING SLEEVE / LOCAL PREVIEW</p>
      <h3>Step into your own <em>mixtape.</em></h3>
      <p>A little portrait, pressed into your sleeve.</p>
      <div className="living-sleeve__actions">
        <button type="button" className="living-sleeve__camera-button" disabled={still} onClick={toggleCamera} aria-pressed={active}>
          {camera.status === 'requesting' ? 'Cancel camera' : camera.status === 'live' ? 'Turn camera off' : 'Put me in the mix'}
        </button>
        <label className="living-sleeve__still"><input type="checkbox" checked={still} onChange={event => {
          setStill(event.target.checked);
          if (event.target.checked) controller.current?.disable();
        }}/>Still artwork</label>
      </div>
      <p className="living-sleeve__status" role="status">{renderError || (still ? 'Still sleeve · uncheck Still artwork to enable camera' : camera.message)}</p>
      <p className="living-sleeve__privacy">Video stays here, with no uploads or recording. Voice has its own microphone control.</p>
    </div>
  </section>;
}
