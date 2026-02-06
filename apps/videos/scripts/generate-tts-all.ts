#!/usr/bin/env node
/**
 * generate-tts-all.ts — Unified TTS generator for all JACK video versions.
 *
 * Reads from scene-registry.ts — no more per-version TTS scripts.
 *
 * Usage:
 *   tsx scripts/generate-tts-all.ts                    # generate missing
 *   tsx scripts/generate-tts-all.ts --force             # regenerate all
 *   tsx scripts/generate-tts-all.ts --version v3        # only v3 scenes
 *   tsx scripts/generate-tts-all.ts --version v3 --force
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  SCENE_REGISTRY,
  getVersion,
  getVersions,
  getTtsScenes,
} from "./scene-registry";

// ─── Paths ───
const VIDEOS_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(VIDEOS_ROOT, "public", "audio", "narration");

// ─── Parse args ───
function parseArgs() {
  const args = process.argv.slice(2);
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

// ─── Main ───
async function main() {
  console.log("🎙️  JACK Unified TTS Generator");
  console.log("─".repeat(50));

  const flags = parseArgs();
  const force = !!flags.force;

  // Get scenes to process
  let scenes = getTtsScenes();

  if (flags.version) {
    const ver = getVersion(flags.version as string);
    if (!ver) {
      console.error(
        `  ❌ Version "${flags.version}" not found. Available: ${getVersions().join(", ")}`,
      );
      process.exit(1);
    }
    scenes = scenes.filter((s) => s.version === flags.version);
  }

  if (scenes.length === 0) {
    console.log("  ⚠️  No scenes with TTS configuration found.");
    return;
  }

  // Ensure output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Verify edge-tts is available
  try {
    execSync("edge-tts --version", { stdio: "pipe" });
  } catch {
    console.log("  Installing edge-tts...");
    execSync("pip install --user --break-system-packages edge-tts", {
      stdio: "inherit",
    });
  }

  console.log(`  Scenes: ${scenes.length}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log(`  Force:  ${force}`);
  console.log();

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const scene of scenes) {
    const tts = scene.tts!;
    const outPath = path.join(OUTPUT_DIR, `${tts.audioFilename}.mp3`);
    const exists = fs.existsSync(outPath);

    if (exists && !force) {
      console.log(
        `  ⏭  [${scene.version}] ${tts.audioFilename}.mp3 (exists)`,
      );
      skipped++;
      continue;
    }

    process.stdout.write(
      `  ⏳ [${scene.version}] ${tts.audioFilename}.mp3 ...`,
    );

    const ratePercent = Math.round((tts.speakingRate - 1) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
    const pitchHz = tts.pitch >= 0 ? `+${tts.pitch}Hz` : `${tts.pitch}Hz`;

    // Escape single quotes for shell
    const escapedText = tts.text.replace(/'/g, "'\\''");

    const cmd = [
      "edge-tts",
      `--voice "${tts.voice}"`,
      `--rate="${rateStr}"`,
      `--pitch="${pitchHz}"`,
      `--text '${escapedText}'`,
      `--write-media "${outPath}"`,
    ].join(" ");

    try {
      execSync(cmd, { stdio: "pipe", timeout: 60_000 });
      const stat = fs.statSync(outPath);
      console.log(` ✅ (${(stat.size / 1024).toFixed(0)} KB)`);
      success++;
    } catch (err) {
      console.log(" ❌ FAILED");
      failed++;
    }
  }

  console.log(
    `\n📊 Results: ${success} generated, ${skipped} skipped, ${failed} failed`,
  );
}

main();
