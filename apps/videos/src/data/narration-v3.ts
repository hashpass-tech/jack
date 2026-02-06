import { FPS } from "../constants";

/**
 * V3 "Deep Dive" narration — 35 seconds per scene (1050 frames @ 30fps).
 * These are the detailed, educational versions shown in Theatre/Expanded mode.
 * V2 short clips remain for the initial compact modal card.
 */

export interface V3NarrationSegment {
  sceneId: string;
  filename: string;
  text: string;
  targetDurationSec: number;
  speakingRate: number;
  pitch: number;
}

export const V3_NARRATION_SEGMENTS: V3NarrationSegment[] = [
  // ── Scene 1 — Layer 1: Secure Key Management (35 s) ──
  {
    sceneId: "V3Scene1KeyManagement",
    filename: "v3-scene1-key-management",
    text: "Layer one. Secure Key Management. At the foundation of JACK lies a hardware-backed key isolation system. Unlike traditional wallets that expose private keys to the browser or application layer, JACK leverages Trusted Execution Environments, secure enclaves that keep cryptographic material physically isolated from the rest of the system. When a cross-chain transaction is initiated, the signing operation happens entirely within the enclave. The private key never leaves the protected boundary. This means even if the host system is compromised, your keys remain secure. Every signature is cryptographically verified before broadcast, ensuring that only authorized operations ever execute on-chain. This architecture enables JACK to manage keys across multiple chains simultaneously, maintaining a unified security posture regardless of the destination network. Layer one is the trust foundation that everything else builds upon.",
    targetDurationSec: 35,
    speakingRate: 0.97,
    pitch: 0,
  },

  // ── Scene 2 — Layer 2: Multi-Chain Connectivity (35 s) ──
  {
    sceneId: "V3Scene2MultiChain",
    filename: "v3-scene2-multi-chain",
    text: "Layer two. Multi-Chain Connectivity. JACK abstracts away the complexity of interacting with multiple blockchains. When you submit a cross-chain intent, the routing engine decomposes it into an optimal execution path spanning any number of networks. The solver network evaluates available bridges, liquidity pools, and execution venues to find the best combination of cost, speed, and reliability. Transactions are routed through verified pathways. Not just the cheapest bridge, but the most reliable one given current network conditions. The system maintains a real-time topology map of cross-chain infrastructure, continuously updating route weights as conditions change. Whether you're moving assets from Ethereum to Arbitrum, swapping on Base, or providing liquidity on Optimism, the same unified interface handles it all. One intent, every chain. That's the promise of chain-abstracted execution.",
    targetDurationSec: 35,
    speakingRate: 0.97,
    pitch: 0,
  },

  // ── Scene 3 — Layer 3: Decentralized Clearing (35 s) ──
  {
    sceneId: "V3Scene3Clearing",
    filename: "v3-scene3-clearing",
    text: "Layer three. Decentralized Clearing. This is where JACK enforces execution guarantees on-chain. Built on Uniswap V4's hook architecture, the clearing layer deploys custom policy hooks that run before and after every swap. These hooks act as programmable constraints, verifying that trades meet user-specified conditions like maximum slippage, minimum output amounts, or time-locked execution windows. But JACK goes further. Using Fhenix's fully homomorphic encryption, private policies can be enforced without revealing the actual constraint parameters on-chain. This means your trading strategy stays confidential while still being provably enforced. The settlement adapters ensure atomic execution. Either the entire cross-chain operation completes successfully, or it reverts entirely. No partial fills. No stuck transactions. Layer three is the trust-minimized enforcement engine that makes cross-chain DeFi reliable.",
    targetDurationSec: 35,
    speakingRate: 0.97,
    pitch: 0,
  },

  // ── Scene 4 — Layer 4: UX & Automation (35 s) ──
  {
    sceneId: "V3Scene4Automation",
    filename: "v3-scene4-automation",
    text: "Layer four. User Experience and Automation. The top layer of JACK transforms complex cross-chain operations into simple natural language intents. Instead of navigating multiple DEX interfaces, bridging assets manually, and monitoring transactions across chains, you simply state what you want to achieve. AI agents interpret your intent, decompose it into the required steps, and orchestrate the entire execution autonomously. The agent system handles gas optimization, timing decisions, and error recovery, while you maintain full control through the constraint layer below. You set the policies, the agents execute within those boundaries. This creates a powerful separation of concerns. Human judgment for strategy, machine precision for execution. The result is a DeFi experience that feels as simple as a single click, yet leverages the full power of multi-chain infrastructure underneath.",
    targetDurationSec: 35,
    speakingRate: 0.97,
    pitch: 0,
  },
];

/**
 * V3 scene durations (frames at 30fps) — 35 seconds per layer scene.
 */
export const V3_DURATIONS = {
  SCENE1: 35 * FPS, // 1050 frames → 35 s
  SCENE2: 35 * FPS, // 1050 frames → 35 s
  SCENE3: 35 * FPS, // 1050 frames → 35 s
  SCENE4: 35 * FPS, // 1050 frames → 35 s
} as const;

/**
 * V3 extended subtitles — more granular on-screen text for longer scenes.
 */
export const V3_SUBTITLES = {
  SCENE1: [
    "Layer 1: Secure Key Management",
    "Hardware-backed key isolation",
    "Trusted Execution Environments",
    "Keys never leave the enclave",
    "Cryptographic signature verification",
    "Multi-chain key orchestration",
    "The trust foundation",
  ],
  SCENE2: [
    "Layer 2: Multi-Chain Connectivity",
    "Cross-chain intent decomposition",
    "Optimal routing across bridges",
    "Real-time network topology",
    "Verified execution pathways",
    "Chain-abstracted execution",
    "One intent, every chain",
  ],
  SCENE3: [
    "Layer 3: Decentralized Clearing",
    "Uniswap V4 hook architecture",
    "Programmable policy constraints",
    "Homomorphic encryption for privacy",
    "Confidential strategy enforcement",
    "Atomic cross-chain settlement",
    "Trust-minimized execution",
  ],
  SCENE4: [
    "Layer 4: UX & Automation",
    "Natural language intents",
    "AI agent orchestration",
    "Autonomous execution pipeline",
    "Policy-bounded operation",
    "Human strategy, machine precision",
    "One click, every chain",
  ],
} as const;
