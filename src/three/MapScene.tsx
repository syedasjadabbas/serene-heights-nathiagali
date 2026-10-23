import { use, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { elevation, loadDem, project, EXAG, MAP_W, MAP_D, PLACES, SERENE, ROUTE_MAIN, ROUTE_ABBOTTABAD, type Place } from './geo'
import { fogGLSL } from './shaders'

// progress: where the scroll is (0–1). shown: what the scene plays, which follows the
// scroll at a capped pace so the whole drive takes at least DRIVE_SECONDS.
export const mapState = { progress: 0, shown: 0, pointerX: 0, pointerY: 0 }
const DRIVE_SECONDS = 8

function Pacer() {
  useFrame((_, dt) => {
    const step = Math.min(dt, 0.1) / DRIVE_SECONDS
    const d = mapState.progress - mapState.shown
    mapState.shown += Math.max(-step, Math.min(step, d))
  })
  return null
}

const BG = '#18332a'
const worldAt = (lat: number, lon: number, lift = 0) => {
  const [x, z] = project(lat, lon)
  return new THREE.Vector3(x, elevation(x, z) * EXAG + lift, z)
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// scroll choreography
export const PHASE = { grow: [0, 0.14], main: [0.14, 0.66], abbottabad: [0.6, 0.76], arrive: [0.74, 0.96] } as const

/* ---------- terrain ---------- */

const terrainVert = /* glsl */ `
uniform float uGrow;
varying float vH;
varying vec3 vN;
varying vec3 vWorld;
varying float vDepth;
void main(){
  vH = position.y / ${EXAG.toFixed(2)};
  vec3 p = position; p.y *= uGrow;
  vN = normalize(normal * vec3(1.0, 1.0 / max(uGrow, 0.05), 1.0));
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  vec4 mv = viewMatrix * wp; vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`

const terrainFrag = /* glsl */ `
uniform vec2 uHome;
uniform float uScan;
uniform float uTime;
uniform vec2 uHalf;
uniform vec3 uBg;
varying float vH;
varying vec3 vN;
varying vec3 vWorld;
varying float vDepth;
${fogGLSL}
float line(float v, float w){ float d = abs(fract(v) - 0.5); float fw = fwidth(v); return smoothstep(0.5 - fw * w, 0.5, d) * smoothstep(0.35, 0.08, fw); }
void main(){
  vec3 n = normalize(vN);
  vec3 moon = normalize(vec3(-0.75, 0.45, -0.25));
  float lit = 0.25 + 1.1 * max(dot(n, moon), 0.0);

  // elevation ramp: valley pine → upland → snow above ~2,350 m
  vec3 c = mix(vec3(0.008, 0.03, 0.022), vec3(0.02, 0.06, 0.045), smoothstep(0.45, 1.3, vH));
  c = mix(c, vec3(0.06, 0.09, 0.08), smoothstep(1.3, 2.1, vH));
  float snow = smoothstep(2.42, 2.62, vH + (n.y - 0.85) * 0.5);
  c = mix(c, vec3(0.14, 0.17, 0.16), snow);
  c *= lit;

  // contours every 100 m, index contours every 500 m
  float minor = line(vH * 10.0 - 0.5, 1.0);
  float major = line(vH * 2.0 - 0.5, 1.4);
  c += vec3(0.75, 0.9, 0.83) * (minor * 0.05 + major * 0.26);

  // 5 km survey grid
  float grid = max(line(vWorld.x / 5.0 - 0.5, 0.8), line(vWorld.z / 5.0 - 0.5, 0.8));
  c += vec3(0.95, 0.98, 0.96) * grid * 0.05;

  // scan ring travelling out from Serene Heights
  float d = distance(vWorld.xz, uHome);
  float ring = exp(-pow((d - uScan) * 1.6, 2.0)) * smoothstep(40.0, 0.0, uScan);
  float halo = exp(-d * 0.5);
  c += vec3(0.85, 1.0, 0.92) * (ring * 0.12 + halo * 0.08);

  c = applyFog(c, vDepth);
  // fade the map tile into the night at its edges
  vec2 e = abs(vWorld.xz - vec2(-3.0, 2.0)) / uHalf;
  float edge = smoothstep(1.0, 0.82, max(e.x, e.y));
  gl_FragColor = vec4(mix(uBg, c, edge), 1.0);
}`

function Terrain({ segs, grow, scan }: { segs: number; grow: React.RefObject<number>; scan: React.RefObject<number> }) {
  const { geometry, material } = useMemo(() => {
    const g = new THREE.PlaneGeometry(MAP_W, MAP_D, segs, Math.round(segs * (MAP_D / MAP_W)))
    g.rotateX(-Math.PI / 2)
    g.translate(-3, 0, 2) // centre the tile between Islamabad and Abbottabad
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) pos.setY(i, elevation(pos.getX(i), pos.getZ(i)) * EXAG)
    g.computeVertexNormals()
    const [hx, hz] = project(SERENE.lat, SERENE.lon)
    const m = new THREE.ShaderMaterial({
      vertexShader: terrainVert, fragmentShader: terrainFrag, toneMapped: false,
      uniforms: {
        uGrow: { value: 0 }, uScan: { value: 0 }, uTime: { value: 0 },
        uHome: { value: new THREE.Vector2(hx, hz) },
        uHalf: { value: new THREE.Vector2(MAP_W / 2, MAP_D / 2) },
        uBg: { value: new THREE.Color(BG) },
        uFogColor: { value: new THREE.Color(BG) }, uFogNear: { value: 90 }, uFogFar: { value: 190 },
      },
    })
    return { geometry: g, material: m }
  }, [segs])
  useFrame((s) => {
    material.uniforms.uGrow.value = Math.max(0.02, grow.current ?? 0)
    material.uniforms.uScan.value = scan.current ?? 0
    material.uniforms.uTime.value = s.clock.elapsedTime
  })
  return <mesh geometry={geometry} material={material} />
}

/* ---------- town lights ---------- */

const lightsVert = /* glsl */ `
uniform float uPixel;
uniform float uOn;
uniform float uGrow;
attribute float aSize;
varying float vA;
void main(){
  vec3 p = position; p.y *= uGrow;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = aSize * uPixel * (34.0 / -mv.z);
  vA = uOn;
  gl_Position = projectionMatrix * mv;
}`
const lightsFrag = /* glsl */ `
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vA;
  gl_FragColor = vec4(vec3(1.0, 0.7, 0.38) * a * 0.55, a);
}`

function TownLights({ grow, on }: { grow: React.RefObject<number>; on: React.RefObject<number> }) {
  const { geometry, material } = useMemo(() => {
    const pts: number[] = [], sizes: number[] = []
    let seed = 3
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (const p of PLACES) {
      const [cx, cz] = project(p.lat, p.lon)
      const spread = p.kind === 'city' ? Math.sqrt(p.size) * 0.12 : 0.6
      for (let i = 0; i < p.size; i++) {
        const r = Math.sqrt(-2 * Math.log(rand() + 1e-6)) * spread * 0.5
        const a = rand() * Math.PI * 2
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.8
        pts.push(x, elevation(x, z) * EXAG + 0.06, z)
        sizes.push(0.25 + rand() * 0.6)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    g.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1))
    const m = new THREE.ShaderMaterial({
      vertexShader: lightsVert, fragmentShader: lightsFrag, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { uPixel: { value: Math.min(window.devicePixelRatio, 2) }, uOn: { value: 0 }, uGrow: { value: 0 } },
    })
    return { geometry: g, material: m }
  }, [])
  useFrame(() => {
    material.uniforms.uOn.value = on.current ?? 0
    material.uniforms.uGrow.value = Math.max(0.02, grow.current ?? 0)
  })
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

/* ---------- routes: glowing line that draws itself along the road ---------- */

const routeVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const routeFrag = /* glsl */ `
uniform float uDraw;
uniform float uTime;
uniform vec3 uColor;
uniform float uDash;
varying vec2 vUv;
void main(){
  if (vUv.x > uDraw) discard;
  float head = exp(-(uDraw - vUv.x) * 60.0);
  float pulse = 0.5 + 0.5 * sin(vUv.x * 160.0 - uTime * 4.0);
  float dash = uDash > 0.5 ? step(0.45, fract(vUv.x * 40.0)) : 1.0;
  vec3 c = uColor * (0.9 + pulse * 0.35) * dash + vec3(1.0, 0.95, 0.85) * head * 2.5;
  gl_FragColor = vec4(c, 1.0);
}`

function buildRoute(points: [number, number][]) {
  const raw = points.map(([la, lo]) => worldAt(la, lo, 0.28))
  const rough = new THREE.CatmullRomCurve3(raw, false, 'centripetal')
  // drape: resample and lift each point above the terrain beneath it
  const dense = rough.getSpacedPoints(400).map((p) => new THREE.Vector3(p.x, elevation(p.x, p.z) * EXAG + 0.28, p.z))
  return new THREE.CatmullRomCurve3(dense, false, 'centripetal')
}

function Route({ curve, draw, color, dashed, radius }: { curve: THREE.CatmullRomCurve3; draw: React.RefObject<number>; color: string; dashed?: boolean; radius: number }) {
  const { geometry, material } = useMemo(() => {
    const g = new THREE.TubeGeometry(curve, 600, radius, 6, false)
    const m = new THREE.ShaderMaterial({
      vertexShader: routeVert, fragmentShader: routeFrag, toneMapped: false,
      uniforms: { uDraw: { value: 0 }, uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uDash: { value: dashed ? 1 : 0 } },
    })
    return { geometry: g, material: m }
  }, [curve, color, dashed, radius])
  useFrame((s) => {
    material.uniforms.uDraw.value = draw.current ?? 0
    material.uniforms.uTime.value = s.clock.elapsedTime
  })
  return <mesh geometry={geometry} material={material} />
}

/* ---------- Serene Heights beacon ---------- */

const beamFrag = /* glsl */ `
uniform float uOn;
uniform float uTime;
varying vec2 vUv;
void main(){
  float a = pow(1.0 - vUv.y, 2.2) * uOn * (0.75 + 0.25 * sin(uTime * 2.0));
  gl_FragColor = vec4(vec3(0.85, 1.0, 0.93) * a * 2.2, a);
}`
const ringFrag = /* glsl */ `
uniform float uOn;
uniform float uTime;
varying vec2 vUv;
void main(){
  float r = length(vUv - 0.5) * 2.0;
  float t = fract(uTime * 0.45);
  float ring = smoothstep(0.06, 0.0, abs(r - t)) * (1.0 - t);
  float core = smoothstep(0.16, 0.0, r);
  float a = (ring + core) * uOn;
  gl_FragColor = vec4(vec3(0.85, 1.0, 0.93) * a * 2.0, a);
}`

function Beacon({ on }: { on: React.RefObject<number> }) {
  const pos = useMemo(() => worldAt(SERENE.lat, SERENE.lon), [])
  const mats = useMemo(() => {
    const mk = (frag: string) => new THREE.ShaderMaterial({
      vertexShader: routeVert, fragmentShader: frag, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide,
      uniforms: { uOn: { value: 0 }, uTime: { value: 0 } },
    })
    return [mk(beamFrag), mk(ringFrag)]
  }, [])
  useFrame((s) => mats.forEach((m) => { m.uniforms.uOn.value = on.current ?? 0; m.uniforms.uTime.value = s.clock.elapsedTime }))
  return (
    <group position={pos}>
      <mesh material={mats[0]} position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.05, 0.22, 4.4, 16, 1, true]} />
      </mesh>
      <mesh material={mats[1]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <planeGeometry args={[3.2, 3.2]} />
      </mesh>
    </group>
  )
}

/* ---------- labels: plain DOM, positioned from the camera every frame ---------- */

export const LABELLED: Place[] = [...PLACES.filter((p) => p.label !== false), SERENE]

function LabelProjector({ els }: { els: React.RefObject<(HTMLDivElement | null)[]> }) {
  const { camera, size } = useThree()
  const anchors = useMemo(() => LABELLED.map((pl) => worldAt(pl.lat, pl.lon, pl.kind === 'home' ? 2.6 : 1.2)), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const p = mapState.shown
    const on = p > 0.1, arrived = p >= PHASE.arrive[0]
    LABELLED.forEach((pl, i) => {
      const el = els.current?.[i]
      if (!el) return
      v.copy(anchors[i]).project(camera)
      const hidden = v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2
      el.style.transform = `translate3d(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px, 0)`
      el.classList.toggle('on', on && !hidden)
      el.classList.toggle('active', pl === SERENE && arrived)
      el.classList.toggle('dim', pl.kind === 'town' && arrived)
    })
  })
  return null
}

