#!/usr/bin/env node
/**
 * scene-registry.ts — Single source of truth for all JACK video scene versions.
 *
 * Every scene version (v1, v2, v3, v4 …) is registered here with its
 * Remotion composition ID, output filename, codec, and metadata.
 *
 * Other scripts (render.ts, generate-tts-all.ts, deploy-landing.ts)
 * import this registry instead of hard-coding paths.
 *
 * ┌───────────┬──────────────────────────────────────────┐
 * │  Adding a │  1. Add entry to SCENE_REGISTRY below    │
 * │  new ver  │  2. Register <Composition> in Root.tsx   │
 * │           │  3. Run: pnpm render --version vN --all  │
 * └───────────┴──────────────────────────────────────────┘
 */

// ─── Types ───

export type Codec = "h264" | "vp8" | "h265" | "prores";
export type Container = "mp4" | "webm" | "mov";

export interface SceneEntry {
  /** Remotion <Composition> id — must match Root.tsx exactly */
  compositionId: string;
  /** Output filename (without extension) */
  outputName: string;
  /** Codec to encode with */
  codec: Codec;
  /** Container / file extension */
  container: Container;
  /** Duration in frames (at 30 fps) */
  durationFrames: number;
  /** Human-readable label */
  label: string;
  /** Extra CLI flags for remotion render (e.g. --gl=angle) */
  extraFlags?: string[];
  /** If this scene has narration, the TTS config */
  tts?: {
    /** Output filename for the audio (without extension) */
    audioFilename: string;
    /** Plain-text narration */
    text: string;
    /** edge-tts voice name */
    voice: string;
    /** Speaking rate multiplier (1.0 = normal) */
    speakingRate: number;
    /** Pitch offset (0 = normal) */
    pitch: number;
  };
  /** Whether to copy to landing public/videos/ on deploy */
  deployToLanding: boolean;
  /** Override filename when deploying to landing (without extension). If omitted, uses outputName. */
  landingFilename?: string;
}

export interface VersionConfig {
  /** Version tag (v1, v2, v3, …) */
  version: string;
  /** Human-readable description */
  description: string;
  /** All scenes in this version */
  scenes: SceneEntry[];
}

// ─── Constants ───

const FPS = 30;
const DEFAULT_VOICE = "en-US-AndrewMultilingualNeural";

// ─── Registry ───

