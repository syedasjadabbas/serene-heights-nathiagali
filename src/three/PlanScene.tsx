import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { coarsePointer } from '../lib/device'

// A floor plan raised into 3D: the drawing is the floor, its walls, balcony railings and
// beds stand up from it. The boxes come from scripts/plan3d.py (public/data/plans3d).

type PlanData = { w: number; h: number; boxes: [number, number, number, number, number][] }
const SIZE = 12 // world width of the longer side of a plan
const KINDS = [
  { height: 0.46, color: '#eef1ec' }, // walls and cores: snow, capped in pine
  { height: 0.16, color: '#37584f' }, // balcony railings: pine
  { height: 0.1, color: '#a9c7b8' }, // beds: sage
]

const cache = new Map<string, Promise<{ data: PlanData; tex: THREE.Texture }>>()
function loadPlan(name: string) {
  let p = cache.get(name)
  if (!p) {
    p = Promise.all([
      fetch(`/data/plans3d/${name}.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText)))),
      new THREE.TextureLoader().loadAsync(`/data/plans3d/${name}.webp`),
    ]).then(([data, tex]) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 8
      return { data: data as PlanData, tex }
    })
    cache.set(name, p)
  }
  return p
}

const unitBox = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)

const CAP = 0.03 // pine top on each wall, so the layout reads from above

function Walls({ data, kind, scale, cap = false }: { data: PlanData; kind: number; scale: number; cap?: boolean }) {
  const mesh = useMemo(() => {
    const list = data.boxes.filter((b) => b[4] === kind)
    const color = cap ? '#18332a' : KINDS[kind].color
    const m = new THREE.InstancedMesh(unitBox, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }), Math.max(1, list.length))
    const o = new THREE.Object3D()
    list.forEach(([x, y, w, h], i) => {
      o.position.set((x + w / 2) * scale - (data.w * scale) / 2, cap ? KINDS[kind].height : 0, (y + h / 2) * scale - (data.h * scale) / 2)
      o.scale.set(Math.max(w * scale, 0.02), cap ? CAP : KINDS[kind].height, Math.max(h * scale, 0.02))
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.count = list.length
    return m
  }, [data, kind, scale, cap])
  useEffect(() => () => { (mesh.material as THREE.Material).dispose(); mesh.dispose() }, [mesh])
  return <primitive object={mesh} />
}

function Plan({ name, onReady }: { name: string; onReady: () => void }) {
  const [plan, setPlan] = useState<{ data: PlanData; tex: THREE.Texture } | null>(null)
  const rise = useRef<THREE.Group>(null)
  const grow = useRef(0)
  useEffect(() => {
    let live = true
    loadPlan(name).then((p) => { if (live) { grow.current = 0; setPlan(p); onReady() } }).catch(() => {})
    return () => { live = false }
  }, [name, onReady])
  // walls rise out of the drawing each time a floor is shown
  useFrame((_, dt) => {
    if (!rise.current) return
    grow.current = Math.min(1, grow.current + dt / 1.1)
    const t = 1 - Math.pow(1 - grow.current, 3)
    rise.current.scale.y = Math.max(0.001, t)
  })
  if (!plan) return null
  const { data, tex } = plan
  const scale = SIZE / Math.max(data.w, data.h * 1.3) // deep plans are seen foreshortened, so give them room
  const W = data.w * scale, H = data.h * scale
  return (
    <group>
      {/* the drawing as the floor, and its dark silhouette below as the slab edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={tex} transparent alphaTest={0.5} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} scale={1.01}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={tex} color="#0c1c16" transparent alphaTest={0.5} />
      </mesh>
      <group ref={rise}>
        {KINDS.map((_, k) => <Walls key={k} data={data} kind={k} scale={scale} />)}
        <Walls data={data} kind={0} scale={scale} cap />
      </group>
    </group>
  )
}

function Rig({ spin, zoom }: { spin: React.RefObject<number>; zoom: React.RefObject<number> }) {
  const { camera, size } = useThree()
  const s = useMemo(() => ({ az: 0.35, r: 15 }), [])
  useFrame((state, dt) => {
    if (!coarsePointer) return
    // touch: slow sway, turned by the arrow buttons and zoomed by the +/- buttons
    const ease = 1 - Math.exp(-dt * 4)
    const want = spin.current + Math.sin(state.clock.elapsedTime * 0.25) * 0.25
    s.az += (want - s.az) * ease
    const fit = (SIZE * 0.62) / Math.tan(THREE.MathUtils.degToRad(35) / 2 * Math.min(1, size.width / size.height))
    const r = (Number.isFinite(fit) ? fit : 15) * zoom.current
    s.r += (r - s.r) * ease
    const pol = 0.85
    camera.position.set(s.r * Math.sin(pol) * Math.sin(s.az), s.r * Math.cos(pol), s.r * Math.sin(pol) * Math.cos(s.az))
    camera.lookAt(0, 0, 0)
  })
  if (coarsePointer) return null
  return (
    <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.08} minDistance={5} maxDistance={24}
      minPolarAngle={0.2} maxPolarAngle={1.35} autoRotate autoRotateSpeed={0.35} />
  )
}

export function PlanScene({ name, spin, zoom }: { name: string; spin: React.RefObject<number>; zoom: React.RefObject<number> }) {
  const invalidate = useThree((s) => s.invalidate)
  const onReady = useMemo(() => () => invalidate(), [invalidate])
  return (
    <>
      <color attach="background" args={['#18332a']} />
      <fog attach="fog" args={['#18332a', 26, 48]} />
      <hemisphereLight args={['#f4f8f5', '#18332a', 1.1]} />
      <directionalLight position={[-6, 12, 8]} intensity={1.9} color="#ffffff" />
      <directionalLight position={[8, 6, -6]} intensity={0.5} color="#a9c7b8" />
      <Rig spin={spin} zoom={zoom} />
      <Plan name={name} onReady={onReady} />
    </>
  )
}
