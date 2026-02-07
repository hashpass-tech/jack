#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const changelogPath = path.resolve(
  process.cwd(),
  "apps/docs/docs/operations/documentation-changelog.md",
);

const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();

const parseField = (body, key) => {
  const regex = new RegExp(`^\\s*[-*]?\\s*${key}\\s*:\\s*(.+)$`, "im");
  const match = (body || "").match(regex);
  return match ? normalize(match[1]) : "";
};

const ensureFile = () => {
  if (fs.existsSync(changelogPath)) return;
  const initial = [
    "---",
    "title: Documentation Changelog",
    "sidebar_position: 9",
    "---",
    "",
    "# Documentation Changelog",
    "",
    "Auto-updated on merged PRs to `develop` and `main` when changelog metadata is present.",
    "",
  ].join("\n");
  fs.writeFileSync(changelogPath, initial, "utf8");
};

const loadLabels = () => {
  const raw = process.env.PR_LABELS_JSON || "[]";
  try {
    const labels = JSON.parse(raw);
    if (!Array.isArray(labels)) return [];
    return labels.map((label) => normalize(String(label))).filter(Boolean);
  } catch {
    return [];
  }
};

const extractDate = () => {
  const mergedAt = process.env.PR_MERGED_AT;
  if (!mergedAt) {
    return new Date().toISOString().slice(0, 10);
  }
  const parsed = new Date(mergedAt);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
};

const buildEntry = () => {
  const prNumber = process.env.PR_NUMBER;
  const prTitle = normalize(process.env.PR_TITLE || "");
  const prUrl = process.env.PR_URL || "";
  const prAuthor = process.env.PR_AUTHOR || "unknown";
  const prBaseRef = process.env.PR_BASE_REF || "unknown";
  const prBody = process.env.PR_BODY || "";

  if (!prNumber || !prUrl || !prTitle) {
    throw new Error(
      "Missing required PR metadata (PR_NUMBER, PR_TITLE, PR_URL).",
    );
  }

  const docsImpactRaw = normalize(parseField(prBody, "DOCS_IMPACT"));
  const docsImpactNote = normalize(
    parseField(prBody, "DOCS_IMPACT_NOTE") ||
      parseField(prBody, "DOCS_JUSTIFICATION"),
  );
  const changelogSummary = normalize(
    parseField(prBody, "DOC_CHANGELOG") || prTitle,
  );

  let docsImpact = docsImpactRaw || "unspecified";
  if (/^none\b/i.test(docsImpactRaw) && docsImpactNote) {
    docsImpact = `none (${docsImpactNote})`;
  } else if (docsImpactNote && docsImpactRaw) {
    docsImpact = `${docsImpactRaw} (${docsImpactNote})`;
  }

  const labels = loadLabels();
  const areaLabels = labels.filter((label) =>
    /^(area[:/]|contracts|api|sdk|docs)/i.test(label),
  );
  const areaSummary = areaLabels.length ? areaLabels.join(", ") : "unlabeled";

  return `- PR [#${prNumber}](${prUrl}) into \`${prBaseRef}\` by @${prAuthor}: ${prTitle} | docs-impact: ${docsImpact} | areas: ${areaSummary} | summary: ${changelogSummary}`;
};

const insertEntry = (content, day, entry, prNumber) => {
  if (
    content.includes(`PR [#${prNumber}](`) ||
    content.includes(`PR #${prNumber}`)
  ) {
    return { changed: false, next: content };
  }

  const dayHeading = `## ${day}`;
  const dayIndex = content.indexOf(dayHeading);

  if (dayIndex === -1) {
    const separator = content.endsWith("\n") ? "" : "\n";
    const next = `${content}${separator}\n${dayHeading}\n\n${entry}\n`;
    return { changed: true, next };
  }

  const afterHeadingStart = dayIndex + dayHeading.length;
  const nextHeadingIndex = content.indexOf("\n## ", afterHeadingStart);
  const sectionEnd =
    nextHeadingIndex === -1 ? content.length : nextHeadingIndex;
  const section = content.slice(afterHeadingStart, sectionEnd);
  const trimmedSectionStart = section.replace(/^\n+/, "");
  const prefix = content.slice(0, afterHeadingStart);
  const suffix = content.slice(sectionEnd);
  const updatedSection =
    "\n\n" + entry + (trimmedSectionStart ? `\n${trimmedSectionStart}` : "\n");
  const next = `${prefix}${updatedSection}${suffix}`;
  return { changed: true, next };
};

const main = () => {
  ensureFile();
  const prNumber = process.env.PR_NUMBER;
  const day = extractDate();
  const entry = buildEntry();
  const current = fs.readFileSync(changelogPath, "utf8");
  const { changed, next } = insertEntry(current, day, entry, prNumber);

  if (!changed) {
    console.log(`Documentation changelog already contains PR #${prNumber}.`);
    return;
  }

  fs.writeFileSync(changelogPath, next, "utf8");
  console.log(`Updated documentation changelog for PR #${prNumber}.`);
};

main();
