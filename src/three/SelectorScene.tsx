import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Edges } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { TOWERS as HERO_TOWERS, FLOOR_H } from './Towers'
import { facadeTextures, fitTexture } from './facade'
import { availableOn, residentialFloors } from '../data/units'

export type FloorRef = { tower: number; floor: number }

// The selector stands the three towers in one straight row, B · A · C, facing the camera,
// so every floor can be read and picked (the hero keeps its own staggered layout).
const ROW_X = [0, -4.4, 4.4]
const TOWERS = HERO_TOWERS.map((t, i) => ({ ...t, x: ROW_X[i], z: 0, rot: 0 }))
const HOME = new THREE.Vector3(0, 2.2, 0)
// camera distance and height angle for the overview, a chosen tower and a chosen floor
// (`width` is how much of the scene must fit across a narrow phone screen)
const VIEW = { all: { dist: 23.5, phi: 1.3, width: 14 }, tower: { dist: 14, phi: 1.25, width: 5.6 }, floor: { dist: 6.6, phi: 1.36, width: 4.6 } }
const SWAY = 0.35 // the overview drifts this far either side of front-on, so the row never turns edge-on

const SLAB = FLOOR_H * 0.84
// the facade texture shows at full colour; selection tints it, sold-out floors grey it,
// floors of the other towers fade to pine
const COLORS = {
  slab: new THREE.Color('#ffffff'),
  slabDim: new THREE.Color('#3b5249'),
  selected: new THREE.Color('#bfe0cf'),
  glow: new THREE.Color('#7fb79c'),
  hover: new THREE.Color('#cfe3d8'),
  full: new THREE.Color('#9da59f'),
  stucco: new THREE.Color('#f1f3ee'),
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
    const side = (width: number) => new THREE.MeshStandardMaterial({ map: fitTexture(base, width), roughness: 0.82, emissive: COLORS.glow, emissiveIntensity: 0, transparent: true })
    const short = side(spec.d), long = side(spec.w)
    const cap = new THREE.MeshStandardMaterial({ color: COLORS.stucco, roughness: 0.9, transparent: true })
    const railMat = new THREE.MeshStandardMaterial({ map: fitTexture(tx.rail, spec.w + 0.1, 0.2), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4 })
    const slabMat = new THREE.MeshStandardMaterial({ color: '#18332a', roughness: 0.7, transparent: true })
    return { box: [short, short, cap, cap, long, long], tinted: [short, long], all: [short, long, cap, railMat, slabMat], railMat, slabMat }
  }, [isLobby, isTop, f, t, spec.d, spec.w])
  useEffect(() => () => mats.all.forEach((m) => { m.map?.dispose(); m.dispose() }), [mats])

  useFrame(() => {
    const dimTower = props.tower !== null && props.tower !== t
    const sel = props.tower === t && props.floor === f
    const hov = props.hover?.tower === t && props.hover.floor === f
    const base = sel ? COLORS.selected : hov ? COLORS.hover : dimTower ? COLORS.slabDim : full ? COLORS.full : COLORS.slab
    const glow = sel ? 0.75 : hov ? 0.2 : 0
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
    const cap = new THREE.MeshStandardMaterial({ color: '#18332a', roughness: 0.6 })
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
      {/* pine-green steel gable roof */}
      <mesh geometry={gable} position={[0, ph, 0]}>
        <meshStandardMaterial color="#37584f" roughness={0.55} metalness={0.3} />
        <Edges color="#18332a" />
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
        <meshStandardMaterial color="#18332a" roughness={0.7} />
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
  const orbit = useMemo(() => ({ az: 0.19, target: HOME.clone(), r: undefined as number | undefined, pol: undefined as number | undefined }), [])
  const want = useMemo(() => HOME.clone(), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const sph = useMemo(() => new THREE.Spherical(), [])
  const anchors = useMemo(() => TOWERS.map((t) => new THREE.Vector3(t.x, t.floors * FLOOR_H + 1.5, t.z)), [])
  // a camera flight runs after each selection, and stops as soon as the visitor drags
  const fly = useMemo(() => ({ active: false, dist: VIEW.all.dist, phi: VIEW.all.phi, front: false }), [])

  useEffect(() => {
    if (tower === null) want.copy(HOME)
    else want.set(TOWERS[tower].x, floor ? floor * FLOOR_H + FLOOR_H / 2 : (TOWERS[tower].floors * FLOOR_H) / 2, TOWERS[tower].z)
    const view = tower === null ? VIEW.all : floor ? VIEW.floor : VIEW.tower
    Object.assign(fly, { active: true, dist: view.dist, phi: view.phi, front: floor !== null && tower !== null })
  }, [tower, floor, want, fly])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const stop = () => { fly.active = false }
    c.addEventListener('start', stop)
    return () => c.removeEventListener('start', stop)
  }, [fly])

  useFrame((state, dt) => {
    const c = controls.current
    // time-based easing, so the flight takes the same time at any frame rate
    const ease = 1 - Math.exp(-dt * 4)
    if (c) {
      c.target.lerp(want, ease)
      if (fly.active) {
        // ease the camera in (or back out) around the new target
        const k = ease
        sph.setFromVector3(v.copy(camera.position).sub(c.target))
        sph.radius += (fly.dist - sph.radius) * k
        sph.phi += (fly.phi - sph.phi) * k
        if (fly.front) sph.theta += (Math.atan2(Math.sin(0.12 - sph.theta), Math.cos(0.12 - sph.theta))) * k // swing round to face the floor
        camera.position.copy(c.target).add(v.setFromSpherical(sph))
        if (Math.abs(sph.radius - fly.dist) < 0.03 && Math.abs(sph.phi - fly.phi) < 0.005 && c.target.distanceTo(want) < 0.01) fly.active = false
      }
      c.autoRotate = tower === null && !fly.active
      // turn back and forth across the front instead of all the way round
      const az = c.getAzimuthalAngle()
      if (az > SWAY) c.autoRotateSpeed = -0.4
      else if (az < -SWAY) c.autoRotateSpeed = 0.4
      c.update()
    } else if (spin.current !== null) {
      // touch: a fixed-height orbit driven by the turn buttons; the overview sways gently
      if (floor !== null) spin.current += (Math.round((spin.current - 0.12) / (Math.PI * 2)) * Math.PI * 2 + 0.12 - spin.current) * ease
      const sway = tower === null ? Math.sin(state.clock.elapsedTime * 0.3) * SWAY : 0
      orbit.az += (spin.current + sway - orbit.az) * Math.min(1, dt * 4)
      orbit.target.lerp(want, ease)
      // far enough back that the view's width fits the screen, whatever its shape
      const view = tower === null ? VIEW.all : floor ? VIEW.floor : VIEW.tower
      const cam = camera as THREE.PerspectiveCamera
      const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * (size.width / size.height))
      const fit = view.width / 2 / Math.tan(hfov / 2)
      const r = Math.max(view.dist * 0.8, Number.isFinite(fit) ? fit : view.dist) // the canvas can measure 0 x 0 before layout
      orbit.r = orbit.r === undefined || !Number.isFinite(orbit.r) ? r : orbit.r + (r - orbit.r) * ease
      orbit.pol = (orbit.pol ?? view.phi) + (view.phi - (orbit.pol ?? view.phi)) * ease
      camera.position.set(
        orbit.target.x + orbit.r * Math.sin(orbit.pol) * Math.sin(orbit.az),
        orbit.target.y + orbit.r * Math.cos(orbit.pol),
        orbit.target.z + orbit.r * Math.sin(orbit.pol) * Math.cos(orbit.az),
      )
      camera.lookAt(orbit.target)
    }
    // project tower labels, then push apart any that collide on screen
    const pts = anchors.map((a) => {
      v.copy(a).project(camera)
      return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height, hidden: v.z > 1 }
    })
    const gap = Math.min(150, size.width * 0.26) // labels are narrower than that on a phone
    for (let i = 0; i < pts.length; i++)
      for (let j = 0; j < i; j++)
        if (Math.abs(pts[i].x - pts[j].x) < gap && Math.abs(pts[i].y - pts[j].y) < 44) pts[i].y = pts[j].y - 46
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
      minDistance={5} maxDistance={26} minPolarAngle={0.35} maxPolarAngle={1.45} autoRotateSpeed={0.4} />
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
