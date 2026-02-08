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

// ── Dashboard brand colors ──
const BRAND = {
  GOLD: "#F2B94B",
  NAVY: "#0B1020",
  DARK: "#0F1A2E",
  SKY: "#38BDF8",
  GREEN: "#27C93F",
  RED: "#FF5F56",
  AMBER: "#FFBD2E",
  WHITE: "#ffffff",
  MUTED: "#94a3b8",
  BORDER: "rgba(242,185,75,0.30)",
};

// ── Skin tones for pirate JACK ──
const SKIN = "#c68642";
const SKIN_LIGHT = "#d4954a";
const SKIN_SHADOW = "#a0622e";

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
// ══ PIRATE JACK AVATAR — Webcam PIP ═════════
// ══  Pirate JACK — CSS avatar PIP v1.0.0      
// ══  @version 1.0.0                           
// ══════════════════════════════════════════════
const PirateJackCam: React.FC<{
  frame: number;
  fps: number;
  isSpeaking: boolean;
  viseme: string;
  size?: number;
}> = ({ frame, fps, isSpeaking, viseme, size = 220 }) => {
  const t = frame / fps;

  // Mouth shape from viseme
  const { openY, mouthW } = (() => {
    switch (viseme) {
      case "aa": return { openY: 18, mouthW: 11 };
      case "ee": return { openY: 7, mouthW: 14 };
      case "ih": return { openY: 6, mouthW: 12 };
      case "oh": return { openY: 15, mouthW: 8 };
      case "ou": return { openY: 10, mouthW: 6 };
      default:  return { openY: 0, mouthW: 9 };
    }
  })();

  // Animation params
  const blinkPhase = Math.sin(t * 0.25);
  const isBlinking = blinkPhase > 0.985;
  const headBob = isSpeaking ? Math.sin(t * 3.5) * 2 : Math.sin(t * 0.5) * 0.8;
  const headTilt = Math.sin(t * 0.25) * 1.5;
  const glowIntensity = isSpeaking ? 0.7 + Math.sin(t * 6) * 0.3 : 0.2;
  const breathe = Math.sin(t * 1.5) * 0.8;

  const S = size;
  const headW = S * 0.58;
  const headH = S * 0.62;

  return (
    <div style={{ width: S, height: S, position: "relative" }}>
      {/* Webcam frame */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 20,
          overflow: "hidden",
          border: `3px solid ${BRAND.GOLD}`,
          boxShadow: `0 0 ${glowIntensity * 30}px ${BRAND.GOLD}${Math.round(glowIntensity * 99).toString(16).padStart(2, "0")}, 0 8px 32px rgba(0,0,0,0.6)`,
          background: `radial-gradient(ellipse at 50% 35%, #122240, #080e1e)`,
          position: "relative",
        }}
      >
        {/* ── Subtle compass rose bg ── */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: S * 0.7, height: S * 0.7,
          borderRadius: "50%",
          border: `1px solid rgba(242,185,75,0.08)`,
          opacity: 0.4,
        }} />
        {[0, 45, 90, 135].map((deg) => (
          <div key={deg} style={{
            position: "absolute", top: "50%", left: "50%",
            width: 1, height: S * 0.3,
            background: `rgba(242,185,75,0.06)`,
            transformOrigin: "top center",
            transform: `translate(-50%, 0) rotate(${deg}deg)`,
          }} />
        ))}

        {/* ── Ambient gold dust ── */}
        {[0.15, 0.35, 0.55, 0.72, 0.88].map((px, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${px * 100}%`,
            top: `${(0.2 + Math.sin(t * 0.3 + i * 1.8) * 0.15) * 100}%`,
            width: 2, height: 2, borderRadius: "50%",
            background: BRAND.GOLD,
            opacity: 0.15 + Math.sin(t * 0.5 + i) * 0.1,
          }} />
        ))}

        {/* ── Character group ── */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "48%",
            transform: `translate(-50%, -50%) translateY(${headBob + breathe}px) rotate(${headTilt}deg)`,
          }}
        >
          {/* ── BODY / COAT ── */}
          <div
            style={{
              position: "absolute",
              top: headH * 0.82,
              left: "50%",
              transform: "translateX(-50%)",
              width: headW * 1.7,
              height: S * 0.36,
              background: "linear-gradient(180deg, #1a1a1a 0%, #0e0e0e 100%)",
              borderRadius: "30% 30% 50% 50%",
              overflow: "hidden",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            {/* Coat lapels */}
            <div style={{
              position: "absolute", top: 0, left: "28%",
              width: "44%", height: "60%",
              background: "linear-gradient(180deg, #8B0000 0%, #4a0000 100%)",
              clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
            }} />
            {/* White shirt */}
            <div style={{
              position: "absolute", top: 1, left: "37%",
              width: "26%", height: "52%",
              background: "linear-gradient(180deg, #f0e8d8 0%, #ddd0be 100%)",
              clipPath: "polygon(28% 0%, 72% 0%, 100% 100%, 0% 100%)",
            }} />
            {/* Gold buttons */}
            {[0.2, 0.38, 0.56].map((p, i) => (
              <div key={`bl-${i}`} style={{
                position: "absolute", top: `${p * 100}%`, left: "43%",
                width: 4, height: 4, borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, #FFD700, #B8860B)`,
              }} />
            ))}
            {[0.2, 0.38, 0.56].map((p, i) => (
              <div key={`br-${i}`} style={{
                position: "absolute", top: `${p * 100}%`, right: "43%",
                width: 4, height: 4, borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, #FFD700, #B8860B)`,
              }} />
            ))}
            {/* Gold chain */}
            <div style={{
              position: "absolute", top: "12%", left: "32%",
              width: "36%", height: 2,
              background: `linear-gradient(90deg, transparent, ${BRAND.GOLD}, transparent)`,
              borderRadius: 2, opacity: 0.6,
            }} />
          </div>

          {/* ── HEAD ── */}
          <div
            style={{
              width: headW,
              height: headH,
              borderRadius: "50% 50% 45% 45%",
              background: `radial-gradient(ellipse at 42% 38%, ${SKIN_LIGHT}, ${SKIN})`,
              position: "relative",
              boxShadow: `inset -5px -5px 10px ${SKIN_SHADOW}55, inset 2px 2px 6px rgba(255,220,180,0.1)`,
            }}
          >
            {/* ── HAIR (sides) ── */}
            <div style={{
              position: "absolute", top: "18%", left: "-8%",
              width: "24%", height: "80%",
              background: "linear-gradient(180deg, #3a2a1a 0%, #2a1a0a 70%)",
              borderRadius: "40% 20% 30% 50%",
              transform: `rotate(${2 + Math.sin(t * 0.8) * 1.5}deg)`,
            }} />
            <div style={{
              position: "absolute", top: "18%", right: "-8%",
              width: "24%", height: "80%",
              background: "linear-gradient(180deg, #3a2a1a 0%, #2a1a0a 70%)",
              borderRadius: "20% 40% 50% 30%",
              transform: `rotate(${-2 + Math.sin(t * 0.8 + 1) * 1.5}deg)`,
            }} />

            {/* ── PIRATE HAT ── */}
            <div style={{
              position: "absolute", top: "-28%", left: "-18%",
              width: "136%", height: "50%",
              zIndex: 3,
            }}>
              {/* Hat body */}
              <div style={{
                position: "absolute", bottom: "10%", left: "18%",
                width: "64%", height: "55%",
                background: "linear-gradient(180deg, #1a1a1a 0%, #111 100%)",
                borderRadius: "50% 50% 5% 5%",
              }} />
              {/* Brim */}
              <div style={{
                position: "absolute", bottom: "-2%", left: "5%",
                width: "90%", height: "28%",
                background: "linear-gradient(180deg, #1a1a1a 0%, #0e0e0e 100%)",
                borderRadius: "50%",
                transform: "perspective(100px) rotateX(10deg)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
              }} />
              {/* Gold band */}
              <div style={{
                position: "absolute", bottom: "22%", left: "20%",
                width: "60%", height: 3,
                background: `linear-gradient(90deg, transparent, ${BRAND.GOLD}, transparent)`,
                borderRadius: 2,
              }} />
              {/* Skull emblem */}
              <div style={{
                position: "absolute", bottom: "30%", left: "50%",
                transform: "translateX(-50%)",
                fontSize: S * 0.09, lineHeight: 1,
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
              }}>
                ☠
              </div>
            </div>

            {/* ── EYEBROWS ── */}
            <div style={{
              position: "absolute", top: "36%", right: "18%",
              width: "22%", height: 3,
              background: "#3a2a1a",
              borderRadius: 2,
              transform: `rotate(${isSpeaking ? 2 : 4}deg)`,
              zIndex: 4,
            }} />
            <div style={{
              position: "absolute", top: "37%", left: "20%",
              width: "20%", height: 3,
              background: "#3a2a1a",
              borderRadius: 2,
              transform: "rotate(-3deg)",
              zIndex: 4,
            }} />

            {/* ── EYES (both visible) ── */}
            {[-1, 1].map((side) => (
              <div key={side} style={{
                position: "absolute", top: "40%",
                [side === -1 ? "left" : "right"]: "18%",
                width: S * 0.11, height: isBlinking ? 2 : S * 0.08,
                borderRadius: isBlinking ? 2 : "50%",
                background: isBlinking ? SKIN : "radial-gradient(ellipse at 50% 45%, #f5f5f0, #e8e0d0)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", zIndex: 4,
                boxShadow: isBlinking ? "none" : "0 1px 3px rgba(0,0,0,0.3)",
              }}>
                {!isBlinking && (
                  <div style={{
                    width: S * 0.05, height: S * 0.05,
                    borderRadius: "50%",
                    background: "radial-gradient(circle at 45% 40%, #4a6b2a, #2d4016)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative",
                  }}>
                    <div style={{
                      width: S * 0.022, height: S * 0.022,
                      borderRadius: "50%", background: "#000",
                    }} />
                    <div style={{
                      position: "absolute", top: "22%", right: "24%",
                      width: S * 0.01, height: S * 0.01,
                      borderRadius: "50%", background: "#fff",
                      opacity: 0.8,
                    }} />
                  </div>
                )}
              </div>
            ))}

            {/* ── NOSE ── */}
            <div style={{
              position: "absolute", top: "51%", left: "47%",
              transform: "translateX(-50%)",
              width: S * 0.05, height: S * 0.065,
              background: `radial-gradient(ellipse at 40% 35%, ${SKIN_LIGHT}, ${SKIN_SHADOW})`,
              borderRadius: "35% 35% 50% 50%",
              zIndex: 4,
            }} />

            {/* ── BEARD ── */}
            <div style={{
              position: "absolute", top: "60%", left: "12%",
              width: "76%", height: "50%",
              background: "linear-gradient(180deg, #6a3a1a 0%, #4a2a12 50%, #3a1a0a 90%)",
              borderRadius: "15% 15% 50% 50%",
              zIndex: 5,
            }} />

            {/* ── MOUTH (lip sync) ── */}
            <div style={{
              position: "absolute", top: "66%", left: "50%",
              transform: "translateX(-50%)",
              width: mouthW * (S / 50),
              height: Math.max(3, openY * (S / 90)),
              borderRadius: openY > 3 ? "4px 4px 50% 50%" : 4,
              background: openY > 3
                ? "radial-gradient(ellipse at 50% 30%, #2a0a05, #1a0505)"
                : "#5a2a15",
              zIndex: 8,
              transition: "height 0.03s ease, width 0.03s ease",
            }}>
              {openY > 8 && (
                <div style={{
                  position: "absolute", top: 1, left: "15%",
                  width: "70%", height: "30%",
                  background: "#f0e8d8",
                  borderRadius: "0 0 3px 3px",
                }} />
              )}
            </div>

            {/* ── GOLD EARRINGS (both sides) ── */}
            {[-1, 1].map((side) => (
              <div key={side} style={{
                position: "absolute", top: "48%",
                [side === -1 ? "left" : "right"]: "-6%",
                width: S * 0.055, height: S * 0.075,
                border: `2px solid ${BRAND.GOLD}`,
                borderRadius: "50%",
                borderTop: "transparent",
                transform: `rotate(${side * 10}deg)`,
                zIndex: 3,
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
              }} />
            ))}
          </div>
        </div>

        {/* ── LIVE badge ── */}
        {isSpeaking && (
          <div style={{
            position: "absolute", top: 8, left: 8,
            padding: "2px 8px", borderRadius: 4,
            background: "#FF0000",
            fontSize: 10, fontWeight: 800, color: "#fff",
            letterSpacing: "0.05em",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#fff",
              opacity: Math.sin(frame / 5) > 0 ? 1 : 0.3,
            }} />
            LIVE
          </div>
        )}
      </div>

      {/* ── Name tag ── */}
      <div style={{
        position: "absolute", bottom: -14, left: "50%",
        transform: "translateX(-50%)",
        padding: "3px 16px", borderRadius: 8,
        background: BRAND.GOLD,
        fontSize: 12, fontWeight: 800, color: "#000",
        letterSpacing: "0.06em", whiteSpace: "nowrap",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", gap: 5,
      }}>
        <span style={{ fontSize: 10 }}>☠</span> JACK
      </div>
    </div>
  );
};

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
