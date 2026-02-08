/**
 * DashboardWalkthroughComposition — Streamer-style PIRATE JACK walkthrough
 *
 * Features:
 *  - Real dashboard screenshots (captured via Puppeteer)
 *  - 3D-styled pirate JACK avatar PIP (default)
 *  - jack.png PIP fallback (2.5D parallax + mouth movement overlay)
 *  - Per-section TTS audio (edge-tts generated, en-US-AndrewNeural)
 *  - Synced subtitles with typewriter effect
 *  - Zoom/pan on dashboard screenshots
 *  - Animated cursor highlighting features
 *
 * Timeline driven by generated audio (sections.json):
 *   intro → create-intent → executions → agent-costs → outro
 */
import React from "react";
import {
  AbsoluteFill,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Img,
  staticFile,
} from "remotion";

// ── Load generated timing data ──
import sectionsData from "../../public/audio/sections.json";
import subtitlesData from "../../public/audio/subtitles.json";

// ── Jack character (versioned — see characters/index.tsx) ──
import { PirateJackCam, BRAND } from "../characters";

export interface DashboardWalkthroughProps {
  visemeSequence?: Array<{ frame: number; viseme: string }>;
  captions?: Array<{ startFrame: number; endFrame: number; text: string }>;
  usePngFallback?: boolean;
  dashboardScreenshots?: {
    createIntent?: string;
    executions?: string;
    agentCosts?: string;
    full?: string;
  };
}

// ── Timeline sections (from generated audio) ──
interface SectionDef {
  id: string;
  label: string;
  screenshot: string;
  startFrame: number;
  endFrame: number;
  audioFile: string;
  audioDurationS: number;
  zoomTarget: { x: number; y: number; scale: number } | null;
}

const SECTIONS: SectionDef[] = (sectionsData as any[]).map((s: any) => ({
  id: s.id,
  label: s.label,
  screenshot: s.screenshot,
  startFrame: s.startFrame,
  endFrame: s.endFrame,
  audioFile: s.audioFile,
  audioDurationS: s.audioDurationS,
  zoomTarget: s.zoomTarget,
}));

const TOTAL_FRAMES = SECTIONS[SECTIONS.length - 1].endFrame;

// ── Subtitles (from generated audio) ──
interface SubtitleEntry {
  startFrame: number;
  endFrame: number;
  text: string;
  id: string;
}
const SUBTITLES: SubtitleEntry[] = subtitlesData as SubtitleEntry[];

function getCurrentSection(frame: number): SectionDef {
  return (
    SECTIONS.find((s) => frame >= s.startFrame && frame < s.endFrame) ||
    SECTIONS[0]
  );
}

function getCaption(
  frame: number,
): { text: string; progress: number } | null {
  const c = SUBTITLES.find(
    (c) => frame >= c.startFrame && frame < c.endFrame,
  );
  if (!c) return null;
  const progress = (frame - c.startFrame) / (c.endFrame - c.startFrame);
  return { text: c.text, progress };
}

