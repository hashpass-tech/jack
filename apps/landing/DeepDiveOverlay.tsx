import React, { useEffect, useRef, useState, useCallback } from "react";

/* ── Layer definitions (same order as Scene3Dv2 rings 0–3) ── */
const LAYERS = [
  {
    name: "INTENT",
    accent: "#F2B94B",
    video: "/videos/v3-scene1-key-management.mp4",
    desc: "Captures your cross-chain goal and strategizes the optimal execution path.",
  },
  {
    name: "ROUTE",
    accent: "#38BDF8",
    video: "/videos/v3-scene2-multi-chain.mp4",
    desc: "Deploys solvers along optimal bridges and liquidity pools across chains.",
  },
  {
    name: "CONSTRAINTS",
    accent: "#A855F7",
    video: "/videos/v3-scene3-clearing.mp4",
    desc: "Enforces private policies and guardrails through encryption and hooks.",
  },
  {
    name: "SETTLEMENT",
    accent: "#38BDF8",
    video: "/videos/v3-scene4-automation.mp4",
    desc: "Finalizes execution with atomic adapters for consistent cross-chain state.",
  },
] as const;

const COUNTDOWN_SECS = 3;
const SCENE_PAUSE_MS = 5000;
const POST_COUNTDOWN_DELAY_MS = 600;

/* ── Cinematic sound via Web Audio (no external files) ── */
let _audioCtx: AudioContext | null = null;
const getAudioCtx = () => {
  if (!_audioCtx) _audioCtx = new AudioContext();
  return _audioCtx;
};

/** Play a cinematic whoosh/sweep sound */
const playCinematicSwoosh = (volume = 0.18) => {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    // Filtered noise sweep (whoosh)
    const dur = 1.6;
    const bufSize = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(400, now);
    bandpass.frequency.exponentialRampToValueAtTime(2400, now + 0.4);
    bandpass.frequency.exponentialRampToValueAtTime(200, now + dur);
    bandpass.Q.value = 1.2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(volume * 0.7, now + 0.15);
    noiseGain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.6);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(bandpass).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + dur);

    // Sub-bass thud
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.8);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(volume, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(oscGain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.0);
  } catch {
    // Silently ignore if Web Audio unavailable
  }
};

type Phase = "intro" | "playing" | "routing" | "scene" | "complete";

interface DeepDiveOverlayProps {
  onClose: () => void;
  onLayerChange: (index: number | null) => void;
  onCinematicSpin?: (active: boolean) => void;
  startLayerIdx?: number;
}

