// Shared GLSL helpers.

export const noiseGLSL = /* glsl */ `
float hash(float n){ return fract(sin(n) * 43758.5453123); }
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise1(float x){ float i = floor(x); float f = fract(x); f = f*f*(3.0-2.0*f); return mix(hash(i), hash(i+1.0), f); }
float noise2(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  float a = hash2(i), b = hash2(i + vec2(1.0, 0.0)), c = hash2(i + vec2(0.0, 1.0)), d = hash2(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm1(float x){ float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise1(x); x *= 2.03; a *= 0.5; } return v; }
float fbm2(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise2(p); p *= 2.03; a *= 0.5; } return v; }
`

export const fogGLSL = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
vec3 applyFog(vec3 col, float depth){ return mix(col, uFogColor, smoothstep(uFogNear, uFogFar, depth)); }
`

export const FOG = { color: '#071c3a', near: 18, far: 150 }
