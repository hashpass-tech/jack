#!/usr/bin/env node

const { execSync } = require("child_process");

const DEFAULT_WORKFLOW = "deploy-docs-pages.yml";

const usage = () => {
  console.log(
    [
      "Usage: node scripts/release-docs.js [options]",
      "",
      "Options:",
      "  --trigger-deploy      Trigger the GitHub Actions docs deploy workflow after build.",
      "  --ref <branch-or-sha> Git ref used when triggering workflow_dispatch.",
      "  --workflow <name>     Workflow file/name to trigger (default: deploy-docs-pages.yml).",
      "  --skip-build          Skip docs build step.",
      "  -h, --help            Show this help output.",
    ].join("\n"),
  );
};

const ensureArgValue = (args, index, flag) => {
  const value = args[index + 1];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
};

const parseArgs = (args) => {
  const parsed = {
    triggerDeploy: false,
    skipBuild: false,
    ref: process.env.DOCS_RELEASE_REF || process.env.GIT_BRANCH || "",
    workflow: process.env.DOCS_RELEASE_WORKFLOW || DEFAULT_WORKFLOW,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--trigger-deploy" || arg === "--trigger") {
      parsed.triggerDeploy = true;
      continue;
    }
    if (arg === "--skip-build") {
      parsed.skipBuild = true;
      continue;
    }
    if (arg === "--ref") {
      parsed.ref = ensureArgValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--workflow") {
      parsed.workflow = ensureArgValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return parsed;
};

const run = (command) => {
  console.log(`\u27A4 ${command}`);
  execSync(command, { stdio: "inherit", env: process.env });
};

const runWithOutput = (command) => {
  return execSync(command, { stdio: "pipe", env: process.env })
    .toString()
    .trim();
};

const commandExists = (command) => {
  try {
    runWithOutput(`command -v ${command}`);
    return true;
  } catch {
    return false;
  }
};

const getCurrentRef = () => {
  try {
    const branch = runWithOutput("git rev-parse --abbrev-ref HEAD");
    if (branch && branch !== "HEAD") {
      return branch;
    }
  } catch {
    // ignore
  }
  try {
    return runWithOutput("git rev-parse HEAD");
  } catch {
    return "";
  }
};

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    usage();
    process.exit(0);
  }

  if (!options.skipBuild) {
    console.log("Building whitepaper artifacts");
    run("pnpm whitepaper:build");
    console.log("Building docs site");
    run("pnpm --dir apps/docs build");
  } else {
    console.log("Skipping docs build (--skip-build)");
  }

  if (!options.triggerDeploy) {
    console.log("Docs release complete (deploy trigger skipped)");
    process.exit(0);
  }

  if (!commandExists("gh")) {
    throw new Error("GitHub CLI (`gh`) is required to trigger docs deployment");
  }

  const ref = options.ref || getCurrentRef();
  if (!ref) {
    throw new Error("Unable to determine git ref for docs deployment trigger");
  }

  if (ref !== "main" && ref !== "master") {
    console.log(
      `Warning: triggering docs deploy workflow from ref "${ref}" (custom domain typically tracks main).`,
    );
  }

  run(`gh workflow run ${options.workflow} --ref ${ref}`);
  console.log(`Triggered ${options.workflow} on ref ${ref}`);
} catch (error) {
  console.error(error.message || error);
  usage();
  process.exit(1);
}
