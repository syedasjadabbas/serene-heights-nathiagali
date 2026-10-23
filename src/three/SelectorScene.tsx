import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Edges } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { TOWERS, FLOOR_H } from './Towers'
import { facadeTextures, fitTexture } from './facade'
import { availableOn, residentialFloors } from '../data/units'

export type FloorRef = { tower: number; floor: number }

const SLAB = FLOOR_H * 0.84
// the facade texture shows at full colour; selection tints it, sold-out floors grey it,
// floors of the other towers fade to pine
const COLORS = {
  slab: new THREE.Color('#ffffff'),
  slabDim: new THREE.Color('#3b5249'),
  selected: new THREE.Color('#37584f'),
  hover: new THREE.Color('#cfe3d8'),
  full: new THREE.Color('#9da59f'),
  stucco: new THREE.Color('#ece4d5'),
}

import { coarsePointer } from '../lib/device'

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
  const isLobby = f === 0
  const isTop = f === residentialFloors(t)
  const full = !isLobby && availableOn(t, f) === 0
  const h = isLobby ? FLOOR_H * 0.96 : SLAB
  const balcony = !isLobby && !isTop

  // box faces: +x, -x, +y, -y, +z, -z; the long faces (w) and short faces (d) get their own tiling
  const mats = useMemo(() => {
    const tx = facadeTextures()
    const base = isLobby ? tx.lobby : isTop ? tx.top : tx.floors[(f * 7 + t * 3) % tx.floors.length]
    const side = (width: number) => new THREE.MeshStandardMaterial({ map: fitTexture(base, width), roughness: 0.82, emissive: COLORS.selected, emissiveIntensity: 0, transparent: true })
    const short = side(spec.d), long = side(spec.w)
    const cap = new THREE.MeshStandardMaterial({ color: COLORS.stucco, roughness: 0.9, transparent: true })
    const railMat = new THREE.MeshStandardMaterial({ map: fitTexture(tx.rail, spec.w + 0.1, 0.2), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4 })
    const slabMat = new THREE.MeshStandardMaterial({ color: '#2a2623', roughness: 0.7, transparent: true })
    return { box: [short, short, cap, cap, long, long], tinted: [short, long], all: [short, long, cap, railMat, slabMat], railMat, slabMat }
  }, [isLobby, isTop, f, t, spec.d, spec.w])
  useEffect(() => () => mats.all.forEach((m) => { m.map?.dispose(); m.dispose() }), [mats])

  useFrame(() => {
    const dimTower = props.tower !== null && props.tower !== t
    const sel = props.tower === t && props.floor === f
    const hov = props.hover?.tower === t && props.hover.floor === f
    const base = sel ? COLORS.selected : hov ? COLORS.hover : dimTower ? COLORS.slabDim : full ? COLORS.full : COLORS.slab
    const glow = sel ? 0.35 : hov ? 0.12 : 0
    const opacity = dimTower ? 0.35 : 1
    for (const m of mats.tinted) {
      m.color.lerp(base, 0.2)
      m.emissiveIntensity += (glow - m.emissiveIntensity) * 0.2
    }
    for (const m of mats.all) m.opacity += (opacity - m.opacity) * 0.15
  })
  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => { e.stopPropagation(); if (!isLobby) props.onPick({ tower: t, floor: f }) }
  const y0 = f * FLOOR_H
  return (
    <group
      onPointerOver={(e) => { e.stopPropagation(); if (!isLobby) { props.onHover({ tower: t, floor: f }); document.body.style.cursor = 'pointer' } }}
      onPointerOut={() => { props.onHover(null); document.body.style.cursor = '' }}
      onClick={pick}
    >
      <mesh position={[0, y0 + (isLobby ? h / 2 : FLOOR_H / 2), 0]} material={mats.box}>
        <boxGeometry args={[spec.w, h, spec.d]} />
      </mesh>
      {balcony && (
        <>
          {/* balcony slabs front and back, with black railings like the renders */}
          <mesh position={[0, y0 + 0.012, 0]} material={mats.slabMat}>
            <boxGeometry args={[spec.w + 0.1, 0.024, spec.d + 0.28]} />
          </mesh>
          {[1, -1].map((side) => (
            <mesh key={side} position={[0, y0 + 0.024 + 0.055, side * (spec.d / 2 + 0.14)]} material={mats.railMat}>
              <planeGeometry args={[spec.w + 0.1, 0.11]} />
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}

// a gabled steel-and-glass pavilion, like the rooftop restaurant and greenhouse in the renders
function Pavilion({ w, d, x, onClick }: { w: number; d: number; x: number; onClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const ph = FLOOR_H * 1.05
  const gable = useMemo(() => {
    const gh = d * 0.22
    const shape = new THREE.Shape([new THREE.Vector2(-d / 2 - 0.06, 0), new THREE.Vector2(d / 2 + 0.06, 0), new THREE.Vector2(0, gh)])
    const g = new THREE.ExtrudeGeometry(shape, { depth: w + 0.1, bevelEnabled: false })
    g.translate(0, 0, -(w + 0.1) / 2)
    g.rotateY(Math.PI / 2)
    return g
  }, [w, d])
  const glass = useMemo(() => {
    const tx = facadeTextures().glass
    const side = (width: number) => {
      const map = fitTexture(tx, width, 0.6)
      return new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.94 })
    }
    const short = side(d), long = side(w)
    const cap = new THREE.MeshStandardMaterial({ color: '#2a2623', roughness: 0.6 })
    return [short, short, cap, cap, long, long]
  }, [w, d])
  useEffect(() => () => {
    gable.dispose()
    glass.forEach((m) => { m.map?.dispose(); m.dispose() })
  }, [gable, glass])
  return (
    <group position={[x, 0, 0]} onClick={onClick}>
      <mesh position={[0, ph / 2, 0]} material={glass}>
        <boxGeometry args={[w, ph, d]} />
      </mesh>
      {/* weathered steel gable roof */}
      <mesh geometry={gable} position={[0, ph, 0]}>
        <meshStandardMaterial color="#5a3a2b" roughness={0.6} metalness={0.35} />
        <Edges color="#1f1c1a" />
      </mesh>
    </group>
  )
}

function Tower({ t, props }: { t: number; props: Props }) {
  const spec = TOWERS[t]
  const H = (residentialFloors(t) + 1) * FLOOR_H
  const pick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); props.onTower(t) }
  // the roof fades with the rest of the tower when another tower is chosen
  const roof = useRef<THREE.Group>(null)
  useFrame(() => {
    const k = props.tower !== null && props.tower !== t ? 0.3 : 1
    roof.current?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined
      if (!m || Array.isArray(m)) return
      m.userData.base ??= m.opacity
      m.transparent = true
      m.opacity += (m.userData.base * k - m.opacity) * 0.15
    })
  })
  return (
    <group position={[spec.x, 0, spec.z]} rotation={[0, spec.rot, 0]}>
      {Array.from({ length: residentialFloors(t) + 1 }, (_, f) => <Floor key={f} t={t} f={f} props={props} />)}
      {/* roof slab with a parapet line, then the rooftop restaurant and greenhouse */}
      <group ref={roof}>
      <mesh position={[0, H + 0.02, 0]}>
        <boxGeometry args={[spec.w + 0.06, 0.04, spec.d + 0.06]} />
        <meshStandardMaterial color="#2a2623" roughness={0.7} />
      </mesh>
      <group position={[0, H + 0.04, 0]}>
        <Pavilion w={spec.w * 0.5} d={spec.d * 0.72} x={-spec.w * 0.2} onClick={pick} />
        <Pavilion w={spec.w * 0.3} d={spec.d * 0.55} x={spec.w * 0.3} onClick={pick} />
      </group>
      </group>
    </group>
  )
}

function Grounds() {
  const forest = useMemo(() => {
    const g = new THREE.ConeGeometry(0.22, 1, 6)
    const m = new THREE.MeshStandardMaterial({ color: '#0f261e', roughness: 0.9 })
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
        <meshStandardMaterial color="#1a3229" roughness={1} />
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
      el.style.opacity = p.hidden ? '0' : '1'
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
      <color attach="background" args={['#18332a']} />
      <fog attach="fog" args={['#18332a', 22, 48]} />
      <hemisphereLight args={['#eef6f1', '#0f221b', 0.9]} />
      <directionalLight position={[-8, 12, 6]} intensity={2.2} color="#f2f6f4" />
      <directionalLight position={[9, 5, -6]} intensity={0.6} color="#9fc6cf" />
      <pointLight position={[3, 2, 7]} intensity={12} distance={16} color="#ffe6c2" />
      <Rig tower={props.tower} floor={props.floor} labelEls={props.labelEls} spin={props.spin} />
      <group onPointerMissed={() => props.onHover(null)}>
        {TOWERS.map((_, t) => <Tower key={t} t={t} props={props} />)}
      </group>
      <Grounds />
    </>
  )
}