// ══════════════════════════════════════════════
// ══ PIRATE JACK AVATAR — imported from       ═
// ══  ../characters/ (versioned)              ═
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════
// ══ JACK.PNG AVATAR — Webcam PIP ═════════════
// ══════════════════════════════════════════════
const JackPngCam: React.FC<{
  frame: number;
  fps: number;
  isSpeaking: boolean;
  viseme: string;
  size?: number;
}> = ({ frame, fps, isSpeaking, viseme, size = 220 }) => {
  const t = frame / fps;

  const { openY } = (() => {
    switch (viseme) {
      case "aa":
        return { openY: 16 };
      case "ee":
        return { openY: 7 };
      case "ih":
        return { openY: 6 };
      case "oh":
        return { openY: 14 };
      case "ou":
        return { openY: 9 };
      default:
        return { openY: 0 };
    }
  })();

  const headBob = isSpeaking ? Math.sin(t * 3.5) * 2.5 : Math.sin(t * 0.5) * 1;
  const headTilt = Math.sin(t * 0.25) * 2;
  const glowIntensity = isSpeaking ? 0.7 + Math.sin(t * 6) * 0.3 : 0.2;
  const breathe = Math.sin(t * 1.5) * 1;
  const mouthOpen = Math.max(0, openY / 16);
  const S = size;

  return (
    <div style={{ width: S, height: S, position: "relative" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 20,
          overflow: "hidden",
          border: `3px solid ${BRAND.GOLD}`,
          boxShadow: `0 0 ${glowIntensity * 30}px ${BRAND.GOLD}${Math.round(
            glowIntensity * 99,
          )
            .toString(16)
            .padStart(2, "0")}, 0 8px 32px rgba(0,0,0,0.6)`,
          background: `radial-gradient(ellipse at 50% 30%, #1a2a40, ${BRAND.NAVY})`,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "52%",
            transform: `translate(-50%, -50%) translateY(${headBob + breathe}px) rotate(${headTilt}deg)`,
            width: "90%",
            height: "90%",
          }}
        >
          <Img
            src={staticFile("jack.png")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.55))",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "66%",
              width: "16%",
              height: `${6 + mouthOpen * 14}%`,
              transform: `translate(-50%, -50%) scaleY(${0.6 + mouthOpen * 0.9})`,
              borderRadius: "0 0 40% 40%",
              background: "rgba(20, 8, 6, 0.45)",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)",
              mixBlendMode: "multiply",
              opacity: 0.5 + mouthOpen * 0.4,
            }}
          />
        </div>

        {isSpeaking && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              padding: "2px 8px",
              borderRadius: 4,
              background: "#FF0000",
              fontSize: 10,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#fff",
                opacity: Math.sin(frame / 5) > 0 ? 1 : 0.3,
              }}
            />
            LIVE
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: -14,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "3px 16px",
          borderRadius: 8,
          background: BRAND.GOLD,
          fontSize: 12,
          fontWeight: 800,
          color: "#000",
          letterSpacing: "0.06em",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span style={{ fontSize: 10 }}>☠</span> JACK
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
// ══ ANIMATED CURSOR ═════════════════════════
// ══════════════════════════════════════════════
const AnimatedCursor: React.FC<{
  frame: number;
  fps: number;
  x: number;
  y: number;
  visible: boolean;
}> = ({ frame, fps, x, y, visible }) => {
  if (!visible) return null;
  const pulse = Math.sin((frame / fps) * 3) * 0.1 + 1;
  const opacity = interpolate(frame % 60, [0, 10, 50, 60], [0, 1, 1, 0.8], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: `translate(-50%, -50%) scale(${pulse})`,
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: `2px solid ${BRAND.GOLD}`,
          background: `${BRAND.GOLD}15`,
          boxShadow: `0 0 20px ${BRAND.GOLD}33`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: BRAND.GOLD,
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
};

// ══════════════════════════════════════════════
// ══ DASHBOARD SCREENSHOT VIEWER ═════════════
// ══════════════════════════════════════════════
const DashboardScreen: React.FC<{
  frame: number;
  fps: number;
  screenshotPath: string;
  zoomTarget: { x: number; y: number; scale: number } | null;
  sectionFrame: number;
  sectionDuration: number;
}> = ({
  frame,
  fps,
  screenshotPath,
  zoomTarget,
  sectionFrame,
  sectionDuration,
}) => {
  const zoomProgress = zoomTarget
    ? interpolate(
        sectionFrame,
        [0, 60, sectionDuration - 30, sectionDuration],
        [1, zoomTarget.scale, zoomTarget.scale, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 1;
  const panX = zoomTarget
    ? interpolate(
        sectionFrame,
        [0, 60, sectionDuration - 30, sectionDuration],
        [50, zoomTarget.x * 100, zoomTarget.x * 100, 50],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 50;
  const panY = zoomTarget
    ? interpolate(
        sectionFrame,
        [0, 60, sectionDuration - 30, sectionDuration],
        [50, zoomTarget.y * 100, zoomTarget.y * 100, 50],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 50;

  const slideIn = spring({
    frame: sectionFrame,
    fps,
    from: 20,
    to: 0,
    durationInFrames: 20,
  });
  const fadeIn = interpolate(sectionFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 52,
        left: 30,
        right: 270,
        bottom: 80,
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${BRAND.BORDER}`,
        boxShadow:
          "0 20px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
        opacity: fadeIn,
        transform: `translateY(${slideIn}px)`,
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          height: 36,
          background: "#0D1117",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 6,
          borderBottom: "1px solid #1e293b",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: BRAND.RED,
          }}
        />
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: BRAND.AMBER,
          }}
        />
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: BRAND.GREEN,
          }}
        />
        <div
          style={{
            flex: 1,
            marginLeft: 10,
            padding: "3px 12px",
            background: "#0B1020",
            borderRadius: 6,
            fontSize: 11,
            color: BRAND.MUTED,
            fontFamily: "monospace",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ color: BRAND.GREEN }}>🔒</span>
          testnet.jack.lukas.money/dashboard
        </div>
      </div>

      {/* Screenshot with zoom/pan */}
      <div
        style={{
          width: "100%",
          height: "calc(100% - 36px)",
          overflow: "hidden",
        }}
      >
        <Img
          src={screenshotPath}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
            transform: `scale(${zoomProgress})`,
            transformOrigin: `${panX}% ${panY}%`,
          }}
        />
      </div>
    </div>
  );
};

// ── Section indicator (top bar) ──
const SectionBadge: React.FC<{
  label: string;
  index: number;
  total: number;
  frame: number;
  fps: number;
}> = ({ label, index, total, frame, fps }) => {
  const scale = spring({ frame, fps, config: { damping: 15 } });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        transform: `scale(${scale})`,
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === index ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === index ? BRAND.GOLD : `${BRAND.GOLD}33`,
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: BRAND.GOLD,
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════
// ═══ MAIN COMPOSITION ═════════════════════════
// ═══════════════════════════════════════════════
const DashboardWalkthroughComposition: React.FC<DashboardWalkthroughProps> = ({
  visemeSequence = [],
  dashboardScreenshots = {},
  usePngFallback = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const section = getCurrentSection(frame);
  const sectionIndex = SECTIONS.findIndex((s) => s.id === section.id);
  const sectionFrame = frame - section.startFrame;
  const sectionDuration = section.endFrame - section.startFrame;

  // Viseme
  let currentViseme = "sil";
  if (visemeSequence.length > 0) {
    for (const e of visemeSequence) {
      if (e.frame <= frame) currentViseme = e.viseme;
      else break;
    }
  }

  // Caption from generated subtitles
  const caption = getCaption(frame);

  // Infer speaking from captions when no viseme data
  const isSpeaking =
    visemeSequence.length > 0 ? currentViseme !== "sil" : caption !== null;

  // Pseudo-viseme from caption timing for mouth animation
  const pseudoViseme = (() => {
    if (!isSpeaking) return "sil";
    if (visemeSequence.length > 0) return currentViseme;
    const visemes = [
      "aa",
      "ee",
      "oh",
      "sil",
      "ih",
      "ou",
      "sil",
      "ee",
      "aa",
      "sil",
    ];
    return visemes[Math.floor(frame / 3) % visemes.length];
  })();

  // Screenshot paths
  const screenshotMap: Record<string, string> = {
    full:
      dashboardScreenshots?.full ||
      staticFile("screenshots/dashboard-full.png"),
    createIntent:
      dashboardScreenshots?.createIntent ||
      staticFile("screenshots/dashboard-create-intent.png"),
    executions:
      dashboardScreenshots?.executions ||
      staticFile("screenshots/dashboard-executions.png"),
    agentCosts:
      dashboardScreenshots?.agentCosts ||
      staticFile("screenshots/dashboard-agent-costs.png"),
  };
  const currentScreenshot =
    screenshotMap[section.screenshot] || screenshotMap.full;

  // Global fade
  const globalFade = interpolate(
    frame,
    [0, 15, durationInFrames - 20, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Cursor positions per section
  const cursorVisible =
    section.id !== "intro" &&
    section.id !== "outro" &&
    sectionFrame > 30 &&
    sectionFrame < sectionDuration - 20;
  const cursorX = (() => {
    if (section.id === "create-intent")
      return interpolate(
        sectionFrame,
        [30, 200, 400, 600, 900],
        [0.3, 0.4, 0.35, 0.5, 0.4],
        { extrapolateRight: "clamp" },
      );
    if (section.id === "executions")
      return interpolate(
        sectionFrame,
        [30, 300, 500, 800],
        [0.3, 0.5, 0.6, 0.45],
        { extrapolateRight: "clamp" },
      );
    if (section.id === "agent-costs")
      return interpolate(
        sectionFrame,
        [30, 300, 500, 700],
        [0.35, 0.5, 0.4, 0.55],
        { extrapolateRight: "clamp" },
      );
    return 0.5;
  })();
  const cursorY = (() => {
    if (section.id === "create-intent")
      return interpolate(
        sectionFrame,
        [30, 200, 400, 600, 900],
        [0.4, 0.5, 0.6, 0.7, 0.5],
        { extrapolateRight: "clamp" },
      );
    if (section.id === "executions")
      return interpolate(
        sectionFrame,
        [30, 300, 500, 800],
        [0.35, 0.5, 0.65, 0.4],
        { extrapolateRight: "clamp" },
      );
    if (section.id === "agent-costs")
      return interpolate(
        sectionFrame,
        [30, 250, 500, 700],
        [0.4, 0.55, 0.6, 0.45],
        { extrapolateRight: "clamp" },
      );
    return 0.5;
  })();

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${BRAND.NAVY} 0%, #060d1a 50%, ${BRAND.NAVY} 100%)`,
        fontFamily:
          "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        opacity: globalFade,
        overflow: "hidden",
      }}
    >
      {/* ══ Per-section audio tracks ══ */}
      {SECTIONS.map((sec) => (
        <Sequence
          key={sec.id}
          from={sec.startFrame}
          durationInFrames={sec.endFrame - sec.startFrame}
        >
          <Audio src={staticFile(`audio/${sec.audioFile}`)} volume={1} />
        </Sequence>
      ))}

      {/* ── Ambient particles ── */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${((i * 53 + frame * 0.02) % 100)}%`,
            top: `${((i * 37 + Math.sin(frame / 60 + i) * 10 + 50) % 100)}%`,
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: BRAND.SKY,
            opacity: 0.1 + Math.sin(frame / 30 + i) * 0.05,
          }}
        />
      ))}

      {/* ── Top bar ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          background: `${BRAND.NAVY}ee`,
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${BRAND.BORDER}`,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          zIndex: 100,
        }}
      >
        {/* REC indicator + Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              padding: "3px 10px",
              borderRadius: 4,
              background: isSpeaking ? "#FF0000" : "#333",
              fontSize: 10,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#fff",
                opacity: isSpeaking
                  ? Math.sin(frame / 5) > 0
                    ? 1
                    : 0.3
                  : 0.5,
              }}
            />
            REC
          </div>

          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: BRAND.GOLD,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 900,
              color: "#000",
            }}
          >
            J
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: BRAND.WHITE,
              letterSpacing: "0.04em",
            }}
          >
            JACK Kernel
          </span>
          <span
            style={{ fontSize: 11, color: BRAND.MUTED, marginLeft: 4 }}
          >
            Dashboard Walkthrough
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <SectionBadge
          label={section.label}
          index={sectionIndex}
          total={SECTIONS.length}
          frame={sectionFrame}
          fps={fps}
        />
      </div>

      {/* ── INTRO ── */}
      {section.id === "intro" && (
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: BRAND.GOLD,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              fontWeight: 900,
              color: "#000",
              opacity: interpolate(frame, [0, 15], [0, 1], {
                extrapolateRight: "clamp",
              }),
              transform: `scale(${spring({ frame, fps, config: { damping: 12 } })})`,
              boxShadow: `0 0 60px ${BRAND.GOLD}44`,
              marginBottom: 20,
            }}
          >
            J
          </div>

          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: BRAND.WHITE,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              opacity: interpolate(frame, [8, 25], [0, 1], {
                extrapolateRight: "clamp",
              }),
              transform: `translateY(${interpolate(frame, [8, 25], [20, 0], { extrapolateRight: "clamp" })}px)`,
            }}
          >
            JACK Kernel
          </div>

          <div
            style={{
              fontSize: 20,
              color: BRAND.GOLD,
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginTop: 8,
              opacity: interpolate(frame, [20, 40], [0, 1], {
                extrapolateRight: "clamp",
              }),
            }}
          >
            Dashboard Walkthrough
          </div>

          <div
            style={{
              width: 60,
              height: 3,
              borderRadius: 2,
              background: BRAND.GOLD,
              marginTop: 20,
              opacity: interpolate(frame, [30, 50], [0, 1], {
                extrapolateRight: "clamp",
              }),
            }}
          />

          <div
            style={{
              fontSize: 14,
              color: BRAND.MUTED,
              marginTop: 16,
              opacity: interpolate(frame, [50, 70], [0, 1], {
                extrapolateRight: "clamp",
              }),
            }}
          >
            testnet.jack.lukas.money
          </div>
        </AbsoluteFill>
      )}

      {/* ── DASHBOARD SCREENSHOT ── */}
      {section.id !== "intro" && section.id !== "outro" && (
        <DashboardScreen
          frame={frame}
          fps={fps}
          screenshotPath={currentScreenshot}
          zoomTarget={section.zoomTarget}
          sectionFrame={sectionFrame}
          sectionDuration={sectionDuration}
        />
      )}

      {/* ── Animated cursor ── */}
      {section.id !== "intro" && section.id !== "outro" && (
        <div
          style={{
            position: "absolute",
            top: 52,
            left: 30,
            right: 270,
            bottom: 80,
            pointerEvents: "none",
            zIndex: 20,
          }}
        >
          <AnimatedCursor
            frame={sectionFrame}
            fps={fps}
            x={cursorX}
            y={cursorY}
            visible={cursorVisible}
          />
        </div>
      )}

      {/* ── OUTRO ── */}
      {section.id === "outro" && (
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: BRAND.GOLD,
              letterSpacing: "-0.01em",
              opacity: interpolate(sectionFrame, [0, 20], [0, 1], {
                extrapolateRight: "clamp",
              }),
              transform: `translateY(${interpolate(sectionFrame, [0, 20], [15, 0], { extrapolateRight: "clamp" })}px)`,
            }}
          >
            Set Sail
          </div>
          <div
            style={{
              fontSize: 18,
              color: BRAND.MUTED,
              marginTop: 10,
              opacity: interpolate(sectionFrame, [10, 30], [0, 1], {
                extrapolateRight: "clamp",
              }),
            }}
          >
            Three tabs. Full control. Total transparency.
          </div>

          <div
            style={{
              marginTop: 32,
              padding: "14px 40px",
              borderRadius: 12,
              background: BRAND.GOLD,
              fontSize: 16,
              fontWeight: 800,
              color: "#000",
              letterSpacing: "0.02em",
              opacity: interpolate(sectionFrame, [20, 45], [0, 1], {
                extrapolateRight: "clamp",
              }),
              transform: `scale(${spring({ frame: Math.max(0, sectionFrame - 20), fps, config: { damping: 12 } })})`,
              boxShadow: `0 4px 20px ${BRAND.GOLD}44`,
            }}
          >
            testnet.jack.lukas.money
          </div>

          <div
            style={{
              display: "flex",
              gap: 20,
              marginTop: 30,
              opacity: interpolate(sectionFrame, [40, 60], [0, 1], {
                extrapolateRight: "clamp",
              }),
            }}
          >
            {[
              "Cross-Chain Settlement",
              "Agent-Based Execution",
              "On-Chain Transparency",
            ].map((t) => (
              <div
                key={t}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `1px solid ${BRAND.BORDER}`,
                  fontSize: 11,
                  color: BRAND.MUTED,
                  fontWeight: 600,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* ── JACK Streamer Cam ── */}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          right: 28,
          zIndex: 80,
          opacity: interpolate(frame, [20, 45], [0, 1], {
            extrapolateRight: "clamp",
          }),
          transform: `scale(${spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 15 } })})`,
        }}
      >
        {usePngFallback ? (
          <JackPngCam
            frame={frame}
            fps={fps}
            isSpeaking={isSpeaking}
            viseme={pseudoViseme}
            size={section.id === "intro" || section.id === "outro" ? 180 : 200}
          />
        ) : (
          <PirateJackCam
            frame={frame}
            fps={fps}
            isSpeaking={isSpeaking}
            viseme={pseudoViseme}
            size={section.id === "intro" || section.id === "outro" ? 180 : 200}
          />
        )}
      </div>

      {/* ── Caption bar (typewriter) ── */}
      {caption && (
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: 30,
            right: 270,
            zIndex: 90,
          }}
        >
          <div
            style={{
              padding: "10px 20px",
              background: `${BRAND.NAVY}dd`,
              backdropFilter: "blur(8px)",
              borderRadius: 10,
              border: `1px solid ${BRAND.BORDER}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: BRAND.GOLD,
                opacity: isSpeaking
                  ? Math.sin(frame / 4) > 0
                    ? 1
                    : 0.4
                  : 0.3,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontSize: 16,
                color: BRAND.WHITE,
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              {caption.text.slice(
                0,
                Math.floor(
                  caption.text.length * Math.min(1, caption.progress * 2.5),
                ),
              )}
              {caption.progress < 0.4 && (
                <span
                  style={{
                    color: BRAND.GOLD,
                    opacity: Math.sin(frame / 4) > 0 ? 1 : 0,
                  }}
                >
                  |
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Progress bar ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `${BRAND.GOLD}15`,
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(frame / durationInFrames) * 100}%`,
            background: `linear-gradient(90deg, ${BRAND.GOLD}, ${BRAND.SKY})`,
            borderRadius: "0 2px 2px 0",
          }}
        />
      </div>

      {/* ── Timecode ── */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          right: 10,
          fontSize: 10,
          fontFamily: "monospace",
          color: `${BRAND.MUTED}66`,
          zIndex: 100,
        }}
      >
        {Math.floor(frame / fps / 60)
          .toString()
          .padStart(2, "0")}
        :
        {Math.floor((frame / fps) % 60)
          .toString()
          .padStart(2, "0")}
        .
        {(frame % fps).toString().padStart(2, "0")}
      </div>
    </AbsoluteFill>
  );
};

export default DashboardWalkthroughComposition;