/* ---------- camera choreography ---------- */

function CameraRig({ main, home }: { main: THREE.CatmullRomCurve3; home: THREE.Vector3 }) {
  const { camera, size } = useThree()
  const s = useMemo(() => ({ p: 0, px: 0, py: 0, pos: new THREE.Vector3(-8, 108, 66), look: new THREE.Vector3() }), [])
  const want = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const a = size.width / size.height
    cam.fov = a < 0.8 ? 60 : a < 1.2 ? 48 : 38
    cam.updateProjectionMatrix()
  }, [camera, size])

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 3)
    s.p += (mapState.shown - s.p) * k
    s.px += (mapState.pointerX - s.px) * k
    s.py += (mapState.pointerY - s.py) * k
    const p = s.p

    // 1. overview of the whole Galiyat, tilting down as the terrain rises
    const g = ease(range(p, 0, PHASE.grow[1]))
    want.set(-8, 108 - g * 18, 66 - g * 6)
    look.set(-15, 0, 0)

    // 2. follow the road from Islamabad up through Murree and the galis
    const m = range(p, PHASE.main[0], PHASE.main[1])
    if (m > 0) {
      const t = ease(m)
      main.getPointAt(Math.min(0.999, t), tmp)
      const blend = ease(range(p, PHASE.main[0], PHASE.main[0] + 0.08))
      // aim left of the road so it sits on the right, clear of the caption
      const aim = tmp.clone().add(new THREE.Vector3(size.width > 760 ? -9 : 0, 0, size.width > 760 ? 2 : 6))
      want.lerp(aim.clone().add(new THREE.Vector3(-9, 22, 24)), blend)
      look.lerp(aim, blend)
    }

    // 3. settle on Serene Heights, low and close, Abbottabad valley behind
    const a = ease(range(p, PHASE.arrive[0], PHASE.arrive[1]))
    if (a > 0) {
      const side = size.width > 760 ? -3.2 : 0
      want.lerp(tmp.copy(home).add(new THREE.Vector3(8 + side, 9.5, 14)), a)
      look.lerp(home.clone().add(new THREE.Vector3(-1 + side, 2.2, -1.5)), a)
    }

    want.x += s.px * 2
    want.y += s.py * 1.2
    s.pos.lerp(want, k * 1.4)
    s.look.lerp(look, k * 1.4)
    camera.position.copy(s.pos)
    camera.lookAt(s.look)
  })
  return null
}

