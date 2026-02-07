/* ── Changelog Markdown Parser ────────────────────────────────
 *  Parses conventional-changelog flavoured CHANGELOG.md into
 *  structured ChangelogEntry[] objects.
 * ──────────────────────────────────────────────────────────── */

import type { ChangelogEntry, ChangelogSection, ChangelogItem } from "./types";

/**
 * Parse a raw CHANGELOG.md string into an array of ChangelogEntry objects.
 *
 * Understands the format produced by `@edcalderon/versioning` / `conventional-changelog`:
 *
 *   ## [0.1.36](https://github.com/.../compare/v0.1.35...v0.1.36) (2026-02-07)
 *
 *   ### Features
 *   * **scope:** description ([hash](url))
 */
export function parseChangelog(markdown: string): ChangelogEntry[] {
  if (!markdown) return [];

  const entries: ChangelogEntry[] = [];
  const lines = markdown.split("\n");

  let current: ChangelogEntry | null = null;
  let section: ChangelogSection | null = null;

  for (const line of lines) {
    // ── Version header ─────────────────────────────────────
    // ## [0.1.36](https://…/compare/v0.1.35...v0.1.36) (2026-02-07)
    const versionMatch = line.match(
      /^## \[([^\]]+)\]\(([^)]+)\)\s*\(([^)]+)\)/,
    );
    if (versionMatch) {
      // Flush previous
      if (current) {
        if (section && section.items.length > 0) current.sections.push(section);
        entries.push(current);
      }
      current = {
        version: versionMatch[1],
        compareUrl: versionMatch[2],
        date: versionMatch[3],
        sections: [],
      };
      section = null;
      continue;
    }

    // ── Section header ─────────────────────────────────────
    // ### Bug Fixes | ### Features | ### Performance Improvements
    const sectionMatch = line.match(/^### (.+)/);
    if (sectionMatch && current) {
      if (section && section.items.length > 0) current.sections.push(section);
      section = { title: sectionMatch[1].trim(), items: [] };
      continue;
    }

    // ── List item ──────────────────────────────────────────
    // * **scope:** description ([hash](url))
    // * description ([hash](url))
    const itemMatch = line.match(/^\* (?:\*\*([^*]+):\*\* )?(.+)/);
    if (itemMatch && section) {
      const scope = itemMatch[1]?.trim();
      let description = itemMatch[2].trim();

      let commitHash: string | undefined;
      let commitUrl: string | undefined;

      // Extract trailing commit link:  ([abcdef0](https://…))
      const commitMatch = description.match(
        /\s*\(?\[([a-f0-9]{7,})\]\(([^)]+)\)\)?$/,
      );
      if (commitMatch) {
        commitHash = commitMatch[1];
        commitUrl = commitMatch[2];
        description = description
          .slice(0, commitMatch.index)
          .replace(/\s+$/, "");
      }

      section.items.push({ scope, description, commitHash, commitUrl });
    }
  }

  // Flush last entry
  if (current) {
    if (section && section.items.length > 0) current.sections.push(section);
    entries.push(current);
  }

  return entries;
}
