#!/usr/bin/env node

const { spawnSync } = require("child_process");

const MIN_JUSTIFICATION_LENGTH = 12;

const runGit = (args) => {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    return { ok: false, output: (result.stderr || result.stdout || "").trim() };
  }
  return { ok: true, output: (result.stdout || "").trim() };
};

const parseArg = (name) => {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
};

const resolveBaseSha = () => {
  const fromEnv = process.env.BASE_SHA;
  if (fromEnv) return fromEnv;

  const fromArg = parseArg("--base");
  if (fromArg) return fromArg;

  const candidates = [
    ["merge-base", "HEAD", "origin/develop"],
    ["merge-base", "HEAD", "origin/main"],
    ["rev-parse", "HEAD~1"],
  ];

  for (const candidate of candidates) {
    const result = runGit(candidate);
    if (result.ok && result.output) {
      return result.output.split("\n")[0].trim();
    }
  }

  return "";
};

const resolveHeadSha = () => {
  return process.env.HEAD_SHA || parseArg("--head") || "HEAD";
};

const parseField = (body, key) => {
  if (!body) return "";
  const regex = new RegExp(`^\\s*[-*]?\\s*${key}\\s*:\\s*(.+)$`, "im");
  const match = body.match(regex);
  return match ? match[1].trim() : "";
};

const normalize = (value) => {
  return (value || "").replace(/\s+/g, " ").trim();
};

const isDocFile = (filePath) => {
  return (
    filePath === "README.md" ||
    filePath === "contracts/README.md" ||
    filePath.startsWith("apps/docs/docs/") ||
    filePath === "apps/docs/sidebars.ts" ||
    filePath === "apps/docs/docusaurus.config.ts" ||
    filePath.startsWith("docs/")
  );
};

const criticalMatchers = [
  {
    name: "Contracts",
    test: (filePath) =>
      filePath.startsWith("contracts/") &&
      !filePath.startsWith("contracts/lib/") &&
      !filePath.endsWith("README.md"),
  },
  {
    name: "Dashboard API",
    test: (filePath) => filePath.startsWith("apps/dashboard/src/app/api/"),
  },
  {
    name: "Execution Integrations",
    test: (filePath) =>
      filePath.startsWith("apps/dashboard/src/lib/") &&
      /(lifi|yellow|intent|quote|route|execution|provider)/i.test(filePath),
  },
  {
    name: "SDK",
    test: (filePath) => filePath.startsWith("packages/sdk/"),
  },
  {
    name: "Contract Ops Scripts",
    test: (filePath) => filePath.startsWith("scripts/contracts/"),
  },
  {
    name: "Whitepaper Source",
    test: (filePath) => filePath.startsWith("whitepaper/"),
  },
];

const detectCriticalArea = (filePath) => {
  for (const matcher of criticalMatchers) {
    if (matcher.test(filePath)) {
      return matcher.name;
    }
  }
  return "";
};

const listChangedFiles = (baseSha, headSha) => {
  const result = runGit([
    "diff",
    "--name-only",
    "--diff-filter=ACMR",
    baseSha,
    headSha,
  ]);
  if (!result.ok) {
    throw new Error(
      `Unable to list changed files: ${result.output || "git diff failed"}`,
    );
  }
  return result.output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
};

const printList = (label, values) => {
  if (!values.length) return;
  console.log(`${label}:`);
  for (const value of values) {
    console.log(`- ${value}`);
  }
};

const fail = (message) => {
  console.error(`::error::${message}`);
  console.error(message);
  process.exit(1);
};

const main = () => {
  const baseSha = resolveBaseSha();
  const headSha = resolveHeadSha();

  if (!baseSha) {
    fail("Could not determine base SHA. Set BASE_SHA or pass --base <sha>.");
  }

  const changedFiles = listChangedFiles(baseSha, headSha);
  const criticalFiles = [];
  const criticalAreas = new Set();
  const docsFiles = [];

  for (const filePath of changedFiles) {
    if (isDocFile(filePath)) {
      docsFiles.push(filePath);
    }
    const area = detectCriticalArea(filePath);
    if (area) {
      criticalFiles.push(filePath);
      criticalAreas.add(area);
    }
  }

  console.log(`Docs impact check: comparing ${baseSha}..${headSha}`);
  console.log(`Changed files: ${changedFiles.length}`);

  if (!criticalFiles.length) {
    console.log(
      "No critical contract/API/SDK paths changed. Passing docs impact gate.",
    );
    process.exit(0);
  }

  printList("Critical files", criticalFiles);
  printList("Docs files", docsFiles);
  console.log(`Critical areas: ${Array.from(criticalAreas).join(", ")}`);

  const prBody = process.env.PR_BODY || "";
  const docsImpact = normalize(parseField(prBody, "DOCS_IMPACT"));
  const docsNote =
    normalize(parseField(prBody, "DOCS_IMPACT_NOTE")) ||
    normalize(parseField(prBody, "DOCS_JUSTIFICATION"));

  if (docsFiles.length > 0) {
    console.log("Critical paths changed and docs were updated. Passing.");
    process.exit(0);
  }

  const impactIsNone = /^none\b/i.test(docsImpact);
  const inlineReason = impactIsNone
    ? docsImpact.replace(/^none\b[:\-\s]*/i, "").trim()
    : "";
  const reason = docsNote || inlineReason;

  if (impactIsNone && reason.length >= MIN_JUSTIFICATION_LENGTH) {
    console.log(
      "Critical paths changed with explicit DOCS_IMPACT: none justification. Passing.",
    );
    process.exit(0);
  }

  fail(
    [
      "Critical contract/API/SDK changes detected without docs update.",
      "Update docs (README or apps/docs/docs/*) OR set:",
      "DOCS_IMPACT: none",
      "DOCS_IMPACT_NOTE: <why docs are not needed>",
    ].join(" "),
  );
};

main();
