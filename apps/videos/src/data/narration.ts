import { FPS } from "../constants";

/**
 * Narration scripts for each scene.
 * SSML is used for Google Cloud TTS to control pacing, emphasis, and breaks.
 * Plain text is the fallback for other TTS engines.
 */

export interface NarrationSegment {
  /** Scene composition id */
  sceneId: string;
  /** Output filename (without extension) */
  filename: string;
  /** Plain-text narration (for fallback engines) */
  text: string;
  /** SSML narration (for Google Cloud TTS — richer prosody control) */
  ssml: string;
  /** Target duration in seconds (narration should fit within this) */
  targetDurationSec: number;
  /** Speaking rate multiplier — 1.0 = normal, 1.1 = slightly faster */
  speakingRate: number;
  /** Pitch offset in semitones — 0 = normal */
  pitch: number;
}

export const NARRATION_SEGMENTS: NarrationSegment[] = [
  // ── Scene 0 — Cold Open (3 s) ──
  {
    sceneId: "Scene0ColdOpen",
    filename: "scene0-cold-open",
    text: "JACK. The Cross-Chain Execution Kernel.",
    ssml: `<speak>
  <prosody rate="95%" pitch="+1st">
    <emphasis level="strong">JACK.</emphasis>
    <break time="350ms"/>
    The Cross-Chain Execution Kernel.
  </prosody>
</speak>`,
    targetDurationSec: 3,
    speakingRate: 0.95,
    pitch: 1,
  },

  // ── Scene 1 — Layer 1: Secure Key Management (8 s) ──
  {
    sceneId: "Scene1KeyManagement",
    filename: "scene1-key-management",
    text: "Layer one: Secure Key Management. JACK isolates private keys in hardware-backed enclaves, enabling secure signing without exposing secrets. Every transaction is cryptographically verified.",
    ssml: `<speak>
  <prosody rate="100%">
    <emphasis level="moderate">Layer one:</emphasis>
    <break time="200ms"/>
    Secure Key Management.
    <break time="400ms"/>
    JACK isolates private keys in hardware-backed enclaves,
    <break time="150ms"/>
    enabling secure signing without exposing secrets.
    <break time="300ms"/>
    Every transaction is cryptographically verified.
  </prosody>
</speak>`,
    targetDurationSec: 8,
    speakingRate: 1.0,
    pitch: 0,
  },

  // ── Scene 2 — Layer 2: Multi-Chain Connectivity (8 s) ──
  {
    sceneId: "Scene2MultiChain",
    filename: "scene2-multi-chain",
    text: "Layer two: Multi-Chain Connectivity. Route transactions across any blockchain through unified execution paths. One intent, every chain.",
    ssml: `<speak>
  <prosody rate="100%">
    <emphasis level="moderate">Layer two:</emphasis>
    <break time="200ms"/>
    Multi-Chain Connectivity.
    <break time="400ms"/>
    Route transactions across any blockchain
    <break time="100ms"/>
    through unified execution paths.
    <break time="350ms"/>
    <emphasis level="strong">One intent, every chain.</emphasis>
  </prosody>
</speak>`,
    targetDurationSec: 8,
    speakingRate: 1.0,
    pitch: 0,
  },

  // ── Scene 3 — Layer 3: Decentralized Clearing (9 s) ──
  {
    sceneId: "Scene3Clearing",
    filename: "scene3-clearing",
    text: "Layer three: Decentralized Clearing. On-chain settlement with policy enforcement through Uniswap V4 hooks. Verifiable constraints protect every execution.",
    ssml: `<speak>
  <prosody rate="98%">
    <emphasis level="moderate">Layer three:</emphasis>
    <break time="200ms"/>
    Decentralized Clearing.
    <break time="400ms"/>
    On-chain settlement with policy enforcement
    <break time="100ms"/>
    through Uniswap V4 hooks.
    <break time="350ms"/>
    Verifiable constraints protect every execution.
  </prosody>
</speak>`,
    targetDurationSec: 9,
    speakingRate: 0.98,
    pitch: 0,
  },

  // ── Scene 4 — Layer 4: UX & Automation (8 s) ──
  {
    sceneId: "Scene4Automation",
    filename: "scene4-automation",
    text: "Layer four: User Experience and Automation. Natural language intents become cross-chain transactions. AI agents handle complexity while users stay in control.",
    ssml: `<speak>
  <prosody rate="100%">
    <emphasis level="moderate">Layer four:</emphasis>
    <break time="200ms"/>
    User Experience and Automation.
    <break time="400ms"/>
    Natural language intents become cross-chain transactions.
    <break time="300ms"/>
    AI agents handle complexity
    <break time="100ms"/>
    while users <emphasis level="moderate">stay in control.</emphasis>
  </prosody>
</speak>`,
    targetDurationSec: 8,
    speakingRate: 1.0,
    pitch: 0,
  },

  // ── Scene 5 — Outro (6 s) ──
  {
    sceneId: "Scene5Outro",
    filename: "scene5-outro",
    text: "JACK Kernel. Programmable execution for DeFi. Build the future.",
    ssml: `<speak>
  <prosody rate="92%" pitch="+1st">
    <emphasis level="strong">JACK Kernel.</emphasis>
    <break time="400ms"/>
    Programmable execution for DeFi.
    <break time="500ms"/>
    <emphasis level="strong">Build the future.</emphasis>
  </prosody>
</speak>`,
    targetDurationSec: 6,
    speakingRate: 0.92,
    pitch: 1,
  },
];

/**
 * V2 scene durations (frames at 30fps) — extended to accommodate narration.
 * These replace the v1 durations from constants.ts.
 */
export const V2_DURATIONS = {
  COLD_OPEN: 3 * FPS,   //  90 frames →  3 s  (was 2 s)
  SCENE1: 8 * FPS,       // 240 frames →  8 s  (was 6 s)
  SCENE2: 8 * FPS,       // 240 frames →  8 s  (was 6 s)
  SCENE3: 9 * FPS,       // 270 frames →  9 s  (was 7 s)
  SCENE4: 8 * FPS,       // 240 frames →  8 s  (was 6 s)
  OUTRO: 6 * FPS,        // 180 frames →  6 s  (was 5 s)
} as const;

export const V2_TOTAL_DURATION =
  V2_DURATIONS.COLD_OPEN +
  V2_DURATIONS.SCENE1 +
  V2_DURATIONS.SCENE2 +
  V2_DURATIONS.SCENE3 +
  V2_DURATIONS.SCENE4 +
  V2_DURATIONS.OUTRO; // 1260 frames = 42 s

/**
 * Google Cloud TTS voice configuration.
 */
export const TTS_VOICE = {
  name: "en-US-Neural2-D",       // Deep male voice (professional)
  languageCode: "en-US",
  alternateVoice: "en-US-Neural2-J", // Alternative male voice
} as const;

/**
 * Background audio configuration.
 */
export const BACKGROUND_AUDIO = {
  /** Relative path inside public/ */
  ambientFile: "audio/sfx/ambient-dark.mp3",
  /** Volume level (0–1) for background ambient */
  ambientVolume: 0.12,
  /** Volume level (0–1) for narration voice */
  narrationVolume: 0.85,
  /** Fade-in duration in frames for background ambient */
  fadeInFrames: 30,
  /** Fade-out duration in frames for background ambient */
  fadeOutFrames: 45,
} as const;
