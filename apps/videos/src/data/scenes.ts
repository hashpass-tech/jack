import { COLORS } from "../constants";

export interface SceneData {
  id: string;
  layerNumber: number | null;
  title: string;
  subtitles: string[];
  narration: string;
  accentColor: string;
  secondaryColor: string;
}

/**
 * Scene content — subtitle text matches the user's prompt EXACTLY.
 * Do NOT paraphrase, add brand names, or modify the on-screen text.
 */
export const SCENES: SceneData[] = [
  {
    id: "Scene1KeyManagement",
    layerNumber: 1,
    title: "Secure Key Management",
    subtitles: [
      "Layer 1: Secure Key Management",
      "Secure key generation and storage",
      "Protected signing operations",
    ],
    narration:
      "Welcome to Layer 1 of the JACK kernel: Secure Key Management. Here, cryptographic keys are generated and protected using secure execution environments. This layer prevents unauthorized access and protects signing operations.",
    accentColor: COLORS.gold,
    secondaryColor: COLORS.dimGray,
  },
  {
    id: "Scene2MultiChain",
    layerNumber: 2,
    title: "Multi-Chain Connectivity",
    subtitles: [
      "Layer 2: Multi-Chain Connectivity",
      "Cross-chain execution routing",
      "Chain-abstracted execution",
    ],
    narration:
      "Layer 2 enables multi-chain connectivity. JACK connects execution flows across multiple blockchains and routing networks. This layer enables chain-abstracted execution.",
    accentColor: COLORS.blue,
    secondaryColor: COLORS.dimGray,
  },
  {
    id: "Scene3Clearing",
    layerNumber: 3,
    title: "Decentralized Clearing",
    subtitles: [
      "Layer 3: Decentralized Clearing",
      "On-chain settlement enforcement",
      "Verifiable execution policies",
    ],
    narration:
      "Layer 3 provides the decentralized clearing and settlement layer. JACK coordinates execution and enforces settlement policies on-chain. This layer guarantees verifiable and policy-controlled execution.",
    accentColor: COLORS.green,
    secondaryColor: COLORS.dimGray,
  },
  {
    id: "Scene4Automation",
    layerNumber: 4,
    title: "User Experience & Automation",
    subtitles: [
      "Layer 4: User Experience & Automation",
      "Intent-based user interface",
      "Agent-driven execution flows",
    ],
    narration:
      "Layer 4 focuses on user interaction and automation. JACK exposes a simple interface for creating and monitoring execution intents. This layer enables agent-driven execution workflows.",
    accentColor: COLORS.gold,
    secondaryColor: COLORS.blue,
  },
  {
    id: "Scene5Outro",
    layerNumber: null,
    title: "JACK Kernel",
    subtitles: ["JACK Kernel", "Programmable execution for DeFi"],
    narration:
      "Together, these layers form the JACK kernel. A programmable execution layer for decentralized finance.",
    accentColor: COLORS.gold,
    secondaryColor: COLORS.blue,
  },
];
