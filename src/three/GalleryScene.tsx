import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

import { galleryState } from './state'

const SPACING = 7.5
const PLANE_H = 3.1

const vert = /* glsl */ `
uniform float uBend;
varying vec2 vUv;
varying float vDepth;
void main(){
  vUv = uv;
  vec3 p = position;
  // planes curl with scroll speed, like paper caught in a draught
  p.z += sin(uv.x * 3.14159) * uBend;
  p.y += sin(uv.x * 3.14159) * uBend * 0.25;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const frag = /* glsl */ `
uniform sampler2D uTex;
uniform float uFocus;
uniform float uFade;
varying vec2 vUv;
varying float vDepth;
void main(){
  vec2 uv = vUv;
  // a slight lens pull toward the centre when in focus
  uv = (uv - 0.5) * (1.0 - uFocus * 0.04) + 0.5;
  vec3 c = texture2D(uTex, uv).rgb;
  float grey = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 cold = vec3(grey) * vec3(0.7, 0.85, 0.78);
  c = mix(cold * 0.55, c, uFocus);
  // frost frame
  float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  c += vec3(0.85, 0.95, 0.9) * smoothstep(0.006, 0.0, edge) * 0.8;
  float a = uFade * smoothstep(60.0, 18.0, vDepth);
  gl_FragColor = vec4(c, a);
  #include <colorspace_fragment>
}`

export function GalleryScene({ images, onIndex }: { images: string[]; onIndex: (i: number) => void }) {
  const textures = useTexture(images)
  const { camera, size } = useThree()
  const aspect = size.width / size.height
  // portrait screens: smaller planes, pulled toward the centre line
  const fit = aspect < 0.8 ? { s: 0.5, x: 0.1 } : aspect < 1.25 ? { s: 0.72, x: 0.6 } : { s: 1, x: 1 }
  const last = useRef(-1)
  const smooth = useRef({ p: 0, v: 0 })

  const planes = useMemo(
    () =>
      textures.map((tex, i) => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = 4
        const img = tex.image as { width: number; height: number }
        const aspect = img.width / img.height
        const mat = new THREE.ShaderMaterial({
          vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
          uniforms: { uTex: { value: tex }, uBend: { value: 0 }, uFocus: { value: 0 }, uFade: { value: 1 } },
        })
        const geo = new THREE.PlaneGeometry(PLANE_H * aspect, PLANE_H, 24, 8)
        const side = i % 2 === 0 ? -1 : 1
        return { mat, geo, pos: new THREE.Vector3(side * 2.4, ((i % 3) - 1) * 0.45, -i * SPACING), side }
      }),
    [textures],
  )

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 5)
    smooth.current.p += (galleryState.progress - smooth.current.p) * k
    smooth.current.v += (galleryState.velocity - smooth.current.v) * k
    const travel = smooth.current.p * (planes.length - 1) * SPACING
    const camZ = 6.2 - travel
    const fi = Math.min(planes.length - 1, Math.max(0, Math.round(travel / SPACING)))
    const sway = planes[fi].pos.x * fit.x * 0.34
    camera.position.x += (sway - camera.position.x) * k
    camera.position.y = 0
    camera.position.z = camZ
    camera.lookAt(camera.position.x * 0.6, 0, camZ - 10)

    const bend = THREE.MathUtils.clamp(smooth.current.v * 0.0009, -0.9, 0.9)
    planes.forEach((pl, i) => {
      const d = pl.pos.z - camZ // negative when in front of the camera
      const focus = THREE.MathUtils.clamp(1 - Math.abs(d + 6.2) / (SPACING * 0.75), 0, 1)
      pl.mat.uniforms.uFocus.value = focus
      pl.mat.uniforms.uBend.value = bend * pl.side
      // fade out well before a plane reaches the lens, so it never fills the screen
      pl.mat.uniforms.uFade.value = THREE.MathUtils.clamp((-d - 2.2) / 2.4, 0, 1)
      void i
    })
    if (fi !== last.current) {
      last.current = fi
      onIndex(fi)
    }
  })

  return (
    <>
      <color attach="background" args={['#18332a']} />
      {planes.map((pl, i) => (
        <mesh key={i} geometry={pl.geo} material={pl.mat} position={[pl.pos.x * fit.x, pl.pos.y * fit.s, pl.pos.z]} scale={fit.s} rotation={[0, -pl.side * 0.22, 0]} />
      ))}
    </>
  )
}
