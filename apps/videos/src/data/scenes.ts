import { COLORS } from "../constants";

export interface SceneData {
  id: string;
  layerNumber: number | null;
  title: string;
  subtitles: string[];
  accentColor: string;
  secondaryColor: string;
}

/**
 * Scene content — subtitle text matches the spec EXACTLY.
 * Do NOT paraphrase, add brand names, or modify the on-screen text.
 */
export const SCENES: SceneData[] = [
  // ── Scene 0 — Cold Open ──
  {
    id: "Scene0ColdOpen",
    layerNumber: null,
    title: "JACK",
    subtitles: ["JACK", "XChain Exec Kernel"],
    accentColor: COLORS.gold,
    secondaryColor: COLORS.cyan,
  },
  // ── Scene 1 — Layer 1 ──
  {
    id: "Scene1KeyManagement",
    layerNumber: 1,
    title: "Secure Key Management",
    subtitles: [
      "Layer 1: Secure Key Management",
      "Secure key generation and storage",
      "Protected signing operations",
    ],
    accentColor: COLORS.gold,
    secondaryColor: COLORS.dimGray,
  },
  // ── Scene 2 — Layer 2 ──
  {
    id: "Scene2MultiChain",
    layerNumber: 2,
    title: "Multi-Chain Connectivity",
    subtitles: [
      "Layer 2: Multi-Chain Connectivity",
      "Cross-chain execution routing",
      "Chain-abstracted execution",
    ],
    accentColor: COLORS.cyan,
    secondaryColor: COLORS.gold,
  },
  // ── Scene 3 — Layer 3 ──
  {
    id: "Scene3Clearing",
    layerNumber: 3,
    title: "Decentralized Clearing",
    subtitles: [
      "Layer 3: Decentralized Clearing",
      "On-chain settlement enforcement",
      "Verifiable execution policies",
    ],
    accentColor: COLORS.gold,
    secondaryColor: COLORS.magenta,
  },
  // ── Scene 4 — Layer 4 ──
  {
    id: "Scene4Automation",
    layerNumber: 4,
    title: "User Experience & Automation",
    subtitles: [
      "Layer 4: User Experience & Automation",
      "Intent-based user interface",
      "Agent-driven execution flows",
    ],
    accentColor: COLORS.gold,
    secondaryColor: COLORS.cyan,
  },
  // ── Scene 5 — Outro ──
  {
    id: "Scene5Outro",
    layerNumber: null,
    title: "JACK Kernel",
    subtitles: ["JACK Kernel", "Programmable execution for DeFi"],
    accentColor: COLORS.gold,
    secondaryColor: COLORS.cyan,
  },
];
