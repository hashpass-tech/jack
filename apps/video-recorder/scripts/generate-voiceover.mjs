#!/usr/bin/env node
/**
 * generate-voiceover.mjs — Generate TTS voiceover + word-level subtitle JSON
 *
 * Uses edge-tts (Microsoft Edge Neural TTS) to generate:
 *   1. public/audio/voiceover.mp3         — Full narration audio
 *   2. public/audio/subtitles.json        — Word-level timing [{startFrame, endFrame, text}]
 *
 * Voice: en-US-AndrewNeural (warm, confident male)
 * FPS:   30 (matching Remotion composition)
 *
 * Usage:
 *   node scripts/generate-voiceover.mjs
 *   node scripts/generate-voiceover.mjs --voice en-US-GuyNeural
 */
import { execSync, spawn } from "child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const AUDIO_DIR = join(ROOT, "public", "audio");
const FPS = 30;

// ── Parse args ──
const args = process.argv.slice(2);
const voiceArg = args.find((a) => a.startsWith("--voice"));
const VOICE = voiceArg ? args[args.indexOf(voiceArg) + 1] : "en-US-ChristopherNeural";

// ── Caption segments (must match composition timeline) ──
// Each segment: { id, text, pauseAfterMs }
// We generate individual audio files then concatenate with timed pauses
const SEGMENTS = [
  // ── Intro (0-4s) ──
  {
    id: "intro-1",
    text: "Grrr! What's up everyone — I'm JACK, your DeFi settlement captain. Welcome aboard, matey!",
    pauseAfterMs: 300,
    section: "intro",
  },
  {
    id: "intro-2",
    text: "Today I'm walking you through the JACK Kernel dashboard. Anchors aweigh — let's dive in!",
    pauseAfterMs: 600,
    section: "intro",
  },
  // ── Create Intent (4-29s) ──
  {
    id: "create-1",
    text: "Arrr, first up — the Create Intent tab. This is where every voyage begins!",
    pauseAfterMs: 400,
    section: "create-intent",
  },
  {
    id: "create-2",
    text: "I've got three modes: Quick Intent with natural language, Templates for common strategies, and Advanced for full control.",
    pauseAfterMs: 400,
    section: "create-intent",
  },
  {
    id: "create-3",
    text: "Pick your source chain, destination chain, token, and amount. I handle the rest — routing, bridging, settlement. Grrr, smooth sailing!",
    pauseAfterMs: 400,
    section: "create-intent",
  },
  {
    id: "create-4",
    text: "Check out the sidebar — on-chain policy enforcement, execution pipeline. Everything is transparent and verifiable.",
    pauseAfterMs: 400,
    section: "create-intent",
  },
  {
    id: "create-5",
    text: "Hit 'Resolve Best Route' and I chart the fastest course through the DeFi seas. Then authorize and — boom — intent created!",
    pauseAfterMs: 400,
    section: "create-intent",
  },
  {
    id: "create-6",
    text: "My Kernel Guardrails ensure your constraints are always respected. No surprises.",
    pauseAfterMs: 600,
    section: "create-intent",
  },
  // ── Executions (29-54s) ──
  {
    id: "exec-1",
    text: "Arrr, next up — the Executions tab. This be your mission control, your fleet tracker!",
    pauseAfterMs: 400,
    section: "executions",
  },
  {
    id: "exec-2",
    text: "Every intent shows up here with real-time status — Pending, Routing, Executing, Settling, Settled.",
    pauseAfterMs: 400,
    section: "executions",
  },
  {
    id: "exec-3",
    text: "Color-coded so you know exactly what's happening at a glance. Green means settled, sky blue means in-flight.",
    pauseAfterMs: 400,
    section: "executions",
  },
  {
    id: "exec-4",
    text: "Click into any execution for the full trace — timeline, steps, on-chain proof. Total transparency.",
    pauseAfterMs: 400,
    section: "executions",
  },
  {
    id: "exec-5",
    text: "Agent-based execution means atomic settlement. No partial fills. No stranded treasure. Grrr — that's a captain's promise!",
    pauseAfterMs: 300,
    section: "executions",
  },
  {
    id: "exec-6",
    text: "That's my guarantee. Arrr!",
    pauseAfterMs: 600,
    section: "executions",
  },
  // ── Agent & Costs (54-78s) ──
  {
    id: "costs-1",
    text: "Last but not least — Agent and Costs. A wise pirate always knows where his gold goes!",
    pauseAfterMs: 400,
    section: "agent-costs",
  },
  {
    id: "costs-2",
    text: "Agent fees, gas costs, protocol fees — all broken down per issue. Full budget tracking.",
    pauseAfterMs: 400,
    section: "agent-costs",
  },
  {
    id: "costs-3",
    text: "Green means within budget. Red means over. Simple. You're always in control of spending.",
    pauseAfterMs: 400,
    section: "agent-costs",
  },
  {
    id: "costs-4",
    text: "This is the kind of transparency DeFi needs. No hidden fees, no surprises.",
    pauseAfterMs: 400,
    section: "agent-costs",
  },
  {
    id: "costs-5",
    text: "Every doubloon is accounted for on-chain. Grrr — that's the JACK Kernel way!",
    pauseAfterMs: 600,
    section: "agent-costs",
  },
  // ── Outro (78-90s) ──
  {
    id: "outro-1",
    text: "That's the dashboard. Three tabs. Full control over your cross-chain settlements.",
    pauseAfterMs: 400,
    section: "outro",
  },
  {
    id: "outro-2",
    text: "Head to testnet.jack.lukas.money, connect your wallet, and start navigating the DeFi seas. The treasure awaits!",
    pauseAfterMs: 400,
    section: "outro",
  },
  {
    id: "outro-3",
    text: "I'm JACK. Grrr — set sail, mateys! Let's gooo!",
    pauseAfterMs: 200,
    section: "outro",
  },
];

