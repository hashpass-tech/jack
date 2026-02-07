/* ── Changelog Drawer · Shared Types ─────────────────────────── */

import type React from "react";

export interface ChangelogItem {
  scope?: string;
  description: string;
  commitHash?: string;
  commitUrl?: string;
}

export interface ChangelogSection {
  title: string; // "Bug Fixes" | "Features" | "Performance Improvements" | …
  items: ChangelogItem[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  compareUrl: string;
  sections: ChangelogSection[];
}

export interface ChangelogTheme {
  overlay: string;
  drawerBg: string;
  drawerBorder: string;
  headerBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  sectionBg: string;
  sectionBorder: string;
  triggerBg: string;
  triggerBorder: string;
  triggerText: string;
  triggerHover: string;
  scrollbarTrack: string;
  scrollbarThumb: string;
  divider: string;
}

export interface ChangelogDrawerProps {
  /** Raw CHANGELOG.md text */
  changelogText: string;
  /** Built-in theme preset or custom theme object */
  theme?: "landing" | "dashboard" | ChangelogTheme;
  /** GitHub repo URL for tag/release links */
  repoUrl?: string;
  /** Current app version (falls back to latest parsed version) */
  version?: string;
  /** Extra className for the trigger element */
  className?: string;
  /**
   * Custom trigger renderer. Receives onClick to open the peek drawer.
   * When provided, replaces the default pulsing-dot badge entirely,
   * letting each app embed the trigger into its own footer design.
   */
  renderTrigger?: (props: { onClick: () => void; version: string }) => React.ReactNode;
}
