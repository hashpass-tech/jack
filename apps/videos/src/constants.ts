// ─── JACK Brand Colors (v2 — gold / cyan / magenta palette) ───
export const COLORS = {
  darkBg: "#0B1020",
  surface: "#0F1A2E",
  gold: "#F2B94B",
  cyan: "#38BDF8",
  magenta: "#A855F7",
  green: "#22C55E",
  white: "#F8FAFC",
  gray: "#94A3B8",
  dimGray: "#334155",
  red: "#EF4444",
} as const;

// ─── Video Dimensions (1080p 16:9) ───
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const FPS = 30;

// ─── Scene Durations (frames at 30 fps) ───
// Scene 0: Cold open      0:00 – 0:02 →  60 frames
// Scene 1: Layer 1        0:02 – 0:08 → 180 frames
// Scene 2: Layer 2        0:08 – 0:14 → 180 frames
// Scene 3: Layer 3        0:14 – 0:21 → 210 frames
// Scene 4: Layer 4        0:21 – 0:27 → 180 frames
// Scene 5: Outro          0:27 – 0:32 → 150 frames
export const COLD_OPEN_DURATION = 60; // 2 s
export const SCENE1_DURATION = 180; // 6 s
export const SCENE2_DURATION = 180; // 6 s
export const SCENE3_DURATION = 210; // 7 s
export const SCENE4_DURATION = 180; // 6 s
export const OUTRO_DURATION = 150; // 5 s
export const TOTAL_DURATION =
  COLD_OPEN_DURATION +
  SCENE1_DURATION +
  SCENE2_DURATION +
  SCENE3_DURATION +
  SCENE4_DURATION +
  OUTRO_DURATION; // 960 frames = 32 s

// ─── Fog ───
export const FOG_NEAR = 3;
export const FOG_FAR = 18;

// ─── Deterministic random (safe for Remotion re-renders) ───
export const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453123;
  return x - Math.floor(x);
};
