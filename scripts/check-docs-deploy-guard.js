#!/usr/bin/env node

const https = require("https");

const DEFAULT_PATTERNS = [
  "rmgpgab-jack-just-in-time-autonomous-cross-chain-kernel",
];
const DEFAULT_APP = "Google Cloud Build";
const DEFAULT_TIMEOUT_SECONDS = 1800;
const DEFAULT_POLL_SECONDS = 20;

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const patterns = (
  process.env.DOCS_REQUIRED_DEPLOY_CHECK_PATTERNS || DEFAULT_PATTERNS.join(",")
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const requiredApp = process.env.DOCS_REQUIRED_DEPLOY_CHECK_APP || DEFAULT_APP;
const timeoutSeconds = parseNumber(
  process.env.DOCS_DEPLOY_GUARD_TIMEOUT_SECONDS,
  DEFAULT_TIMEOUT_SECONDS,
);
const pollSeconds = parseNumber(
  process.env.DOCS_DEPLOY_GUARD_POLL_SECONDS,
  DEFAULT_POLL_SECONDS,
);

const repo = process.env.GITHUB_REPOSITORY || "";
const sha = process.env.GITHUB_SHA || "";
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const branch = process.env.GITHUB_REF_NAME || "";

const fail = (message) => {
  console.error(`::error::${message}`);
  console.error(`ERROR: ${message}`);
  process.exit(1);
};

if (!repo || !sha) {
  fail("GITHUB_REPOSITORY and GITHUB_SHA are required for deploy guard");
}

if (!token) {
  fail("GITHUB_TOKEN is required for deploy guard");
}

if (patterns.length === 0) {
  fail("At least one deploy check pattern is required");
}

if (branch && branch !== "main" && branch !== "master") {
  console.log(
    `Skipping docs deploy guard for non-production branch "${branch}"`,
  );
  process.exit(0);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = (path) =>
  new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.github.com",
        path,
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "jack-docs-deploy-guard",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
      (response) => {
        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(
              new Error(
                `GitHub API ${response.statusCode}: ${data.slice(0, 2000)}`,
              ),
            );
            return;
          }

          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.on("error", reject);
    request.end();
  });

const getCheckRuns = async () => {
  const runs = [];
  let page = 1;

  while (true) {
    const payload = await fetchJson(
      `/repos/${repo}/commits/${sha}/check-runs?per_page=100&page=${page}`,
    );
    const batch = payload.check_runs || [];
    runs.push(...batch);
    if (batch.length < 100) {
      break;
    }
    page += 1;
  }

  return runs;
};

const matchesRequiredCheck = (run) => {
  const name = String(run.name || "");
  const appName = String(run.app?.name || "");
  const hasPattern = patterns.some((pattern) => name.includes(pattern));
  const hasApp = requiredApp ? appName === requiredApp : true;
  return hasPattern && hasApp;
};

const summarizeRuns = (runs) =>
  runs
    .map((run) => {
      const status = run.status || "unknown";
      const conclusion = run.conclusion || "n/a";
      const url = run.details_url || "n/a";
      return `- ${run.name} | status=${status} | conclusion=${conclusion} | ${url}`;
    })
    .join("\n");

const isFailureConclusion = (conclusion) => {
  if (!conclusion) {
    return false;
  }
  return conclusion !== "success";
};

const run = async () => {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let lastMatched = [];
  let attempt = 1;

  while (Date.now() <= deadline) {
    const checkRuns = await getCheckRuns();
    const matched = checkRuns.filter(matchesRequiredCheck);
    lastMatched = matched;

    if (matched.length === 0) {
      console.log(
        `Attempt ${attempt}: required deploy checks not visible yet for ${sha}. Waiting...`,
      );
      attempt += 1;
      await sleep(pollSeconds * 1000);
      continue;
    }

    const failed = matched.filter((run) => isFailureConclusion(run.conclusion));
    if (failed.length > 0) {
      fail(
        [
          "Docs deploy guard blocked publish because required app deploy checks failed.",
          "Required checks:",
          summarizeRuns(matched),
        ].join("\n"),
      );
    }

    const pending = matched.filter(
      (run) => run.status !== "completed" || !run.conclusion,
    );
    if (pending.length === 0) {
      console.log(
        [
          "Docs deploy guard passed.",
          `Commit: ${sha}`,
          "Required checks:",
          summarizeRuns(matched),
        ].join("\n"),
      );
      return;
    }

    console.log(
      [
        `Attempt ${attempt}: waiting for required deploy checks to complete...`,
        summarizeRuns(matched),
      ].join("\n"),
    );
    attempt += 1;
    await sleep(pollSeconds * 1000);
  }

  fail(
    [
      `Timed out after ${timeoutSeconds}s waiting for required app deploy checks.`,
      `Commit: ${sha}`,
      "Last seen checks:",
      summarizeRuns(lastMatched),
    ].join("\n"),
  );
};

run().catch((error) => {
  fail(`Docs deploy guard failed unexpectedly: ${error.message || error}`);
});
