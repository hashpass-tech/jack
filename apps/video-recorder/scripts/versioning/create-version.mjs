#!/usr/bin/env node
/**
 * create-version.mjs
 *
 * Manually create a version folder for scripts/audio.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import { cpSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const VERSIONS_DIR = path.join(ROOT, "scripts", "versions");
const LATEST_PATH = path.join(VERSIONS_DIR, "latest.json");
const AUDIO_DIR = path.join(ROOT, "public", "audio");

const args = process.argv.slice(2);
const getArg = (key) => {
  const idx = args.findIndex((a) => a === key);
  return idx >= 0 ? args[idx + 1] : null;
};

const version = getArg("--version");
if (!version) {
  console.error("Usage: node scripts/versioning/create-version.mjs --version v1.0.1 [--script path] [--description text] [--dashboard-html path] [--copy-audio y|n]");
  process.exit(1);
}

const scriptPath = getArg("--script");
const description = getArg("--description") || "Manual version";
const dashboardHtmlPath = getArg("--dashboard-html");
const copyAudio = (getArg("--copy-audio") || "y").toLowerCase() === "y";

const versionDir = path.join(VERSIONS_DIR, version);
if (existsSync(versionDir)) {
  console.error(`Version already exists: ${version}`);
  process.exit(1);
}
mkdirSync(versionDir, { recursive: true });

// Script
const scriptFile = "script.txt";
if (scriptPath && existsSync(scriptPath)) {
  copyFileSync(scriptPath, path.join(versionDir, scriptFile));
} else {
  writeFileSync(path.join(versionDir, scriptFile), "", "utf-8");
}

// Dashboard HTML
let htmlHash = "";
let htmlFile = "";
if (dashboardHtmlPath && existsSync(dashboardHtmlPath)) {
  const html = readFileSync(dashboardHtmlPath, "utf-8");
  htmlHash = createHash("sha256").update(html).digest("hex");
  htmlFile = "dashboard.html";
  writeFileSync(path.join(versionDir, htmlFile), html, "utf-8");
}

// Audio
let audioDir = "";
if (copyAudio && existsSync(AUDIO_DIR)) {
  audioDir = "audio";
  cpSync(AUDIO_DIR, path.join(versionDir, audioDir), { recursive: true });
}

// Renders dir
mkdirSync(path.join(versionDir, "renders"), { recursive: true });

const meta = {
  version,
  createdAt: new Date().toISOString().slice(0, 10),
  description,
  scriptFile,
  audioDir,
  renderDir: "renders",
  dashboard: {
    url: "",
    htmlHash,
    htmlFile,
  },
};

writeFileSync(path.join(versionDir, "meta.json"), JSON.stringify(meta, null, 2));
writeFileSync(LATEST_PATH, JSON.stringify({ version, path: version }, null, 2));

console.log(`✅ Version created: ${version}`);
console.log(`   Path: ${path.relative(ROOT, versionDir)}`);
