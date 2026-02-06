#!/usr/bin/env node
/**
 * generate-tts.ts — Pre-generate narration audio files for JACK video scenes.
 *
 * Supports two engines:
 *   1. Google Cloud TTS (requires GOOGLE_APPLICATION_CREDENTIALS env)
 *   2. edge-tts fallback (requires Python + `pip install edge-tts`)
 *
 * Usage:
 *   npx tsx scripts/generate-tts.ts              # auto-detect engine
 *   npx tsx scripts/generate-tts.ts --engine gcp  # force Google Cloud
 *   npx tsx scripts/generate-tts.ts --engine edge # force edge-tts
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// ─── Inline narration data (avoid import resolution issues in script context) ──
interface NarrationSegment {
  sceneId: string;
  filename: string;
  text: string;
  ssml: string;
  targetDurationSec: number;
  speakingRate: number;
  pitch: number;
}

const SEGMENTS: NarrationSegment[] = [
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

// ─── Paths ───
const VIDEOS_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(VIDEOS_ROOT, "public", "audio", "narration");

// ─── Engine detection ───
type Engine = "gcp" | "edge";

function detectEngine(): Engine {
  // Check for Google Cloud credentials
  if (
    process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  ) {
    try {
      execSync("node -e \"require('@google-cloud/text-to-speech')\"", {
        stdio: "pipe",
        cwd: VIDEOS_ROOT,
      });
      return "gcp";
    } catch {
      // package not installed
    }
  }

  // Check for edge-tts Python package
  try {
    execSync("edge-tts --version", { stdio: "pipe" });
    return "edge";
  } catch {
    // not installed
  }

  // Default to edge — will install if needed
  return "edge";
}

// ─── Google Cloud TTS Engine ───
async function generateWithGCP(segment: NarrationSegment, outPath: string) {
  // Dynamic import to avoid requiring the package when using edge-tts
  // @ts-expect-error — optional dependency, only available when GCP engine is used
  const textToSpeech = await import("@google-cloud/text-to-speech");
  const client = new textToSpeech.default.TextToSpeechClient();

  const [response] = await client.synthesizeSpeech({
    input: { ssml: segment.ssml },
    voice: {
      name: "en-US-Neural2-D",
      languageCode: "en-US",
    },
    audioConfig: {
      audioEncoding: "MP3" as const,
      effectsProfileId: ["large-home-entertainment-class-device"],
      speakingRate: segment.speakingRate,
      pitch: segment.pitch,
      sampleRateHertz: 24000,
    },
  });

  if (response.audioContent) {
    fs.writeFileSync(outPath, response.audioContent as Buffer);
    return true;
  }
  return false;
}

// ─── Edge-TTS Engine (Microsoft Neural voices, free) ───
async function generateWithEdge(segment: NarrationSegment, outPath: string) {
  // Use en-US-GuyNeural (deep male) or en-US-AndrewNeural (professional)
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
    return true;
  } catch (err) {
    console.error(`  ✗ edge-tts failed for ${segment.filename}:`, err);
    return false;
  }
}

// ─── Main ───
async function main() {
  console.log("🎙️  JACK Video TTS Generator");
  console.log("─".repeat(50));

  // Parse args
  const args = process.argv.slice(2);
  const engineFlag = args.find((a) => a.startsWith("--engine="))?.split("=")[1];
  let engine: Engine;

  if (engineFlag === "gcp" || engineFlag === "edge") {
    engine = engineFlag;
  } else {
    engine = detectEngine();
  }

  console.log(`Engine: ${engine === "gcp" ? "Google Cloud TTS" : "Microsoft Edge TTS"}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log();

  // Ensure output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Ensure edge-tts is available if using edge engine
  if (engine === "edge") {
    try {
      execSync("edge-tts --version", { stdio: "pipe" });
    } catch {
      console.log("Installing edge-tts...");
      execSync("pip install edge-tts", { stdio: "inherit" });
    }
  }

  let success = 0;
  let failed = 0;

  for (const segment of SEGMENTS) {
    const outPath = path.join(OUTPUT_DIR, `${segment.filename}.mp3`);
    const exists = fs.existsSync(outPath);

    if (exists && !args.includes("--force")) {
      console.log(`  ⏭  ${segment.filename}.mp3 (exists, use --force to regenerate)`);
      success++;
      continue;
    }

    process.stdout.write(`  ⏳ ${segment.filename}.mp3 ...`);

    try {
      const ok =
        engine === "gcp"
          ? await generateWithGCP(segment, outPath)
          : await generateWithEdge(segment, outPath);

      if (ok) {
        const stat = fs.statSync(outPath);
        console.log(` ✅ (${(stat.size / 1024).toFixed(1)} KB)`);
        success++;
      } else {
        console.log(" ✗ (empty response)");
        failed++;
      }
    } catch (err: any) {
      console.log(` ✗ ${err.message || err}`);
      failed++;
    }
  }

  console.log();
  console.log(`Done: ${success} generated, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
