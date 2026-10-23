// Device capabilities, checked once.

export const coarsePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

let webgl: boolean | null = null
/** True when the browser can create a WebGL context. Old phones and locked-down browsers can't. */
export function hasWebGL() {
  if (webgl !== null) return webgl
  try {
    const c = document.createElement('canvas')
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    webgl = false
  }
  return webgl
}
