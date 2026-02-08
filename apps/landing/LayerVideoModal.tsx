import React, { useEffect, useRef, useState, useCallback } from "react";

/* ─── Video mapping: Landing layer name → video file ─── */
const LAYER_VIDEO_MAP: Record<string, string> = {
  INTENT: "/videos/scene1-key-management.webm",
  ROUTE: "/videos/scene2-multi-chain.webm",
  CONSTRAINTS: "/videos/scene3-clearing.webm",
  SETTLEMENT: "/videos/scene4-automation.webm",
};

/* ─── V3 "Deep Dive" videos — shown in Theatre/Expanded mode ─── */
const LAYER_VIDEO_V3_MAP: Record<string, string> = {
  INTENT: "/videos/v3-scene1-key-management.mp4",
  ROUTE: "/videos/v3-scene2-multi-chain.mp4",
  CONSTRAINTS: "/videos/v3-scene3-clearing.mp4",
  SETTLEMENT: "/videos/v3-scene4-automation.mp4",
};

const LAYER_ACCENT: Record<string, string> = {
  INTENT: "#F2B94B",
  ROUTE: "#38BDF8",
  CONSTRAINTS: "#A855F7",
  SETTLEMENT: "#38BDF8",
};

const LAYER_DESCRIPTION: Record<string, string> = {
  INTENT:
    "Captures the user's high-level cross-chain goal and lets the kernel strategize the best execution path.",
  ROUTE:
    "Deploys the solver network along optimal bridges and liquidity pools, balancing cost, speed, and risk.",
  CONSTRAINTS:
    "Keeps private policies and guardrails enforced through Fhenix encryption and policy hooks.",
  SETTLEMENT:
    "Finalizes the execution with atomic settlement adapters so every chain sees a consistent state.",
};

interface LayerVideoModalProps {
  layer: string;
  onClose: () => void;
  onDeepDive?: (layerName: string) => void;
}

