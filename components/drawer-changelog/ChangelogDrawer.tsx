/* ── Changelog Drawer ─────────────────────────────────────────
 *
 *  A shared, themeable changelog UI that lives in the footer of
 *  every JACK app.  It has two modes:
 *
 *  1. **Peek**  – small bottom-sheet with the latest release.
 *  2. **Full**  – near-full-screen paginated list of all releases
 *                 with GitHub tag links.
 *
 *  Usage:
 *    <ChangelogDrawer
 *      changelogText={rawMarkdown}
 *      theme="landing"       // or "dashboard" or custom ChangelogTheme
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
      className="flex items-center justify-between flex-wrap gap-2"
      style={{ marginBottom: "10px" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide"
          style={{
            background: theme.badgeBg,
            color: theme.badgeText,
            border: `1px solid ${theme.badgeBorder}`,
          }}
        >
          v{entry.version}
        </span>
        <span className="text-[10px]" style={{ color: theme.textMuted }}>
          {formatDate(entry.date)}
        </span>
      </div>
      <a
        href={`${repoUrl}/releases/tag/v${entry.version}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-opacity hover:opacity-70"
        style={{
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
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em]"
            style={{ color: theme.textMuted, marginBottom: "5px" }}
          >
            <span style={{ color: theme.accent, fontSize: "8px" }}>
              {meta.icon}
            </span>
            {meta.label}
          </div>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item, ii) => (
              <div
                key={ii}
                className="flex items-start gap-2 text-[11px] leading-relaxed"
                style={{ color: theme.textSecondary }}
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
                      className="font-semibold"
                      style={{ color: theme.textPrimary }}
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
                      className="ml-1.5 font-mono text-[9px] transition-opacity hover:opacity-70"
                      style={{ color: theme.accent }}
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
    <div className="flex items-center justify-center gap-1 py-3">
      <button
        onClick={() => goTo(Math.max(0, page - 1))}
        disabled={page === 0}
        className="rounded-md p-1.5 transition-opacity disabled:opacity-25 cursor-pointer disabled:cursor-default"
        style={{ color: theme.textSecondary }}
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
          className="rounded-md px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer"
          style={{
            background: i === page ? theme.badgeBg : "transparent",
            color: i === page ? theme.badgeText : theme.textMuted,
            border:
              i === page
                ? `1px solid ${theme.badgeBorder}`
                : "1px solid transparent",
          }}
        >
          {i + 1}
        </button>
      ))}

      <button
        onClick={() => goTo(Math.min(totalPages - 1, page + 1))}
        disabled={page === totalPages - 1}
        className="rounded-md p-1.5 transition-opacity disabled:opacity-25 cursor-pointer disabled:cursor-default"
        style={{ color: theme.textSecondary }}
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
      className={`group inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-all duration-300 cursor-pointer select-none ${className}`}
      style={{
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
      <span className="relative flex h-2 w-2">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{
            background: theme.accent,
            animation: "cl-ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ background: theme.accent }}
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
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      style={{
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
        className="relative w-full flex flex-col"
        style={{
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
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: theme.divider }}
          />
        </div>

        {/* ── Header ──────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 pb-3"
          style={{ borderBottom: `1px solid ${theme.divider}` }}
        >
          <div className="flex items-center gap-3">
            <h2
              className="text-sm font-bold tracking-wide"
              style={{ color: theme.textPrimary }}
            >
              {isPeek ? "What's New" : "Changelog"}
            </h2>
            {!isPeek && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: theme.textMuted }}
              >
                {entries.length} release{entries.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button
            onClick={close}
            className="rounded-lg p-2 transition-colors cursor-pointer"
            style={{ color: theme.textMuted }}
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
          className="flex-1 overflow-y-auto px-5"
          style={{
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
                className="py-8 text-center text-xs"
                style={{ color: theme.textMuted }}
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
          className="px-5 py-3"
          style={{ borderTop: `1px solid ${theme.divider}` }}
        >
          {isPeek ? (
            <div className="flex items-center justify-between">
              <a
                href={
                  latest
                    ? `${repoUrl}/releases/tag/v${latest.version}`
                    : repoUrl
                }
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold uppercase tracking-wider transition-opacity hover:opacity-70"
                style={{ color: theme.accent }}
              >
                View on GitHub ↗
              </a>
              <button
                onClick={expand}
                className="rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                style={{
                  background: theme.badgeBg,
                  color: theme.badgeText,
                  border: `1px solid ${theme.badgeBorder}`,
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