/* ---------- scene ---------- */

export function MapScene({ lite, onStop, labelEls }: { lite: boolean; onStop: (i: number) => void; labelEls: React.RefObject<(HTMLDivElement | null)[]> }) {
  use(loadDem()) // suspend until the elevation grid is in
  const main = useMemo(() => buildRoute(ROUTE_MAIN), [])
  const abbottabad = useMemo(() => buildRoute(ROUTE_ABBOTTABAD), [])
  const home = useMemo(() => worldAt(SERENE.lat, SERENE.lon), [])

  const grow = useRef(0), scan = useRef(0), lights = useRef(0)
  const drawMain = useRef(0), drawAbb = useRef(0), beacon = useRef(0)
  const stopRef = useRef(-1)

  // where each labelled stop sits along the main road (0–1)
  const stops = useMemo(() => {
    const names = ['Islamabad', 'Murree', 'Ayubia', 'Nathia Gali']
    const samples = main.getSpacedPoints(400)
    return names.map((n) => {
      const pl = PLACES.find((p) => p.name === n)!
      const w = worldAt(pl.lat, pl.lon)
      let best = 0, bd = Infinity
      samples.forEach((s, i) => { const d = Math.hypot(s.x - w.x, s.z - w.z); if (d < bd) { bd = d; best = i } })
      return best / 400
    })
  }, [main])

  useFrame((st) => {
    const p = mapState.shown
    grow.current = ease(range(p, 0.01, PHASE.grow[1]))
    lights.current = range(p, 0.06, 0.16)
    drawMain.current = ease(range(p, PHASE.main[0], PHASE.main[1]))
    drawAbb.current = ease(range(p, PHASE.abbottabad[0], PHASE.abbottabad[1]))
    beacon.current = range(p, 0.08, 0.18)
    scan.current = (st.clock.elapsedTime * 9) % 46

    // HUD stop index: 0..3 along the main road, 4 = Abbottabad, 5 = arrival
    let idx = -1
    stops.forEach((t, i) => { if (drawMain.current >= t - 0.02) idx = i })
    if (drawAbb.current > 0.3) idx = 4
    if (p >= PHASE.arrive[0] + 0.06) idx = 5
    if (idx !== stopRef.current) { stopRef.current = idx; onStop(idx) }

  })

  return (
    <>
      <color attach="background" args={[BG]} />
      <Pacer />
      <CameraRig main={main} home={home} />
      <LabelProjector els={labelEls} />
      <group>
        <Terrain segs={lite ? 160 : 240} grow={grow} scan={scan} />
        <TownLights grow={grow} on={lights} />
        <Route curve={main} draw={drawMain} color="#bcd8ca" radius={0.11} />
        <Route curve={abbottabad} draw={drawAbb} color="#a9c7b8" dashed radius={0.08} />
        <Beacon on={beacon} />
      </group>
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={lite ? 0.7 : 0.9} luminanceThreshold={0.8} luminanceSmoothing={0.2} radius={0.65} />
        <Vignette eskil={false} offset={0.25} darkness={0.7} />
      </EffectComposer>
    </>
  )
}