const LayerVideoModal: React.FC<LayerVideoModalProps> = ({
  layer,
  onClose,
  onDeepDive,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoV3Ref = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [entered, setEntered] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [v3VideoLoaded, setV3VideoLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [v3VideoProgress, setV3VideoProgress] = useState(0);

  const accent = LAYER_ACCENT[layer] ?? "#F2B94B";
  const videoSrc = LAYER_VIDEO_MAP[layer];
  const videoSrcV3 = LAYER_VIDEO_V3_MAP[layer];
  const description = LAYER_DESCRIPTION[layer] ?? "";

  /* Entrance animation */
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
  }, []);

  /* Autoplay when modal enters, then unmute after short delay */
  useEffect(() => {
    if (entered && videoRef.current) {
      videoRef.current.play().then(() => {
        // Auto-unmute after 300ms — the modal open was user-initiated so we can try
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.muted = false;
            setIsMuted(false);
          }
        }, 300);
      }).catch(() => {});
    }
  }, [entered, videoLoaded]);

  /* Autoplay V3 when expanded and loaded */
  useEffect(() => {
    if (expanded && v3VideoLoaded && videoV3Ref.current) {
      videoV3Ref.current.currentTime = 0;
      videoV3Ref.current.muted = isMuted;
      videoV3Ref.current.play().catch(() => {});
    }
  }, [expanded, v3VideoLoaded]);

  /* Close on ESC */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Close on backdrop click */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === modalRef.current) handleClose();
    },
    [],
  );

  const handleClose = () => {
    setEntered(false);
    setTimeout(onClose, 350);
  };

  const toggleExpand = () => {
    setExpanded((prev) => {
      const willExpand = !prev;
      if (willExpand) {
        // Switching to Theatre Mode — pause V2, V3 will autoplay once mounted
        if (videoRef.current) videoRef.current.pause();
        setV3VideoLoaded(false); // reset so we show shimmer while loading
      } else if (!willExpand && videoRef.current) {
        // Switching back to compact — resume V2 clip
        videoRef.current.muted = isMuted;
        videoRef.current.play().catch(() => {});
      }
      return willExpand;
    });
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) videoRef.current.muted = newMuted;
    if (videoV3Ref.current) videoV3Ref.current.muted = newMuted;
  };

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (v && v.duration && isFinite(v.duration)) {
      setVideoProgress(v.currentTime / v.duration);
    }
  }, []);

  const handleV3TimeUpdate = useCallback(() => {
    const v = videoV3Ref.current;
    if (v && v.duration && isFinite(v.duration)) {
      setV3VideoProgress(v.currentTime / v.duration);
    }
  }, []);

  const handleDeepDiveClick = () => {
    if (expanded) {
      // "Compact View" should always collapse back
      toggleExpand();
    } else if (onDeepDive) {
      // Not expanded → launch full deep-dive auto-flow
      setEntered(false);
      setTimeout(() => {
        onClose();
        onDeepDive(layer);
      }, 350);
    } else {
      toggleExpand();
    }
  };

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
      style={{
        background: entered ? "rgba(11,16,32,0.92)" : "rgba(11,16,32,0)",
        backdropFilter: entered ? "blur(20px)" : "blur(0px)",
        transition: "background 0.4s ease, backdrop-filter 0.4s ease",
      }}
    >
      {/* ── Card ── */}
      <div
        className="relative w-full rounded-t-[28px] sm:rounded-[28px] border border-b-0 sm:border-b overflow-hidden overflow-y-auto"
        style={{
          maxWidth: expanded ? "960px" : "540px",
          maxHeight: "calc(100dvh - env(safe-area-inset-bottom, 0px))",
          background: "#0F1A2E",
          borderColor: `${accent}33`,
          boxShadow: entered
            ? `0 0 80px ${accent}15, 0 40px 80px rgba(0,0,0,0.6)`
            : "none",
          opacity: entered ? 1 : 0,
          transform: entered
            ? "scale(1) translateY(0)"
            : "scale(0.92) translateY(24px)",
          transition:
            "all 0.45s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* ── Video area ── */}
        <div
          className="relative cursor-pointer group flex-shrink-0"
          onClick={toggleExpand}
          style={{
            height: expanded ? "min(56vw, 540px)" : "min(52vw, 260px)",
            minHeight: expanded ? "220px" : "160px",
            transition: "height 0.5s cubic-bezier(0.16, 1, 0.3, 1), min-height 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {videoSrc && (
            <video
              ref={videoRef}
              src={videoSrc}
              muted={isMuted}
              loop
              playsInline
              preload="metadata"
              onLoadedData={() => setVideoLoaded(true)}
              onTimeUpdate={handleTimeUpdate}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: videoLoaded && !expanded ? 1 : 0,
                transition: "opacity 0.6s ease",
              }}
            />
          )}

          {/* V3 detailed video — only mount when expanded (saves ~4MB download per video) */}
          {expanded && videoSrcV3 && (
            <video
              ref={videoV3Ref}
              src={videoSrcV3}
              muted={isMuted}
              loop
              playsInline
              preload="auto"
              onLoadedData={() => setV3VideoLoaded(true)}
              onTimeUpdate={handleV3TimeUpdate}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: v3VideoLoaded ? 1 : 0,
                transition: "opacity 0.6s ease",
              }}
            />
          )}

          {/* Loading shimmer */}
          {!videoLoaded && (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, #0F1A2E, ${accent}10, #0F1A2E)`,
                backgroundSize: "200% 200%",
                animation: "shimmer 2s ease infinite",
              }}
            />
          )}

          {/* Subtle gradient overlay at bottom */}
          <div
            className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
            style={{
              background: "linear-gradient(transparent, #0F1A2E)",
            }}
          />

          {/* Sound toggle button */}
          <button
            onClick={toggleMute}
            className="absolute bottom-3 left-3 z-20 flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all hover:scale-105"
            style={{
              background: isMuted ? "rgba(255,255,255,0.08)" : `${accent}22`,
              backdropFilter: "blur(8px)",
              border: isMuted ? "1px solid rgba(255,255,255,0.06)" : `1px solid ${accent}40`,
              color: isMuted ? "rgba(255,255,255,0.5)" : accent,
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMuted ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zm11.828-6.414a5 5 0 010 7.072M16.586 11.586a1 1 0 010 1.414" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              )}
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {isMuted ? "Unmute" : "Sound On"}
            </span>
          </button>

          {/* Expand icon indicator */}
          <div
            className="absolute bottom-3 right-3 z-20 flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all group-hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <svg
              className="w-3.5 h-3.5 transition-transform"
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.4s ease",
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {expanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {expanded ? "Compact" : "Expand"}
            </span>
          </div>
        </div>

        {/* ── Content area ── */}
        <div
          className="px-5 sm:px-8 pt-3 sm:pt-4 pb-6 sm:pb-8"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(12px)",
            transition: "all 0.5s ease 0.15s",
          }}
        >
          {/* Time-remaining progress bar */}
          <div
            style={{
              position: "relative",
              height: "3px",
              borderRadius: "2px",
              background: "rgba(255,255,255,0.06)",
              overflow: "hidden",
              marginBottom: expanded ? "16px" : "16px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: `${(1 - (expanded ? v3VideoProgress : videoProgress)) * 100}%`,
                borderRadius: "2px",
                background: `linear-gradient(90deg, ${accent}, ${accent}80)`,
                boxShadow: `0 0 8px ${accent}40`,
                transition: "width 0.25s linear",
              }}
            />
          </div>

          {/* Layer title */}
          <div className="flex items-center space-x-3 mb-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            <h2
              className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight"
              style={{ color: "#fff" }}
            >
              {layer}
              <span
                className="ml-2 text-xs sm:text-sm font-bold tracking-widest opacity-60"
                style={{ color: accent }}
              >
                Layer
              </span>
            </h2>
          </div>

          {/* Description */}
          <p className="text-[13px] sm:text-[15px] text-gray-300 font-medium leading-relaxed mb-4 sm:mb-6 max-w-lg">
            {description}
          </p>

          {/* Actions row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs border transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Return to Scene
            </button>
            <button
              onClick={handleDeepDiveClick}
              className="flex-1 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: `${accent}18`,
                border: `1px solid ${accent}40`,
                color: accent,
              }}
            >
              {expanded ? "▴ Compact View" : onDeepDive ? "▾ Deep Dive · All Layers" : "▾ Expand"}
            </button>
          </div>
        </div>
      </div>

      {/* shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default LayerVideoModal;
