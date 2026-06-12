import { Easing } from 'react-native-reanimated';

// Just a Pinch motion language — "Warm Editorial".
// Fast arrivals, soft landings, one clean overshoot on delighters.
// All values are consumed by Reanimated on the UI thread.

export const Springs = {
  // Press feedback: immediate, controlled, zero wobble.
  press: { damping: 30, stiffness: 420, mass: 0.8 },
  // Standard movement: confident glide with a soft settle.
  glide: { damping: 26, stiffness: 240, mass: 1 },
  // Delighters: a single expressive overshoot, then settle.
  pop: { damping: 14, stiffness: 340, mass: 0.9 },
};

export const Durations = {
  fast: 160,
  base: 260,
  slow: 420,
};

export const Curves = {
  // Expo-out: covers 80% of the distance in the first third, lands gently.
  enter: Easing.bezier(0.16, 1, 0.3, 1),
  // Accelerate away — exits should never linger.
  exit: Easing.bezier(0.55, 0, 1, 0.45),
  // Standard positional moves.
  move: Easing.bezier(0.4, 0, 0.2, 1),
  // Ambient idle motion — symmetric and breath-like, for endless loops.
  drift: Easing.inOut(Easing.sin),
};

// Stagger interval for choreographed list/section entrances.
export const StaggerMs = 60;

// Ambient FX loops (badge shimmer language). Loops animate only
// transform/opacity and must be cancelled on unmount.
export const Ambient = {
  sheenMs: 1100,       // one specular sweep across a medallion
  sheenRestMs: 2600,   // pause between sweeps
  twinkleInMs: 260,    // glitter particle pop-in
  twinkleOutMs: 520,   // glitter particle fade-away
  twinkleRestMs: 1400, // rest before a particle re-fires (plus per-particle phase)
  floatMs: 5200,       // full hero float cycle, down and back
};
