import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { gsap } from '../lib/scroll'
import { noiseGLSL } from './shaders'

// Full-frame image that melts from winter to summer through a noise front,
// like snow thawing off the slope.
const frag = /* glsl */ `
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uMix;
uniform float uTime;
uniform vec2 uPlane;
uniform vec2 uImgA;
uniform vec2 uImgB;
uniform vec2 uPointer;
varying vec2 vUv;
${noiseGLSL}
vec2 cover(vec2 uv, vec2 plane, vec2 img){
  float rp = plane.x / plane.y, ri = img.x / img.y;
  vec2 s = rp > ri ? vec2(1.0, ri / rp) : vec2(rp / ri, 1.0);
  return (uv - 0.5) * s + 0.5;
}
void main(){
  vec2 par = uPointer * 0.012;
  float n = fbm2(vUv * vec2(3.0, 2.2) + uTime * 0.03);
  float front = uMix * 1.5 - 0.25;
  float t = smoothstep(front - 0.12, front + 0.12, n + (1.0 - vUv.y) * 0.35);
  float m = 1.0 - t;
  float warp = (1.0 - abs(m - 0.5) * 2.0) * 0.06;
  vec2 ua = cover(vUv + par + vec2(0.0, warp), uPlane, uImgA);
  vec2 ub = cover(vUv - par - vec2(0.0, warp), uPlane, uImgB);
  vec3 a = texture2D(uA, ua).rgb;
  vec3 b = texture2D(uB, ub).rgb;
  vec3 col = mix(a, b, m);
  // a thin warm seam where the thaw line passes
  col += vec3(0.9, 1.0, 0.95) * smoothstep(0.12, 0.0, abs(t - 0.5)) * 0.25 * step(0.01, uMix) * step(uMix, 0.99);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`
const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

export function SeasonScene({ season, a, b }: { season: 'winter' | 'summer'; a: string; b: string }) {
  const [ta, tb] = useTexture([a, b])
  const size = useThree((s) => s.size)
  const { uniforms, material } = useMemo(() => {
    for (const t of [ta, tb]) t.colorSpace = THREE.SRGBColorSpace
    const dim = (t: THREE.Texture) => {
      const i = t.image as { width: number; height: number }
      return new THREE.Vector2(i.width, i.height)
    }
    const u = {
      uA: { value: ta }, uB: { value: tb }, uMix: { value: 0 }, uTime: { value: 0 },
      uPlane: { value: new THREE.Vector2(1, 1) }, uImgA: { value: dim(ta) }, uImgB: { value: dim(tb) },
      uPointer: { value: new THREE.Vector2() },
    }
    const m = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: u, depthTest: false })
    return { uniforms: u, material: m }
  }, [ta, tb])

  useEffect(() => {
    uniforms.uPlane.value.set(size.width, size.height)
  }, [size, uniforms])

  useEffect(() => {
    gsap.to(uniforms.uMix, { value: season === 'summer' ? 1 : 0, duration: 1.8, ease: 'power2.inOut' })
  }, [season, uniforms])

  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime
    uniforms.uPointer.value.lerp(s.pointer, 0.05)
  })

  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
