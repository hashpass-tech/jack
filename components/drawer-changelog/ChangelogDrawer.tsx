/* ── Changelog Drawer ─────────────────────────────────────────
 *
 *  A shared, themeable changelog UI that lives in the footer of
 *  every JACK app.  It has two modes:
 *
 *  1. **Peek**  – small bottom-sheet with the latest release.
 *  2. **Full**  – near-full-screen paginated list of all releases
 *                 with GitHub tag links.
 *
 *  IMPORTANT: This component uses INLINE STYLES for all layout,
 *  NOT Tailwind utilities. The drawer is portal-mounted on
 *  document.body across three different apps (Vite/CDN Tailwind,
 *  Next.js/Tailwind v4, Docusaurus/no Tailwind) so utility
 *  classes cannot be guaranteed available in every context.
 *
 *  Usage:
 *    <ChangelogDrawer
 *      changelogText={rawMarkdown}
 *      theme="landing"       // or "dashboard" | "docs" | custom
 *      version="0.1.36"
 *    />
 *
 *  The component renders an inline trigger badge.  Everything
 *  else (overlay + drawer) is portal-mounted on document.body.
 * ──────────────────────────────────────────────────────────── */

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { parseChangelog } from "./parse-changelog";
import { resolveTheme } from "./themes";
import type {
  ChangelogDrawerProps,
  ChangelogEntry,
  ChangelogTheme,
} from "./types";

const ITEMS_PER_PAGE = 5;
const REPO_URL_DEFAULT = "https://github.com/hashpass-tech/JACK";

/* ── Helpers ─────────────────────────────────────────────────── */

const formatDate = (raw: string) => {
  try {
    return new Date(raw).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return raw;
  }
};

const sectionMeta = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("feat")) return { icon: "◆", label: title };
  if (t.includes("fix")) return { icon: "●", label: title };
  if (t.includes("perf")) return { icon: "▲", label: title };
  if (t.includes("break")) return { icon: "✦", label: title };
  return { icon: "■", label: title };
};

/* ── Sub-component: single version card ──────────────────────── */

