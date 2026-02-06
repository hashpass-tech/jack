import React, { useEffect, useRef, useState, useCallback } from "react";

/* ─── Video mapping: Landing layer name → video file ─── */
const LAYER_VIDEO_MAP: Record<string, string> = {
  INTENT: "/videos/scene4-automation.webm",
  ROUTE: "/videos/scene2-multi-chain.webm",
  CONSTRAINTS: "/videos/scene1-key-management.webm",
  SETTLEMENT: "/videos/scene3-clearing.webm",
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
}

const LayerVideoModal: React.FC<LayerVideoModalProps> = ({
  layer,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [entered, setEntered] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const accent = LAYER_ACCENT[layer] ?? "#F2B94B";
  const videoSrc = LAYER_VIDEO_MAP[layer];
  const description = LAYER_DESCRIPTION[layer] ?? "";

  /* Entrance animation */
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
  }, []);

  /* Autoplay when modal enters */
  useEffect(() => {
    if (entered && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [entered, videoLoaded]);

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
    setExpanded((prev) => !prev);
  };

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6"
      style={{
        background: entered ? "rgba(11,16,32,0.92)" : "rgba(11,16,32,0)",
        backdropFilter: entered ? "blur(20px)" : "blur(0px)",
        transition: "background 0.4s ease, backdrop-filter 0.4s ease",
      }}
    >
      {/* ── Card ── */}
      <div
        className="relative w-full rounded-[28px] border overflow-hidden"
        style={{
          maxWidth: expanded ? "960px" : "540px",
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
          className="relative cursor-pointer group"
          onClick={toggleExpand}
          style={{
            height: expanded ? "440px" : "260px",
            transition: "height 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {videoSrc && (
            <video
              ref={videoRef}
              src={videoSrc}
              muted
              loop
              playsInline
              preload="auto"
              onLoadedData={() => setVideoLoaded(true)}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: videoLoaded ? 1 : 0,
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
              {expanded ? "Collapse" : "Expand"}
            </span>
          </div>
        </div>

        {/* ── Content area ── */}
        <div
          className="px-8 pt-4 pb-8"
          style={{
            opacity: entered ? 1 : 0,
            transform: entered ? "translateY(0)" : "translateY(12px)",
            transition: "all 0.5s ease 0.15s",
          }}
        >
          {/* Accent line */}
          <div
            className="w-full h-[2px] rounded-full mb-6"
            style={{
              background: `linear-gradient(to right, ${accent}, ${accent}40, transparent)`,
            }}
          />

          {/* Layer title */}
          <div className="flex items-center space-x-3 mb-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            <h2
              className="text-2xl md:text-3xl font-black uppercase tracking-tight"
              style={{ color: "#fff" }}
            >
              {layer}
              <span
                className="ml-2 text-sm font-bold tracking-widest opacity-60"
                style={{ color: accent }}
              >
                Layer
              </span>
            </h2>
          </div>

          {/* Description */}
          <p className="text-[15px] text-gray-300 font-medium leading-relaxed mb-6 max-w-lg">
            {description}
          </p>

          {/* Actions row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-3.5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs border transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Return to Scene
            </button>
            <button
              onClick={toggleExpand}
              className="flex-1 py-3.5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: `${accent}18`,
                border: `1px solid ${accent}40`,
                color: accent,
              }}
            >
              {expanded ? "▴ Compact" : "▾ Theatre Mode"}
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
