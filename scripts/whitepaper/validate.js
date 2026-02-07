#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..", "..");
const MANIFEST_PATH = path.join(ROOT, "whitepaper", "manifest.json");

const OUTPUT_DIRS = [
  "apps/landing/public/whitepaper",
  "apps/docs/static/whitepaper",
  "apps/landing/public/whitepapper",
  "apps/docs/static/whitepapper",
];

const hashFile = (filePath) =>
  crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

const normalizeVersion = (value) => (value || "").replace(/^v/i, "").trim();

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const main = () => {
  ensure(fs.existsSync(MANIFEST_PATH), "Missing whitepaper manifest");
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

  ensure(
    Array.isArray(manifest.versions),
    "Manifest versions must be an array",
  );
  ensure(manifest.versions.length > 0, "Manifest versions cannot be empty");

  const latestVersion = normalizeVersion(manifest.latest);
  const latestEntry = manifest.versions.find(
    (entry) => normalizeVersion(entry.version) === latestVersion,
  );

  ensure(latestEntry, `Manifest latest version not found: ${manifest.latest}`);
  ensure(manifest.canonicalPdf, "Manifest canonicalPdf is required");

  for (const entry of manifest.versions) {
    ensure(entry.version, "Each version entry requires version");
    ensure(entry.releaseDate, `Version v${entry.version} requires releaseDate`);
    ensure(entry.pdf, `Version v${entry.version} requires pdf`);
    ensure(entry.tex, `Version v${entry.version} requires tex source`);
    ensure(
      fs.existsSync(path.join(ROOT, entry.tex)),
      `Missing TeX source for v${entry.version}: ${entry.tex}`,
    );

    for (const outputDir of OUTPUT_DIRS) {
      const pdfPath = path.join(ROOT, outputDir, entry.pdf);
      ensure(
        fs.existsSync(pdfPath),
        `Missing PDF artifact: ${path.relative(ROOT, pdfPath)}`,
      );
    }
  }

  for (const outputDir of OUTPUT_DIRS) {
    const latestPdfPath = path.join(ROOT, outputDir, latestEntry.pdf);
    const canonicalPdfPath = path.join(ROOT, outputDir, manifest.canonicalPdf);
    ensure(
      fs.existsSync(canonicalPdfPath),
      `Missing canonical PDF: ${path.relative(ROOT, canonicalPdfPath)}`,
    );
    ensure(
      hashFile(latestPdfPath) === hashFile(canonicalPdfPath),
      `Canonical PDF is out of sync in ${outputDir}`,
    );

    const manifestCopyPath = path.join(ROOT, outputDir, "manifest.json");
    ensure(
      fs.existsSync(manifestCopyPath),
      `Missing public manifest copy: ${path.relative(ROOT, manifestCopyPath)}`,
    );

    const sourceManifestHash = hashFile(MANIFEST_PATH);
    const copyManifestHash = hashFile(manifestCopyPath);
    ensure(
      sourceManifestHash === copyManifestHash,
      `Public manifest out of sync in ${outputDir}`,
    );
  }

  const latestMarkdown = path.join(
    ROOT,
    "apps",
    "docs",
    "docs",
    "whitepaper",
    `whitepaper-v${latestVersion}.md`,
  );
  ensure(
    fs.existsSync(latestMarkdown),
    `Missing docs markdown companion: ${path.relative(ROOT, latestMarkdown)}`,
  );

  const latestSummary = path.join(
    ROOT,
    "apps",
    "docs",
    "docs",
    "whitepaper",
    "summary.md",
  );
  ensure(
    fs.existsSync(latestSummary),
    `Missing docs whitepaper summary: ${path.relative(ROOT, latestSummary)}`,
  );

  const changelogPath = path.join(
    ROOT,
    "apps",
    "docs",
    "docs",
    "whitepaper",
    "changelog.md",
  );
  ensure(fs.existsSync(changelogPath), "Missing whitepaper changelog doc");

  const changelogRaw = fs.readFileSync(changelogPath, "utf8");
  ensure(
    changelogRaw.includes(`## v${latestVersion}`),
    "Whitepaper changelog doc does not include latest version",
  );

  console.log("Whitepaper validation passed");
};

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
