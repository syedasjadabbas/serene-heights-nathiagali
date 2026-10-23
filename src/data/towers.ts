// Tower massing shared by the hero line-work, the apartment selector and the unit data.
// Kept free of three.js so pages can use it without loading the 3D engine.
export type TowerSpec = { x: number; z: number; w: number; d: number; floors: number; rot: number }

export const TOWERS: TowerSpec[] = [
  { x: 0, z: 0, w: 3.4, d: 2.5, floors: 11, rot: 0.08 },
  { x: -4.4, z: -2.6, w: 2.8, d: 2.3, floors: 9, rot: -0.12 },
  { x: 4.2, z: -3.4, w: 3.0, d: 2.3, floors: 10, rot: 0.22 },
]
export const FLOOR_H = 0.38
export const TOWER_SCALE = 1.9
