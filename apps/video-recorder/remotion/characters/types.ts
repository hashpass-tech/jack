/**
 * Jack Character — Shared types for versioned pirate avatars
 * Used by all JackV*.tsx variants.
 */
export interface JackCharacterProps {
  frame: number;
  fps: number;
  isSpeaking: boolean;
  viseme: string;
  size?: number;
}

/** Dashboard brand palette (passed in so characters stay in sync) */
export const BRAND = {
  GOLD: "#F2B94B",
  NAVY: "#0B1020",
  DARK: "#0F1A2E",
  SKY: "#38BDF8",
  GREEN: "#27C93F",
  RED: "#FF5F56",
  AMBER: "#FFBD2E",
  WHITE: "#ffffff",
  MUTED: "#94a3b8",
  BORDER: "rgba(242,185,75,0.30)",
};

/** Skin tones for JACK */
export const SKIN = "#c68642";
export const SKIN_LIGHT = "#d4954a";
export const SKIN_SHADOW = "#a0622e";
