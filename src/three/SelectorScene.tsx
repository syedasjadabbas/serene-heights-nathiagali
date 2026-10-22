import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Edges } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { TOWERS, FLOOR_H } from './Towers'
import { availableOn, residentialFloors } from '../data/units'

export type FloorRef = { tower: number; floor: number }

const SLAB = FLOOR_H * 0.84
// cream stone like the renders; sold-out floors read as copper
const COLORS = {
  slab: new THREE.Color('#e6d7c6'),
  slabDim: new THREE.Color('#2a3656'),
  lobby: new THREE.Color('#9d8e80'),
  selected: new THREE.Color('#cf8f7d'),
  full: new THREE.Color('#a8604c'),
}

export const coarsePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

type Props = {
  spin: React.RefObject<number> // target azimuth for touch devices, nudged by the turn buttons
  tower: number | null
  floor: number | null
  hover: FloorRef | null
  onHover: (f: FloorRef | null) => void
  onPick: (f: FloorRef) => void
  onTower: (t: number) => void
  labelEls: React.RefObject<(HTMLButtonElement | null)[]>
}

function Floor({ t, f, props }: { t: number; f: number; props: Props }) {
  const spec = TOWERS[t]
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const isLobby = f === 0
  const full = !isLobby && availableOn(t, f) === 0
  useFrame(() => {
    const m = mat.current
    if (!m) return
    const dimTower = props.tower !== null && props.tower !== t
    const sel = props.tower === t && props.floor === f
    const hov = props.hover?.tower === t && props.hover.floor === f
    const base = isLobby ? COLORS.lobby : dimTower ? COLORS.slabDim : full ? COLORS.full : COLORS.slab
    m.color.lerp(base, 0.2)
    const glow = sel ? 0.9 : hov ? 0.45 : 0
    m.emissive.lerp(COLORS.selected, 0.2)
    m.emissiveIntensity += (glow - m.emissiveIntensity) * 0.2
    m.opacity += ((dimTower ? 0.35 : 1) - m.opacity) * 0.15
  })
  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => { e.stopPropagation(); if (!isLobby) props.onPick({ tower: t, floor: f }) }
  return (
    <mesh
      position={[0, f * FLOOR_H + FLOOR_H / 2, 0]}
      onPointerOver={(e) => { e.stopPropagation(); if (!isLobby) { props.onHover({ tower: t, floor: f }); document.body.style.cursor = 'pointer' } }}
      onPointerOut={() => { props.onHover(null); document.body.style.cursor = '' }}
      onClick={pick}
    >
      <boxGeometry args={[spec.w, isLobby ? FLOOR_H * 0.96 : SLAB, spec.d]} />
      <meshStandardMaterial ref={mat} color={COLORS.slab} emissive={COLORS.selected} emissiveIntensity={0} roughness={0.85} metalness={0} transparent opacity={1} />
    </mesh>
  )
}

function Tower({ t, props }: { t: number; props: Props }) {
  const spec = TOWERS[t]
  const H = spec.floors * FLOOR_H
  const pw = spec.w * 0.72, pd = spec.d * 0.72, ph = FLOOR_H * 1.3
  return (
    <group position={[spec.x, 0, spec.z]} rotation={[0, spec.rot, 0]}>
      {Array.from({ length: residentialFloors(t) + 1 }, (_, f) => <Floor key={f} t={t} f={f} props={props} />)}
      {/* rooftop restaurant and gable */}
      <mesh position={[0, H + ph / 2, 0]} onClick={(e) => { e.stopPropagation(); props.onTower(t) }}>
        <boxGeometry args={[pw, ph, pd]} />
        <meshStandardMaterial color="#1b2b52" emissive="#f0a27e" emissiveIntensity={0.45} roughness={0.15} metalness={0.5} transparent opacity={0.85} />
        <Edges color="#f0a27e" />
      </mesh>
      <mesh position={[0, H + ph + 0.27, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.001, pd / 2, 0.55, 4, 1]} />
        <meshStandardMaterial color="#6a6158" roughness={0.6} />
      </mesh>
    </group>
  )
}

