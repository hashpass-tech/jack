/**
 * ══════════════════════════════════════════════
 * ══ JACK V1 — Original Pirate CSS Avatar     ═
 * ══ @version 1.0.0  (video v1.0.3 look)      ═
 * ══════════════════════════════════════════════
 *
 * Features:
 *  - Simple oval pirate hat with gold band & skull emblem
 *  - Both eyes visible (no eyepatch)
 *  - Earrings on BOTH sides
 *  - Modest brown beard
 *  - Short hair on sides
 *  - Lip-syncing mouth with viseme mapping
 *  - Coat with red lapels, white shirt, gold buttons, gold chain
 *  - Compass rose background, gold dust particles
 *  - Head bob, breathe, blink animations
 */
import React from "react";
import type { JackCharacterProps } from "./types";
import { BRAND, SKIN, SKIN_LIGHT, SKIN_SHADOW } from "./types";

const JackV1: React.FC<JackCharacterProps> = ({
  frame,
  fps,
  isSpeaking,
  viseme,
  size = 220,
}) => {
  const t = frame / fps;

  // ── Mouth shape from viseme ──
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

  // ── Animation params ──
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
            {/* Gold buttons (left) */}
            {[0.2, 0.38, 0.56].map((p, i) => (
              <div key={`bl-${i}`} style={{
                position: "absolute", top: `${p * 100}%`, left: "43%",
                width: 4, height: 4, borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, #FFD700, #B8860B)`,
              }} />
            ))}
            {/* Gold buttons (right) */}
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
            {/* ── HAIR (short sides) ── */}
            {/* Left side hair */}
            <div style={{
              position: "absolute", top: "5%", left: "-8%",
              width: "28%", height: "50%",
              background: "linear-gradient(180deg, #5a3820 0%, #3a2010 100%)",
              borderRadius: "40% 10% 25% 50%",
              zIndex: 1,
            }} />
            {/* Right side hair */}
            <div style={{
              position: "absolute", top: "5%", right: "-8%",
              width: "28%", height: "50%",
              background: "linear-gradient(180deg, #5a3820 0%, #3a2010 100%)",
              borderRadius: "10% 40% 50% 25%",
              zIndex: 1,
            }} />
            {/* Top hair (under hat) */}
            <div style={{
              position: "absolute", top: "-3%", left: "8%",
              width: "84%", height: "20%",
              background: "linear-gradient(180deg, #4a3018 0%, #3a2010 100%)",
              borderRadius: "50% 50% 40% 40%",
              zIndex: 2,
            }} />

            {/* ── PIRATE HAT (simple oval with brim) ── */}
            <div style={{
              position: "absolute", top: "-32%", left: "-18%",
              width: "136%", height: "52%",
              zIndex: 4,
            }}>
              {/* Hat body (oval/dome) */}
              <div style={{
                position: "absolute", bottom: "16%", left: "18%",
                width: "64%", height: "54%",
                background: "linear-gradient(180deg, #1a1610 0%, #0e0a06 60%, #080604 100%)",
                borderRadius: "50% 50% 8% 8%",
                boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)",
              }} />
              {/* Brim */}
              <div style={{
                position: "absolute", bottom: "0%", left: "4%",
                width: "92%", height: "30%",
                background: "linear-gradient(180deg, #181210 0%, #0a0806 100%)",
                borderRadius: "48% 48% 50% 50% / 80% 80% 20% 20%",
                boxShadow: "0 4px 10px rgba(0,0,0,0.7)",
              }} />
              {/* Gold band */}
              <div style={{
                position: "absolute", bottom: "22%", left: "16%",
                width: "68%", height: 4,
                background: `linear-gradient(90deg, transparent 0%, ${BRAND.GOLD}cc 10%, ${BRAND.GOLD} 50%, ${BRAND.GOLD}cc 90%, transparent 100%)`,
                borderRadius: 2,
                boxShadow: `0 0 6px ${BRAND.GOLD}66`,
              }} />
              {/* Skull emblem */}
              <div style={{
                position: "absolute", bottom: "34%", left: "50%",
                transform: "translateX(-50%)",
                fontSize: S * 0.12, lineHeight: 1,
                filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.8))",
                color: "#f0e8d0",
              }}>
                ☠
              </div>
            </div>

            {/* ── EYEBROWS ── */}
            <div style={{
              position: "absolute", top: "34%", left: "14%",
              width: "24%", height: 3,
              background: "#3a2818",
              borderRadius: 2,
              transform: `rotate(${isSpeaking ? -3 : -5}deg)`,
              zIndex: 5,
            }} />
            <div style={{
              position: "absolute", top: "34%", right: "14%",
              width: "24%", height: 3,
              background: "#3a2818",
              borderRadius: 2,
              transform: `rotate(${isSpeaking ? 3 : 5}deg)`,
              zIndex: 5,
            }} />

            {/* ── LEFT EYE ── */}
            <div style={{
              position: "absolute", top: "40%", left: "15%",
              width: S * 0.11, height: isBlinking ? 2 : S * 0.08,
              borderRadius: isBlinking ? 2 : "50%",
              background: isBlinking ? SKIN : "radial-gradient(ellipse at 50% 45%, #f8f5f0, #e0d8c8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", zIndex: 5,
              boxShadow: isBlinking ? "none" : "0 1px 3px rgba(0,0,0,0.3)",
            }}>
              {!isBlinking && (
                <div style={{
                  width: S * 0.05, height: S * 0.05,
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 42% 38%, #5a7b3a, #2d4016)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}>
                  <div style={{
                    width: S * 0.025, height: S * 0.025,
                    borderRadius: "50%", background: "#000",
                  }} />
                  <div style={{
                    position: "absolute", top: "18%", right: "20%",
                    width: S * 0.011, height: S * 0.011,
                    borderRadius: "50%", background: "#fff", opacity: 0.9,
                  }} />
                </div>
              )}
            </div>

            {/* ── RIGHT EYE ── */}
            <div style={{
              position: "absolute", top: "40%", right: "15%",
              width: S * 0.11, height: isBlinking ? 2 : S * 0.08,
              borderRadius: isBlinking ? 2 : "50%",
              background: isBlinking ? SKIN : "radial-gradient(ellipse at 50% 45%, #f8f5f0, #e0d8c8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", zIndex: 5,
              boxShadow: isBlinking ? "none" : "0 1px 3px rgba(0,0,0,0.3)",
            }}>
              {!isBlinking && (
                <div style={{
                  width: S * 0.05, height: S * 0.05,
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 42% 38%, #5a7b3a, #2d4016)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}>
                  <div style={{
                    width: S * 0.025, height: S * 0.025,
                    borderRadius: "50%", background: "#000",
                  }} />
                  <div style={{
                    position: "absolute", top: "18%", right: "20%",
                    width: S * 0.011, height: S * 0.011,
                    borderRadius: "50%", background: "#fff", opacity: 0.9,
                  }} />
                </div>
              )}
            </div>

            {/* ── NOSE ── */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translateX(-50%)",
              width: S * 0.055, height: S * 0.065,
              background: `radial-gradient(ellipse at 38% 32%, ${SKIN_LIGHT}, ${SKIN_SHADOW})`,
              borderRadius: "32% 32% 50% 50%",
              zIndex: 6,
              boxShadow: `inset -2px -2px 3px ${SKIN_SHADOW}55`,
            }} />

            {/* ── BEARD (moderate brown, simple) ── */}
            <div style={{
              position: "absolute", top: "60%", left: "12%",
              width: "76%", height: "46%",
              background: "linear-gradient(180deg, #6a3a1a 0%, #4a2810 60%, #3a1c08 100%)",
              borderRadius: "10% 10% 50% 50%",
              zIndex: 5,
              boxShadow: "inset 0 3px 6px rgba(0,0,0,0.2)",
            }} />

            {/* ── MOUTH (lip-sync) ── */}
            <div style={{
              position: "absolute", top: "66%", left: "50%",
              transform: "translateX(-50%)",
              width: mouthW * (S / 48),
              height: Math.max(3, openY * (S / 85)),
              borderRadius: openY > 3 ? "4px 4px 50% 50%" : 4,
              background: openY > 3
                ? "radial-gradient(ellipse at 50% 30%, #2a0a05, #1a0505)"
                : "#5a2a10",
              border: openY > 3 ? "1px solid #3a1a10" : "none",
              zIndex: 8,
              boxShadow: openY > 3 ? "inset 0 2px 4px rgba(0,0,0,0.5)" : "none",
              transition: "height 0.03s ease, width 0.03s ease",
            }}>
              {openY > 10 && (
                <div style={{
                  position: "absolute", top: 1, left: "15%",
                  width: "70%", height: "25%",
                  background: "#f0e8d8",
                  borderRadius: "0 0 2px 2px",
                }} />
              )}
            </div>

            {/* ── EARRING LEFT ── */}
            <div style={{
              position: "absolute", top: "46%", left: "-8%",
              width: S * 0.05, height: S * 0.07,
              border: `2px solid ${BRAND.GOLD}`,
              borderRadius: "50%",
              borderTop: "transparent",
              transform: "rotate(-8deg)",
              zIndex: 2,
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
            }} />

            {/* ── EARRING RIGHT ── */}
            <div style={{
              position: "absolute", top: "46%", right: "-8%",
              width: S * 0.05, height: S * 0.07,
              border: `2px solid ${BRAND.GOLD}`,
              borderRadius: "50%",
              borderTop: "transparent",
              transform: "rotate(8deg)",
              zIndex: 2,
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
            }} />
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

export default JackV1;
