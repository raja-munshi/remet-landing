// Remet landing — the door + the people.
// Pass 1: a fullscreen shader — dark paper, a door left ajar, light carrying the
//         Orchid Dusk role colours (purple primary / verdigris verified / live cyan).
// Pass 2: a parallaxed point field — the dots are people. They stay cold in the
//         crowd, resolve to verdigris when verified, pulse cyan when present,
//         gather into venue constellations, and two of them tie the knot.
import * as THREE from 'https://esm.sh/three@0.161.0';

// Both passes write gl_FragColor directly with no sRGB encode, so keep
// THREE.Color in raw sRGB — otherwise every Orchid Dusk hex lands ~2.5x too dark.
THREE.ColorManagement.enabled = false;

const NOISE = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; } return v; }`;

const TRAVEL = 26;   // world units the camera falls across the whole page
const CROWD = 250;
const VENUES = 6;
const PER_VENUE = 9;

export function sceneDoor(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.autoClear = false;

  /* ─────────── pass 1: the door ─────────── */
  const doorScene = new THREE.Scene();
  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const u = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uOpen: { value: 0 },
    uCol: { value: new THREE.Color('#8E5FA8') },
    uCol2: { value: new THREE.Color('#C79BD8') },
    uKnot: { value: 0 },
    // pre-tonemap value; lands on #1A160F after the highlight rolloff so the
    // canvas ground matches the CSS paper the neumorphic cards are raised on
    uPaper: { value: new THREE.Color('#120F0A') },
  };
  const doorMat = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform float uOpen; uniform float uKnot;
uniform vec3 uCol; uniform vec3 uCol2; uniform vec3 uPaper;
${NOISE}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float ar = uRes.x / uRes.y;
  float t = uTime, o = uOpen;

  vec3 col = uPaper;
  col *= 0.86 + 0.28 * fbm(uv * vec2(3.0, 4.2));
  col -= vnoise(uv * vec2(420.0, 46.0)) * 0.012;
  col += uPaper * 0.35 * smoothstep(0.9, 0.0, length((uv - vec2(0.30, 0.72)) * vec2(ar, 1.0)));

  float lean  = (uv.y - 0.5) * 0.085;
  float slit  = 0.775 + lean + 0.055 * o;
  float halfW = 0.0055 + 0.088 * o * o;
  float d     = uv.x - slit;

  float jamb = smoothstep(halfW, halfW * 0.30, abs(d));
  jamb *= smoothstep(1.06, 0.80, abs(uv.y - 0.5) * 1.72);

  float reach = clamp((slit - uv.x) / 0.95, 0.0, 1.0);
  float falloff = exp(-reach * (4.4 - 1.9 * o));
  float shaft = smoothstep(0.98, 0.04, abs((uv.y - 0.5) - reach * 0.11) * (1.32 - 0.50 * reach));
  float breathe = 0.74 + 0.26 * fbm(vec2(uv.y * 6.4 - t * 0.055, t * 0.032));
  float beam = falloff * shaft * breathe * (0.26 + 0.86 * o);
  beam *= step(uv.x, slit + halfW);

  float beyond = smoothstep(0.0, 0.10, d) * exp(-max(d, 0.0) * 9.0) * o * 0.55;
  float haze = fbm(vec2(uv.x * 2.1 + t * 0.021, uv.y * 2.8 - t * 0.017)) * 0.18 * beam;

  float dust = 0.0;
  for (int i = 0; i < 22; i++){
    float fi = float(i);
    float sx = hash(vec2(fi, 3.1));
    float sy = hash(vec2(fi, 9.7));
    float sp = 0.012 + hash(vec2(fi, 5.3)) * 0.038;
    vec2 mp = vec2(
      slit - 0.05 - fract(sx + t * sp * 0.5) * (0.60 + 0.30 * o),
      fract(sy + sin(t * sp * 2.1 + fi) * 0.055 + t * sp * 0.09)
    );
    float md = length((uv - mp) * vec2(ar, 1.0));
    float sz = 0.0015 + hash(vec2(fi, 1.7)) * 0.0034;
    dust += smoothstep(sz, 0.0, md) * (0.32 + 0.68 * hash(vec2(fi, 8.2)));
  }
  dust *= beam * 2.5 + 0.06 * o;

  float k = clamp(uKnot, 0.0, 1.0);
  if (k > 0.001){
    float e = k * k * (3.0 - 2.0 * k);
    vec2 mid = vec2(0.5, 0.46);
    vec2 pa = mix(vec2(0.10, 0.30), mid, e);
    vec2 pb = mix(vec2(0.92, 0.62), mid, e);
    float da = length((uv - pa) * vec2(ar, 1.0));
    float db = length((uv - pb) * vec2(ar, 1.0));
    float m  = smoothstep(0.020, 0.0, da) + smoothstep(0.020, 0.0, db);
    m += (smoothstep(0.090, 0.0, da) + smoothstep(0.090, 0.0, db)) * 0.30;
    vec2 ab = pb - pa; float L = max(dot(ab, ab), 1e-5);
    float h = clamp(dot(uv - pa, ab) / L, 0.0, 1.0);
    m += smoothstep(0.004, 0.0, length((uv - (pa + ab * h)) * vec2(ar, 1.0))) * 0.55 * e;
    float land = smoothstep(0.88, 1.0, k);
    float rr = length((uv - mid) * vec2(ar, 1.0));
    m += smoothstep(0.005, 0.0, abs(rr - (0.02 + land * 0.32))) * land * (1.0 - land) * 6.0;
    col += mix(uCol, uCol2, 0.5) * m * 0.82;
  }

  vec3 warm = mix(uCol, uCol2, 0.55);
  col += uCol  * (beam * 0.72 + haze) * 0.62;
  col += warm  * jamb * 0.82;
  col += uCol2 * jamb * jamb * 0.52;
  col += warm  * beyond * 0.55;
  col += uCol2 * dust * 0.58;

  // Additive light must not clip per-channel — that desaturates the core to white
  // and destroys the Orchid Dusk hue. Roll the highlights off instead.
  col = 1.0 - exp(-col * 1.25);

  float vig = smoothstep(1.30, 0.26, length((uv - 0.5) * vec2(ar * 0.70, 1.0)));
  col *= 0.40 + 0.60 * vig;
  col += (hash(uv * uRes + fract(t)) - 0.5) * 0.024;
  gl_FragColor = vec4(col, 1.0);
}`
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), doorMat);
  quad.frustumCulled = false;
  doorScene.add(quad);

  /* ─────────── pass 2: the people ─────────── */
  const dotScene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(46, 1, 0.1, 60);
  cam.position.set(0, 0, 6);

  const N = CROWD + VENUES * PER_VENUE + 2;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  const role = new Float32Array(N);
  const vtar = new Float32Array(N * 3);

  const R = (a, b) => a + Math.random() * (b - a);
  let i = 0;
  for (let c = 0; c < CROWD; c++, i++) {
    pos[i * 3] = R(-4.4, 4.4); pos[i * 3 + 1] = R(-TRAVEL - 3.5, 3.5); pos[i * 3 + 2] = R(-5.5, 1.8);
    seed[i] = Math.random(); role[i] = 0;
  }
  for (let v = 0; v < VENUES; v++) {
    const ang = (v / VENUES) * Math.PI * 2 + 0.4;
    const vx = Math.cos(ang) * R(1.5, 2.1);
    const vy = Math.sin(ang) * R(0.9, 1.35);
    const vz = R(-1.4, -0.2);
    for (let k = 0; k < PER_VENUE; k++, i++) {
      pos[i * 3] = R(-4.6, 4.6); pos[i * 3 + 1] = R(-TRAVEL - 3.5, 3.5); pos[i * 3 + 2] = R(-5, 1.2);
      seed[i] = Math.random(); role[i] = 3;
      const rr = k === 0 ? 0 : R(0.10, 0.30), ra = Math.random() * 6.283;
      vtar[i * 3] = vx + Math.cos(ra) * rr;
      vtar[i * 3 + 1] = vy + Math.sin(ra) * rr;
      vtar[i * 3 + 2] = vz;
    }
  }
  for (let p = 0; p < 2; p++, i++) {
    pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = -0.5;
    seed[i] = 0.5 + p * 0.2; role[i] = 1 + p;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aRole', new THREE.BufferAttribute(role, 1));
  g.setAttribute('aTarget', new THREE.BufferAttribute(vtar, 3));

  const du = {
    uTime: { value: 0 },
    uDpr: { value: dpr },
    uVerified: { value: 0 },
    uLive: { value: 0 },
    uGather: { value: 0 },
    uKnotD: { value: 0 },
    uGatherY: { value: -8 },
    uKnotY: { value: -16 },
    uPointer: { value: new THREE.Vector3(0, 0, 0) },
    uPointerAmt: { value: 0 },
    uCrowd: { value: new THREE.Color('#A29886') },
    uVerd: { value: new THREE.Color('#5E9E80') },
    uLiveC: { value: new THREE.Color('#2C92A2') },
    uPurple: { value: new THREE.Color('#C79BD8') },
  };

  const dotMat = new THREE.ShaderMaterial({
    uniforms: du, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
attribute float aSeed; attribute float aRole; attribute vec3 aTarget;
uniform float uTime, uDpr, uVerified, uLive, uGather, uKnotD, uGatherY, uKnotY, uPointerAmt;
uniform vec3 uPointer, uCrowd, uVerd, uLiveC, uPurple;
varying vec3 vCol; varying float vA;
void main(){
  vec3 p = position;
  p.x += sin(uTime * 0.24 + aSeed * 21.0) * 0.13;
  p.y += cos(uTime * 0.18 + aSeed * 34.0) * 0.10;

  float isVenue = step(2.5, aRole);
  vec3 vt = vec3(aTarget.x, uGatherY + aTarget.y, aTarget.z);
  p = mix(p, vt, isVenue * uGather);

  float isPair = step(0.5, aRole) * step(aRole, 2.5);
  float side = aRole < 1.5 ? -1.0 : 1.0;
  vec3 pStart = vec3(side * 2.6, uKnotY + side * 0.85, -0.8);
  vec3 pEnd   = vec3(0.0, uKnotY + 0.10, -0.45);
  float ke = uKnotD * uKnotD * (3.0 - 2.0 * uKnotD);
  p = mix(p, mix(pStart, pEnd, ke), isPair);

  vec3 toP = uPointer - p;
  float dl = length(toP.xy) + 1e-4;
  p.xy += (toP.xy / dl) * uPointerAmt * exp(-dl * 0.5) * 0.5;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (5.4 + aSeed * 4.4 + isPair * 10.0) * uDpr * (6.6 / max(dist, 0.8));

  vec3 c = uCrowd;
  c = mix(c, uVerd, step(aSeed, 0.44) * uVerified);
  float pulse = 0.5 + 0.5 * sin(uTime * 2.1 + aSeed * 31.0);
  c = mix(c, uLiveC, step(aSeed, 0.34) * uLive * (0.5 + 0.5 * pulse));
  c = mix(c, uPurple, isVenue * uGather * 0.85);
  c = mix(c, mix(uVerd, vec3(1.0), 0.45), isPair);

  float a = (0.34 + 0.78 * aSeed) * exp(-dist * 0.055);
  a = mix(a, a * (0.25 + 1.9 * uKnotD), isPair);
  vA = min(a, 0.85);  vCol = c;
}`,
    fragmentShader: `
precision highp float;
varying vec3 vCol; varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.05, d) * vA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCol * a * 1.15, a);
}`
  });
  const dots = new THREE.Points(g, dotMat);
  dots.frustumCulled = false;
  dotScene.add(dots);

  /* ─────────── plumbing ─────────── */
  const resize = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    u.uRes.value.set(w * dpr, h * dpr);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  const tCol = new THREE.Color('#8E5FA8'), tCol2 = new THREE.Color('#C79BD8');
  const T = { open: 0, knot: 0, verified: 0, live: 0, gather: 0, knotD: 0, scroll: 0, ptrAmt: 0 };
  const ptrNdc = new THREE.Vector2(0, 0);
  let camY = 0, raf = 0, alive = true;
  const t0 = performance.now();

  const tick = (now) => {
    if (!alive) return;
    const t = (now - t0) / 1000;
    u.uTime.value = t; du.uTime.value = t;

    u.uOpen.value += (T.open - u.uOpen.value) * 0.06;
    u.uKnot.value += (T.knot - u.uKnot.value) * 0.055;
    u.uCol.value.lerp(tCol, 0.045);
    u.uCol2.value.lerp(tCol2, 0.045);

    du.uVerified.value += (T.verified - du.uVerified.value) * 0.05;
    du.uLive.value     += (T.live - du.uLive.value) * 0.05;
    du.uGather.value   += (T.gather - du.uGather.value) * 0.045;
    du.uKnotD.value    += (T.knotD - du.uKnotD.value) * 0.045;
    du.uPointerAmt.value += (T.ptrAmt - du.uPointerAmt.value) * 0.08;

    camY += (-T.scroll * TRAVEL - camY) * 0.10;
    cam.position.y = camY;

    // pointer → world on the z=0 plane
    const halfH = Math.tan((cam.fov * Math.PI) / 360) * cam.position.z;
    du.uPointer.value.set(ptrNdc.x * halfH * cam.aspect, camY + ptrNdc.y * halfH, 0);

    renderer.clear();
    renderer.render(doorScene, orthoCam);
    renderer.render(dotScene, cam);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  return {
    setOpen: (v) => { T.open = clamp01(v); },
    setKnot: (v) => { T.knot = clamp01(v); },
    setLight: (a, b) => { tCol.set(a); tCol2.set(b || a); },
    setScroll: (v) => { T.scroll = clamp01(v); },
    setPhase: (p) => {
      if (p.verified !== undefined) T.verified = clamp01(p.verified);
      if (p.live !== undefined) T.live = clamp01(p.live);
      if (p.gather !== undefined) T.gather = clamp01(p.gather);
      if (p.knotD !== undefined) T.knotD = clamp01(p.knotD);
    },
    setAnchors: (gatherScroll, knotScroll) => {
      du.uGatherY.value = -gatherScroll * TRAVEL;
      du.uKnotY.value = -knotScroll * TRAVEL;
    },
    setPointer: (nx, ny, amt) => { ptrNdc.set(nx, ny); T.ptrAmt = amt; },
    getOpen: () => u.uOpen.value,
    dispose: () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); g.dispose(); dotMat.dispose(); doorMat.dispose(); renderer.dispose(); }
  };
}