const DeepDiveOverlay: React.FC<DeepDiveOverlayProps> = ({
  onClose,
  onLayerChange,
  onCinematicSpin,
  startLayerIdx = 0,
}) => {
  const [phase, setPhase] = useState<Phase>("intro");
  const [layerIdx, setLayerIdx] = useState(startLayerIdx);
  const [count, setCount] = useState(COUNTDOWN_SECS);
  const [entered, setEntered] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(Date.now());

  const layer = LAYERS[layerIdx];
  const nextLayer =
    layerIdx < LAYERS.length - 1 ? LAYERS[layerIdx + 1] : null;
  const isLast = !nextLayer;
  const showOverlay = phase !== "scene";

  /* ── Entrance animation ── */
  useEffect(() => {
    window.scrollTo({ top: 0 });
    playCinematicSwoosh(0.15);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setEntered(true)),
    );
  }, []);

  /* ── ESC to exit ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── Countdown for intro & routing phases ── */
  useEffect(() => {
    if (phase !== "intro" && phase !== "routing") return;

    setCount(COUNTDOWN_SECS);

    const iv = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(iv);
          // Dramatic pause after reaching 0
          timeoutRef.current = setTimeout(() => {
            if (phase === "intro") {
              onLayerChange(0);
              setPhase("playing");
            } else {
              // routing
              if (nextLayer) {
                setPhase("scene");
              } else {
                setPhase("complete");
              }
            }
          }, POST_COUNTDOWN_DELAY_MS);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(iv);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [phase, layerIdx]);

  /* ── Scene transition: show 3D with cinematic rotation, then advance ── */
  useEffect(() => {
    if (phase !== "scene") return;

    const nextIdx = layerIdx + 1;
    onLayerChange(nextIdx);
    onCinematicSpin?.(true);
    playCinematicSwoosh(0.12);

    const timer = setTimeout(() => {
      onCinematicSpin?.(false);
      setLayerIdx(nextIdx);
      setVideoReady(false);
      setVideoProgress(0);
      setPhase("playing");
    }, SCENE_PAUSE_MS);

    return () => {
      clearTimeout(timer);
      onCinematicSpin?.(false);
    };
  }, [phase]);

  /* ── Autoplay video ── */
  useEffect(() => {
    if (phase === "playing" && videoReady && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = isMuted;
      videoRef.current
        .play()
        .catch(() => {
          // Autoplay blocked — try muted
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(() => {});
          }
        });
    }
  }, [phase, videoReady]);

  /* ── Preload next video ── */
  useEffect(() => {
    if (nextLayer) {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = nextLayer.video;
      link.as = "video";
      document.head.appendChild(link);
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [layerIdx]);

  /* ── Auto-close after complete ── */
  useEffect(() => {
    if (phase !== "complete") return;
    const timer = setTimeout(() => {
      onLayerChange(null);
      onClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [phase]);

  /* ── Video time tracking for progress bar ── */
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (v && v.duration && isFinite(v.duration)) {
      setVideoProgress(v.currentTime / v.duration);
    }
  }, []);

  /* ── Video ended ── */
  const handleVideoEnded = useCallback(() => {
    setVideoProgress(1);
    setPhase(isLast ? "complete" : "routing");
  }, [isLast]);

  /* ── Video error — skip forward ── */
  const handleVideoError = useCallback(() => {
    setTimeout(() => {
      setPhase(isLast ? "complete" : "routing");
    }, 1000);
  }, [isLast]);

  /* ── Skip ── */
  const handleSkip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    videoRef.current?.pause();

    if (phase === "intro") {
      onLayerChange(0);
      setPhase("playing");
    } else if (phase === "playing") {
      setPhase(isLast ? "complete" : "routing");
    } else if (phase === "routing") {
      if (nextLayer) setPhase("scene");
      else setPhase("complete");
    }
  }, [phase, isLast, nextLayer]);

  /* ── Exit ── */
  const handleExit = useCallback(() => {
    videoRef.current?.pause();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onCinematicSpin?.(false);
    setEntered(false);
    setTimeout(() => {
      onLayerChange(null);
      onClose();
    }, 400);
  }, [onClose, onLayerChange, onCinematicSpin]);

  /* ── Mute toggle ── */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newVal = !prev;
      if (videoRef.current) videoRef.current.muted = newVal;
      return newVal;
    });
  }, []);

  /* ── Circumference helpers ── */
  const introR = 70;
  const introC = 2 * Math.PI * introR;
  const routeR = 52;
  const routeC = 2 * Math.PI * routeR;

  /* ── Elapsed time for complete screen ── */
  const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          entered && showOverlay
            ? "rgba(5,7,15,0.96)"
            : "rgba(5,7,15,0)",
        backdropFilter:
          entered && showOverlay ? "blur(24px)" : "blur(0px)",
        transition: "background 0.6s ease, backdrop-filter 0.6s ease",
        /* Always block interaction so 3D scene can't be clicked */
        pointerEvents: "auto",
      }}
    >
      {/* ── Top bar: Progress + Controls ── */}
      {showOverlay && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            right: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 30,
            opacity: entered ? 1 : 0,
            transition: "opacity 0.5s ease 0.2s",
          }}
        >
          {/* Layer progress dots */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            {LAYERS.map((l, i) => {
              const isDone =
                i < layerIdx ||
                (i === layerIdx &&
                  (phase === "routing" || phase === "complete"));
              const isActive =
                i === layerIdx && (phase === "playing" || phase === "intro");
              return (
                <div
                  key={l.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      width: isDone ? "10px" : "8px",
                      height: isDone ? "10px" : "8px",
                      borderRadius: "50%",
                      background:
                        isDone || isActive
                          ? l.accent
                          : "rgba(255,255,255,0.12)",
                      boxShadow:
                        isDone || isActive
                          ? `0 0 10px ${l.accent}60`
                          : "none",
                      transition: "all 0.5s ease",
                    }}
                  />
                  <span
                    className="hidden sm:inline"
                    style={{
                      fontSize: "8px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: isActive
                        ? "#fff"
                        : isDone
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(255,255,255,0.2)",
                      transition: "color 0.3s",
                    }}
                  >
                    {l.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: "8px" }}>
            {phase !== "complete" && (
              <button onClick={handleSkip} style={btnStyle}>
                {phase === "intro"
                  ? "Skip Intro"
                  : phase === "playing"
                    ? "Skip Video →"
                    : "Skip →"}
              </button>
            )}
            <button onClick={handleExit} style={btnStyle}>
              ✕ Exit
            </button>
          </div>
        </div>
      )}

      {/* ═══ INTRO COUNTDOWN ═══ */}
      {phase === "intro" && (
        <div
          style={{
            textAlign: "center",
            animation: "dd-fadeup 0.8s ease",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.8em",
              color: "#F2B94B",
              marginBottom: "32px",
            }}
          >
            Deep Dive Sequence
          </p>

          {/* Circular countdown */}
          <div
            style={{
              position: "relative",
              width: "160px",
              height: "160px",
              margin: "0 auto 32px",
            }}
          >
            <svg
              width="160"
              height="160"
              style={{ transform: "rotate(-90deg)" }}
            >
              <circle
                cx="80"
                cy="80"
                r={introR}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="2"
              />
              <circle
                cx="80"
                cy="80"
                r={introR}
                fill="none"
                stroke={layer.accent}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={introC}
                strokeDashoffset={introC * (1 - count / COUNTDOWN_SECS)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: count === 0 ? "48px" : "72px",
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1,
                  transition: "font-size 0.3s ease",
                }}
              >
                {count === 0 ? "GO" : count}
              </span>
            </div>
          </div>

          <h2
            style={{
              fontSize: "clamp(1.5rem, 5vw, 3rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              color: "#fff",
              marginBottom: "12px",
            }}
          >
            Deep Dive Starts
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
            Beginning with{" "}
            <span style={{ color: LAYERS[0].accent, fontWeight: 700 }}>
              INTENT
            </span>{" "}
            Layer
          </p>
        </div>
      )}

      {/* ═══ VIDEO PLAYING + ROUTING OVERLAY ═══ */}
      {(phase === "playing" || phase === "routing") && (
        <div
          style={{
            width: "100%",
            maxWidth: "960px",
            margin: "0 16px",
            animation: "dd-fadeup 0.6s ease",
          }}
        >
          {/* Layer heading */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: layer.accent,
                boxShadow: `0 0 14px ${layer.accent}`,
              }}
            />
            <h2
              style={{
                fontSize: "clamp(1.2rem, 3vw, 1.8rem)",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "-0.02em",
                color: "#fff",
                margin: 0,
              }}
            >
              {layer.name}
              <span
                style={{
                  fontSize: "14px",
                  marginLeft: "10px",
                  opacity: 0.5,
                  color: layer.accent,
                }}
              >
                Layer {layerIdx + 1}/{LAYERS.length}
              </span>
            </h2>
          </div>

          {/* Video container */}
          <div
            style={{
              position: "relative",
              borderRadius: "16px",
              overflow: "hidden",
              aspectRatio: "16/9",
              background: "#080c18",
              boxShadow: `0 0 60px ${layer.accent}10, 0 40px 80px rgba(0,0,0,0.6)`,
              border: `1px solid ${layer.accent}22`,
            }}
          >
            <video
              key={layerIdx}
              ref={videoRef}
              src={layer.video}
              muted={isMuted}
              playsInline
              preload="auto"
              onLoadedData={() => setVideoReady(true)}
              onEnded={handleVideoEnded}
              onError={handleVideoError}
              onTimeUpdate={handleTimeUpdate}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: videoReady ? 1 : 0,
                transition: "opacity 0.6s ease",
              }}
            />

            {/* Loading shimmer */}
            {!videoReady && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(135deg, #0F1A2E, ${layer.accent}10, #0F1A2E)`,
                  backgroundSize: "200% 200%",
                  animation: "dd-shimmer 2s ease infinite",
                }}
              />
            )}

            {/* Mute toggle (visible during playback) */}
            {phase === "playing" && (
              <button
                onClick={toggleMute}
                style={{
                  position: "absolute",
                  bottom: "12px",
                  left: "12px",
                  zIndex: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  background: isMuted
                    ? "rgba(255,255,255,0.08)"
                    : `${layer.accent}22`,
                  backdropFilter: "blur(8px)",
                  border: isMuted
                    ? "1px solid rgba(255,255,255,0.06)"
                    : `1px solid ${layer.accent}40`,
                  color: isMuted
                    ? "rgba(255,255,255,0.5)"
                    : layer.accent,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontSize: "10px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  {isMuted ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zm11.828-6.414a5 5 0 010 7.072M16.586 11.586a1 1 0 010 1.414"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  )}
                </svg>
                {isMuted ? "Unmute" : "Sound On"}
              </button>
            )}

            {/* ── ROUTING COUNTDOWN OVERLAY (on top of paused video) ── */}
            {phase === "routing" && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(5,7,15,0.85)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: "dd-fadein 0.4s ease",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.6em",
                      color: "rgba(255,255,255,0.4)",
                      marginBottom: "20px",
                    }}
                  >
                    Routing to next layer
                  </p>

                  <div
                    style={{
                      position: "relative",
                      width: "120px",
                      height: "120px",
                      margin: "0 auto 20px",
                    }}
                  >
                    <svg
                      width="120"
                      height="120"
                      style={{ transform: "rotate(-90deg)" }}
                    >
                      <circle
                        cx="60"
                        cy="60"
                        r={routeR}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="2"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r={routeR}
                        fill="none"
                        stroke={nextLayer?.accent ?? "#38BDF8"}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={routeC}
                        strokeDashoffset={
                          routeC * (1 - count / COUNTDOWN_SECS)
                        }
                        style={{
                          transition: "stroke-dashoffset 1s linear",
                        }}
                      />
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: count === 0 ? "32px" : "48px",
                          fontWeight: 900,
                          color: "#fff",
                          lineHeight: 1,
                          transition: "font-size 0.3s ease",
                        }}
                      >
                        {count === 0 ? "→" : count}
                      </span>
                    </div>
                  </div>

                  <h3
                    style={{
                      fontSize: "clamp(1rem, 3vw, 1.5rem)",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      color: nextLayer?.accent ?? "#fff",
                      margin: 0,
                    }}
                  >
                    → {nextLayer?.name ?? "Complete"}
                  </h3>
                </div>
              </div>
            )}
          </div>

          {/* ── Time-remaining progress bar ── */}
          <div
            style={{
              position: "relative",
              height: "3px",
              marginTop: "6px",
              borderRadius: "2px",
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: `${(1 - videoProgress) * 100}%`,
                borderRadius: "2px",
                background: `linear-gradient(90deg, ${layer.accent}, ${layer.accent}80)`,
                boxShadow: `0 0 8px ${layer.accent}40`,
                transition: "width 0.25s linear",
              }}
            />
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.35)",
              marginTop: "8px",
              maxWidth: "600px",
            }}
          >
            {layer.desc}
          </p>
        </div>
      )}

      {/* ═══ SCENE TRANSITION — 3D visible with cinematic rotation ═══ */}
      {phase === "scene" && nextLayer && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
          }}
        >
          {/* Cinematic letterbox bars */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "60px",
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "60px",
              background:
                "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
            }}
          />

          {/* Small layer name badge at bottom center */}
          <div
            style={{
              position: "absolute",
              bottom: "24px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 20px",
              borderRadius: "20px",
              background: "rgba(5,7,15,0.6)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${nextLayer.accent}30`,
              animation: "dd-fadeup 0.6s ease",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: nextLayer.accent,
                boxShadow: `0 0 10px ${nextLayer.accent}`,
                animation: "dd-pulse 1s ease infinite",
              }}
            />
            <span
              style={{
                fontSize: "10px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.3em",
                color: nextLayer.accent,
              }}
            >
              {nextLayer.name}
            </span>
          </div>
        </div>
      )}

      {/* ═══ COMPLETE ═══ */}
      {phase === "complete" && (
        <div
          style={{
            textAlign: "center",
            animation: "dd-fadeup 0.8s ease",
          }}
        >
          {/* Checkmark */}
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              margin: "0 auto 24px",
              background: "rgba(242,185,75,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 40px rgba(242,185,75,0.2)",
            }}
          >
            <svg
              width="36"
              height="36"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#F2B94B"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2
            style={{
              fontSize: "clamp(1.5rem, 5vw, 3rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              color: "#fff",
              marginBottom: "12px",
            }}
          >
            Deep Dive Complete
          </h2>

          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.4)",
              marginBottom: "24px",
            }}
          >
            All four architecture layers explored
            {mins > 0
              ? ` in ${mins}m ${secs}s`
              : ` in ${secs}s`}
          </p>

          {/* Layer badges */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: "32px",
            }}
          >
            {LAYERS.map((l) => (
              <div
                key={l.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  background: `${l.accent}15`,
                  border: `1px solid ${l.accent}30`,
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: l.accent,
                  }}
                />
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: l.accent,
                  }}
                >
                  {l.name}
                </span>
                <span style={{ fontSize: "10px", color: l.accent }}>✓</span>
              </div>
            ))}
          </div>

          {/* Return button */}
          <button
            onClick={handleExit}
            style={{
              padding: "14px 36px",
              borderRadius: "16px",
              background: "rgba(242,185,75,0.15)",
              border: "1px solid rgba(242,185,75,0.4)",
              color: "#F2B94B",
              fontSize: "11px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.3em",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Return to Scene
          </button>
        </div>
      )}

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes dd-fadeup {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dd-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dd-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes dd-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

/* ── Shared button style for top bar ── */
const btnStyle: React.CSSProperties = {
  padding: "6px 16px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(255,255,255,0.6)",
  fontSize: "10px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  cursor: "pointer",
  transition: "all 0.2s",
};

export default DeepDiveOverlay;
