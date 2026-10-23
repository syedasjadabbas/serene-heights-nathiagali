// Mutable state shared between DOM scroll handlers and WebGL frame loops.
// No three.js imports here, so sections can update it before the 3D engine has loaded.

// progress: where the scroll is (0–1). shown: what the map plays, paced in MapScene.
export const mapState = { progress: 0, shown: 0, pointerX: 0, pointerY: 0 }

export const galleryState = { progress: 0, velocity: 0 }
