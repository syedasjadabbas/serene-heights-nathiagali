import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { coarsePointer } from '../lib/device'

// A floor plan built as a furnished floor: oak, stone and decking floors, plastered walls,
// glass balcony railings and made beds, lit by a low sun that casts real shadows.
// Walls, railings, beds and the floor texture come from scripts/plan3d.py (public/data/plans3d).

type Box = [number, number, number, number, number]
type PlanData = { w: number; h: number; boxes: Box[]; beds: Box[] }
const SIZE = 12 // world width of the longer side of a plan
const WALL_H = 0.5
const RAIL_H = 0.2

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

/** One instanced mesh of boxes: `parts` gives each box's world matrix. */
function Instanced({ parts, material, shadows = true }: { parts: THREE.Matrix4[]; material: THREE.Material; shadows?: boolean }) {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(unitBox, material, Math.max(1, parts.length))
    parts.forEach((mx, i) => m.setMatrixAt(i, mx))
    m.count = parts.length
    m.castShadow = shadows
    m.receiveShadow = true
    return m
  }, [parts, material, shadows])
  useEffect(() => () => mesh.dispose(), [mesh])
  return <primitive object={mesh} />
}

const o = new THREE.Object3D()
const boxMatrix = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
  o.position.set(x, y, z)
  o.rotation.set(0, 0, 0)
  o.scale.set(sx, sy, sz)
  o.updateMatrix()
  return o.matrix.clone()
}

function useMaterials() {
  const m = useMemo(() => ({
    plaster: new THREE.MeshStandardMaterial({ color: '#f3f0ea', roughness: 0.92 }),
    wallTop: new THREE.MeshStandardMaterial({ color: '#56635d', roughness: 0.8 }),
    glass: new THREE.MeshStandardMaterial({ color: '#cfe5dc', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.38, depthWrite: false }),
    handrail: new THREE.MeshStandardMaterial({ color: '#18332a', roughness: 0.4, metalness: 0.5 }),
    walnut: new THREE.MeshStandardMaterial({ color: '#5a3d2b', roughness: 0.6 }),
    linen: new THREE.MeshStandardMaterial({ color: '#f6f4ef', roughness: 0.95 }),
    duvet: new THREE.MeshStandardMaterial({ color: '#9fc2b1', roughness: 0.95 }),
  }), [])
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m])
  return m
}

/** Matrices for every part of every bed: frame, mattress, duvet, two pillows, headboard. */
function bedParts(beds: Box[], toWorld: (x: number, y: number) => [number, number], s: number) {
  const parts = { walnut: [] as THREE.Matrix4[], linen: [] as THREE.Matrix4[], duvet: [] as THREE.Matrix4[] }
  const bed = new THREE.Matrix4()
  const local = new THREE.Matrix4()
  const add = (list: THREE.Matrix4[], x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    local.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz))
    list.push(bed.clone().multiply(local))
  }
  for (const [x, y, w, h, head] of beds) {
    const [cx, cz] = toWorld(x + w / 2, y + h / 2)
    const L = Math.max(w, h) * s, W = Math.min(w, h) * s
    // the bed's own frame has its head toward -z; turn it so the head meets the wall
    const angle = [0, -Math.PI / 2, Math.PI, Math.PI / 2][head]
    bed.compose(new THREE.Vector3(cx, 0, cz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle), new THREE.Vector3(1, 1, 1))
    add(parts.walnut, 0, 0, 0, W, 0.05, L)                               // frame
    add(parts.linen, 0, 0.05, 0.01 * L, W * 0.94, 0.05, L * 0.95)        // mattress
    add(parts.duvet, 0, 0.1, 0.19 * L, W * 0.99, 0.022, L * 0.62)        // duvet folded at the foot
    add(parts.linen, -W * 0.23, 0.1, -0.36 * L, W * 0.4, 0.035, L * 0.14) // pillows
    add(parts.linen, W * 0.23, 0.1, -0.36 * L, W * 0.4, 0.035, L * 0.14)
    add(parts.walnut, 0, 0, -L / 2 - 0.015, W * 1.04, 0.2, 0.03)         // headboard
  }
  return parts
}

