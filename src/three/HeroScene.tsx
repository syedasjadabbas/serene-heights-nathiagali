import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import * as THREE from 'three'
import { heroState } from './heroState'
import { Towers, TOWER_SCALE } from './Towers'
import { Landscape } from './Landscape'
import { LightRings } from './LightRings'

// Camera flies in from the valley, swings left over the road, then rises
// along the main tower to the rooftop as the hero is scrolled.
const PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 4.5, 36),
  new THREE.Vector3(-17, 7.5, 26),
  new THREE.Vector3(-16, 11, 15),
  new THREE.Vector3(-4, 11.5, 12.5),
  new THREE.Vector3(8, 10.5, 9.5),
])
const LOOK_FROM = new THREE.Vector3(0, 8.2, 0) // aim high so the towers sit below the headline
const LOOK_TO = new THREE.Vector3(-0.8, 8.4, -1.6)

function CameraRig() {
  const { camera, size } = useThree()
  // portrait screens get a wider lens so all three towers stay in frame
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    cam.fov = aspect < 0.8 ? 62 : aspect < 1.2 ? 50 : 42
    cam.updateProjectionMatrix()
  }, [camera, size])
  const look = useMemo(() => new THREE.Vector3(), [])
  const target = useMemo(() => new THREE.Vector3(), [])
  const smooth = useMemo(() => ({ p: 0, px: 0, py: 0 }), [])
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 4)
    smooth.p += (heroState.progress - smooth.p) * k
    smooth.px += (heroState.pointerX - smooth.px) * k * 0.6
    smooth.py += (heroState.pointerY - smooth.py) * k * 0.6
    // the intro adds a slow push-in before scrolling takes over
    const introPush = (1 - easeOut(heroState.intro)) * 16
    PATH.getPointAt(Math.min(0.999, smooth.p), target)
    target.z += introPush
    target.y += introPush * 0.12
    target.x += smooth.px * 1.2
    target.y += smooth.py * 0.6
    camera.position.copy(target)
    look.lerpVectors(LOOK_FROM, LOOK_TO, easeInOut(smooth.p))
    camera.lookAt(look)
  })
  return null
}

const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// Announces the first finished frame (shaders compiled, scene on screen) to the preloader.
function FirstFrame() {
  const frames = useMemo(() => ({ n: 0 }), [])
  useFrame(() => {
    if (heroState.ready || ++frames.n < 2) return
    heroState.ready = true
    window.dispatchEvent(new Event('hero-ready'))
  })
  return null
}

export function HeroScene({ lite }: { lite: boolean }) {
  return (
    <>
      <color attach="background" args={['#12261f']} />
      <FirstFrame />
      <CameraRig />
      <Landscape lite={lite} />
      <group scale={TOWER_SCALE}>
        <Towers />
      </group>
      <LightRings />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={lite ? 0.9 : 1.25} luminanceThreshold={0.5} luminanceSmoothing={0.3} radius={0.75} />
        <Noise opacity={0.035} />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    </>
  )
}
