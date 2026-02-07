#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

const readJson = (filePath) => {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const compareSemver = (a, b) => {
  const am = String(a).match(SEMVER_RE);
  const bm = String(b).match(SEMVER_RE);
  if (!am || !bm) {
    return 0;
  }
  for (let i = 1; i <= 3; i += 1) {
    const ai = Number(am[i]);
    const bi = Number(bm[i]);
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
};

const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getCurrentBranch = () => {
  if (process.env.CHECK_BRANCH) {
    return process.env.CHECK_BRANCH;
  }
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      stdio: "pipe",
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
};

const readVersionFromRef = (ref) => {
  try {
    const raw = execSync(`git show ${ref}:package.json`, {
      stdio: "pipe",
      encoding: "utf8",
    });
    return JSON.parse(raw).version ?? "";
  } catch {
    return "";
  }
};

const main = () => {
  const rootPkg = readJson(path.resolve(process.cwd(), "package.json"));
  const dashboardPkg = readJson(
    path.resolve(process.cwd(), "apps/dashboard/package.json"),
  );
  const changelog = fs.readFileSync(
    path.resolve(process.cwd(), "CHANGELOG.md"),
    "utf8",
  );
  const branch = getCurrentBranch();
  const strictMainDevelopSync = process.env.STRICT_MAIN_DEVELOP_SYNC === "true";

  const errors = [];
  const warnings = [];

  const rootVersion = rootPkg.version;
  const dashboardVersion = dashboardPkg.version;

  if (!SEMVER_RE.test(String(rootVersion))) {
    errors.push(`Root package version is not semver: "${rootVersion}"`);
  }
  if (!SEMVER_RE.test(String(dashboardVersion))) {
    errors.push(
      `Dashboard package version is not semver: "${dashboardVersion}"`,
    );
  }

  if (rootVersion !== dashboardVersion) {
    errors.push(
      `Version mismatch: root package.json (${rootVersion}) != apps/dashboard/package.json (${dashboardVersion})`,
    );
  }

  const versionHeading = new RegExp(
    `^## \\[${escapeRegExp(String(rootVersion))}\\]`,
    "m",
  );
  if (!versionHeading.test(changelog)) {
    errors.push(
      `CHANGELOG.md is missing a release section for version ${rootVersion}`,
    );
  }

  const mainRef = process.env.CHECK_MAIN_REF || "origin/main";
  const developRef = process.env.CHECK_DEVELOP_REF || "origin/develop";
  const mainVersion = readVersionFromRef(mainRef);
  const developVersion = readVersionFromRef(developRef);

  if (branch === "main" || branch === "master") {
    if (developVersion && compareSemver(developVersion, rootVersion) > 0) {
      const msg = `Version drift: ${branch} is ${rootVersion} but ${developRef} is ${developVersion}.`;
      if (strictMainDevelopSync) {
        errors.push(msg);
      } else {
        warnings.push(
          `${msg} Merge/release before publishing docs to avoid stale version labels.`,
        );
      }
    }
  }

  if (branch === "develop") {
    if (mainVersion && compareSemver(mainVersion, rootVersion) > 0) {
      errors.push(
        `Version drift: develop is ${rootVersion} but ${mainRef} is newer at ${mainVersion}.`,
      );
    }
  }

  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.warn(`::warning::${warning}`);
      console.warn(`WARN: ${warning}`);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`::error::${error}`);
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }

  console.log(
    [
      `Version sync OK on branch "${branch || "unknown"}"`,
      `root=${rootVersion}`,
      `dashboard=${dashboardVersion}`,
      mainVersion ? `${mainRef}=${mainVersion}` : `${mainRef}=unavailable`,
      developVersion
        ? `${developRef}=${developVersion}`
        : `${developRef}=unavailable`,
    ].join(" | "),
  );
};

main();
