import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { heroState } from './heroState'
import { noiseGLSL, fogGLSL, FOG } from './shaders'
import { TOWERS, TOWER_SCALE } from './Towers'

const fogUniforms = () => ({
  uFogColor: { value: new THREE.Color(FOG.color) },
  uFogNear: { value: FOG.near },
  uFogFar: { value: FOG.far },
})

/* ---------- five ridge layers of the Galiyat, each with a glowing crest ---------- */

const ridgeVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

const ridgeFrag = /* glsl */ `
uniform float uSeed;
uniform float uFreq;
uniform float uAmp;
uniform float uBase;
uniform float uIntro;
uniform float uHeight;
uniform vec3 uFill;
uniform vec3 uEdge;
uniform float uEdgeStrength;
varying vec2 vUv;
${noiseGLSL}
void main(){
  float x = vUv.x;
  float ridge = uBase + uAmp * (fbm1(x * uFreq + uSeed) * 1.25 - 0.1);
  // sharper alpine peaks
  ridge += uAmp * 0.35 * pow(abs(sin(x * uFreq * 1.7 + uSeed)), 6.0);
  float y = vUv.y;
  if (y > ridge) discard;
  float dist = (ridge - y) * uHeight;
  float crest = exp(-dist * 9.0);
  // crest line draws outward from the centre during the intro
  float reveal = smoothstep(uIntro * 0.62 + 0.02, uIntro * 0.62 - 0.04, abs(x - 0.5));
  // snow caps near the top of each ridge
  float snow = smoothstep(0.55, 0.0, dist) * (0.35 + 0.65 * fbm2(vec2(x * 80.0, y * 30.0)));
  vec3 col = uFill + uEdge * snow * 0.18 + uEdge * crest * uEdgeStrength * reveal;
  gl_FragColor = vec4(col, 1.0);
}`

const RIDGES = [
  { z: -130, y: -2, w: 520, h: 70, seed: 3.1, freq: 6, amp: 0.55, base: 0.25, fill: '#1a2c55', edge: 0.55 },
  { z: -95, y: -3, w: 400, h: 52, seed: 8.7, freq: 7, amp: 0.5, base: 0.2, fill: '#132449', edge: 0.7 },
  { z: -68, y: -3, w: 300, h: 34, seed: 1.9, freq: 6, amp: 0.55, base: 0.18, fill: '#0d1d3d', edge: 0.85 },
  { z: -45, y: -3, w: 220, h: 20, seed: 5.3, freq: 5, amp: 0.6, base: 0.2, fill: '#091733', edge: 1.0 },
  { z: -26, y: -2.5, w: 150, h: 9, seed: 9.9, freq: 4, amp: 0.55, base: 0.25, fill: '#06122a', edge: 0.6 },
]

