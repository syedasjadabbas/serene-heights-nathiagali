import { Suspense, type ComponentType } from 'react'
import { Canvas, type CanvasProps } from '@react-three/fiber'

// The only module that pulls in the 3D engine for the canvas. LazyCanvas loads it on demand,
// so the first page load ships without three.js.
export default function CanvasHost<P extends object>({ scene: Scene, sceneProps, frameloop, canvas }: {
  scene: ComponentType<P>
  sceneProps: P
  frameloop: 'always' | 'never'
  canvas: Omit<CanvasProps, 'children'>
}) {
  return (
    <Canvas {...canvas} frameloop={frameloop}>
      <Suspense fallback={null}>
        <Scene {...sceneProps} />
      </Suspense>
    </Canvas>
  )
}