function Grounds() {
  const forest = useMemo(() => {
    const g = new THREE.ConeGeometry(0.22, 1, 6)
    const m = new THREE.MeshStandardMaterial({ color: '#0a1c3a', roughness: 0.9 })
    const inst = new THREE.InstancedMesh(g, m, 260)
    const o = new THREE.Object3D()
    let s = 5
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    let i = 0
    while (i < 260) {
      const a = r() * Math.PI * 2, d = 7 + r() * 13
      const x = Math.cos(a) * d, z = Math.sin(a) * d
      if (z > 4 && Math.abs(x) < 9) continue // keep the valley side open
      const h = 1.2 + r() * 2
      o.position.set(x, h / 2, z)
      o.scale.set(h * 0.6, h, h * 0.6)
      o.updateMatrix()
      inst.setMatrixAt(i++, o.matrix)
    }
    return inst
  }, [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[24, 64]} />
        <meshStandardMaterial color="#0e2347" roughness={1} />
      </mesh>
      <primitive object={forest} />
    </group>
  )
}

function Rig({ tower, floor, labelEls, spin }: Pick<Props, 'tower' | 'floor' | 'labelEls' | 'spin'>) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera, size } = useThree()
  const orbit = useMemo(() => ({ az: 0.19, target: new THREE.Vector3(0, 2.2, -1.5) }), [])
  const want = useMemo(() => new THREE.Vector3(0, 2.2, -1.5), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const anchors = useMemo(() => TOWERS.map((t) => new THREE.Vector3(t.x, t.floors * FLOOR_H + 1.5, t.z)), [])

  useEffect(() => {
    if (tower === null) want.set(0, 2.2, -1.5)
    else want.set(TOWERS[tower].x, floor ? floor * FLOOR_H + FLOOR_H / 2 : (TOWERS[tower].floors * FLOOR_H) / 2, TOWERS[tower].z)
  }, [tower, floor, want])

  useFrame((_, dt) => {
    const c = controls.current
    if (c) {
      c.target.lerp(want, 0.08)
      c.autoRotate = tower === null
      c.update()
    } else if (spin.current !== null) {
      // touch: a fixed-height orbit driven by the turn buttons, with slow auto-turn
      if (tower === null) spin.current += dt * 0.12
      orbit.az += (spin.current - orbit.az) * Math.min(1, dt * 4)
      orbit.target.lerp(want, 0.08)
      const portrait = size.width < size.height
      const r = (tower === null ? 22 : 15) * (portrait ? 1.35 : 1)
      const pol = 1.12
      camera.position.set(
        orbit.target.x + r * Math.sin(pol) * Math.sin(orbit.az),
        orbit.target.y + r * Math.cos(pol),
        orbit.target.z + r * Math.sin(pol) * Math.cos(orbit.az),
      )
      camera.lookAt(orbit.target)
    }
    // project tower labels, then push apart any that collide on screen
    const pts = anchors.map((a) => {
      v.copy(a).project(camera)
      return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, hidden: v.z > 1 }
    })
    for (let i = 0; i < pts.length; i++)
      for (let j = 0; j < i; j++)
        if (Math.abs(pts[i].x - pts[j].x) < 150 && Math.abs(pts[i].y - pts[j].y) < 44) pts[i].y = pts[j].y - 46
    pts.forEach((p, i) => {
      const el = labelEls.current?.[i]
      if (!el) return
      el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -100%)`
      el.style.visibility = p.hidden ? 'hidden' : 'visible'
    })
  })
  if (coarsePointer) return null
  return (
    <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping dampingFactor={0.08}
      minDistance={7} maxDistance={26} minPolarAngle={0.35} maxPolarAngle={1.4} autoRotateSpeed={0.5} />
  )
}

export function SelectorScene(props: Props) {
  return (
    <>
      <color attach="background" args={['#051936']} />
      <fog attach="fog" args={['#051936', 22, 48]} />
      <hemisphereLight args={['#f8e6da', '#0b1a35', 0.9]} />
      <directionalLight position={[-8, 12, 6]} intensity={2.2} color="#f2f6f4" />
      <directionalLight position={[9, 5, -6]} intensity={0.6} color="#9fc6cf" />
      <pointLight position={[3, 2, 7]} intensity={16} distance={16} color="#f0a27e" />
      <Rig tower={props.tower} floor={props.floor} labelEls={props.labelEls} spin={props.spin} />
      <group onPointerMissed={() => props.onHover(null)}>
        {TOWERS.map((_, t) => <Tower key={t} t={t} props={props} />)}
      </group>
      <Grounds />
    </>
  )
}
