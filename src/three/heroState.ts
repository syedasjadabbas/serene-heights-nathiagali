// Mutable state shared between the DOM scroll timeline and the WebGL frame loop.
// Plain object (not React state) so scrubbing never triggers re-renders.
export const heroState = {
  intro: 0, // 0 → 1 once the preloader finishes: towers draw themselves
  progress: 0, // 0 → 1 scroll progress through the pinned hero
  pointerX: 0,
  pointerY: 0,
}