const VersionCard: React.FC<{
  entry: ChangelogEntry;
  theme: ChangelogTheme;
  repoUrl: string;
  compact?: boolean;
}> = ({ entry, theme, repoUrl, compact = false }) => (
  <div
    style={{
      borderBottom: `1px solid ${theme.divider}`,
      padding: compact ? "14px 0" : "18px 0",
    }}
  >
    {/* Header: version badge + date + GitHub link */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "8px",
        marginBottom: "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: "6px",
            padding: "2px 8px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            background: theme.badgeBg,
            color: theme.badgeText,
            border: `1px solid ${theme.badgeBorder}`,
          }}
        >
          v{entry.version}
        </span>
        <span style={{ fontSize: "10px", color: theme.textMuted }}>
          {formatDate(entry.date)}
        </span>
      </div>
      <a
        href={`${repoUrl}/releases/tag/v${entry.version}`}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          borderRadius: "6px",
          padding: "2px 8px",
          fontSize: "9px",
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
          textDecoration: "none",
          color: theme.accent,
          border: `1px solid ${theme.badgeBorder}`,
          background: theme.badgeBg,
        }}
        title={`View v${entry.version} on GitHub`}
      >
        Tag
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4.5 1.5H10.5V7.5M10.5 1.5L1.5 10.5" />
        </svg>
      </a>
    </div>

    {/* Sections */}
    {entry.sections.map((section, si) => {
      const meta = sectionMeta(section.title);
      return (
        <div
          key={si}
          style={{
            marginBottom: si < entry.sections.length - 1 ? "10px" : "0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "9px",
              fontWeight: 900,
              textTransform: "uppercase" as const,
              letterSpacing: "0.2em",
              color: theme.textMuted,
              marginBottom: "5px",
            }}
          >
            <span style={{ color: theme.accent, fontSize: "8px" }}>
              {meta.icon}
            </span>
            {meta.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {section.items.map((item, ii) => (
              <div
                key={ii}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  fontSize: "11px",
                  lineHeight: 1.6,
                  color: theme.textSecondary,
                }}
              >
                <span
                  style={{
                    color: theme.textMuted,
                    marginTop: "7px",
                    fontSize: "3px",
                    flexShrink: 0,
                  }}
                >
                  ●
                </span>
                <span>
                  {item.scope && (
                    <span
                      style={{ fontWeight: 600, color: theme.textPrimary }}
                    >
                      {item.scope}:{" "}
                    </span>
                  )}
                  {item.description}
                  {item.commitHash && (
                    <a
                      href={item.commitUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        marginLeft: "6px",
                        fontFamily: "monospace",
                        fontSize: "9px",
                        color: theme.accent,
                        textDecoration: "none",
                      }}
                    >
                      {item.commitHash.slice(0, 7)}
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

/* ── Sub-component: pagination ───────────────────────────────── */

const Pagination: React.FC<{
  page: number;
  totalPages: number;
  theme: ChangelogTheme;
  onPage: (p: number) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}> = ({ page, totalPages, theme, onPage, scrollRef }) => {
  if (totalPages <= 1) return null;

  const goTo = (p: number) => {
    onPage(p);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "12px 0" }}>
      <button
        onClick={() => goTo(Math.max(0, page - 1))}
        disabled={page === 0}
        style={{ borderRadius: "6px", padding: "6px", cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.25 : 1, color: theme.textSecondary, background: "none", border: "none" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M9 3L5 7L9 11" />
        </svg>
      </button>

      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i}
          onClick={() => goTo(i)}
          style={{
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "10px",
            fontWeight: 700,
            cursor: "pointer",
            background: i === page ? theme.badgeBg : "transparent",
            color: i === page ? theme.badgeText : theme.textMuted,
            border: i === page ? `1px solid ${theme.badgeBorder}` : "1px solid transparent",
          }}
        >
          {i + 1}
        </button>
      ))}

      <button
        onClick={() => goTo(Math.min(totalPages - 1, page + 1))}
        disabled={page === totalPages - 1}
        style={{ borderRadius: "6px", padding: "6px", cursor: page === totalPages - 1 ? "default" : "pointer", opacity: page === totalPages - 1 ? 0.25 : 1, color: theme.textSecondary, background: "none", border: "none" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M5 3L9 7L5 11" />
        </svg>
      </button>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
 *  Main export
 * ═════════════════════════════════════════════════════════════ */

export default function ChangelogDrawer({
  changelogText,
  theme: themeProp,
  repoUrl = REPO_URL_DEFAULT,
  version,
  className = "",
  renderTrigger,
}: ChangelogDrawerProps) {
  /* ── State ───────────────────────────────────────────────── */
  const [drawerMode, setDrawerMode] = useState<"closed" | "peek" | "full">(
    "closed",
  );
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Client-only portal guard
  useEffect(() => setMounted(true), []);

  /* ── Derived data ────────────────────────────────────────── */
  const theme = useMemo(() => resolveTheme(themeProp), [themeProp]);
  const allEntries = useMemo(
    () => parseChangelog(changelogText),
    [changelogText],
  );
  const entries = useMemo(
    () => allEntries.filter((e) => e.sections.length > 0),
    [allEntries],
  );
  const latest = entries[0];
  const displayVersion = version || allEntries[0]?.version || "0.0.0";

  const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);
  const pageEntries = useMemo(
    () => entries.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE),
    [entries, page],
  );

  /* ── Actions ─────────────────────────────────────────────── */
  const open = useCallback((mode: "peek" | "full") => {
    setDrawerMode(mode);
    // Double rAF to let the DOM paint at translateY(100%) first
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true)),
    );
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    // Wait for exit transition
    setTimeout(() => {
      setDrawerMode("closed");
      setPage(0);
    }, 320);
  }, []);

  const expand = useCallback(() => {
    setDrawerMode("full");
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ── Effects ─────────────────────────────────────────────── */

  // Escape to close
  useEffect(() => {
    if (drawerMode === "closed") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawerMode, close]);

  // Lock scroll
  useEffect(() => {
    if (drawerMode !== "closed") {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerMode]);

  /* ── Trigger badge (always visible) ────────────────────── */
  const handleTriggerClick = useCallback(() => open("peek"), [open]);

  const defaultTrigger = (
    <button
      type="button"
      onClick={handleTriggerClick}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        borderRadius: "999px",
        padding: "6px 12px",
        fontSize: "10px",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: "0.18em",
        cursor: "pointer",
        userSelect: "none" as const,
        transition: "all 300ms ease",
        background: theme.triggerBg,
        border: `1px solid ${theme.triggerBorder}`,
        color: theme.triggerText,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = theme.triggerHover;
        e.currentTarget.style.borderColor = theme.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = theme.triggerText;
        e.currentTarget.style.borderColor = theme.triggerBorder;
      }}
    >
      {/* Pulsing dot */}
      <span style={{ position: "relative", display: "flex", width: "8px", height: "8px" }}>
        <span
          style={{
            position: "absolute",
            display: "inline-flex",
            width: "100%",
            height: "100%",
            borderRadius: "999px",
            opacity: 0.75,
            background: theme.accent,
            animation: "cl-ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
        <span
          style={{ position: "relative", display: "inline-flex", width: "8px", height: "8px", borderRadius: "999px", background: theme.accent }}
        />
      </span>

      <span>v{displayVersion}</span>
      <span style={{ opacity: 0.35 }}>·</span>
      <span style={{ color: theme.accent }}>Changelog</span>
    </button>
  );

  const trigger = renderTrigger
    ? renderTrigger({ onClick: handleTriggerClick, version: displayVersion })
    : defaultTrigger;

  /* ── Closed → just render the trigger ─────────────────── */
  if (drawerMode === "closed" || !mounted) return <>{trigger}</>;

  const isPeek = drawerMode === "peek";

  /* ── Drawer portal ─────────────────────────────────────── */
  const drawer = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: visible ? theme.overlay : "transparent",
        transition: "background 300ms ease",
        pointerEvents: visible ? "auto" : "none",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {/* Keyframes injected once */}
      <style>{`
        @keyframes cl-ping {
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>

      {/* ── Sheet ─────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          maxWidth: isPeek ? "480px" : "640px",
          maxHeight: isPeek ? "50vh" : "85vh",
          background: theme.drawerBg,
          border: `1px solid ${theme.drawerBorder}`,
          borderBottom: "none",
          borderRadius: "20px 20px 0 0",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition:
            "transform 320ms cubic-bezier(0.32, 0.72, 0, 1), max-width 300ms ease, max-height 300ms ease",
          boxShadow: "0 -20px 80px rgba(0,0,0,0.50)",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "4px" }}>
          <div
            style={{ height: "4px", width: "40px", borderRadius: "999px", background: theme.divider }}
          />
        </div>

        {/* ── Header ──────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px 12px",
            borderBottom: `1px solid ${theme.divider}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: theme.textPrimary,
              }}
            >
              {isPeek ? "What's New" : "Changelog"}
            </h2>
            {!isPeek && (
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  color: theme.textMuted,
                }}
              >
                {entries.length} release{entries.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button
            onClick={close}
            style={{
              borderRadius: "8px",
              padding: "8px",
              cursor: "pointer",
              color: theme.textMuted,
              background: "transparent",
              border: "none",
              transition: "color 200ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.textPrimary;
              e.currentTarget.style.background = theme.sectionBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.textMuted;
              e.currentTarget.style.background = "transparent";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 4L12 12M12 4L4 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable content ──────────────────────────── */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 20px",
            scrollbarWidth: "thin",
            scrollbarColor: `${theme.scrollbarThumb} ${theme.scrollbarTrack}`,
          }}
        >
          {isPeek ? (
            latest ? (
              <VersionCard
                entry={latest}
                theme={theme}
                repoUrl={repoUrl}
                compact
              />
            ) : (
              <p
                style={{ padding: "32px 0", textAlign: "center", fontSize: "12px", color: theme.textMuted }}
              >
                No changelog entries yet.
              </p>
            )
          ) : (
            pageEntries.map((entry) => (
              <VersionCard
                key={entry.version}
                entry={entry}
                theme={theme}
                repoUrl={repoUrl}
              />
            ))
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div
          style={{ padding: "12px 20px", borderTop: `1px solid ${theme.divider}` }}
        >
          {isPeek ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <a
                href={
                  latest
                    ? `${repoUrl}/releases/tag/v${latest.version}`
                    : repoUrl
                }
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  color: theme.accent,
                  textDecoration: "none",
                }}
              >
                View on GitHub ↗
              </a>
              <button
                onClick={expand}
                style={{
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  background: theme.badgeBg,
                  color: theme.badgeText,
                  border: `1px solid ${theme.badgeBorder}`,
                  transition: "all 200ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.accent;
                  e.currentTarget.style.color = theme.drawerBg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = theme.badgeBg;
                  e.currentTarget.style.color = theme.badgeText;
                }}
              >
                All changes ({entries.length})
              </button>
            </div>
          ) : (
            <Pagination
              page={page}
              totalPages={totalPages}
              theme={theme}
              onPage={setPage}
              scrollRef={scrollRef}
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {trigger}
      {createPortal(drawer, document.body)}
    </>
  );
}
