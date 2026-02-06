#!/usr/bin/env node
/**
 * generate-tts-v3.ts — Generate detailed narration audio for V3 "Deep Dive" scenes.
 *
 * Uses edge-tts (Microsoft Neural voices, free).
 *
 * Usage:
 *   npx tsx scripts/generate-tts-v3.ts          # generate missing
 *   npx tsx scripts/generate-tts-v3.ts --force   # regenerate all
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// ─── V3 narration segments (inline to avoid import resolution issues) ───
interface V3Segment {
  filename: string;
  text: string;
  speakingRate: number;
  pitch: number;
}

const V3_SEGMENTS: V3Segment[] = [
  {
    filename: "v3-scene1-key-management",
    text: "Layer one. Secure Key Management. At the foundation of JACK lies a hardware-backed key isolation system. Unlike traditional wallets that expose private keys to the browser or application layer, JACK leverages Trusted Execution Environments, secure enclaves that keep cryptographic material physically isolated from the rest of the system. When a cross-chain transaction is initiated, the signing operation happens entirely within the enclave. The private key never leaves the protected boundary. This means even if the host system is compromised, your keys remain secure. Every signature is cryptographically verified before broadcast, ensuring that only authorized operations ever execute on-chain. This architecture enables JACK to manage keys across multiple chains simultaneously, maintaining a unified security posture regardless of the destination network. Layer one is the trust foundation that everything else builds upon.",
    speakingRate: 0.97,
    pitch: 0,
  },
  {
    filename: "v3-scene2-multi-chain",
    text: "Layer two. Multi-Chain Connectivity. JACK abstracts away the complexity of interacting with multiple blockchains. When you submit a cross-chain intent, the routing engine decomposes it into an optimal execution path spanning any number of networks. The solver network evaluates available bridges, liquidity pools, and execution venues to find the best combination of cost, speed, and reliability. Transactions are routed through verified pathways. Not just the cheapest bridge, but the most reliable one given current network conditions. The system maintains a real-time topology map of cross-chain infrastructure, continuously updating route weights as conditions change. Whether you're moving assets from Ethereum to Arbitrum, swapping on Base, or providing liquidity on Optimism, the same unified interface handles it all. One intent, every chain. That's the promise of chain-abstracted execution.",
    speakingRate: 0.97,
    pitch: 0,
  },
  {
    filename: "v3-scene3-clearing",
    text: "Layer three. Decentralized Clearing. This is where JACK enforces execution guarantees on-chain. Built on Uniswap V4's hook architecture, the clearing layer deploys custom policy hooks that run before and after every swap. These hooks act as programmable constraints, verifying that trades meet user-specified conditions like maximum slippage, minimum output amounts, or time-locked execution windows. But JACK goes further. Using Fhenix's fully homomorphic encryption, private policies can be enforced without revealing the actual constraint parameters on-chain. This means your trading strategy stays confidential while still being provably enforced. The settlement adapters ensure atomic execution. Either the entire cross-chain operation completes successfully, or it reverts entirely. No partial fills. No stuck transactions. Layer three is the trust-minimized enforcement engine that makes cross-chain DeFi reliable.",
    speakingRate: 0.97,
    pitch: 0,
  },
  {
    filename: "v3-scene4-automation",
    text: "Layer four. User Experience and Automation. The top layer of JACK transforms complex cross-chain operations into simple natural language intents. Instead of navigating multiple DEX interfaces, bridging assets manually, and monitoring transactions across chains, you simply state what you want to achieve. AI agents interpret your intent, decompose it into the required steps, and orchestrate the entire execution autonomously. The agent system handles gas optimization, timing decisions, and error recovery, while you maintain full control through the constraint layer below. You set the policies, the agents execute within those boundaries. This creates a powerful separation of concerns. Human judgment for strategy, machine precision for execution. The result is a DeFi experience that feels as simple as a single click, yet leverages the full power of multi-chain infrastructure underneath.",
    speakingRate: 0.97,
    pitch: 0,
  },
];

// ─── Paths ───
const VIDEOS_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(VIDEOS_ROOT, "public", "audio", "narration");

// ─── Main ───
async function main() {
  console.log("🎙️  JACK V3 Deep Dive TTS Generator");
  console.log("─".repeat(50));

  const args = process.argv.slice(2);
  const force = args.includes("--force");

  // Ensure output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Verify edge-tts is available
  try {
    execSync("edge-tts --version", { stdio: "pipe" });
  } catch {
    console.log("Installing edge-tts...");
    execSync("pip install --user --break-system-packages edge-tts", {
      stdio: "inherit",
    });
  }

  console.log(`Engine: Microsoft Edge TTS (en-US-AndrewMultilingualNeural)`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log();

  let success = 0;
  let failed = 0;

  for (const segment of V3_SEGMENTS) {
    const outPath = path.join(OUTPUT_DIR, `${segment.filename}.mp3`);
    const exists = fs.existsSync(outPath);

    if (exists && !force) {
      console.log(
        `  ⏭  ${segment.filename}.mp3 (exists, use --force to regenerate)`,
      );
      success++;
      continue;
    }

    process.stdout.write(`  ⏳ ${segment.filename}.mp3 ...`);

    const voice = "en-US-AndrewMultilingualNeural";
    const ratePercent = Math.round((segment.speakingRate - 1) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
    const pitchStr =
      segment.pitch >= 0 ? `+${segment.pitch}Hz` : `${segment.pitch}Hz`;

    const cmd = [
      "edge-tts",
      `--voice "${voice}"`,
      `--rate="${rateStr}"`,
      `--pitch="${pitchStr}"`,
      `--text "${segment.text.replace(/"/g, '\\"')}"`,
      `--write-media "${outPath}"`,
    ].join(" ");

    try {
      execSync(cmd, { stdio: "pipe" });
      const stat = fs.statSync(outPath);
      const durationEstimate = (stat.size / 16000).toFixed(1); // rough MP3 estimate
      console.log(
        ` ✅ (${(stat.size / 1024).toFixed(1)} KB, ~${durationEstimate}s)`,
      );
      success++;
    } catch (err: any) {
      console.log(` ✗ ${err.message || err}`);
      failed++;
    }
  }

  console.log();
  console.log(`Done: ${success} generated, ${failed} failed`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