export const SCENE_REGISTRY: VersionConfig[] = [
  // ══════════════════════════════════════════════════════════════
  //  V1 — Original short scenes (no narration, MP4)
  // ══════════════════════════════════════════════════════════════
  {
    version: "v1",
    description: "Original silent 3D scenes (2-7s each)",
    scenes: [
      {
        compositionId: "Scene0ColdOpen",
        outputName: "scene0-cold-open",
        codec: "vp8",
        container: "webm",
        durationFrames: 60,
        label: "Cold Open",
        deployToLanding: false,
      },
      {
        compositionId: "Scene1KeyManagement",
        outputName: "scene1-key-management",
        codec: "vp8",
        container: "webm",
        durationFrames: 180,
        label: "Key Management",
        deployToLanding: false,
      },
      {
        compositionId: "Scene2MultiChain",
        outputName: "scene2-multi-chain",
        codec: "vp8",
        container: "webm",
        durationFrames: 180,
        label: "Multi-Chain",
        deployToLanding: false,
      },
      {
        compositionId: "Scene3Clearing",
        outputName: "scene3-clearing",
        codec: "vp8",
        container: "webm",
        durationFrames: 210,
        label: "Clearing",
        deployToLanding: false,
      },
      {
        compositionId: "Scene4Automation",
        outputName: "scene4-automation",
        codec: "vp8",
        container: "webm",
        durationFrames: 180,
        label: "Automation",
        deployToLanding: false,
      },
      {
        compositionId: "Scene5Outro",
        outputName: "scene5-outro",
        codec: "vp8",
        container: "webm",
        durationFrames: 150,
        label: "Outro",
        deployToLanding: false,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  //  V2 — Narrated compact clips (8-9s, WebM for landing modal)
  // ══════════════════════════════════════════════════════════════
  {
    version: "v2",
    description: "Narrated compact clips with SFX (3-9s each, WebM)",
    scenes: [
      {
        compositionId: "V2Scene0",
        outputName: "v2-scene0-cold-open",
        codec: "vp8",
        container: "webm",
        durationFrames: 3 * FPS,
        label: "Cold Open",
        deployToLanding: false,
        tts: {
          audioFilename: "scene0-cold-open",
          text: "JACK. The Cross-Chain Execution Kernel.",
          voice: DEFAULT_VOICE,
          speakingRate: 0.95,
          pitch: 1,
        },
      },
      {
        compositionId: "V2Scene1",
        outputName: "v2-scene1-key-management",
        codec: "vp8",
        container: "webm",
        durationFrames: 8 * FPS,
        label: "Key Management",
        deployToLanding: true,
        landingFilename: "scene1-key-management",
        tts: {
          audioFilename: "scene1-key-management",
          text: "Layer one: Secure Key Management. JACK isolates private keys in hardware-backed enclaves, enabling secure signing without exposing secrets. Every transaction is cryptographically verified.",
          voice: DEFAULT_VOICE,
          speakingRate: 1.0,
          pitch: 0,
        },
      },
      {
        compositionId: "V2Scene2",
        outputName: "v2-scene2-multi-chain",
        codec: "vp8",
        container: "webm",
        durationFrames: 8 * FPS,
        label: "Multi-Chain",
        deployToLanding: true,
        landingFilename: "scene2-multi-chain",
        tts: {
          audioFilename: "scene2-multi-chain",
          text: "Layer two: Multi-Chain Connectivity. Route transactions across any blockchain through unified execution paths. One intent, every chain.",
          voice: DEFAULT_VOICE,
          speakingRate: 1.0,
          pitch: 0,
        },
      },
      {
        compositionId: "V2Scene3",
        outputName: "v2-scene3-clearing",
        codec: "vp8",
        container: "webm",
        durationFrames: 9 * FPS,
        label: "Clearing",
        deployToLanding: true,
        landingFilename: "scene3-clearing",
        tts: {
          audioFilename: "scene3-clearing",
          text: "Layer three: Decentralized Clearing. On-chain settlement with policy enforcement through Uniswap V4 hooks. Verifiable constraints protect every execution.",
          voice: DEFAULT_VOICE,
          speakingRate: 0.98,
          pitch: 0,
        },
      },
      {
        compositionId: "V2Scene4",
        outputName: "v2-scene4-automation",
        codec: "vp8",
        container: "webm",
        durationFrames: 8 * FPS,
        label: "Automation",
        deployToLanding: true,
        landingFilename: "scene4-automation",
        tts: {
          audioFilename: "scene4-automation",
          text: "Layer four: User Experience and Automation. Natural language intents become cross-chain transactions. AI agents handle complexity while users stay in control.",
          voice: DEFAULT_VOICE,
          speakingRate: 1.0,
          pitch: 0,
        },
      },
      {
        compositionId: "V2Scene5",
        outputName: "v2-scene5-outro",
        codec: "vp8",
        container: "webm",
        durationFrames: 6 * FPS,
        label: "Outro",
        deployToLanding: false,
        tts: {
          audioFilename: "scene5-outro",
          text: "JACK Kernel. Programmable execution for DeFi. Build the future.",
          voice: DEFAULT_VOICE,
          speakingRate: 0.92,
          pitch: 1,
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  //  V3 — "Deep Dive" detailed explainers (35s, MP4 for Theatre)
  // ══════════════════════════════════════════════════════════════
  {
    version: "v3",
    description: "Deep Dive detailed explainers (35s each, MP4, H.264)",
    scenes: [
      {
        compositionId: "V3Scene1",
        outputName: "v3-scene1-key-management",
        codec: "h264",
        container: "mp4",
        durationFrames: 35 * FPS,
        label: "Key Management — Deep Dive",
        extraFlags: ["--gl=angle"],
        deployToLanding: true,
        tts: {
          audioFilename: "v3-scene1-key-management",
          text: "Layer one. Secure Key Management. At the foundation of JACK lies a hardware-backed key isolation system. Unlike traditional wallets that expose private keys to the browser or application layer, JACK leverages Trusted Execution Environments, secure enclaves that keep cryptographic material physically isolated from the rest of the system. When a cross-chain transaction is initiated, the signing operation happens entirely within the enclave. The private key never leaves the protected boundary. This means even if the host system is compromised, your keys remain secure. Every signature is cryptographically verified before broadcast, ensuring that only authorized operations ever execute on-chain. This architecture enables JACK to manage keys across multiple chains simultaneously, maintaining a unified security posture regardless of the destination network. Layer one is the trust foundation that everything else builds upon.",
          voice: DEFAULT_VOICE,
          speakingRate: 0.97,
          pitch: 0,
        },
      },
      {
        compositionId: "V3Scene2",
        outputName: "v3-scene2-multi-chain",
        codec: "h264",
        container: "mp4",
        durationFrames: 35 * FPS,
        label: "Multi-Chain — Deep Dive",
        extraFlags: ["--gl=angle"],
        deployToLanding: true,
        tts: {
          audioFilename: "v3-scene2-multi-chain",
          text: "Layer two. Multi-Chain Connectivity. JACK abstracts away the complexity of interacting with multiple blockchains. When you submit a cross-chain intent, the routing engine decomposes it into an optimal execution path spanning any number of networks. The solver network evaluates available bridges, liquidity pools, and execution venues to find the best combination of cost, speed, and reliability. Transactions are routed through verified pathways. Not just the cheapest bridge, but the most reliable one given current network conditions. The system maintains a real-time topology map of cross-chain infrastructure, continuously updating route weights as conditions change. Whether you're moving assets from Ethereum to Arbitrum, swapping on Base, or providing liquidity on Optimism, the same unified interface handles it all. One intent, every chain. That's the promise of chain-abstracted execution.",
          voice: DEFAULT_VOICE,
          speakingRate: 0.97,
          pitch: 0,
        },
      },
      {
        compositionId: "V3Scene3",
        outputName: "v3-scene3-clearing",
        codec: "h264",
        container: "mp4",
        durationFrames: 35 * FPS,
        label: "Clearing — Deep Dive",
        extraFlags: ["--gl=angle"],
        deployToLanding: true,
        tts: {
          audioFilename: "v3-scene3-clearing",
          text: "Layer three. Decentralized Clearing. This is where JACK enforces execution guarantees on-chain. Built on Uniswap V4's hook architecture, the clearing layer deploys custom policy hooks that run before and after every swap. These hooks act as programmable constraints, verifying that trades meet user-specified conditions like maximum slippage, minimum output amounts, or time-locked execution windows. But JACK goes further. Using Fhenix's fully homomorphic encryption, private policies can be enforced without revealing the actual constraint parameters on-chain. This means your trading strategy stays confidential while still being provably enforced. The settlement adapters ensure atomic execution. Either the entire cross-chain operation completes successfully, or it reverts entirely. No partial fills. No stuck transactions. Layer three is the trust-minimized enforcement engine that makes cross-chain DeFi reliable.",
          voice: DEFAULT_VOICE,
          speakingRate: 0.97,
          pitch: 0,
        },
      },
      {
        compositionId: "V3Scene4",
        outputName: "v3-scene4-automation",
        codec: "h264",
        container: "mp4",
        durationFrames: 35 * FPS,
        label: "Automation — Deep Dive",
        extraFlags: ["--gl=angle"],
        deployToLanding: true,
        tts: {
          audioFilename: "v3-scene4-automation",
          text: "Layer four. User Experience and Automation. The top layer of JACK transforms complex cross-chain operations into simple natural language intents. Instead of navigating multiple DEX interfaces, bridging assets manually, and monitoring transactions across chains, you simply state what you want to achieve. AI agents interpret your intent, decompose it into the required steps, and orchestrate the entire execution autonomously. The agent system handles gas optimization, timing decisions, and error recovery, while you maintain full control through the constraint layer below. You set the policies, the agents execute within those boundaries. This creates a powerful separation of concerns. Human judgment for strategy, machine precision for execution. The result is a DeFi experience that feels as simple as a single click, yet leverages the full power of multi-chain infrastructure underneath.",
          voice: DEFAULT_VOICE,
          speakingRate: 0.97,
          pitch: 0,
        },
      },
    ],
  },
];

// ─── Helper exports ───

/** Get all registered versions */
export const getVersions = () => SCENE_REGISTRY.map((v) => v.version);

/** Get a specific version config */
export const getVersion = (version: string): VersionConfig | undefined =>
  SCENE_REGISTRY.find((v) => v.version === version);

/** Get all scenes across all versions */
export const getAllScenes = (): Array<SceneEntry & { version: string }> =>
  SCENE_REGISTRY.flatMap((v) =>
    v.scenes.map((s) => ({ ...s, version: v.version })),
  );

/** Get scenes marked for landing deployment */
export const getLandingScenes = (): Array<SceneEntry & { version: string }> =>
  getAllScenes().filter((s) => s.deployToLanding);

/** Get scenes that have TTS configured */
export const getTtsScenes = (): Array<SceneEntry & { version: string }> =>
  getAllScenes().filter((s) => s.tts);

/** Build the output file path for a scene */
export const getOutputPath = (scene: SceneEntry): string =>
  `out/${scene.outputName}.${scene.container}`;

/** Get the filename used when deploying to landing (with extension) */
export const getLandingFilename = (scene: SceneEntry): string => {
  const base = scene.landingFilename ?? scene.outputName;
  return `${base}.${scene.container}`;
};

/** Build the remotion render command for a scene */
export const getRenderCommand = (scene: SceneEntry): string => {
  const codecFlag =
    scene.codec === "h264" ? "" : `--codec=${scene.codec}`;
  const extra = scene.extraFlags?.join(" ") ?? "";
  const output = getOutputPath(scene);
  return [
    "remotion render",
    scene.compositionId,
    output,
    codecFlag,
    extra,
  ]
    .filter(Boolean)
    .join(" ");
};

// ─── CLI: list / info when run directly ───

if (require.main === module) {
  const arg = process.argv[2];

  if (arg === "list" || !arg) {
    console.log("\n🎬  JACK Video Scene Registry\n");
    for (const ver of SCENE_REGISTRY) {
      console.log(`  ${ver.version}  ${ver.description}`);
      for (const scene of ver.scenes) {
        const file = `${scene.outputName}.${scene.container}`;
        const dur = `${(scene.durationFrames / FPS).toFixed(0)}s`;
        const tts = scene.tts ? "🎙️" : "  ";
        const deploy = scene.deployToLanding ? "🚀" : "  ";
        console.log(
          `    ${tts} ${deploy}  ${scene.compositionId.padEnd(22)} → ${file.padEnd(35)} ${dur}  ${scene.label}`,
        );
      }
      console.log();
    }
    console.log("  Legend: 🎙️ = has TTS narration, 🚀 = deploys to landing\n");
  } else if (arg === "commands") {
    console.log("\n# Render commands for all scenes:\n");
    for (const ver of SCENE_REGISTRY) {
      console.log(`# ── ${ver.version}: ${ver.description} ──`);
      for (const scene of ver.scenes) {
        console.log(getRenderCommand(scene));
      }
      console.log();
    }
  } else {
    console.log("Usage: tsx scripts/scene-registry.ts [list|commands]");
  }
}
