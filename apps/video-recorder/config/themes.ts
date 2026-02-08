/**
 * JACK Video Recorder — Theme configuration
 */
export const theme = {
  light: "light" as const,
  dark: "dark" as const,
};

export type Theme = "light" | "dark";

export const COLORS = {
  light: {
    BACKGROUND: "#FFFFFF",
    ACCENT_COLOR: "#0C85F3",
    TEXT_COLOR: "#1A1A1A",
    MUTED_TEXT: "#666666",
    BORDER: "#E0E0E0",
    CARD_BG: "#F8F9FA",
  },
  dark: {
    BACKGROUND: "#0A0A0A",
    ACCENT_COLOR: "#4DA8FF",
    TEXT_COLOR: "#FFFFFF",
    MUTED_TEXT: "#A0A0A0",
    BORDER: "#2A2A2A",
    CARD_BG: "#141414",
  },
};

export const JACK_BRAND = {
  PRIMARY: "#00D4AA",
  SECONDARY: "#0C85F3",
  ACCENT: "#FF6B35",
  DARK: "#0A0A0A",
  LIGHT: "#F0FFF4",
};
