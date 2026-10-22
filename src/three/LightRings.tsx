import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { heroState } from './heroState'
import { TOWER_SCALE, FLOOR_H } from './Towers'

// Copper light ribbons orbiting the main tower, after ERA's glowing trails.
// Each ring is a thin tube on a tilted ellipse with a bright head and a fading tail.
const vert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const frag = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uOn;
uniform vec3 uColor;
varying vec2 vUv;
void main(){
  float t = fract(vUv.x - uTime * uSpeed);
  float tail = pow(t, 3.0);              // long fading tail behind the head
  float head = smoothstep(0.97, 1.0, t);  // white-hot head
  float base = 0.06;                      // faint full ring
  vec3 c = uColor * (tail * 2.2 + base) + vec3(1.0, 0.92, 0.85) * head * 3.0;
  gl_FragColor = vec4(c * uOn, 1.0);
}`

const RINGS = [
  { rx: 5.2, rz: 3.6, y: 5.4, tiltX: 0.18, tiltZ: -0.22, speed: 0.07, color: '#f0a27e', r: 0.035 },
  { rx: 6.4, rz: 4.4, y: 4.2, tiltX: -0.12, tiltZ: 0.16, speed: -0.05, color: '#cf8f7d', r: 0.028 },
  { rx: 4.4, rz: 3.0, y: 7.2, tiltX: 0.26, tiltZ: 0.1, speed: 0.09, color: '#ffd2bc', r: 0.022 },
]

export function LightRings() {
  const group = useRef<THREE.Group>(null)
  const items = useMemo(
    () =>
      RINGS.map((r) => {
        const pts: THREE.Vector3[] = []
        for (let i = 0; i <= 160; i++) {
          const a = (i / 160) * Math.PI * 2
          pts.push(new THREE.Vector3(Math.cos(a) * r.rx, 0, Math.sin(a) * r.rz))
        }
        const curve = new THREE.CatmullRomCurve3(pts, true)
        const geo = new THREE.TubeGeometry(curve, 320, r.r, 6, true)
        const mat = new THREE.ShaderMaterial({
          vertexShader: vert, fragmentShader: frag, toneMapped: false,
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
          uniforms: { uTime: { value: 0 }, uSpeed: { value: r.speed }, uOn: { value: 0 }, uColor: { value: new THREE.Color(r.color) } },
        })
        return { geo, mat, r }
      }),
    [],
  )
  useFrame((s) => {
    // rings arrive after the towers have drawn, and thin out as the camera climbs past
    const on = Math.min(1, Math.max(0, heroState.intro * 1.8 - 0.8)) * (1 - Math.min(1, Math.max(0, (heroState.progress - 0.75) * 4)) * 0.6)
    items.forEach(({ mat }) => { mat.uniforms.uTime.value = s.clock.elapsedTime; mat.uniforms.uOn.value = on })
    if (group.current) group.current.rotation.y = s.clock.elapsedTime * 0.04
  })
  const centreY = (11 * FLOOR_H * TOWER_SCALE) / 2
  return (
    <group ref={group} position={[0, 0, 0]}>
      {items.map(({ geo, mat, r }, i) => (
        <mesh key={i} geometry={geo} material={mat} position={[0, r.y + centreY - 4, 0]} rotation={[r.tiltX, 0, r.tiltZ]} />
      ))}
    </group>
  )
}
