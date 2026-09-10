import {
  Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial,
  VideoTexture, WebGLRenderer,
} from 'three';

const vertexShader = `
varying vec2 sleeveUv;
void main() {
  sleeveUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Original, deliberately static halftone lattice: only the portrait moves.
// No segmentation, tracking, readback, frame export or network consumer.
const fragmentShader = `
uniform sampler2D portrait;
uniform float aspect;
varying vec2 sleeveUv;
void main() {
  vec2 sourceUv = sleeveUv;
  if (aspect > 1.0) sourceUv.x = (sourceUv.x - 0.5) / aspect + 0.5;
  else sourceUv.y = (sourceUv.y - 0.5) * aspect + 0.5;
  sourceUv.x = 1.0 - sourceUv.x;
  vec3 source = texture2D(portrait, sourceUv).rgb;
  float lightness = clamp(dot(source, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
  vec3 oxblood = vec3(0.29, 0.10, 0.14);
  vec3 amber = vec3(0.80, 0.50, 0.25);
  vec3 ivory = vec3(0.94, 0.91, 0.84);
  vec3 ink = mix(oxblood, amber, smoothstep(0.08, 0.62, lightness));
  ink = mix(ink, ivory, smoothstep(0.43, 0.98, lightness));
  vec2 cell = fract(sleeveUv * 72.0) - 0.5;
  float radius = mix(0.40, 0.10, lightness);
  float dotInk = 1.0 - smoothstep(radius - 0.08, radius + 0.08, length(cell));
  ink = mix(ink, oxblood, dotInk * 0.18);
  gl_FragColor = vec4(ink, 1.0);
}`;

/** One tiny local WebGL surface, drawn only for new video frames when visible. */
export function createSleevePortrait(host: HTMLElement, stream: MediaStream, onError: () => void): () => void {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.srcObject = stream;
  const renderer = new WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
  let texture = new VideoTexture(video);
  const material = new ShaderMaterial({
    uniforms: { portrait: { value: texture }, aspect: { value: 1 } },
    vertexShader, fragmentShader, depthTest: false, depthWrite: false,
  });
  const geometry = new PlaneGeometry(2, 2);
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  let disposed = false;
  let visible = true;
  let videoFrame = 0;
  let animationFrame = 0;
  let lastDraw = -Infinity;
  let sourceWidth = 0;
  let sourceHeight = 0;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.domElement.className = 'living-sleeve__portrait-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  function fail() {
    if (!disposed) onError();
  }
  function resize() {
    if (disposed) return;
    const size = Math.max(1, Math.min(360, host.clientWidth));
    renderer.setSize(size, size, false);
  }
  function draw(now: number) {
    if (disposed || !visible || document.hidden || video.readyState < 2 || now - lastDraw < 1000 / 25) return;
    lastDraw = now;
    if (sourceWidth && (sourceWidth !== video.videoWidth || sourceHeight !== video.videoHeight)) {
      // Three.js requires a replacement texture when the source dimensions change.
      texture.dispose();
      texture = new VideoTexture(video);
      material.uniforms.portrait.value = texture;
    }
    sourceWidth = video.videoWidth;
    sourceHeight = video.videoHeight;
    material.uniforms.aspect.value = (video.videoWidth || 1) / (video.videoHeight || 1);
    try {
      renderer.render(scene, camera);
    } catch {
      fail();
    }
  }
  function nextVideoFrame(now: number) {
    if (disposed) return;
    draw(now);
    if (!disposed) videoFrame = video.requestVideoFrameCallback(nextVideoFrame);
  }
  function nextAnimationFrame(now: number) {
    if (disposed) return;
    draw(now);
    if (!disposed) animationFrame = requestAnimationFrame(nextAnimationFrame);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; });
  visibilityObserver.observe(host);
  const contextLost = (event: Event) => { event.preventDefault(); fail(); };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  renderer.debug.onShaderError = fail;
  video.addEventListener('error', fail);
  resize();
  void video.play().then(() => {
    if (disposed) return;
    if ('requestVideoFrameCallback' in video) videoFrame = video.requestVideoFrameCallback(nextVideoFrame);
    else animationFrame = requestAnimationFrame(nextAnimationFrame);
  }).catch(fail);

  return () => {
    if (disposed) return;
    disposed = true;
    if (videoFrame) video.cancelVideoFrameCallback(videoFrame);
    if (animationFrame) cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    video.removeEventListener('error', fail);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    video.pause();
    video.srcObject = null;
    texture.dispose();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}
