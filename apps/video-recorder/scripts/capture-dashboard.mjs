#!/usr/bin/env node
/**
 * capture-dashboard.mjs — Screenshot the real JACK dashboard tabs
 *
 * Uses Puppeteer (via google-chrome) to capture each tab of the dashboard.
 * Outputs PNGs to public/screenshots/ for use in Remotion compositions.
 *
 * Usage:
 *   node scripts/capture-dashboard.mjs [--url http://localhost:3001]
 *
 * Requirements:
 *   - Dashboard running on port 3001 (cd apps/dashboard && pnpm dev)
 *   - OR pass --url https://testnet.jack.lukas.money/dashboard
 */
import puppeteer from "puppeteer";
import { mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/screenshots");

// Parse --url arg
const urlArg = process.argv.find((a) => a.startsWith("--url="));
const BASE_URL = urlArg
  ? urlArg.split("=")[1]
  : process.argv.includes("--testnet")
    ? "https://testnet.jack.lukas.money/dashboard"
    : "http://localhost:3001";

const VIEWPORT = { width: 1920, height: 1080, deviceScaleFactor: 2 };

const TABS = [
  { name: "create-intent", tabIndex: 0, label: "Create Intent" },
  { name: "executions", tabIndex: 1, label: "Executions" },
  { name: "agent-costs", tabIndex: 2, label: "Agent & Costs" },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  console.log(`📸 Capturing dashboard at ${BASE_URL}`);
  console.log(`   Output: ${OUT_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath:
      process.env.CHROME_PATH || "/usr/bin/google-chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--force-dark-mode",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Force dark mode
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "dark" },
  ]);

  try {
    // Load dashboard
    console.log("⏳ Loading dashboard...");
    await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 30000 });
    await sleep(2000); // Let particles + animations settle

    // Full page hero screenshot
    console.log("📷 Capturing full dashboard...");
    await page.screenshot({
      path: path.join(OUT_DIR, "dashboard-full.png"),
      fullPage: false,
    });

    // Capture each tab
    for (const tab of TABS) {
      console.log(`📷 Capturing tab: ${tab.label}...`);

      // Click the tab — find in header tab bar
      // Try desktop tab buttons first (hidden on mobile)
      const tabClicked = await page.evaluate((tabLabel) => {
        const buttons = Array.from(document.querySelectorAll("button, a"));
        const btn = buttons.find(
          (b) =>
            b.textContent?.trim() === tabLabel ||
            b.textContent?.trim().includes(tabLabel),
        );
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      }, tab.label);

      if (!tabClicked) {
        console.warn(`   ⚠️ Could not find tab button for "${tab.label}"`);
      }

      await sleep(1500); // Let tab transition

      await page.screenshot({
        path: path.join(OUT_DIR, `dashboard-${tab.name}.png`),
        fullPage: false,
      });

      // Also capture just the content area (no header/footer)
      const contentEl = await page.$("main") || await page.$("[class*='flex-1']");
      if (contentEl) {
        await contentEl.screenshot({
          path: path.join(OUT_DIR, `dashboard-${tab.name}-content.png`),
        });
      }
    }

    // Bonus: capture with a mock execution detail if executions tab
    console.log("📷 Capturing execution detail (if available)...");
    const rows = await page.$$("tr[class*='cursor'], div[class*='cursor']");
    if (rows.length > 0) {
      await rows[0].click();
      await sleep(1500);
      await page.screenshot({
        path: path.join(OUT_DIR, "dashboard-execution-detail.png"),
        fullPage: false,
      });
    }

    console.log(`\n✅ Screenshots saved to ${OUT_DIR}/`);
    console.log("   Files:");
    console.log("   - dashboard-full.png");
    TABS.forEach((t) => {
      console.log(`   - dashboard-${t.name}.png`);
      console.log(`   - dashboard-${t.name}-content.png`);
    });
  } catch (err) {
    console.error("❌ Capture failed:", err.message);
    // Still save whatever we have
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
