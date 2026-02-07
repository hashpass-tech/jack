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
  const canonicalVersion = normalizeVersion(
    manifest.featured || manifest.latest,
  );
  const latestEntry = manifest.versions.find(
    (entry) => normalizeVersion(entry.version) === latestVersion,
  );
  const canonicalEntry = manifest.versions.find(
    (entry) => normalizeVersion(entry.version) === canonicalVersion,
  );

  ensure(latestEntry, `Manifest latest version not found: ${manifest.latest}`);
  ensure(
    canonicalEntry,
    `Manifest canonical version not found: ${canonicalVersion}`,
  );
  ensure(manifest.canonicalPdf, "Manifest canonicalPdf is required");

  for (const entry of manifest.versions) {
    ensure(entry.version, "Each version entry requires version");
    ensure(entry.releaseDate, `Version v${entry.version} requires releaseDate`);
    ensure(entry.pdf, `Version v${entry.version} requires pdf`);
    const texPath = typeof entry.tex === "string" ? entry.tex.trim() : "";
    const sourcePdfPath =
      typeof entry.sourcePdf === "string" ? entry.sourcePdf.trim() : "";
    ensure(
      texPath || sourcePdfPath,
      `Version v${entry.version} must define tex or sourcePdf`,
    );
    if (texPath) {
      ensure(
        fs.existsSync(path.join(ROOT, texPath)),
        `Missing TeX source for v${entry.version}: ${texPath}`,
      );
    }
    if (sourcePdfPath) {
      ensure(
        fs.existsSync(path.join(ROOT, sourcePdfPath)),
        `Missing sourcePdf for v${entry.version}: ${sourcePdfPath}`,
      );
    }

    for (const outputDir of OUTPUT_DIRS) {
      const pdfPath = path.join(ROOT, outputDir, entry.pdf);
      ensure(
        fs.existsSync(pdfPath),
        `Missing PDF artifact: ${path.relative(ROOT, pdfPath)}`,
      );
    }
  }

  for (const outputDir of OUTPUT_DIRS) {
    const canonicalSourcePdfPath = path.join(
      ROOT,
      outputDir,
      canonicalEntry.pdf,
    );
    const canonicalPdfPath = path.join(ROOT, outputDir, manifest.canonicalPdf);
    ensure(
      fs.existsSync(canonicalPdfPath),
      `Missing canonical PDF: ${path.relative(ROOT, canonicalPdfPath)}`,
    );
    ensure(
      hashFile(canonicalSourcePdfPath) === hashFile(canonicalPdfPath),
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

  for (const entry of manifest.versions) {
    if (!entry.markdown) {
      continue;
    }
    const version = normalizeVersion(entry.version);
    const versionedDocPath = path.join(
      ROOT,
      "apps",
      "docs",
      "docs",
      "whitepaper",
      `whitepaper-v${version}.md`,
    );
    ensure(
      fs.existsSync(versionedDocPath),
      `Missing docs markdown companion: ${path.relative(ROOT, versionedDocPath)}`,
    );
  }

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
