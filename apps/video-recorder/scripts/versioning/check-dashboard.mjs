#!/usr/bin/env node
/**
 * check-dashboard.mjs
 *
 * Detects dashboard changes by hashing HTML snapshot (Puppeteer).
 * If changes are detected, prompts to create a new version folder.
 */
import puppeteer from "puppeteer";
import { createHash } from "crypto";
import { mkdirSync, existsSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import { cpSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const VERSIONS_DIR = path.join(ROOT, "scripts", "versions");
const LATEST_PATH = path.join(VERSIONS_DIR, "latest.json");
const AUDIO_DIR = path.join(ROOT, "public", "audio");

const urlArg = process.argv.find((a) => a.startsWith("--url="));
const BASE_URL = urlArg
  ? urlArg.split("=")[1]
  : process.argv.includes("--testnet")
    ? "https://testnet.jack.lukas.money/dashboard"
    : "http://localhost:3001";

const VIEWPORT = { width: 1920, height: 1080, deviceScaleFactor: 2 };

function loadLatest() {
  if (!existsSync(LATEST_PATH)) return null;
  return JSON.parse(readFileSync(LATEST_PATH, "utf-8"));
}

function getLatestMeta(latest) {
  if (!latest) return null;
  const metaPath = path.join(VERSIONS_DIR, latest.path, "meta.json");
  if (!existsSync(metaPath)) return null;
  return JSON.parse(readFileSync(metaPath, "utf-8"));
}

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function nextVersion(latestVersion) {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(latestVersion || "");
  if (!match) return "v1.0.0";
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  const patch = parseInt(match[3], 10) + 1;
  return `v${major}.${minor}.${patch}`;
}

function ask(question, defaultValue = "") {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question}${defaultValue ? ` [${defaultValue}]` : ""}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  mkdirSync(VERSIONS_DIR, { recursive: true });

  const latest = loadLatest();
  const latestMeta = getLatestMeta(latest);
  const latestHash = latestMeta?.dashboard?.htmlHash || "";

  console.log(`🔎 Checking dashboard: ${BASE_URL}`);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 30000 });
  await page.waitForTimeout(1500);

  const html = await page.content();
  const htmlHash = sha256(html);
  await browser.close();

  if (htmlHash === latestHash && latestHash) {
    console.log("✅ No dashboard changes detected.");
    return;
  }

  console.log("⚠️  Dashboard change detected.");
  console.log(`   New hash: ${htmlHash}`);
  console.log(`   Old hash: ${latestHash || "(none)"}`);

  const shouldCreate = await ask("Create new version now?", "y");
  if (shouldCreate.toLowerCase() !== "y") {
    console.log("⏭️  Skipping version creation.");
    return;
  }

  const suggested = nextVersion(latest?.version || "v1.0.0");
  const version = await ask("Version", suggested);
  const description = await ask("Description", "Dashboard change detected");
  const copyAudio = await ask("Copy public/audio into version?", "y");

  const versionDir = path.join(VERSIONS_DIR, version);
  if (existsSync(versionDir)) {
    console.error(`❌ Version already exists: ${version}`);
    process.exit(1);
  }
  mkdirSync(versionDir, { recursive: true });

  // Save dashboard HTML snapshot
  const htmlFile = path.join(versionDir, "dashboard.html");
  writeFileSync(htmlFile, html, "utf-8");

  // Copy script from latest if present
  let scriptFile = "script.txt";
  if (latest?.path) {
    const prevScript = path.join(VERSIONS_DIR, latest.path, "script.txt");
    if (existsSync(prevScript)) {
      copyFileSync(prevScript, path.join(versionDir, scriptFile));
    } else {
      writeFileSync(path.join(versionDir, scriptFile), "", "utf-8");
    }
  } else {
    writeFileSync(path.join(versionDir, scriptFile), "", "utf-8");
  }

  // Copy audio if requested
  let audioDir = "";
  if (copyAudio.toLowerCase() === "y" && existsSync(AUDIO_DIR)) {
    audioDir = "audio";
    cpSync(AUDIO_DIR, path.join(versionDir, audioDir), { recursive: true });
  }

  // Create renders dir
  const rendersDir = path.join(versionDir, "renders");
  mkdirSync(rendersDir, { recursive: true });

  // Write meta
  const meta = {
    version,
    createdAt: new Date().toISOString().slice(0, 10),
    description,
    scriptFile,
    audioDir,
    renderDir: "renders",
    dashboard: {
      url: BASE_URL,
      htmlHash,
      htmlFile: "dashboard.html",
    },
  };

  writeFileSync(path.join(versionDir, "meta.json"), JSON.stringify(meta, null, 2));

  // Update latest.json
  writeFileSync(
    LATEST_PATH,
    JSON.stringify({ version, path: version }, null, 2),
  );

  console.log(`✅ Version created: ${version}`);
  console.log(`   Path: ${path.relative(ROOT, versionDir)}`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
