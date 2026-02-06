// ─── JACK Brand Colors ───
export const COLORS = {
  darkBg: "#0B1020",
  darkPanel: "#0F1A2E",
  gold: "#F2B94B",
  blue: "#38BDF8",
  green: "#22C55E",
  white: "#F8FAFC",
  gray: "#94A3B8",
  dimGray: "#334155",
} as const;

// ─── Video Dimensions (1080p) ───
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const FPS = 30;

// ─── Scene Durations (in frames) ───
export const SCENE_DURATION = 210; // 7 seconds
export const OUTRO_DURATION = 150; // 5 seconds
export const TOTAL_DURATION = SCENE_DURATION * 4 + OUTRO_DURATION; // 990 frames ≈ 33s

// ─── Deterministic random (safe for Remotion re-renders) ───
export const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453123;
  return x - Math.floor(x);
};
