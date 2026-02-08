/**
 * ══════════════════════════════════════════════
 * ══ JACK V2 — Enhanced Pirate CSS Avatar     ═
 * ══ @version 2.0.0  (tricorn, eyepatch, etc) ═
 * ══════════════════════════════════════════════
 *
 * Features:
 *  - Tricorn pirate hat with upturns, gold trim, skull emblem
 *  - Long flowing brown hair (4 strands)
 *  - Red bandana under hat
 *  - Eyepatch on left eye with strap
 *  - Full thick brown beard with chin point & texture
 *  - Mustache
 *  - Lip-syncing mouth with teeth & tongue
 *  - Gold earring right ear only
 *  - Coat with red lapels, white shirt, gold buttons, gold chain
 *  - Compass rose background, gold dust particles
 *  - Head bob, breathe, blink animations
 */
import React from "react";
import type { JackCharacterProps } from "./types";
import { BRAND, SKIN, SKIN_LIGHT, SKIN_SHADOW } from "./types";

const JackV2: React.FC<JackCharacterProps> = ({
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
            {/* ── LONG FLOWING HAIR ── */}
            <div style={{
              position: "absolute", top: "10%", left: "-16%",
              width: "36%", height: "110%",
              background: "linear-gradient(180deg, #5a3820 0%, #3a2010 40%, #2a1808 100%)",
              borderRadius: "40% 15% 25% 50%",
              transform: `rotate(${3 + Math.sin(t * 0.8) * 2}deg)`,
              zIndex: 1,
            }} />
            <div style={{
              position: "absolute", top: "20%", left: "-10%",
              width: "22%", height: "95%",
              background: "linear-gradient(180deg, #6a4828 0%, #4a2810 60%, #2a1808 100%)",
              borderRadius: "30% 20% 25% 45%",
              transform: `rotate(${1 + Math.sin(t * 0.6 + 0.5) * 1.5}deg)`,
              zIndex: 1,
            }} />
            <div style={{
              position: "absolute", top: "10%", right: "-16%",
              width: "36%", height: "110%",
              background: "linear-gradient(180deg, #5a3820 0%, #3a2010 40%, #2a1808 100%)",
              borderRadius: "15% 40% 50% 25%",
              transform: `rotate(${-3 + Math.sin(t * 0.8 + 1) * 2}deg)`,
              zIndex: 1,
            }} />
            <div style={{
              position: "absolute", top: "20%", right: "-10%",
              width: "22%", height: "95%",
              background: "linear-gradient(180deg, #6a4828 0%, #4a2810 60%, #2a1808 100%)",
              borderRadius: "20% 30% 45% 25%",
              transform: `rotate(${-1 + Math.sin(t * 0.6 + 1.5) * 1.5}deg)`,
              zIndex: 1,
            }} />
            <div style={{
              position: "absolute", top: "-4%", left: "5%",
              width: "90%", height: "28%",
              background: "linear-gradient(180deg, #4a3018 0%, #3a2010 100%)",
              borderRadius: "50% 50% 40% 40% / 80% 80% 50% 50%",
              zIndex: 2,
            }} />

            {/* ── RED BANDANA ── */}
            <div style={{
              position: "absolute", top: "12%", left: "2%",
              width: "96%", height: "14%",
              background: "linear-gradient(180deg, #CC0000 0%, #8B0000 100%)",
              borderRadius: "50% 50% 8% 8%",
              zIndex: 3,
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }} />
            <div style={{
              position: "absolute", top: "22%", left: "-8%",
              width: S * 0.06, height: S * 0.04,
              background: "#CC0000",
              borderRadius: "50%",
              transform: `rotate(${12 + Math.sin(t * 1.2) * 3}deg)`,
              zIndex: 3,
            }} />

            {/* ── TRICORN PIRATE HAT ── */}
            <div style={{
              position: "absolute", top: "-38%", left: "-28%",
              width: "156%", height: "65%",
              zIndex: 4,
            }}>
              <div style={{
                position: "absolute", bottom: "12%", left: "16%",
                width: "68%", height: "58%",
                background: "linear-gradient(180deg, #1a1610 0%, #0e0a06 60%, #080604 100%)",
                borderRadius: "45% 45% 8% 8%",
                boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)",
              }} />
              <div style={{
                position: "absolute", bottom: "-4%", left: "0%",
                width: "100%", height: "32%",
                background: "linear-gradient(180deg, #181210 0%, #0a0806 100%)",
                borderRadius: "48% 48% 50% 50% / 80% 80% 20% 20%",
                boxShadow: "0 4px 10px rgba(0,0,0,0.7)",
              }} />
              <div style={{
                position: "absolute", bottom: "6%", left: "0%",
                width: "30%", height: "40%",
                background: "linear-gradient(135deg, #1a1610 0%, #0e0a06 100%)",
                borderRadius: "50% 20% 0% 60%",
                transform: "rotate(18deg) skewY(-8deg)",
              }} />
              <div style={{
                position: "absolute", bottom: "6%", right: "0%",
                width: "30%", height: "40%",
                background: "linear-gradient(-135deg, #1a1610 0%, #0e0a06 100%)",
                borderRadius: "20% 50% 60% 0%",
                transform: "rotate(-18deg) skewY(8deg)",
              }} />
              <div style={{
                position: "absolute", bottom: "0%", left: "25%",
                width: "50%", height: "18%",
                background: "linear-gradient(0deg, #1a1610 0%, #0e0a06 100%)",
                borderRadius: "0 0 50% 50%",
                transform: "perspective(80px) rotateX(-12deg)",
              }} />
              <div style={{
                position: "absolute", bottom: "20%", left: "14%",
                width: "72%", height: 5,
                background: `linear-gradient(90deg, transparent 0%, ${BRAND.GOLD}cc 8%, ${BRAND.GOLD} 50%, ${BRAND.GOLD}cc 92%, transparent 100%)`,
                borderRadius: 3,
                boxShadow: `0 0 6px ${BRAND.GOLD}66`,
              }} />
              <div style={{
                position: "absolute", bottom: "16%", left: "16%",
                width: "68%", height: 2,
                background: `linear-gradient(90deg, transparent 0%, #B8860Baa 12%, #B8860B 50%, #B8860Baa 88%, transparent 100%)`,
                borderRadius: 1,
              }} />
              <div style={{
                position: "absolute", bottom: "32%", left: "50%",
                transform: "translateX(-50%)",
                fontSize: S * 0.14, lineHeight: 1,
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.9))",
                textShadow: `0 0 6px rgba(255,215,0,0.4)`,
                color: "#f8f0e0",
              }}>
                ☠
              </div>
            </div>

            {/* ── EYEBROWS ── */}
            <div style={{
              position: "absolute", top: "34%", right: "17%",
              width: "24%", height: 4,
              background: "linear-gradient(90deg, #3a2818, #4a3020)",
              borderRadius: 2,
              transform: `rotate(${isSpeaking ? 1 : 4}deg)`,
              zIndex: 5,
            }} />
            <div style={{
              position: "absolute", top: "35%", left: "17%",
              width: "22%", height: 3,
              background: "linear-gradient(90deg, #4a3020, #3a2818)",
              borderRadius: 2,
              transform: "rotate(-4deg)",
              zIndex: 5,
            }} />

            {/* ── LEFT EYE — EYEPATCH ── */}
            <div style={{
              position: "absolute", top: "24%", left: "6%",
              width: "88%", height: 4,
              background: "linear-gradient(90deg, #111 0%, #1a1a1a 50%, #111 100%)",
              borderRadius: 2,
              transform: "rotate(-10deg)",
              zIndex: 5,
              boxShadow: "0 1px 3px rgba(0,0,0,0.6)",
            }} />
            <div style={{
              position: "absolute", top: "36%", left: "14%",
              width: S * 0.13, height: S * 0.11,
              background: "radial-gradient(ellipse at 50% 50%, #1a1a1a, #080808)",
              borderRadius: "45% 45% 45% 45%",
              border: "2px solid #2a2a2a",
              zIndex: 6,
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.5)",
            }} />

            {/* ── RIGHT EYE ── */}
            <div style={{
              position: "absolute", top: "38%", right: "17%",
              width: S * 0.12, height: isBlinking ? 2 : S * 0.09,
              borderRadius: isBlinking ? 2 : "50%",
              background: isBlinking ? SKIN : "radial-gradient(ellipse at 50% 42%, #f8f5f0, #e8e0d0)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", zIndex: 5,
              boxShadow: isBlinking ? "none" : "0 1px 4px rgba(0,0,0,0.35), inset 0 -1px 3px rgba(0,0,0,0.1)",
            }}>
              {!isBlinking && (
                <div style={{
                  width: S * 0.058, height: S * 0.058,
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 42% 38%, #5a7b3a, #2d4016)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}>
                  <div style={{
                    width: S * 0.028, height: S * 0.028,
                    borderRadius: "50%", background: "#000",
                  }} />
                  <div style={{
                    position: "absolute", top: "18%", right: "20%",
                    width: S * 0.013, height: S * 0.013,
                    borderRadius: "50%", background: "#fff", opacity: 0.9,
                  }} />
                  <div style={{
                    position: "absolute", bottom: "28%", left: "26%",
                    width: S * 0.007, height: S * 0.007,
                    borderRadius: "50%", background: "rgba(255,255,255,0.5)",
                  }} />
                </div>
              )}
            </div>

            {/* ── NOSE ── */}
            <div style={{
              position: "absolute", top: "50%", left: "46%",
              transform: "translateX(-50%)",
              width: S * 0.06, height: S * 0.075,
              background: `radial-gradient(ellipse at 38% 32%, ${SKIN_LIGHT}, ${SKIN_SHADOW})`,
              borderRadius: "32% 32% 50% 50%",
              zIndex: 6,
              boxShadow: `inset -2px -2px 4px ${SKIN_SHADOW}55`,
            }} />

            {/* ── MUSTACHE ── */}
            <div style={{
              position: "absolute", top: "61%", left: "26%",
              width: "48%", height: S * 0.035,
              background: "linear-gradient(180deg, #4a3018 0%, #3a2010 100%)",
              borderRadius: "40% 40% 55% 55%",
              zIndex: 7,
            }} />

            {/* ── BEARD ── */}
            <div style={{
              position: "absolute", top: "58%", left: "8%",
              width: "84%", height: "58%",
              background: "linear-gradient(180deg, #5a3820 0%, #3a2010 40%, #2a1808 80%)",
              borderRadius: "12% 12% 48% 48%",
              zIndex: 5,
              boxShadow: "inset 0 4px 8px rgba(0,0,0,0.25)",
            }} />
            <div style={{
              position: "absolute", top: "90%", left: "32%",
              width: "36%", height: "24%",
              background: "linear-gradient(180deg, #3a2010 0%, #2a1808 100%)",
              borderRadius: "25% 25% 50% 50%",
              zIndex: 5,
            }} />
            {[0.68, 0.76, 0.84].map((yp, i) => (
              <div key={i} style={{
                position: "absolute", top: `${yp * 100}%`, left: "18%",
                width: "64%", height: 1,
                background: "rgba(80,48,24,0.25)",
                zIndex: 6,
              }} />
            ))}

            {/* ── MOUTH ── */}
            <div style={{
              position: "absolute", top: "66%", left: "50%",
              transform: "translateX(-50%)",
              width: mouthW * (S / 46),
              height: Math.max(3, openY * (S / 80)),
              borderRadius: openY > 3 ? "4px 4px 50% 50%" : 4,
              background: openY > 3
                ? "radial-gradient(ellipse at 50% 28%, #2a0a05, #1a0505)"
                : "#4a2010",
              border: openY > 3 ? "1px solid #3a1a10" : "none",
              zIndex: 8,
              boxShadow: openY > 3 ? "inset 0 2px 6px rgba(0,0,0,0.6)" : "none",
              transition: "height 0.03s ease, width 0.03s ease",
            }}>
              {openY > 8 && (
                <div style={{
                  position: "absolute", top: 1, left: "12%",
                  width: "76%", height: "30%",
                  background: "#f0e8d8",
                  borderRadius: "0 0 3px 3px",
                }} />
              )}
              {openY > 13 && (
                <div style={{
                  position: "absolute", bottom: 2, left: "22%",
                  width: "56%", height: "26%",
                  background: "#c4626a",
                  borderRadius: "50%",
                }} />
              )}
            </div>

            {/* ── GOLD EARRING (right ear only) ── */}
            <div style={{
              position: "absolute", top: "46%", right: "-8%",
              width: S * 0.06, height: S * 0.085,
              border: `3px solid ${BRAND.GOLD}`,
              borderRadius: "50%",
              borderTop: "transparent",
              transform: "rotate(8deg)",
              zIndex: 2,
              filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
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

export default JackV2;
