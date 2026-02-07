#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const MANIFEST_PATH = path.join(ROOT, "whitepaper", "manifest.json");

const OUTPUT_DIRS = [
  "apps/landing/public/whitepaper",
  "apps/landing/public/whitepapper",
  "apps/docs/static/whitepaper",
  "apps/docs/static/whitepapper",
];

const DOCS_WHITEPAPER_DIR = path.join(
  ROOT,
  "apps",
  "docs",
  "docs",
  "whitepaper",
);

const parseArgs = (argv) => {
  const options = {
    all: false,
    version: "",
    skipCompile: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--all") {
      options.all = true;
      continue;
    }
    if (arg === "--version") {
      options.version = (argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
    if (arg === "--skip-compile") {
      options.skipCompile = true;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      console.log(
        [
          "Usage: node scripts/whitepaper/build.js [options]",
          "",
          "Options:",
          "  --all            Compile all versions listed in whitepaper/manifest.json",
          "  --version <v>    Compile only one version (e.g., 1.0.2 or v1.0.2)",
          "  --skip-compile   Skip LaTeX compilation and only sync docs/manifest outputs",
        ].join("\n"),
      );
      process.exit(0);
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
};

const normalizeVersion = (value) => value.replace(/^v/i, "").trim();

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const writeFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
};

const copyFile = (source, target) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: ROOT,
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with status ${result.status}`,
    );
  }
};

const commandExists = (command) => {
  const result = spawnSync("bash", ["-lc", `command -v ${command}`], {
    cwd: ROOT,
    stdio: "ignore",
  });
  return result.status === 0;
};

const toPosixPath = (value) => value.split(path.sep).join("/");

const compileWithLocalTex = (sourceAbs, outputDirAbs) => {
  if (commandExists("latexmk")) {
    run("latexmk", [
      "-pdf",
      "-interaction=nonstopmode",
      "-halt-on-error",
      `-output-directory=${outputDirAbs}`,
      sourceAbs,
    ]);
    return true;
  }

  if (commandExists("pdflatex")) {
    const args = [
      "-interaction=nonstopmode",
      "-halt-on-error",
      `-output-directory=${outputDirAbs}`,
      sourceAbs,
    ];
    run("pdflatex", args);
    run("pdflatex", args);
    return true;
  }

  return false;
};

const compileWithDocker = (sourceAbs, outputDirAbs) => {
  if (!commandExists("docker")) {
    throw new Error("No LaTeX engine found locally and Docker is unavailable.");
  }

  const image =
    process.env.WHITEPAPER_LATEX_DOCKER_IMAGE || "blang/latex:ctanfull";
  const sourceRel = toPosixPath(path.relative(ROOT, sourceAbs));
  const outputRel = toPosixPath(path.relative(ROOT, outputDirAbs));

  console.log(`Using Docker LaTeX image: ${image}`);

  const args = [
    "run",
    "--rm",
    "-v",
    `${ROOT}:/workspace`,
    "-w",
    "/workspace",
    image,
    "latexmk",
    "-pdf",
    "-interaction=nonstopmode",
    "-halt-on-error",
    `-output-directory=${outputRel}`,
    sourceRel,
  ];

  const result = spawnSync("docker", args, { stdio: "inherit", cwd: ROOT });
  if (result.status === 0) {
    return;
  }

  // Fallback path if latexmk is unavailable in the selected image.
  const shellCommand = [
    `pdflatex -interaction=nonstopmode -halt-on-error -output-directory=${outputRel} ${sourceRel}`,
    `pdflatex -interaction=nonstopmode -halt-on-error -output-directory=${outputRel} ${sourceRel}`,
  ].join(" && ");

  run("docker", [
    "run",
    "--rm",
    "-v",
    `${ROOT}:/workspace`,
    "-w",
    "/workspace",
    image,
    "bash",
    "-lc",
    shellCommand,
  ]);
};

const buildChangelogDoc = (manifest) => {
  const lines = [
    "---",
    "title: Whitepaper Changelog",
    "sidebar_position: 2",
    "---",
    "",
    "# Whitepaper Changelog",
    "",
    `Canonical source: \`whitepaper/manifest.json\``,
    "",
  ];

  for (const entry of manifest.versions) {
    lines.push(`## v${entry.version} (${entry.releaseDate})`);
    lines.push("");
    lines.push(`- PDF: [/whitepaper/${entry.pdf}](/whitepaper/${entry.pdf})`);
    if (entry.markdown) {
      lines.push(
        `- Summary (Markdown): [/docs/whitepaper/whitepaper-v${entry.version}](/docs/whitepaper/whitepaper-v${entry.version})`,
      );
    }
    for (const note of entry.changelog || []) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
};

const syncManifestToPublicDirs = (manifest) => {
  const payload = `${JSON.stringify(manifest, null, 2)}\n`;
  for (const relativeDir of OUTPUT_DIRS) {
    writeFile(path.join(ROOT, relativeDir, "manifest.json"), payload);
  }
};

const syncMarkdownCompanion = (manifest) => {
  const latestVersion = normalizeVersion(manifest.latest);
  const latestEntry = manifest.versions.find(
    (entry) => normalizeVersion(entry.version) === latestVersion,
  );

  if (!latestEntry || !latestEntry.markdown) {
    throw new Error(
      "Manifest latest version must define a markdown companion.",
    );
  }

  const source = path.join(ROOT, latestEntry.markdown);
  if (!fs.existsSync(source)) {
    throw new Error(`Markdown companion not found: ${latestEntry.markdown}`);
  }

  const versionedTarget = path.join(
    DOCS_WHITEPAPER_DIR,
    `whitepaper-v${latestVersion}.md`,
  );
  const summaryTarget = path.join(DOCS_WHITEPAPER_DIR, "summary.md");

  copyFile(source, versionedTarget);
  copyFile(source, summaryTarget);
  return { versionedTarget, summaryTarget };
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const manifest = readJson(MANIFEST_PATH);

  if (
    !manifest.latest ||
    !Array.isArray(manifest.versions) ||
    !manifest.versions.length
  ) {
    throw new Error(
      "Invalid whitepaper manifest: latest/version definitions are required.",
    );
  }

  const requestedVersion = normalizeVersion(options.version || "");
  const targets = manifest.versions.filter((entry) => {
    if (requestedVersion) {
      return normalizeVersion(entry.version) === requestedVersion;
    }
    if (options.all || options.skipCompile) {
      return true;
    }
    return (
      normalizeVersion(entry.version) === normalizeVersion(manifest.latest)
    );
  });

  if (requestedVersion && !targets.length) {
    throw new Error(`Version not found in manifest: ${options.version}`);
  }

  if (!options.skipCompile) {
    console.log(`Compiling ${targets.length} whitepaper source(s)`);
  } else {
    console.log("Skipping LaTeX compilation (--skip-compile)");
  }

  for (const entry of targets) {
    const texPath = entry.tex;
    if (!texPath) {
      throw new Error(
        `Manifest entry v${entry.version} is missing tex source.`,
      );
    }

    const sourceAbs = path.join(ROOT, texPath);
    if (!fs.existsSync(sourceAbs)) {
      throw new Error(`TeX source not found: ${texPath}`);
    }

    const outputDirAbs = path.join(ROOT, "whitepaper", ".build", entry.version);
    fs.mkdirSync(outputDirAbs, { recursive: true });

    if (!options.skipCompile) {
      const compiledLocally = compileWithLocalTex(sourceAbs, outputDirAbs);
      if (!compiledLocally) {
        compileWithDocker(sourceAbs, outputDirAbs);
      }
    }

    const sourcePdfName = `${path.basename(sourceAbs, ".tex")}.pdf`;
    let builtPdfAbs = path.join(outputDirAbs, sourcePdfName);

    if (!fs.existsSync(builtPdfAbs) && options.skipCompile) {
      const existingArtifact = OUTPUT_DIRS.map((relativeDir) =>
        path.join(ROOT, relativeDir, entry.pdf),
      ).find((candidate) => fs.existsSync(candidate));
      if (existingArtifact) {
        builtPdfAbs = existingArtifact;
      }
    }

    if (!fs.existsSync(builtPdfAbs)) {
      throw new Error(
        `Compiled PDF missing for v${entry.version}: ${builtPdfAbs}`,
      );
    }

    for (const relativeDir of OUTPUT_DIRS) {
      const outputDir = path.join(ROOT, relativeDir);
      const versionedTarget = path.join(outputDir, entry.pdf);
      copyFile(builtPdfAbs, versionedTarget);

      if (
        normalizeVersion(entry.version) === normalizeVersion(manifest.latest)
      ) {
        copyFile(builtPdfAbs, path.join(outputDir, manifest.canonicalPdf));
      }
    }

    console.log(`Synced PDF artifacts for v${entry.version}`);
  }

  syncManifestToPublicDirs(manifest);
  const markdownPaths = syncMarkdownCompanion(manifest);
  writeFile(
    path.join(DOCS_WHITEPAPER_DIR, "changelog.md"),
    buildChangelogDoc(manifest),
  );

  console.log("Synced whitepaper manifest to landing/docs public directories");
  console.log(
    `Synced markdown companion: ${path.relative(ROOT, markdownPaths.versionedTarget)}`,
  );
  console.log(
    `Synced latest summary: ${path.relative(ROOT, markdownPaths.summaryTarget)}`,
  );
  console.log("Updated docs changelog: apps/docs/docs/whitepaper/changelog.md");
};

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