async function main() {
  mkdirSync(AUDIO_DIR, { recursive: true });
  const tmpDir = join(AUDIO_DIR, "tmp");
  mkdirSync(tmpDir, { recursive: true });

  console.log(`🎙️  Voice: ${VOICE}`);
  console.log(`📁  Output: ${AUDIO_DIR}`);
  console.log(`🎬  Segments: ${SEGMENTS.length}\n`);

  // ── Step 1: Generate individual segment audio ──
  const segmentFiles = [];

  for (let i = 0; i < SEGMENTS.length; i++) {
    const seg = SEGMENTS[i];
    const audioFile = join(tmpDir, `${seg.id}.mp3`);

    console.log(`  [${i + 1}/${SEGMENTS.length}] ${seg.id}: "${seg.text.slice(0, 50)}..."`);

    execSync(
      `edge-tts --voice "${VOICE}" --text "${seg.text.replace(/"/g, '\\"')}" --write-media "${audioFile}"`,
      { stdio: "pipe" }
    );

    const durationStr = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile}"`,
      { encoding: "utf-8" }
    ).trim();

    segmentFiles.push({
      ...seg,
      audioFile,
      duration: parseFloat(durationStr),
    });
  }

  // ── Step 2: Build per-section audio files ──
  // Group segments by section
  const sectionOrder = ["intro", "create-intent", "executions", "agent-costs", "outro"];
  const sectionSegments = {};
  for (const seg of segmentFiles) {
    if (!sectionSegments[seg.section]) sectionSegments[seg.section] = [];
    sectionSegments[seg.section].push(seg);
  }

  const PADDING_BEFORE = 0.33; // seconds before first speech in section
  const sectionAudioInfo = {}; // { durationS, file, subtitles }
  const allSubtitles = [];

  // Compute section durations and build per-section audio
  let cumulativeStartFrame = 0;

  for (const sectionId of sectionOrder) {
    const segs = sectionSegments[sectionId] || [];
    if (segs.length === 0) continue;

    // Build concat list for this section
    const concatPath = join(tmpDir, `concat-${sectionId}.txt`);
    let concatContent = "";

    // Leading silence
    const leadSilence = join(tmpDir, `lead-${sectionId}.mp3`);
    execSync(
      `ffmpeg -y -f lavfi -i anullsrc=r=24000:cl=mono -t ${PADDING_BEFORE} -q:a 9 "${leadSilence}" 2>/dev/null`,
      { stdio: "pipe" }
    );
    concatContent += `file '${leadSilence}'\n`;

    let sectionTimeS = PADDING_BEFORE;
    const sectionSubs = [];

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      concatContent += `file '${seg.audioFile}'\n`;

      const subStartFrame = cumulativeStartFrame + Math.round(sectionTimeS * FPS);
      const subEndFrame = subStartFrame + Math.round(seg.duration * FPS);
      sectionSubs.push({
        startFrame: subStartFrame,
        endFrame: subEndFrame,
        text: seg.text,
        id: seg.id,
      });

      sectionTimeS += seg.duration;

      // Add pause between segments
      if (seg.pauseAfterMs > 0) {
        const pauseS = seg.pauseAfterMs / 1000;
        const silFile = join(tmpDir, `sil-${seg.id}.mp3`);
        execSync(
          `ffmpeg -y -f lavfi -i anullsrc=r=24000:cl=mono -t ${pauseS} -q:a 9 "${silFile}" 2>/dev/null`,
          { stdio: "pipe" }
        );
        concatContent += `file '${silFile}'\n`;
        sectionTimeS += pauseS;
      }
    }

    // Trailing padding (0.5s)
    const trailSilence = join(tmpDir, `trail-${sectionId}.mp3`);
    execSync(
      `ffmpeg -y -f lavfi -i anullsrc=r=24000:cl=mono -t 0.5 -q:a 9 "${trailSilence}" 2>/dev/null`,
      { stdio: "pipe" }
    );
    concatContent += `file '${trailSilence}'\n`;
    sectionTimeS += 0.5;

    writeFileSync(concatPath, concatContent);

    // Concat this section's audio
    const sectionAudioFile = join(AUDIO_DIR, `section-${sectionId}.mp3`);
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${concatPath}" -c copy "${sectionAudioFile}" 2>/dev/null`,
      { stdio: "pipe" }
    );

    // Get actual duration
    const actualDur = parseFloat(
      execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${sectionAudioFile}"`,
        { encoding: "utf-8" }
      ).trim()
    );

    const sectionFrames = Math.ceil(actualDur * FPS);
    sectionAudioInfo[sectionId] = {
      file: `section-${sectionId}.mp3`,
      durationS: actualDur,
      durationFrames: sectionFrames,
      startFrame: cumulativeStartFrame,
      endFrame: cumulativeStartFrame + sectionFrames,
    };

    allSubtitles.push(...sectionSubs);
    console.log(`  ✅ ${sectionId}: ${actualDur.toFixed(1)}s (${sectionFrames} frames)`);

    cumulativeStartFrame += sectionFrames;
  }

  const totalFrames = cumulativeStartFrame;
  const totalDurationS = totalFrames / FPS;
  console.log(`\n📐 Total composition: ${totalDurationS.toFixed(1)}s (${totalFrames} frames @ ${FPS}fps)`);

  // ── Step 3: Write output files ──
  writeFileSync(join(AUDIO_DIR, "subtitles.json"), JSON.stringify(allSubtitles, null, 2));
  console.log(`✅ subtitles.json: ${allSubtitles.length} captions`);

  const audioMap = {
    voice: VOICE,
    fps: FPS,
    totalDurationS,
    totalFrames,
    sections: sectionAudioInfo,
    subtitles: allSubtitles,
  };
  writeFileSync(join(AUDIO_DIR, "audio-map.json"), JSON.stringify(audioMap, null, 2));
  console.log(`✅ audio-map.json`);

  // ── Step 4: Generate composition SECTIONS constant ──
  // This can be pasted into DashboardWalkthroughComposition.tsx
  console.log(`\n📋 SECTIONS for composition:`);
  const sectionMeta = {
    intro: { label: "INTRO", screenshot: "full", zoomTarget: null },
    "create-intent": { label: "CREATE INTENT", screenshot: "createIntent", zoomTarget: { x: 0.35, y: 0.45, scale: 1.2 } },
    executions: { label: "EXECUTIONS", screenshot: "executions", zoomTarget: { x: 0.5, y: 0.5, scale: 1.15 } },
    "agent-costs": { label: "AGENT & COSTS", screenshot: "agentCosts", zoomTarget: { x: 0.5, y: 0.45, scale: 1.2 } },
    outro: { label: "GET STARTED", screenshot: "full", zoomTarget: null },
  };

  const sectionsArray = sectionOrder.map((id) => ({
    id,
    ...sectionMeta[id],
    startFrame: sectionAudioInfo[id].startFrame,
    endFrame: sectionAudioInfo[id].endFrame,
    audioFile: sectionAudioInfo[id].file,
    audioDurationS: sectionAudioInfo[id].durationS,
  }));
  writeFileSync(join(AUDIO_DIR, "sections.json"), JSON.stringify(sectionsArray, null, 2));
  console.log(`✅ sections.json`);

  for (const s of sectionsArray) {
    console.log(`  ${s.id}: frames ${s.startFrame}-${s.endFrame} (${s.audioDurationS.toFixed(1)}s)`);
  }

  // ── Cleanup tmp ──
  console.log(`\n🧹 Cleaning up temp files...`);
  execSync(`rm -rf "${tmpDir}"`);

  console.log(`\n🎉 Done! Files in public/audio/:`);
  for (const id of sectionOrder) {
    console.log(`   section-${id}.mp3`);
  }
  console.log(`   subtitles.json`);
  console.log(`   audio-map.json`);
  console.log(`   sections.json`);
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