function Plan({ name, onReady }: { name: string; onReady: () => void }) {
  const [plan, setPlan] = useState<{ data: PlanData; tex: THREE.Texture } | null>(null)
  const rise = useRef<THREE.Group>(null)
  const grow = useRef(0)
  const mat = useMaterials()
  useEffect(() => {
    let live = true
    loadPlan(name).then((p) => { if (live) { grow.current = 0; setPlan(p); onReady() } }).catch(() => {})
    return () => { live = false }
  }, [name, onReady])
  // walls and furniture rise out of the floor each time a floor is shown
  useFrame((_, dt) => {
    if (!rise.current) return
    grow.current = Math.min(1, grow.current + dt / 1.1)
    const t = 1 - Math.pow(1 - grow.current, 3)
    rise.current.scale.y = Math.max(0.001, t)
  })

  const built = useMemo(() => {
    if (!plan) return null
    const { data } = plan
    const s = SIZE / Math.max(data.w, data.h * 1.3) // deep plans are seen foreshortened, so give them room
    const W = data.w * s, H = data.h * s
    const toWorld = (gx: number, gy: number): [number, number] => [gx * s - W / 2, gy * s - H / 2]
    const walls: THREE.Matrix4[] = [], tops: THREE.Matrix4[] = [], glass: THREE.Matrix4[] = [], rails: THREE.Matrix4[] = []
    for (const [x, y, w, h, kind] of data.boxes) {
      const [cx, cz] = toWorld(x + w / 2, y + h / 2)
      const sx = Math.max(w * s, 0.02), sz = Math.max(h * s, 0.02)
      if (kind === 0) {
        walls.push(boxMatrix(cx, 0, cz, sx, WALL_H, sz))
        tops.push(boxMatrix(cx, WALL_H, cz, sx, 0.012, sz))
      } else {
        glass.push(boxMatrix(cx, 0, cz, Math.max(sx * 0.5, 0.012), RAIL_H, Math.max(sz * 0.5, 0.012)))
        rails.push(boxMatrix(cx, RAIL_H, cz, sx, 0.016, sz))
      }
    }
    return { W, H, walls, tops, glass, rails, beds: bedParts(data.beds ?? [], toWorld, s) }
  }, [plan])

  if (!plan || !built) return null
  const { W, H } = built
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={plan.tex} transparent alphaTest={0.5} roughness={0.75} />
      </mesh>
      {/* the slab's dark edge below the floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]} scale={1.01}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={plan.tex} color="#0c1c16" transparent alphaTest={0.5} />
      </mesh>
      <group ref={rise}>
        <Instanced parts={built.walls} material={mat.plaster} />
        <Instanced parts={built.tops} material={mat.wallTop} shadows={false} />
        <Instanced parts={built.glass} material={mat.glass} shadows={false} />
        <Instanced parts={built.rails} material={mat.handrail} />
        <Instanced parts={built.beds.walnut} material={mat.walnut} />
        <Instanced parts={built.beds.linen} material={mat.linen} />
        <Instanced parts={built.beds.duvet} material={mat.duvet} />
      </group>
    </group>
  )
}

function Rig({ spin, zoom }: { spin: React.RefObject<number>; zoom: React.RefObject<number> }) {
  const { camera, size } = useThree()
  const s = useMemo(() => ({ az: 0.35, r: 15 }), [])
  useFrame((state, dt) => {
    if (!coarsePointer) return
    // touch: slow sway, turned by swipes or the arrows, zoomed by pinching or +/-
    const ease = 1 - Math.exp(-dt * 4)
    const want = spin.current + Math.sin(state.clock.elapsedTime * 0.25) * 0.25
    s.az += (want - s.az) * ease
    // close enough that the floor fills a narrow screen
    const fit = (SIZE * 0.54) / Math.tan(THREE.MathUtils.degToRad(35) / 2 * Math.min(1, size.width / size.height))
    const r = (Number.isFinite(fit) ? fit : 15) * zoom.current
    s.r += (r - s.r) * ease
    const pol = 0.72 // a little more from above, so the layout reads on a small screen
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
  const map = coarsePointer ? 1024 : 2048
  return (
    <>
      <color attach="background" args={['#18332a']} />
      <fog attach="fog" args={['#18332a', 26, 48]} />
      <hemisphereLight args={['#f6f3ec', '#2a3d35', 0.85]} />
      {/* a low, warm sun: walls and beds throw soft shadows across the floor */}
      <directionalLight position={[-7, 11, 6]} intensity={2.4} color="#fff3e2" castShadow
        shadow-mapSize={[map, map]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-radius={4}
        shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={1} shadow-camera-far={40} />
      <directionalLight position={[8, 6, -6]} intensity={0.45} color="#cfe5dc" />
      <Rig spin={spin} zoom={zoom} />
      <Plan name={name} onReady={onReady} />
    </>
  )
}
