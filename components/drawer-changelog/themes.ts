/* ── Changelog Drawer · Theme Presets ────────────────────────
 *
 *  Each app has its own visual identity:
 *
 *  • Landing   → dark space (#0B1020) with JACK gold (#F2B94B)
 *  • Dashboard → adaptive via CSS custom properties (dark/light toggle)
 *  • Docs      → Docusaurus Infima vars (light/dark auto-switch)
 *
 *  The drawer maps every colour to a theme token so it blends
 *  seamlessly into whichever host it lives in.
 * ──────────────────────────────────────────────────────────── */

import type { ChangelogTheme } from "./types";

/* ── Landing · dark space ─────────────────────────────────── */
export const landingTheme: ChangelogTheme = {
  overlay: "rgba(0, 0, 0, 0.70)",
  drawerBg: "#0B1020",
  drawerBorder: "rgba(255, 255, 255, 0.08)",
  headerBg: "#0D1428",
  textPrimary: "#ffffff",
  textSecondary: "#9ca3af",
  textMuted: "#6b7280",
  accent: "#F2B94B",
  accentHover: "#f5c968",
  badgeBg: "rgba(242, 185, 75, 0.10)",
  badgeText: "#F2B94B",
  badgeBorder: "rgba(242, 185, 75, 0.20)",
  sectionBg: "rgba(255, 255, 255, 0.03)",
  sectionBorder: "rgba(255, 255, 255, 0.06)",
  triggerBg: "rgba(255, 255, 255, 0.05)",
  triggerBorder: "rgba(255, 255, 255, 0.10)",
  triggerText: "#6b7280",
  triggerHover: "#ffffff",
  scrollbarTrack: "rgba(255, 255, 255, 0.02)",
  scrollbarThumb: "rgba(255, 255, 255, 0.10)",
  divider: "rgba(255, 255, 255, 0.06)",
};

/* ── Dashboard · maps to existing CSS custom properties ───── */
export const dashboardTheme: ChangelogTheme = {
  overlay: "rgba(0, 0, 0, 0.50)",
  drawerBg: "var(--bg-primary, #0f172a)",
  drawerBorder: "var(--border-primary, rgba(255,255,255,0.08))",
  headerBg: "var(--bg-secondary, #1e293b)",
  textPrimary: "var(--fg-primary, #ffffff)",
  textSecondary: "var(--fg-secondary, #94a3b8)",
  textMuted: "var(--fg-muted, #64748b)",
  accent: "var(--fg-accent, #22d3ee)",
  accentHover: "var(--fg-accent, #67e8f9)",
  badgeBg: "var(--bg-secondary, rgba(34,211,238,0.10))",
  badgeText: "var(--fg-accent, #22d3ee)",
  badgeBorder: "var(--border-secondary, rgba(34,211,238,0.20))",
  sectionBg: "var(--bg-secondary, rgba(255,255,255,0.03))",
  sectionBorder: "var(--border-secondary, rgba(255,255,255,0.06))",
  triggerBg: "var(--bg-primary, rgba(255,255,255,0.05))",
  triggerBorder: "var(--border-secondary, rgba(255,255,255,0.10))",
  triggerText: "var(--fg-secondary, #94a3b8)",
  triggerHover: "var(--fg-primary, #ffffff)",
  scrollbarTrack: "rgba(255, 255, 255, 0.02)",
  scrollbarThumb: "rgba(255, 255, 255, 0.10)",
  divider: "var(--border-primary, rgba(255,255,255,0.06))",
};

/* ── Docs · Docusaurus Infima variables (auto light/dark) ── */
export const docsTheme: ChangelogTheme = {
  overlay: "rgba(0, 0, 0, 0.50)",
  drawerBg: "var(--ifm-background-surface-color, #ffffff)",
  drawerBorder: "var(--ifm-color-emphasis-300, rgba(0,0,0,0.12))",
  headerBg: "var(--ifm-background-color, #f8f9fa)",
  textPrimary: "var(--ifm-heading-color, #1c1e21)",
  textSecondary: "var(--ifm-font-color-base, #333)",
  textMuted: "var(--ifm-font-color-secondary, #666)",
  accent: "var(--ifm-color-primary, #0a7dc2)",
  accentHover: "var(--ifm-color-primary-dark, #0870ae)",
  badgeBg: "var(--ifm-color-primary-lightest, rgba(10,125,194,0.08))",
  badgeText: "var(--ifm-color-primary, #0a7dc2)",
  badgeBorder: "var(--ifm-color-primary-light, rgba(10,125,194,0.25))",
  sectionBg: "var(--ifm-background-color, rgba(0,0,0,0.02))",
  sectionBorder: "var(--ifm-color-emphasis-200, rgba(0,0,0,0.08))",
  triggerBg: "var(--ifm-background-surface-color, rgba(0,0,0,0.03))",
  triggerBorder: "var(--ifm-color-emphasis-300, rgba(0,0,0,0.12))",
  triggerText: "var(--ifm-font-color-secondary, #666)",
  triggerHover: "var(--ifm-heading-color, #1c1e21)",
  scrollbarTrack: "rgba(0, 0, 0, 0.02)",
  scrollbarThumb: "rgba(0, 0, 0, 0.12)",
  divider: "var(--ifm-color-emphasis-200, rgba(0,0,0,0.08))",
};

/* ── Resolver ─────────────────────────────────────────────── */
export function resolveTheme(
  theme?: "landing" | "dashboard" | "docs" | ChangelogTheme,
): ChangelogTheme {
  if (!theme || theme === "landing") return landingTheme;
  if (theme === "dashboard") return dashboardTheme;
  if (theme === "docs") return docsTheme;
  return theme;
}
