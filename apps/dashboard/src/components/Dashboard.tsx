"use client";

import { useState, useEffect, useRef, type FC } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CreateIntentView } from "./CreateIntentView";
import { ExecutionsListView } from "./ExecutionsListView";
import { ExecutionDetailView } from "./ExecutionDetailView";
import AgentCostDashboard from "./AgentCostDashboard";
import NeuralBackground from "./NeuralBackground";
import { ChangelogDrawer } from "@shared/drawer-changelog";

const ThemeToggle: FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("jack-theme") as "dark" | "light" | null;
      return stored || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("jack-theme", next);
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] hover:border-[var(--fg-accent)] transition-all"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <svg className="w-4 h-4 text-[var(--fg-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-[var(--fg-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};

const OnboardingVideoModal: FC<{ onClose: () => void }> = ({ onClose }) => {
  const [entered, setEntered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showUnmuteBanner, setShowUnmuteBanner] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    const v = videoRef.current;
    if (!v) return;

    // Start muted so autoplay always works
    v.muted = true;
    v.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setIsPlaying(false);
    });

    // Unmute on the very first user interaction (click/touch/key)
    const unmute = () => {
      if (v && v.muted) {
        v.muted = false;
        setIsMuted(false);
        setShowUnmuteBanner(false);
      }
      document.removeEventListener("click", unmute, true);
      document.removeEventListener("touchstart", unmute, true);
      document.removeEventListener("keydown", unmute, true);
    };
    document.addEventListener("click", unmute, true);
    document.addEventListener("touchstart", unmute, true);
    document.addEventListener("keydown", unmute, true);

    return () => {
      document.removeEventListener("click", unmute, true);
      document.removeEventListener("touchstart", unmute, true);
      document.removeEventListener("keydown", unmute, true);
    };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => setIsMuted(v.muted);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVolumeChange);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVolumeChange);
    };
  }, []);

  const handleUnmute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setIsMuted(false);
    setShowUnmuteBanner(false);
    if (v.paused) v.play();
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); } else { v.pause(); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
    if (!v.muted) setShowUnmuteBanner(false);
  };

  const goFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen();
  };

  const glass = {
    background: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
  } as const;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-0"
      style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.5s ease' }}
    >
      {/* Backdrop — blurred, shows dashboard behind */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(2, 6, 16, 0.55)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        }}
        onClick={onClose}
      />

      {/* Video container */}
      <div
        className="relative"
        style={{
          width: 'min(93vw, 93vh * 16 / 9)',
          height: 'min(93vh, 93vw * 9 / 16)',
          borderRadius: 'clamp(0.75rem, 2vw, 1.5rem)',
          overflow: 'hidden',
          background: '#000',
          boxShadow: '0 0 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
          transform: entered ? 'scale(1)' : 'scale(0.96)',
          transition: 'transform 0.5s ease',
        }}
      >
        <video
          ref={videoRef}
          src="/videos/walkthrough.mp4"
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'contain', background: '#000' }}
        />

        {/* Tap to unmute banner */}
        {showUnmuteBanner && isMuted && isPlaying && (
          <button
            onClick={handleUnmute}
            className="absolute z-20 flex items-center gap-2 left-1/2 top-1/2"
            style={{
              transform: 'translate(-50%, -50%)',
              ...glass,
              borderRadius: '3rem',
              padding: '0.75rem 1.5rem',
              animation: 'pulse 2s infinite',
              cursor: 'pointer',
            }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
            <span className="text-xs font-bold uppercase tracking-widest">Tap to unmute</span>
          </button>
        )}

        {/* Tap to play (if autoplay totally blocked) */}
        {!isPlaying && (
          <button
            onClick={() => { const v = videoRef.current; if (v) { v.muted = false; v.play(); setShowUnmuteBanner(false); } }}
            className="absolute z-20 left-1/2 top-1/2"
            style={{
              transform: 'translate(-50%, -50%)',
              width: 72, height: 72, borderRadius: '50%',
              ...glass,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
        )}

        {/* Top-left: REC indicator */}
        <div
          className="absolute top-3 left-3 sm:top-5 sm:left-5 flex items-center gap-2 z-10"
          style={{ ...glass, borderRadius: '2rem', padding: '0.35rem 0.75rem' }}
        >
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ background: '#ef4444', boxShadow: '0 0 8px #ef4444', animation: 'pulse 2s infinite' }} />
          <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">JACK Walkthrough</span>
        </div>

        {/* Top-right: Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={glass}
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Bottom controls */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)', padding: 'clamp(2rem, 6vw, 3.5rem) clamp(0.75rem, 2vw, 1.25rem) clamp(0.75rem, 2vw, 1.25rem)' }}
        >
          {/* Left: transport */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={togglePlay} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95" style={glass} title={isPlaying ? "Pause" : "Play"}>
              {isPlaying
                ? <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                : <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              }
            </button>
            <button onClick={toggleMute} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95" style={glass} title={isMuted ? "Unmute" : "Mute"}>
              {isMuted
                ? <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                : <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              }
            </button>
            <button onClick={goFullscreen} className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center transition-all hover:scale-110" style={glass} title="Fullscreen">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" /></svg>
            </button>
          </div>
          {/* Right: actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.1em] transition-all hover:scale-[1.03] active:scale-95"
              style={{ ...glass, color: 'rgba(255,255,255,0.55)' }}
              onClick={() => { localStorage.setItem("jack-hide-onboarding", "true"); onClose(); }}
            >
              Don&apos;t show again
            </button>
            <button
              className="px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.1em] transition-all hover:scale-[1.03] active:scale-95"
              style={{ background: 'var(--fg-accent)', color: '#0a0f1a', border: 'none' }}
              onClick={onClose}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  );
};

const SettingsDialog: FC<{ open: boolean; onClose: () => void; showOnboarding: boolean; setShowOnboarding: (v: boolean) => void; showBanner: boolean; setShowBanner: (v: boolean) => void }> = ({ open, onClose, showOnboarding, setShowOnboarding, showBanner, setShowBanner }) => {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (open) requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    else setEntered(false);
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      style={{
        background: entered ? 'rgba(4, 12, 28, 0.8)' : 'rgba(4, 12, 28, 0)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        transition: 'background 0.4s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-sm"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-secondary)',
          borderRadius: '1.25rem',
          padding: '1.75rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 30px rgba(56,189,248,0.05)',
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)', color: 'var(--fg-muted)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--fg-accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.12em]" style={{ color: 'var(--fg-primary)' }}>Settings</h2>
        </div>

        {/* Tutorials section */}
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--fg-accent)' }}>Tutorials</p>
          <label
            htmlFor="show-onboarding"
            className="flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer transition-all hover:border-[var(--fg-accent)]"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)' }}
          >
            <span className="text-xs font-bold" style={{ color: 'var(--fg-primary)' }}>Show walkthrough on load</span>
            <div
              className="relative w-9 h-5 rounded-full transition-colors cursor-pointer"
              style={{ background: showOnboarding ? 'var(--fg-accent)' : 'var(--border-secondary)' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full transition-transform shadow-sm"
                style={{
                  background: 'var(--fg-primary)',
                  left: showOnboarding ? '1.125rem' : '0.125rem',
                  transition: 'left 0.2s ease',
                }}
              />
              <input
                type="checkbox"
                checked={showOnboarding}
                onChange={e => {
                  setShowOnboarding(e.target.checked);
                  localStorage.setItem("jack-hide-onboarding", (!e.target.checked).toString());
                }}
                id="show-onboarding"
                className="sr-only"
              />
            </div>
          </label>
        </div>

        {/* Notifications section */}
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--fg-accent)' }}>Notifications</p>
          <label
            htmlFor="show-banner"
            className="flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer transition-all hover:border-[var(--fg-accent)]"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)' }}
          >
            <span className="text-xs font-bold" style={{ color: 'var(--fg-primary)' }}>Show notification banner</span>
            <div
              className="relative w-9 h-5 rounded-full transition-colors cursor-pointer"
              style={{ background: showBanner ? 'var(--fg-accent)' : 'var(--border-secondary)' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full transition-transform shadow-sm"
                style={{
                  background: 'var(--fg-primary)',
                  left: showBanner ? '1.125rem' : '0.125rem',
                  transition: 'left 0.2s ease',
                }}
              />
              <input
                type="checkbox"
                checked={showBanner}
                onChange={e => {
                  setShowBanner(e.target.checked);
                  localStorage.setItem("jack-hide-banner", (!e.target.checked).toString());
                }}
                id="show-banner"
                className="sr-only"
              />
            </div>
          </label>
        </div>

        {/* Done */}
        <button
          className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all hover:scale-[1.02]"
          style={{ background: 'var(--fg-accent)', color: 'var(--bg-primary)' }}
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
};

const Dashboard: FC<{ changelog?: string }> = ({ changelog = "" }) => {
  const [activeTab, setActiveTab] = useState<
    "create" | "executions" | "cost-dashboard"
  >("create");
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(
    null,
  );
  const [showTestnetModal, setShowTestnetModal] = useState(() => {
    if (isTestnet && typeof window !== "undefined") {
      const { hostname } = window.location;
      if (
        hostname === "jack.lukas.money" ||
        hostname === "www.jack.lukas.money"
      ) {
        return true;
      }
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [docsUrl] = useState(() => {
    if (
      typeof window !== "undefined" &&
      (window.location.hostname.includes("localhost") ||
        window.location.hostname === "127.0.0.1")
    ) {
      return "http://localhost:3002";
    }
    return process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.jack.lukas.money";
  });
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [bannerToast, setBannerToast] = useState<string | null>(null);
    // Onboarding modal logic
    useEffect(() => {
      const hide = localStorage.getItem("jack-hide-onboarding");
      setShowOnboarding(hide !== "true");
      if (hide !== "true") setShowOnboardingModal(true);
      const hideBanner = localStorage.getItem("jack-hide-banner");
      setShowBanner(hideBanner !== "true");
    }, []);
  const dashboardVersion = process.env.NEXT_PUBLIC_DASHBOARD_VERSION ?? "0.0.0";
  const protocolTrack = process.env.NEXT_PUBLIC_JACK_PROTOCOL_TRACK ?? "v1";
  const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === "true";
  const landingUrl = isTestnet
    ? "https://testnet.jack.lukas.money"
    : "https://jack.lukas.money";
  const environmentLabel = isTestnet ? "TESTNET" : "MAINNET";

  const handleBack = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  const switchTab = (tab: "create" | "executions" | "cost-dashboard") => {
    setActiveTab(tab);
    setSelectedExecutionId(null);
    setMobileMenuOpen(false);
  };

  const renderContent = () => {
    if (selectedExecutionId) {
      return (
        <ExecutionDetailView
          id={selectedExecutionId}
          onBack={() => setSelectedExecutionId(null)}
        />
      );
    }

    switch (activeTab) {
      case "create":
        return (
          <CreateIntentView
            onIntentSubmitted={(id) => {
              setSelectedExecutionId(id);
              setActiveTab("executions");
            }}
          />
        );
      case "executions":
        return (
          <ExecutionsListView onSelectExecution={setSelectedExecutionId} />
        );
      case "cost-dashboard":
        return <AgentCostDashboard />;
      default:
        return null;
    }
  };

  const tabs: { key: "create" | "executions" | "cost-dashboard"; label: string; shortLabel: string }[] = [
    { key: "create", label: "Create Intent", shortLabel: "Intent" },
    { key: "executions", label: "Executions", shortLabel: "Exec" },
    { key: "cost-dashboard", label: "Agent & Costs", shortLabel: "Costs" },
  ];

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ── Header ────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl border-b px-4 py-3 md:px-8 md:py-4"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border-primary)",
        }}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBack}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ color: "var(--fg-muted)" }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex items-center space-x-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: "var(--fg-accent)", boxShadow: `0 0 20px var(--shadow-accent)` }}
              >
                <span className="font-black text-sm" style={{ color: "var(--bg-primary)" }}>J</span>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.4em]" style={{ color: "var(--fg-accent)" }}>JACK</p>
                <p className="text-xs font-bold tracking-widest leading-none" style={{ color: "var(--fg-primary)" }}>Kernel</p>
              </div>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-4">
            <div
              className="flex p-1 rounded-xl border"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border-secondary)" }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => switchTab(tab.key)}
                  className="px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap"
                  style={
                    (activeTab === tab.key && !selectedExecutionId) || (tab.key === "executions" && selectedExecutionId)
                      ? { background: "var(--fg-accent)", color: "var(--bg-primary)", fontWeight: 900 }
                      : { color: "var(--fg-muted)" }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all hover:opacity-90"
              style={{ borderColor: "var(--border-secondary)", color: "var(--fg-secondary)" }}
              onClick={() => setSettingsOpen(true)}
              title="Settings"
            >
              Settings
            </button>
            <ThemeToggle />
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
                const connected = mounted && account && chain;
                return (
                  <div>
                    {!connected ? (
                      <button
                        onClick={openConnectModal}
                        className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02]"
                        style={{ background: "var(--fg-accent)", color: "var(--bg-primary)" }}
                      >
                        Connect
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={openChainModal}
                          className="px-3 py-2 rounded-xl text-[10px] font-bold border transition-all"
                          style={{ borderColor: "var(--border-secondary)", color: "var(--fg-secondary)" }}
                        >
                          {chain.name}
                        </button>
                        <button
                          onClick={openAccountModal}
                          className="px-4 py-2 rounded-xl text-xs font-bold border transition-all"
                          style={{ borderColor: "var(--fg-accent)", color: "var(--fg-accent)" }}
                        >
                          {account.displayName}
                        </button>
                      </div>
                    )}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>

          {/* Mobile: settings + theme toggle + hamburger */}
          <div className="flex items-center space-x-2 md:hidden">
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-xl transition-all"
              style={{ color: "var(--fg-muted)" }}
              title="Settings"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex flex-col space-y-1.5 p-2"
            >
              <div className={`w-5 h-0.5 transition-all duration-300 ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`} style={{ background: "var(--fg-accent)" }} />
              <div className={`w-5 h-0.5 transition-all duration-300 ${mobileMenuOpen ? "opacity-0" : ""}`} style={{ background: "var(--fg-accent)" }} />
              <div className={`w-5 h-0.5 transition-all duration-300 ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`} style={{ background: "var(--fg-accent)" }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Menu Overlay ───────────────────────── */}
      <div
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-500 md:hidden ${
          mobileMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"
        }`}
        style={{ background: "var(--bg-primary)" }}
      >
        <button
          className="absolute top-6 right-6 p-3"
          onClick={() => setMobileMenuOpen(false)}
          style={{ color: "var(--fg-accent)" }}
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <nav className="flex flex-col items-center space-y-6 w-full px-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all border"
              style={
                activeTab === tab.key
                  ? { background: "var(--fg-accent)", color: "var(--bg-primary)", borderColor: "var(--fg-accent)" }
                  : { background: "transparent", color: "var(--fg-primary)", borderColor: "var(--border-secondary)" }
              }
            >
              {tab.label}
            </button>
          ))}
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all border text-center"
            style={{ background: "transparent", color: "var(--fg-primary)", borderColor: "var(--border-secondary)" }}
          >
            Documentation
          </a>
          <div className="pt-6 w-full flex justify-center">
            <ConnectButton />
          </div>
        </nav>
      </div>

      {/* ── Notification Banner (Marquee) ─────────────── */}
      {isTestnet && showBanner && (
        <div
          className="relative overflow-hidden border-b"
          style={{ background: "var(--fg-accent)", borderColor: "var(--border-accent)", height: 32 }}
        >
          <div className="absolute inset-0 flex items-center animate-marquee whitespace-nowrap" style={{ animation: "marquee 20s linear infinite", lineHeight: "32px" }}>
            <span className="text-[11px] font-bold mx-8 leading-[32px]" style={{ color: "var(--bg-primary)" }}>
              ⚠️ TESTNET MODE · For mainnet, visit <a href="https://jack.lukas.money/dashboard" className="underline font-black hover:opacity-80" target="_blank" rel="noopener noreferrer">jack.lukas.money/dashboard</a> (mainnet launch Q3 2026)
            </span>
            <span className="text-[11px] font-bold mx-8 leading-[32px]" style={{ color: "var(--bg-primary)" }}>
              ⚠️ TESTNET MODE · For mainnet, visit <a href="https://jack.lukas.money/dashboard" className="underline font-black hover:opacity-80" target="_blank" rel="noopener noreferrer">jack.lukas.money/dashboard</a> (mainnet launch Q3 2026)
            </span>
            <span className="text-[11px] font-bold mx-8 leading-[32px]" style={{ color: "var(--bg-primary)" }}>
              ⚠️ TESTNET MODE · For mainnet, visit <a href="https://jack.lukas.money/dashboard" className="underline font-black hover:opacity-80" target="_blank" rel="noopener noreferrer">jack.lukas.money/dashboard</a> (mainnet launch Q3 2026)
            </span>
          </div>
          <button
            onClick={() => {
              setShowBanner(false);
              localStorage.setItem("jack-hide-banner", "true");
              setBannerToast("Notification banner closed — reopen in Settings");
              setTimeout(() => setBannerToast(null), 3500);
            }}
            className="absolute right-0 inset-y-0 flex items-center z-10 pl-4 pr-2"
            style={{ background: "var(--fg-accent)" }}
          >
            <span className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(0,0,0,0.2)", color: "var(--bg-primary)" }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </span>
          </button>
          <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }`}</style>
        </div>
      )}

      {/* Toast notification */}
      {bannerToast && (
        <div
          className="fixed bottom-6 left-1/2 z-[500] flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold shadow-2xl"
          style={{
            transform: "translateX(-50%)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-secondary)",
            color: "var(--fg-primary)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
            animation: "toastIn 0.4s ease",
          }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--fg-accent)" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {bannerToast}
        </div>
      )}
      <style>{`@keyframes toastIn { 0% { opacity: 0; transform: translateX(-50%) translateY(16px); } 100% { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>

      {/* ── Mobile Tab Bar ────────────────────────────── */}
      <div
        className="flex md:hidden border-b overflow-x-auto no-scrollbar"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2"
            style={
              (activeTab === tab.key && !selectedExecutionId) || (tab.key === "executions" && selectedExecutionId)
                ? { color: "var(--fg-accent)", borderColor: "var(--fg-accent)" }
                : { color: "var(--fg-muted)", borderColor: "transparent" }
            }
          >
            {tab.shortLabel}
          </button>
        ))}
      </div>

      {/* ── Main Content ──────────────────────────────── */}
      <main className="relative flex-1 overflow-y-auto" style={{ background: "var(--bg-primary)" }}>
        <NeuralBackground
          className="pointer-events-none absolute inset-0 z-0"
          color="#38BDF8"
          backgroundVariable="--bg-primary"
          trailOpacity={0.12}
          particleCount={460}
          speed={0.85}
        />
        <div className="relative z-10 p-4 md:p-8">
          <div className="max-w-5xl mx-auto">{renderContent()}</div>
        </div>
      </main>

      {/* ── Testnet Modal ─────────────────────────────── */}
      {showTestnetModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: "var(--overlay)" }}>
          <div
            className="border p-8 rounded-3xl max-w-md w-full"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border-accent)", boxShadow: `0 0 50px var(--shadow-accent)` }}
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--fg-accent)" }}>
                <span className="font-bold text-xl" style={{ color: "var(--bg-primary)" }}>!</span>
              </div>
              <h2 className="text-2xl font-bold" style={{ color: "var(--fg-primary)" }}>Testnet Only</h2>
            </div>
            <p className="mb-8 leading-relaxed" style={{ color: "var(--fg-secondary)" }}>
              JACK is currently in the testnet phase. Mainnet operations are not yet available on this domain.
            </p>
            <div className="flex flex-col space-y-3">
              <a
                href="https://testnet.jack.lukas.money"
                className="w-full py-4 font-bold rounded-xl text-center hover:scale-[1.02] transition-transform"
                style={{ background: "var(--fg-accent)", color: "var(--bg-primary)" }}
              >
                Go to Testnet App
              </a>
              <button
                onClick={() => setShowTestnetModal(false)}
                className="w-full py-4 font-bold rounded-xl transition-colors border"
                style={{ background: "transparent", color: "var(--fg-muted)", borderColor: "var(--border-secondary)" }}
              >
                Stay on Mainnet (View Only)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ────────────────────────────────────── */}
      <footer
        className="border-t px-4 py-5 md:px-8 md:py-6"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)", color: "var(--fg-secondary)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <ChangelogDrawer
            changelogText={changelog}
            theme="dashboard"
            version={dashboardVersion}
            renderTrigger={({ onClick, version: v }) => (
              <button
                type="button"
                onClick={onClick}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-all duration-300 cursor-pointer select-none md:w-auto md:justify-start hover:border-[var(--fg-accent)]"
                style={{ borderColor: "var(--border-secondary)", background: "var(--bg-primary)", color: "var(--fg-secondary)" }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: "var(--fg-accent)", boxShadow: `0 0 12px var(--shadow-accent)` }}
                />
                <span style={{ color: "var(--fg-primary)" }}>{environmentLabel}</span>
                <span style={{ color: "var(--fg-info)" }}>{protocolTrack.toUpperCase()}</span>
                <span style={{ color: "var(--fg-muted)" }}>v{v}</span>
                <span style={{ opacity: 0.3 }}>·</span>
                <span style={{ color: "var(--fg-accent)" }}>Changelog</span>
              </button>
            )}
          />
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-bold uppercase tracking-[0.16em] md:justify-end">
            <a href={docsUrl} target="_blank" rel="noreferrer" className="transition-opacity hover:opacity-80" style={{ color: "var(--fg-primary)" }}>
              Documentation
            </a>
            <a href={landingUrl} target="_blank" rel="noreferrer" className="transition-opacity hover:opacity-80" style={{ color: "var(--fg-primary)" }}>
              Landing
            </a>
            <a href="https://github.com/hashpass-tech/JACK" target="_blank" rel="noreferrer" className="transition-opacity hover:opacity-80" style={{ color: "var(--fg-primary)" }}>
              GitHub
            </a>
            <a href="https://discord.gg/7k8CdmYHpn" target="_blank" rel="noreferrer" className="transition-opacity hover:opacity-80" style={{ color: "var(--fg-primary)" }}>
              Discord
            </a>
            <a href="https://x.com/Jack_kernel" target="_blank" rel="noreferrer" className="transition-opacity hover:opacity-80" style={{ color: "var(--fg-primary)" }}>
              X
            </a>
          </div>
        </div>
      </footer>

      {/* Onboarding Video Modal */}
      {showOnboardingModal && showOnboarding && (
        <OnboardingVideoModal onClose={() => setShowOnboardingModal(false)} />
      )}

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} showOnboarding={showOnboarding} setShowOnboarding={setShowOnboarding} showBanner={showBanner} setShowBanner={setShowBanner} />
    </div>
  );
};

export default Dashboard;
