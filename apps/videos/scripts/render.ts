#!/usr/bin/env node
/**
 * render.ts — Unified render CLI for all JACK video scenes.
 *
 * Replaces 30+ individual package.json render scripts with one entry point
 * that reads from scene-registry.ts.
 *
 * Usage:
 *   tsx scripts/render.ts --list                        # list all scenes
 *   tsx scripts/render.ts --version v3 --all            # render all v3 scenes
 *   tsx scripts/render.ts --version v3 --scene 1        # render v3 scene 1
 *   tsx scripts/render.ts --version v2 --scene 0,1,2    # render v2 scenes 0,1,2
 *   tsx scripts/render.ts --composition V3Scene1        # render by composition id
 *   tsx scripts/render.ts --landing                     # render all landing-deployed scenes
 *   tsx scripts/render.ts --deploy                      # copy rendered → landing/public/videos/
 *   tsx scripts/render.ts --version v3 --all --deploy   # render + deploy in one go
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  SCENE_REGISTRY,
  SceneEntry,
  VersionConfig,
  getVersion,
  getVersions,
  getAllScenes,
  getLandingScenes,
  getLandingFilename,
  getRenderCommand,
  getOutputPath,
} from "./scene-registry";

// ─── Paths ───
const VIDEOS_ROOT = path.resolve(__dirname, "..");
const LANDING_VIDEOS = path.resolve(
  __dirname,
  "..",
  "..",
  "landing",
  "public",
  "videos",
);

// ─── Parse CLI args ───
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

// ─── Render a single scene ───
function renderScene(scene: SceneEntry, version: string): boolean {
  const cmd = getRenderCommand(scene);
  const outFile = getOutputPath(scene);
  const dur = (scene.durationFrames / 30).toFixed(0);

  console.log(
    `\n  🎬 [${version}] ${scene.label} (${dur}s) → ${outFile}`,
  );
  console.log(`     $ ${cmd}\n`);

  try {
    execSync(cmd, {
      cwd: VIDEOS_ROOT,
      stdio: "inherit",
      env: { ...process.env },
    });
    const stat = fs.statSync(path.join(VIDEOS_ROOT, outFile));
    console.log(
      `  ✅ ${outFile} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`,
    );
    return true;
  } catch (err) {
    console.error(`  ❌ Failed: ${outFile}`);
    return false;
  }
}

// ─── Deploy rendered videos to landing ───
function deployToLanding(scenes?: Array<SceneEntry & { version: string }>) {
  const targets = scenes ?? getLandingScenes();

  if (targets.length === 0) {
    console.log("  ⚠️  No scenes marked for landing deployment.");
    return;
  }

  fs.mkdirSync(LANDING_VIDEOS, { recursive: true });

  console.log(`\n  🚀 Deploying ${targets.length} videos → landing/public/videos/\n`);

  let copied = 0;
  for (const scene of targets) {
    const src = path.join(VIDEOS_ROOT, getOutputPath(scene));
    const landingFile = getLandingFilename(scene);
    const dest = path.join(LANDING_VIDEOS, landingFile);

    if (!fs.existsSync(src)) {
      console.log(`  ⏭  ${landingFile} (not rendered, skipping)`);
      continue;
    }

    fs.copyFileSync(src, dest);
    const size = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
    const alias = scene.landingFilename ? ` (from ${scene.outputName})` : "";
    console.log(
      `  ✅ ${landingFile}${alias} (${size} MB)`,
    );
    copied++;
  }

  console.log(`\n  📦 Deployed ${copied}/${targets.length} videos.`);
}

// ─── List all scenes ───
function listScenes() {
  console.log("\n🎬  JACK Video Scene Registry\n");
  console.log(
    `  ${"Version".padEnd(8)} ${"#".padEnd(3)} ${"Composition".padEnd(24)} ${"Output".padEnd(38)} ${"Dur".padEnd(5)} ${"Codec".padEnd(6)} TTS  Deploy`,
  );
  console.log("  " + "─".repeat(110));

  for (const ver of SCENE_REGISTRY) {
    for (let i = 0; i < ver.scenes.length; i++) {
      const s = ver.scenes[i];
      const file = `${s.outputName}.${s.container}`;
      const dur = `${(s.durationFrames / 30).toFixed(0)}s`;
      const tts = s.tts ? "🎙️ " : "   ";
      const deploy = s.deployToLanding ? "🚀" : "  ";
      console.log(
        `  ${ver.version.padEnd(8)} ${String(i).padEnd(3)} ${s.compositionId.padEnd(24)} ${file.padEnd(38)} ${dur.padEnd(5)} ${s.codec.padEnd(6)} ${tts}  ${deploy}   ${s.label}`,
      );
    }
  }

  console.log(
    `\n  Total: ${getAllScenes().length} scenes across ${getVersions().length} versions`,
  );
  console.log("  Legend: 🎙️ = has TTS narration, 🚀 = deploys to landing\n");
}

// ─── Main ───
function main() {
  const flags = parseArgs();

  // ── List mode ──
  if (flags.list) {
    listScenes();
    return;
  }

  // ── Deploy-only mode ──
  if (flags.deploy && !flags.version && !flags.composition && !flags.landing) {
    deployToLanding();
    return;
  }

  // ── Determine scenes to render ──
  let scenesToRender: Array<{ scene: SceneEntry; version: string }> = [];

  if (flags.composition) {
    // Render by composition ID
    const compId = flags.composition as string;
    const match = getAllScenes().find(
      (s) => s.compositionId.toLowerCase() === compId.toLowerCase(),
    );
    if (!match) {
      console.error(`  ❌ Composition "${compId}" not found in registry.`);
      console.error(`     Run with --list to see available compositions.`);
      process.exit(1);
    }
    scenesToRender.push({ scene: match, version: match.version });
  } else if (flags.landing) {
    // Render all landing-deployed scenes
    scenesToRender = getLandingScenes().map((s) => ({
      scene: s,
      version: s.version,
    }));
  } else if (flags.version) {
    const ver = getVersion(flags.version as string);
    if (!ver) {
      console.error(
        `  ❌ Version "${flags.version}" not found. Available: ${getVersions().join(", ")}`,
      );
      process.exit(1);
    }

    if (flags.all) {
      scenesToRender = ver.scenes.map((s) => ({
        scene: s,
        version: ver.version,
      }));
    } else if (flags.scene !== undefined) {
      const indices = String(flags.scene)
        .split(",")
        .map((n) => parseInt(n.trim(), 10));
      for (const idx of indices) {
        if (idx < 0 || idx >= ver.scenes.length) {
          console.error(
            `  ❌ Scene index ${idx} out of range for ${ver.version} (0-${ver.scenes.length - 1})`,
          );
          process.exit(1);
        }
        scenesToRender.push({
          scene: ver.scenes[idx],
          version: ver.version,
        });
      }
    } else {
      console.error(
        `  ❌ Specify --all or --scene <index> with --version.`,
      );
      process.exit(1);
    }
  } else {
    console.log("JACK Video Render CLI\n");
    console.log("Usage:");
    console.log("  tsx scripts/render.ts --list                        List all scenes");
    console.log("  tsx scripts/render.ts --version v3 --all            Render all v3");
    console.log("  tsx scripts/render.ts --version v3 --scene 1        Render v3 scene 1");
    console.log("  tsx scripts/render.ts --version v2 --scene 0,1,2    Render specific scenes");
    console.log("  tsx scripts/render.ts --composition V3Scene1        Render by composition");
    console.log("  tsx scripts/render.ts --landing                     Render all landing scenes");
    console.log("  tsx scripts/render.ts --deploy                      Copy to landing/public/videos/");
    console.log("  tsx scripts/render.ts --version v3 --all --deploy   Render + deploy");
    return;
  }

  if (scenesToRender.length === 0) {
    console.log("  ⚠️  No scenes to render.");
    return;
  }

  // ── Render ──
  console.log(
    `\n🎬  Rendering ${scenesToRender.length} scene(s)...\n`,
  );

  let success = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const { scene, version } of scenesToRender) {
    if (renderScene(scene, version)) {
      success++;
    } else {
      failed++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n📊 Results: ${success} succeeded, ${failed} failed (${elapsed}s total)`,
  );

  // ── Auto-deploy if requested ──
  if (flags.deploy) {
    const rendered = scenesToRender
      .filter((s) => s.scene.deployToLanding)
      .map((s) => ({ ...s.scene, version: s.version }));
    deployToLanding(rendered);
  }
}

main();
