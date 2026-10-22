import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { heroState } from './heroState'
import { fogGLSL, FOG } from './shaders'

// Three towers drawn as glowing line work, matched loosely to the renders:
// slab balconies on every floor, arched windows, a set-back penthouse and gable roof.
type TowerSpec = { x: number; z: number; w: number; d: number; floors: number; rot: number }

export const TOWERS: TowerSpec[] = [
  { x: 0, z: 0, w: 3.4, d: 2.5, floors: 11, rot: 0.08 },
  { x: -4.4, z: -2.6, w: 2.8, d: 2.3, floors: 9, rot: -0.12 },
  { x: 4.2, z: -3.4, w: 3.0, d: 2.3, floors: 10, rot: 0.22 },
]
export const FLOOR_H = 0.38
export const TOWER_SCALE = 1.9
const MAX_H = 11 * FLOOR_H + 1.6

function buildTowerLines(t: TowerSpec, rand: () => number) {
  const pos: number[] = []
  const kind: number[] = []
  const lit: number[] = []
  const rot = new THREE.Matrix4().makeRotationY(t.rot)
  const v = new THREE.Vector3()
  const push = (a: [number, number, number], b: [number, number, number], k: number, l = 0) => {
    for (const p of [a, b]) {
      v.set(p[0], p[1], p[2]).applyMatrix4(rot)
      pos.push(v.x + t.x, v.y, v.z + t.z)
      kind.push(k)
      lit.push(l)
    }
  }
  const box = (w: number, d: number, y0: number, y1: number, k = 0) => {
    const hw = w / 2, hd = d / 2
    const c: [number, number][] = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]
    for (let i = 0; i < 4; i++) {
      const [ax, az] = c[i], [bx, bz] = c[(i + 1) % 4]
      push([ax, y0, az], [bx, y0, bz], k)
      push([ax, y1, az], [bx, y1, bz], k)
      push([ax, y0, az], [ax, y1, az], k)
    }
  }

  const H = t.floors * FLOOR_H
  const hw = t.w / 2, hd = t.d / 2
  box(t.w, t.d, 0, H)

  for (let f = 1; f <= t.floors; f++) {
    const y = f * FLOOR_H
    // floor slab ring
    push([-hw, y, -hd], [hw, y, -hd], 0); push([hw, y, -hd], [hw, y, hd], 0)
    push([hw, y, hd], [-hw, y, hd], 0); push([-hw, y, hd], [-hw, y, -hd], 0)
    // balcony rails stand proud of the front and back faces
    if (f < t.floors) {
      for (const s of [1, -1]) {
        const z = s * (hd + 0.16)
        push([-hw + 0.1, y + 0.12, z], [hw - 0.1, y + 0.12, z], 0)
        push([-hw + 0.1, y + 0.01, z], [hw - 0.1, y + 0.01, z], 0)
      }
    }
  }

  // arched windows on all four faces
  const arch = (cx: number, y0: number, face: 'x' | 'z', sign: number, half: number) => {
    const ww = 0.1, wh = 0.17, seg = 6
    const isLit = rand() > 0.42 ? 1 : 0
    const L = isLit ? 0.4 + rand() * 0.6 : 0
    const P = (u: number, y: number): [number, number, number] =>
      face === 'z' ? [cx + u, y, sign * (half + 0.002)] : [sign * (half + 0.002), y, cx + u]
    push(P(-ww, y0), P(-ww, y0 + wh), 1, L)
    push(P(ww, y0), P(ww, y0 + wh), 1, L)
    push(P(-ww, y0), P(ww, y0), 1, L)
    for (let i = 0; i < seg; i++) {
      const a0 = Math.PI - (i / seg) * Math.PI, a1 = Math.PI - ((i + 1) / seg) * Math.PI
      push(P(Math.cos(a0) * ww, y0 + wh + Math.sin(a0) * ww), P(Math.cos(a1) * ww, y0 + wh + Math.sin(a1) * ww), 1, L)
    }
  }
  for (let f = 0; f < t.floors; f++) {
    const y0 = f * FLOOR_H + 0.05
    const nw = Math.max(3, Math.floor(t.w / 0.42))
    for (let i = 0; i < nw; i++) {
      const cx = -hw + (t.w / nw) * (i + 0.5)
      arch(cx, y0, 'z', 1, hd); arch(cx, y0, 'z', -1, hd)
    }
    const nd = Math.max(3, Math.floor(t.d / 0.42))
    for (let i = 0; i < nd; i++) {
      const cz = -hd + (t.d / nd) * (i + 0.5)
      arch(cz, y0, 'x', 1, hw); arch(cz, y0, 'x', -1, hw)
    }
  }

  // set-back penthouse and gable roof
  const pw = t.w * 0.72, pd = t.d * 0.72, ph = FLOOR_H * 1.3
  box(pw, pd, H, H + ph)
  const ridgeY = H + ph + 0.55
  push([-pw / 2, ridgeY, 0], [pw / 2, ridgeY, 0], 0)
  for (const sx of [-1, 1]) {
    push([sx * pw / 2, ridgeY, 0], [sx * pw / 2, H + ph, pd / 2], 0)
    push([sx * pw / 2, ridgeY, 0], [sx * pw / 2, H + ph, -pd / 2], 0)
  }
  // rooftop glasshouse posts
  for (let i = 0; i <= 4; i++) {
    const x = -pw / 2 + (pw / 4) * i
    push([x, H + ph, pd / 2], [x, ridgeY - 0.1, pd * 0.1], 1, 0.9)
  }
  return { pos, kind, lit }
}

