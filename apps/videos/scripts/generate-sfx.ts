#!/usr/bin/env node
/**
 * generate-sfx.ts — Procedurally generate background ambient + SFX audio.
 *
 * Creates:
 *  - ambient-dark.mp3   — 60 s dark ambient drone (loopable)
 *  - whoosh.mp3          — 1 s transition whoosh
 *  - pulse.mp3           — 0.5 s UI pulse
 *
 * Uses pure WAV synthesis (no external deps) → then ffmpeg for MP3 compression.
 * Falls back to .wav if ffmpeg is not available.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const OUTPUT_DIR = path.resolve(__dirname, "..", "public", "audio", "sfx");

// ─── WAV Helpers ───
function createWavBuffer(
  samples: Float32Array,
  sampleRate: number,
  channels: number = 1,
): Buffer {
  const bytesPerSample = 2; // 16-bit PCM
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // PCM samples (16-bit signed)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * bytesPerSample);
  }

  return buffer;
}

/**
 * Convert WAV to MP3 using ffmpeg. Falls back to keeping .wav if ffmpeg missing.
 */
function wavToMp3(wavPath: string, mp3Path: string): string {
  try {
    execSync(`ffmpeg -y -i "${wavPath}" -codec:a libmp3lame -b:a 128k "${mp3Path}" 2>/dev/null`, {
      stdio: "pipe",
    });
    fs.unlinkSync(wavPath);
    return mp3Path;
  } catch {
    console.log("    (ffmpeg not found, keeping .wav)");
    return wavPath;
  }
}

// ─── Synthesizers ───

/**
 * Generate a dark ambient drone (layered sine waves + filtered noise).
 */
function generateAmbientDrone(durationSec: number, sampleRate: number = 44100): Float32Array {
  const numSamples = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(numSamples);

  // Fundamental frequencies for a dark pad (C2 + E2 + G2 + Bb2 — dark minor 7th)
  const freqs = [65.41, 82.41, 98.0, 116.54]; // Hz
  const detuneRange = 0.003; // subtle detuning for width

  // LFO for slow movement
  const lfoFreq = 0.05; // Hz — very slow sweep

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Layered detuned sines
    for (let f = 0; f < freqs.length; f++) {
      const lfo = Math.sin(2 * Math.PI * lfoFreq * t + f * 1.5);
      const detune = 1 + lfo * detuneRange;
      const freq = freqs[f] * detune;

      // Main tone (sine)
      sample += Math.sin(2 * Math.PI * freq * t) * 0.15;
      // Octave harmonic (quieter)
      sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.04;
      // Sub-octave
      sample += Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.06;
    }

    // Filtered noise layer (very subtle)
    const noise = (Math.random() * 2 - 1) * 0.015;
    sample += noise;

    // Slow volume envelope for breathing effect
    const breath = 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.08 * t);
    sample *= breath;

    // Fade in (2 s) and fade out (3 s)
    const fadeIn = Math.min(1, t / 2);
    const fadeOut = Math.min(1, (durationSec - t) / 3);
    sample *= fadeIn * fadeOut;

    // Soft clip
    sample = Math.tanh(sample * 1.5) * 0.6;

    samples[i] = sample;
  }

  return samples;
}

/**
 * Generate a cinematic whoosh transition.
 */
function generateWhoosh(durationSec: number = 1.0, sampleRate: number = 44100): Float32Array {
  const numSamples = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples; // 0–1 normalized

    // Frequency sweep (low → high → low)
    const freq = 200 + 2000 * Math.sin(Math.PI * t);

    // Noise burst shaped by envelope
    const noise = Math.random() * 2 - 1;

    // Sine sweep + noise
    const sweep = Math.sin(2 * Math.PI * freq * t * durationSec) * 0.3;
    const shaped = (noise * 0.5 + sweep) * Math.sin(Math.PI * t); // bell envelope

    // Volume envelope: quick attack, smooth decay
    const envelope = Math.pow(Math.sin(Math.PI * t), 0.7);
    samples[i] = shaped * envelope * 0.7;
  }

  return samples;
}

/**
 * Generate a UI pulse / click sound.
 */
function generatePulse(durationSec: number = 0.4, sampleRate: number = 44100): Float32Array {
  const numSamples = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples;

    // Descending tone (800 → 200 Hz)
    const freq = 800 - 600 * t;
    const tone = Math.sin(2 * Math.PI * freq * t * durationSec) * 0.5;

    // Sharp attack, exponential decay
    const envelope = Math.exp(-t * 8);
    samples[i] = tone * envelope * 0.6;
  }

  return samples;
}

// ─── Main ───
function main() {
  console.log("🔊 JACK Video SFX Generator");
  console.log("─".repeat(50));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const effects = [
    {
      name: "ambient-dark",
      description: "60s dark ambient drone (loopable)",
      generate: () => generateAmbientDrone(60),
    },
    {
      name: "whoosh",
      description: "1s cinematic whoosh transition",
      generate: () => generateWhoosh(1.0),
    },
    {
      name: "pulse",
      description: "0.4s UI pulse click",
      generate: () => generatePulse(0.4),
    },
  ];

  for (const fx of effects) {
    const wavPath = path.join(OUTPUT_DIR, `${fx.name}.wav`);
    const mp3Path = path.join(OUTPUT_DIR, `${fx.name}.mp3`);

    // Skip if MP3 already exists
    if (fs.existsSync(mp3Path) && !process.argv.includes("--force")) {
      console.log(`  ⏭  ${fx.name}.mp3 (exists)`);
      continue;
    }

    process.stdout.write(`  ⏳ ${fx.name} — ${fx.description} ...`);

    const samples = fx.generate();
    const wavBuffer = createWavBuffer(samples, 44100);
    fs.writeFileSync(wavPath, wavBuffer);

    const finalPath = wavToMp3(wavPath, mp3Path);
    const stat = fs.statSync(finalPath);
    console.log(` ✅ (${(stat.size / 1024).toFixed(1)} KB)`);
  }

  console.log();
  console.log("Done! SFX files are in public/audio/sfx/");
}

main();