function Ridges() {
  const mats = useMemo(
    () =>
      RIDGES.map(
        (r) =>
          new THREE.ShaderMaterial({
            vertexShader: ridgeVert,
            fragmentShader: ridgeFrag,
            toneMapped: false,
            uniforms: {
              uSeed: { value: r.seed }, uFreq: { value: r.freq }, uAmp: { value: r.amp }, uBase: { value: r.base },
              uIntro: { value: 0 }, uHeight: { value: r.h },
              uFill: { value: new THREE.Color(r.fill) },
              uEdge: { value: new THREE.Color('#f0b29b') },
              uEdgeStrength: { value: r.edge },
            },
          }),
      ),
    [],
  )
  useFrame(() => {
    const t = Math.min(1, heroState.intro * 1.3)
    mats.forEach((m) => (m.uniforms.uIntro.value = t))
  })
  return (
    <group>
      {RIDGES.map((r, i) => (
        <mesh key={i} position={[0, r.y + r.h / 2, r.z]} material={mats[i]}>
          <planeGeometry args={[r.w, r.h]} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- ground: dark snowfield with a faint contour glow ---------- */

const groundFrag = /* glsl */ `
varying vec3 vWorld;
varying float vDepth;
${noiseGLSL}
${fogGLSL}
void main(){
  float n = fbm2(vWorld.xz * 0.18);
  float contour = smoothstep(0.035, 0.0, abs(fract(n * 9.0) - 0.5) - 0.46);
  vec3 col = mix(vec3(0.012, 0.03, 0.07), vec3(0.03, 0.06, 0.12), n);
  col += vec3(0.95, 0.68, 0.58) * contour * 0.07;
  gl_FragColor = vec4(applyFog(col, vDepth), 1.0);
}`
const worldVert = /* glsl */ `
varying vec3 vWorld;
varying float vDepth;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mv = viewMatrix * wp; vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`

function Ground() {
  const uniforms = useMemo(fogUniforms, [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <planeGeometry args={[400, 400]} />
      <shaderMaterial vertexShader={worldVert} fragmentShader={groundFrag} uniforms={uniforms} toneMapped={false} />
    </mesh>
  )
}

/* ---------- pine forest: instanced cones with a frosted rim ---------- */

const pineVert = /* glsl */ `
varying float vH;
varying float vDepth;
varying float vRand;
void main(){
  vH = position.y + 0.5;
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vRand = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
  vec4 mv = viewMatrix * wp; vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const pineFrag = /* glsl */ `
varying float vH;
varying float vDepth;
varying float vRand;
${fogGLSL}
void main(){
  vec3 col = mix(vec3(0.008, 0.02, 0.05), vec3(0.02, 0.045, 0.09), vRand);
  col += vec3(0.95, 0.85, 0.8) * smoothstep(0.75, 1.0, vH) * 0.1; // snow on the tips
  gl_FragColor = vec4(applyFog(col, vDepth), 1.0);
}`

function Forest({ count }: { count: number }) {
  const { mesh, uniforms } = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.26, 1, 5, 1)
    const u = fogUniforms()
    const mat = new THREE.ShaderMaterial({ vertexShader: pineVert, fragmentShader: pineFrag, uniforms: u, toneMapped: false })
    const m = new THREE.InstancedMesh(geo, mat, count)
    const d = new THREE.Object3D()
    let s = 11
    const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    let i = 0
    while (i < count) {
      const x = (rand() - 0.5) * 140
      const z = 20 - rand() * 120
      // keep the tower plot and the road clear
      if (TOWERS.some((t) => Math.hypot(x - t.x * TOWER_SCALE, z - t.z * TOWER_SCALE) < 6.5)) continue
      if (Math.abs(x) < 15 && z > -10 && z < 16) continue // keep the view to the towers open
      const h = 1.6 + rand() * 3.2
      d.position.set(x, h / 2 - 0.05, z)
      const r = 0.7 + rand() * 0.7
      d.scale.set(r * h * 0.45, h, r * h * 0.45)
      d.updateMatrix()
      m.setMatrixAt(i++, d.matrix)
    }
    return { mesh: m, uniforms: u }
  }, [count])
  void uniforms
  return <primitive object={mesh} />
}

/* ---------- light trails: car lights climbing the Nathia road ---------- */

const trailVert = /* glsl */ `
varying vec2 vUv;
varying float vDepth;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const trailFrag = /* glsl */ `
uniform float uTime;
uniform float uDir;
uniform float uIntro;
uniform vec3 uColor;
varying vec2 vUv;
varying float vDepth;
${fogGLSL}
void main(){
  float t = fract(vUv.x * 7.0 - uTime * 0.09 * uDir);
  float head = smoothstep(0.0, 0.02, t) * pow(1.0 - t, 7.0);
  float along = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
  vec3 col = uColor * (head * 3.2 + 0.05) * along * uIntro;
  gl_FragColor = vec4(applyFog(col, vDepth * 0.7), 1.0);
}`

function LightTrails() {
  const items = useMemo(() => {
    const base = [
      new THREE.Vector3(-46, 0.1, 34), new THREE.Vector3(-26, 0.1, 22), new THREE.Vector3(-30, 0.1, 10),
      new THREE.Vector3(-14, 0.1, 6), new THREE.Vector3(-9, 0.1, 5.5), new THREE.Vector3(-3.5, 0.1, 4.2),
    ]
    const mk = (offset: number, color: string, dir: number) => {
      const pts = base.map((p) => p.clone().add(new THREE.Vector3(0, 0, offset)))
      const curve = new THREE.CatmullRomCurve3(pts)
      const geo = new THREE.TubeGeometry(curve, 240, 0.035, 5, false)
      const mat = new THREE.ShaderMaterial({
        vertexShader: trailVert, fragmentShader: trailFrag, toneMapped: false,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        uniforms: { uTime: { value: 0 }, uDir: { value: dir }, uIntro: { value: 0 }, uColor: { value: new THREE.Color(color) }, ...fogUniforms() },
      })
      return { geo, mat }
    }
    return [mk(0, '#f0a27e', 1), mk(0.18, '#cf8f7d', 1.3), mk(-0.2, '#fff1e6', -0.8)]
  }, [])
  useFrame((s) => {
    items.forEach(({ mat }) => {
      mat.uniforms.uTime.value = s.clock.elapsedTime
      mat.uniforms.uIntro.value = Math.min(1, Math.max(0, heroState.intro * 1.6 - 0.4))
    })
  })
  return (
    <group>
      {items.map((it, i) => <mesh key={i} geometry={it.geo} material={it.mat} />)}
    </group>
  )
}

/* ---------- snowfall ---------- */

const snowVert = /* glsl */ `
uniform float uTime;
uniform float uPixel;
attribute float aSpeed;
attribute float aSize;
varying float vAlpha;
void main(){
  vec3 p = position;
  p.y = mod(p.y - uTime * aSpeed, 26.0) - 2.0;
  p.x += sin(uTime * 0.6 + position.z) * 0.5;
  p.z += cos(uTime * 0.4 + position.x) * 0.3;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = aSize * uPixel * (24.0 / -mv.z);
  vAlpha = smoothstep(80.0, 6.0, -mv.z) * smoothstep(0.5, 3.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}`
const snowFrag = /* glsl */ `
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  gl_FragColor = vec4(vec3(1.0, 0.96, 0.92) * a * 0.9, a);
}`

function Snow({ count }: { count: number }) {
  const { geo, mat } = useMemo(() => {
    const p = new Float32Array(count * 3), sp = new Float32Array(count), sz = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 70
      p[i * 3 + 1] = Math.random() * 26
      p[i * 3 + 2] = 30 - Math.random() * 70
      sp[i] = 0.6 + Math.random() * 1.1
      sz[i] = 0.5 + Math.random() * 1.4
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('aSpeed', new THREE.BufferAttribute(sp, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1))
    const m = new THREE.ShaderMaterial({
      vertexShader: snowVert, fragmentShader: snowFrag, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { uTime: { value: 0 }, uPixel: { value: Math.min(window.devicePixelRatio, 2) } },
    })
    return { geo: g, mat: m }
  }, [count])
  useFrame((s) => (mat.uniforms.uTime.value = s.clock.elapsedTime))
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

/* ---------- sky: night gradient with a low moon glow behind the ridge ---------- */

const skyFrag = /* glsl */ `
varying vec3 vDir;
${noiseGLSL}
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(vec3(0.16, 0.12, 0.2), vec3(0.012, 0.05, 0.13), smoothstep(-0.02, 0.45, h));
  col = mix(col, vec3(0.005, 0.02, 0.06), smoothstep(0.45, 0.9, h));
  col += vec3(0.85, 0.48, 0.38) * exp(-max(h, 0.0) * 9.0) * 0.35; // afterglow on the horizon
  vec3 moonDir = normalize(vec3(-0.35, 0.16, -1.0));
  float m = max(dot(d, moonDir), 0.0);
  col += vec3(0.95, 0.75, 0.65) * pow(m, 60.0) * 0.4 + vec3(1.0, 0.96, 0.9) * smoothstep(0.9993, 0.9996, m);
  float stars = step(0.9975, hash2(floor(d.xy * 420.0 + d.z * 211.0))) * smoothstep(0.05, 0.4, h);
  col += stars * 0.55;
  gl_FragColor = vec4(col, 1.0);
}`
const skyVert = /* glsl */ `
varying vec3 vDir;
void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

function Sky() {
  return (
    <mesh>
      <sphereGeometry args={[300, 32, 16]} />
      <shaderMaterial vertexShader={skyVert} fragmentShader={skyFrag} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

export function Landscape({ lite }: { lite: boolean }) {
  return (
    <group>
      <Sky />
      <Ridges />
      <Ground />
      <Forest count={lite ? 500 : 1400} />
      <LightTrails />
      <Snow count={lite ? 1200 : 3200} />
    </group>
  )
}