const lineVert = /* glsl */ `
attribute float aKind;
attribute float aLit;
varying float vY;
varying float vKind;
varying float vLit;
varying float vDepth;
varying vec3 vWorld;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz; vY = wp.y; vKind = aKind; vLit = aLit;
  vec4 mv = viewMatrix * wp;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`

const lineFrag = /* glsl */ `
uniform float uReveal;
uniform float uTime;
uniform float uLitAmount;
uniform vec3 uFrame;
uniform vec3 uWarm;
varying float vY;
varying float vKind;
varying float vLit;
varying float vDepth;
varying vec3 vWorld;
${fogGLSL}
void main(){
  if (vY > uReveal) discard;
  float front = smoothstep(0.9, 0.0, uReveal - vY);
  vec3 col;
  if (vKind < 0.5) {
    col = uFrame * (0.55 + front * 2.2);
  } else {
    float on = step(1.0 - uLitAmount, vLit);
    float flick = 0.85 + 0.15 * sin(uTime * 2.0 + vWorld.x * 13.0 + vWorld.y * 7.0);
    col = mix(uFrame * 0.22, uWarm * (1.3 + vLit) * flick, on) + uFrame * front * 1.5;
  }
  col = applyFog(col, vDepth);
  gl_FragColor = vec4(col, 1.0);
}`

export function Towers() {
  const { geometry, uniforms, material } = useMemo(() => {
    let s = 7
    const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    const pos: number[] = [], kind: number[] = [], lit: number[] = []
    for (const t of TOWERS) {
      const r = buildTowerLines(t, rand)
      pos.push(...r.pos); kind.push(...r.kind); lit.push(...r.lit)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1))
    g.setAttribute('aLit', new THREE.Float32BufferAttribute(lit, 1))
    const u = {
      uReveal: { value: 0 },
      uTime: { value: 0 },
      uLitAmount: { value: 0.3 },
      uFrame: { value: new THREE.Color('#f6dccb') },
      uWarm: { value: new THREE.Color('#ffb07c') },
      uFogColor: { value: new THREE.Color(FOG.color) },
      uFogNear: { value: FOG.near },
      uFogFar: { value: FOG.far },
    }
    const material = new THREE.ShaderMaterial({ vertexShader: lineVert, fragmentShader: lineFrag, uniforms: u, toneMapped: false })
    return { geometry: g, uniforms: u, material }
  }, [])

  const occluders = useRef<THREE.Group>(null)

  useFrame((state) => {
    const reveal = heroState.intro * (MAX_H + 1.2)
    uniforms.uReveal.value = reveal * TOWER_SCALE
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uLitAmount.value = 0.25 + Math.min(1, heroState.progress * 1.6) * 0.55
    if (occluders.current) {
      occluders.current.children.forEach((c) => {
        const h = c.userData.h as number
        c.scale.y = Math.max(0.001, Math.min(1, reveal / h))
      })
    }
  })

  return (
    <group>
      {/* dark volumes hide the line work behind each tower */}
      <group ref={occluders}>
        {TOWERS.map((t, i) => {
          const h = t.floors * FLOOR_H
          return (
            <mesh key={i} position={[t.x, 0, t.z]} rotation={[0, t.rot, 0]} userData={{ h }}>
              <boxGeometry args={[t.w * 0.985, h * 2, t.d * 0.985]} />
              <meshBasicMaterial color="#04132a" polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
            </mesh>
          )
        })}
      </group>
      <lineSegments geometry={geometry} material={material} />
    </group>
  )
}
