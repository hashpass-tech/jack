import React, {
  Suspense,
  useEffect,
  useRef,
  useState,
  lazy,
  useMemo,
} from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  Stars,
} from "@react-three/drei";
import Scene3D from "@/components/Scene3Dv2";
import { ChangelogDrawer } from "@/components/drawer-changelog";
import changelogRaw from "../../CHANGELOG.md?raw";
import DeepDiveOverlay from "./DeepDiveOverlay";

// Lazy load the video modal — only loaded when user clicks a layer
const LayerVideoModal = lazy(() => import("./LayerVideoModal"));

/* ── Elegant 3D loading skeleton ── */
const Scene3DLoadingFallback: React.FC = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
    {/* Animated rings */}
    <div className="relative w-40 h-40 md:w-56 md:h-56">
      <div
        className="absolute inset-0 rounded-full border border-[#F2B94B]/30"
        style={{ animation: "pulse-ring 2s ease-out infinite" }}
      />
      <div
        className="absolute inset-4 rounded-full border border-[#38BDF8]/20"
        style={{ animation: "pulse-ring 2s ease-out 0.4s infinite" }}
      />
      <div
        className="absolute inset-8 rounded-full border border-[#F2B94B]/15"
        style={{ animation: "pulse-ring 2s ease-out 0.8s infinite" }}
      />
      {/* Center logo */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#F2B94B] flex items-center justify-center shadow-[0_0_40px_rgba(242,185,75,0.3)]"
          style={{ animation: "fade-pulse 1.5s ease-in-out infinite" }}
        >
          <span className="font-space text-2xl md:text-3xl font-black text-[#0B1020]">
            J
          </span>
        </div>
      </div>
    </div>
    <p
      className="mt-6 text-[9px] md:text-[10px] font-black uppercase tracking-[0.6em] text-gray-500"
      style={{ animation: "fade-pulse 1.5s ease-in-out infinite" }}
    >
      Initializing Kernel…
    </p>
    <style>{`
      @keyframes pulse-ring {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.3); opacity: 0; }
      }
      @keyframes fade-pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
    `}</style>
  </div>
);

type WhitepaperVersionEntry = {
  version: string;
  releaseDate: string;
  pdf: string;
  sourcePdf?: string;
};

type WhitepaperManifest = {
  latest: string;
  featured?: string;
  canonicalPdf: string;
  publicPath?: string;
  legacyPublicPath?: string;
  versions: WhitepaperVersionEntry[];
};

const DEFAULT_WHITEPAPER_MANIFEST: WhitepaperManifest = {
  latest: "1.0.2",
  featured: "1.0.0",
  canonicalPdf: "JACK-Whitepaper.pdf",
  publicPath: "/whitepaper",
  legacyPublicPath: "/whitepapper",
  versions: [
    {
      version: "1.0.0",
      releaseDate: "2026-02-07",
      pdf: "JACK-Whitepaper-v1.0.0.pdf",
    },
    {
      version: "1.0.2",
      releaseDate: "2026-02-07",
      pdf: "JACK-Whitepaper-v1.0.2.pdf",
    },
    {
      version: "1.0.1",
      releaseDate: "2026-02-06",
      pdf: "JACK-Whitepaper-v1.0.1.pdf",
    },
  ],
};

const normalizeWhitepaperVersion = (value: string): string =>
  value.replace(/^v/i, "").trim();

const compareSemverDesc = (a: string, b: string): number => {
  const left = a.split(".").map((part) => Number(part));
  const right = b.split(".").map((part) => Number(part));
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    const l = left[index] ?? 0;
    const r = right[index] ?? 0;
    if (l !== r) {
      return r - l;
    }
  }
  return 0;
};

const highlightTiles = [
  {
    title: "Intent-First Workflows",
    description:
      "Express what you want to accomplish, not how to do it. JACK derives the route, privacy, and settlement hooks automatically.",
    accent: "bg-[#F2B94B]/20 text-[#F2B94B]",
    badge: "Autonomous",
  },
  {
    title: "Solver-Powered Routing",
    description:
      "The Yellow Fusion solver continuously evaluates liquidity, policies, and costs to stay inside budget.",
    accent: "bg-[#38BDF8]/20 text-[#38BDF8]",
    badge: "Dynamic",
  },
  {
    title: "Policy-as-Code",
    description:
      "Embed compliance, privacy, and security checks directly into settlement hooks and execution constraints.",
    accent: "bg-[#A855F7]/20 text-[#A855F7]",
    badge: "Shielded",
  },
  {
    title: "Live Cost Telemetry",
    description:
      "Observe every agent’s spend per issue, overlay budgets, and react before an execution drifts out of bounds.",
    accent: "bg-[#34D399]/20 text-[#34D399]",
    badge: "Transparent",
  },
];

const momentumMetrics = [
  {
    value: "12+",
    label: "Chains orchestrated",
    detail: "Arbitrum, Base, Optimism, Polygon, and partners",
  },
  {
    value: "2.8s",
    label: "Avg settlement time",
    detail: "Across agents committed to JIT hooks",
  },
  {
    value: "98%",
    label: "Constraints enforced",
    detail: "Private policies honored on every execution",
  },
];

const deriveDashboardUrl = (): string => {
  const envUrl = import.meta.env.VITE_DASHBOARD_URL?.trim();
  if (typeof window !== "undefined") {
    const { origin, hostname } = window.location;
    if (hostname.includes("localhost") || hostname === "127.0.0.1") {
      return "http://localhost:3001";
    }
    if (envUrl) {
      return envUrl;
    }
    return `${origin}/dashboard`;
  }
  return envUrl || "/dashboard";
};

const deriveDocsUrl = (): string => {
  const envUrl = import.meta.env.VITE_DOCS_URL?.trim();
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname.includes("localhost") || hostname === "127.0.0.1") {
      return "http://localhost:3002";
    }
    return envUrl || "https://docs.jack.lukas.money";
  }
  return envUrl || "https://docs.jack.lukas.money";
};

const LandingPage: React.FC = () => {
  const landingVersion = import.meta.env.VITE_LANDING_VERSION ?? "0.0.0";
  const dashboardUrl = deriveDashboardUrl();
  const docsUrl = deriveDocsUrl();
  const [activeModalLayer, setActiveModalLayer] = useState<string | null>(null);
  const [selected3DLayer, setSelected3DLayer] = useState<number | null>(0);
  const [contentVisible, setContentVisible] = useState(false);
  const [whitepaperOpen, setWhitepaperOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deepDiveActive, setDeepDiveActive] = useState(false);
  const [deepDiveStartLayer, setDeepDiveStartLayer] = useState(0);
  const [cinematicSpin, setCinematicSpin] = useState(false);
  const [whitepaperManifest, setWhitepaperManifest] =
    useState<WhitepaperManifest>(DEFAULT_WHITEPAPER_MANIFEST);
  const whitepaperRef = useRef<HTMLDivElement | null>(null);
  const featuredWhitepaperVersion = useMemo(
    () =>
      normalizeWhitepaperVersion(
        whitepaperManifest.featured ||
          DEFAULT_WHITEPAPER_MANIFEST.featured ||
          whitepaperManifest.latest,
      ),
    [whitepaperManifest.featured, whitepaperManifest.latest],
  );
  const whitepaperBasePath =
    whitepaperManifest.publicPath || DEFAULT_WHITEPAPER_MANIFEST.publicPath;
  const whitepaperVersions = useMemo(() => {
    const featured = normalizeWhitepaperVersion(
      whitepaperManifest.featured ||
        DEFAULT_WHITEPAPER_MANIFEST.featured ||
        whitepaperManifest.latest,
    );
    const latest = normalizeWhitepaperVersion(
      whitepaperManifest.latest || DEFAULT_WHITEPAPER_MANIFEST.latest,
    );
    const ordered = [...whitepaperManifest.versions].sort((left, right) =>
      compareSemverDesc(
        normalizeWhitepaperVersion(left.version),
        normalizeWhitepaperVersion(right.version),
      ),
    );
    const versionsById = new Map(
      ordered.map((entry) => [
        normalizeWhitepaperVersion(entry.version),
        entry,
      ]),
    );
    const selected = new Set<string>();
    const options: Array<{
      label: string;
      filename: string;
      isFeatured: boolean;
      isLatest: boolean;
    }> = [];

    const appendOption = (version: string, label: string) => {
      const entry = versionsById.get(version);
      if (!entry || selected.has(version)) {
        return;
      }
      selected.add(version);
      options.push({
        label,
        filename: entry.pdf,
        isFeatured: version === featured,
        isLatest: version === latest,
      });
    };

    appendOption(featured, `Start Here · Foundational (v${featured})`);
    if (latest !== featured) {
      appendOption(latest, `Latest Technical (v${latest})`);
    }
    for (const entry of ordered) {
      const version = normalizeWhitepaperVersion(entry.version);
      appendOption(version, `v${version}`);
    }

    return options;
  }, [
    whitepaperManifest.featured,
    whitepaperManifest.latest,
    whitepaperManifest.versions,
  ]);

  // Detect mobile for performance tuning
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return (
      window.innerWidth < 768 ||
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    );
  }, []);
  // Lower DPR on mobile for much faster GPU rendering
  const canvasDpr: [number, number] = isMobile ? [1, 1] : [1, 2];
  // Reduce particles on mobile
  const starCount = isMobile ? 2000 : 6000;

  useEffect(() => {
    const isTestnet = import.meta.env.VITE_IS_TESTNET === "true";
    if (isTestnet && typeof window !== "undefined") {
      const { hostname, protocol, pathname, search, hash } = window.location;
      if (hostname === "jack.lukas.money") {
        window.location.replace(
          `${protocol}//testnet.jack.lukas.money${pathname}${search}${hash}`,
        );
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadWhitepaperManifest = async () => {
      try {
        const primary = await fetch("/whitepaper/manifest.json");
        if (primary.ok) {
          const manifest = (await primary.json()) as WhitepaperManifest;
          if (active) {
            setWhitepaperManifest(manifest);
          }
          return;
        }

        const legacy = await fetch("/whitepapper/manifest.json");
        if (!legacy.ok) {
          return;
        }

        const legacyManifest = (await legacy.json()) as WhitepaperManifest;
        if (active) {
          setWhitepaperManifest(legacyManifest);
        }
      } catch {
        // Keep default manifest when fetch fails.
      }
    };

    void loadWhitepaperManifest();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const stripTempoAttrs = () => {
      try {
        const all = Array.from(document.querySelectorAll("*")) as HTMLElement[];
        for (const el of all) {
          for (const attr of Array.from(el.attributes)) {
            if (
              attr.name.startsWith("data-tempo-") ||
              attr.name === "tempo-hot-reload-ts"
            ) {
              el.removeAttribute(attr.name);
            }
          }
        }
      } catch {
        // ignore
      }
    };

    stripTempoAttrs();
    const id = window.setInterval(stripTempoAttrs, 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const threshold = window.innerHeight * 0.3;
      setContentVisible(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!whitepaperRef.current) return;
      if (!whitepaperRef.current.contains(event.target as Node)) {
        setWhitepaperOpen(false);
      }
    };

    if (whitepaperOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => document.removeEventListener("click", handleClickOutside);
  }, [whitepaperOpen]);

  const scrollToContent = () => {
    document.getElementById("content")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCloseModal = () => {
    setActiveModalLayer(null);
    setSelected3DLayer(null);
  };

  const LAYER_NAMES = ["INTENT", "ROUTE", "CONSTRAINTS", "SETTLEMENT"];
  const handleStartDeepDive = (layerName: string) => {
    setActiveModalLayer(null);
    const idx = LAYER_NAMES.indexOf(layerName);
    setDeepDiveStartLayer(idx >= 0 ? idx : 0);
    window.scrollTo({ top: 0 });
    setDeepDiveActive(true);
  };

  return (
    <div className="relative w-full min-h-screen bg-[#0B1020] text-white font-space overflow-x-hidden">
      {/* 3D Core Layer */}
      <div className="fixed inset-0 z-0 h-screen overflow-hidden pointer-events-auto">
        <Suspense fallback={<Scene3DLoadingFallback />}>
          <Canvas
            shadows={!isMobile}
            dpr={canvasDpr}
            gl={{
              antialias: !isMobile,
              stencil: false,
              depth: true,
              powerPreference: "high-performance",
            }}
            performance={{ min: 0.5 }}
          >
            <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />
            <color attach="background" args={["#0B1020"]} />

            <Suspense fallback={null}>
              <Scene3D
                selectedLayer={selected3DLayer}
                onSelect={setSelected3DLayer}
                onViewDetails={(name) => setActiveModalLayer(name)}
                cinematicSpin={cinematicSpin}
              />
              <Stars
                radius={100}
                depth={50}
                count={starCount}
                factor={4}
                saturation={0}
                fade
                speed={1}
              />
              {!isMobile && <Environment preset="city" />}
            </Suspense>

            <ambientLight intensity={isMobile ? 0.6 : 0.4} />
            <pointLight position={[10, 10, 10]} intensity={2} color="#F2B94B" />
            <spotLight
              position={[-5, 5, 5]}
              angle={0.15}
              penumbra={1}
              intensity={3}
              color="#38BDF8"
              castShadow={!isMobile}
            />

            <OrbitControls
              enableZoom={false}
              maxPolarAngle={Math.PI / 2}
              minPolarAngle={Math.PI / 3}
              autoRotate
              autoRotateSpeed={0.4}
            />
          </Canvas>
        </Suspense>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex min-h-screen flex-col pointer-events-none">
        <header className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 backdrop-blur-sm bg-gradient-to-b from-[#0B1020]/80 to-transparent pointer-events-auto">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div
              onClick={scrollToTop}
              className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl md:rounded-2xl bg-[#F2B94B] shadow-[0_0_30px_rgba(242,185,75,0.4)] hover:scale-110 transition-transform cursor-pointer"
            >
              <span className="font-space text-xl md:text-2xl font-black text-[#0B1020]">
                J
              </span>
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] uppercase font-black tracking-[0.4em] md:tracking-[0.6em] text-[#F2B94B]">
                JACK
              </p>
              <p className="text-xs md:text-sm font-bold text-white tracking-widest leading-none">
                Autonomous Kernel
              </p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden items-center space-x-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 md:flex">
            <a
              href={docsUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Documentation
            </a>
            <div className="relative group" ref={whitepaperRef}>
              <button
                type="button"
                className="flex items-center gap-1 hover:text-white transition-colors"
                onClick={(event) => {
                  event.stopPropagation();
                  setWhitepaperOpen((prev) => !prev);
                }}
              >
                {`Whitepaper (Start v${featuredWhitepaperVersion})`}
                <svg
                  className="h-3 w-3 stroke-current"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div
                className={`absolute right-0 mt-4 w-80 rounded-2xl border border-white/10 bg-[#0F1A2E]/95 px-6 py-5 text-left shadow-[0_30px_60px_rgba(0,0,0,0.8)] transition-all duration-300 ${
                  whitepaperOpen
                    ? "visible opacity-100 translate-y-0"
                    : "invisible opacity-0 -translate-y-2"
                }`}
              >
                <p className="text-[8px] font-black uppercase tracking-[0.5em] text-[#F2B94B] mb-4">
                  Whitepaper Downloads
                </p>
                <div className="space-y-2">
                  {whitepaperVersions.map((paper) => (
                    <a
                      key={paper.filename}
                      href={`${whitepaperBasePath}/${paper.filename}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`block rounded-xl border px-4 py-3 text-[10px] font-bold text-white transition uppercase tracking-widest ${
                        paper.isFeatured
                          ? "border-[#F2B94B]/50 bg-[#F2B94B]/15 text-[#FFE19A]"
                          : paper.isLatest
                            ? "border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#AEE7FF]"
                            : "border-white/5 bg-white/5 hover:border-[#F2B94B]/50 hover:bg-[#F2B94B]/10"
                      }`}
                    >
                      {paper.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <a
              href={dashboardUrl}
              className="px-6 py-3 bg-white/5 rounded-xl border border-white/10 text-white hover:bg-[#F2B94B] hover:text-[#0B1020] hover:border-[#F2B94B] transition-all font-black"
            >
              Open App
            </a>
          </nav>

          {/* Mobile Nav Toggle */}
          <button
            className="flex flex-col space-y-1.5 md:hidden p-2 pointer-events-auto relative z-[110]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div
              className={`w-6 h-0.5 bg-[#F2B94B] transition-all duration-300 ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`}
            />
            <div
              className={`w-6 h-0.5 bg-[#F2B94B] transition-all duration-300 ${mobileMenuOpen ? "opacity-0" : ""}`}
            />
            <div
              className={`w-6 h-0.5 bg-[#F2B94B] transition-all duration-300 ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`}
            />
          </button>
        </header>

        {/* Mobile Menu Overlay - Fully opaque to avoid overlap clutter */}
        <div
          className={`fixed inset-0 z-[100] bg-[#0B1020] flex flex-col items-center justify-center transition-all duration-500 md:hidden pointer-events-auto ${mobileMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"}`}
        >
          <button
            className="absolute top-8 right-8 p-4 text-[#F2B94B]"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Menu"
          >
            <svg
              className="w-10 h-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <nav className="flex flex-col items-center space-y-12 text-sm font-black uppercase tracking-[0.4em]">
            <a
              href={docsUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-[#F2B94B]"
            >
              Documentation
            </a>

            <div className="flex flex-col items-center space-y-8">
              <p className="text-gray-500 text-[10px] tracking-[0.6em] border-b border-white/10 pb-2">
                Whitepaper Downloads
              </p>
              <div className="flex flex-col space-y-4">
                {whitepaperVersions.map((p) => (
                  <a
                    key={p.filename}
                    href={`${whitepaperBasePath}/${p.filename}`}
                    className={`px-10 py-4 border rounded-2xl text-[10px] text-center w-72 uppercase tracking-widest font-bold transition-colors ${
                      p.isFeatured
                        ? "bg-[#F2B94B]/15 border-[#F2B94B]/50 text-[#FFE19A]"
                        : p.isLatest
                          ? "bg-[#38BDF8]/10 border-[#38BDF8]/40 text-[#AEE7FF]"
                          : "bg-white/5 border-white/10 text-[#F2B94B] hover:bg-[#F2B94B]/10"
                    }`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {p.label}
                  </a>
                ))}
              </div>
            </div>

            <a
              href={dashboardUrl}
              onClick={() => setMobileMenuOpen(false)}
              className="px-12 py-5 bg-[#F2B94B] text-[#0B1020] rounded-2xl font-black shadow-[0_20px_50px_rgba(242,185,75,0.3)] hover:scale-105 transition-transform"
            >
              Open App
            </a>
          </nav>
        </div>

        <div className="flex flex-1 flex-col">
          <main
            id="hero"
            className="relative flex flex-1 min-h-screen items-center justify-center pt-32 md:pt-20 pointer-events-none"
          >
            <div className="flex flex-col items-center z-20 mt-64 md:mt-[22rem] pointer-events-auto gap-5">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
                <a
                  href={dashboardUrl}
                  className="w-full sm:w-auto px-8 md:px-8 py-3 md:py-3 bg-[#F2B94B] text-[#0B1020] font-black uppercase tracking-[0.1em] md:tracking-[0.15em] rounded-xl shadow-[0_12px_30px_rgba(242,185,75,0.25)] hover:scale-105 transition-all text-[10px] md:text-xs text-center"
                >
                  Enter the Kernel
                </a>
                <button
                  onClick={scrollToContent}
                  className="w-full sm:w-auto px-6 md:px-7 py-3 md:py-3 bg-white/5 text-white font-black uppercase tracking-[0.1em] md:tracking-[0.15em] rounded-xl border border-white/10 hover:bg-white/10 transition-all text-[10px] md:text-xs"
                >
                  Read Thesis
                </button>
              </div>
              <button
                onClick={() => {
                  window.scrollTo({ top: 0 });
                  setDeepDiveStartLayer(0);
                  setDeepDiveActive(true);
                }}
                className="px-5 py-2 rounded-full border border-[#F2B94B]/30 text-[#F2B94B]/80 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#F2B94B]/10 hover:border-[#F2B94B]/50 hover:text-[#F2B94B] transition-all flex items-center gap-2"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Deep Dive · All Layers
              </button>
            </div>

            <button
              type="button"
              onClick={scrollToContent}
              className={`absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 text-[8px] font-black uppercase tracking-[0.8em] text-gray-500 transition-opacity duration-500 pointer-events-auto ${
                contentVisible ? "opacity-0" : "opacity-100"
              }`}
            >
              <span>Explore Architecture</span>
              <svg
                className="h-4 w-4 animate-bounce mt-2 text-[#F2B94B]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path
                  d="M12 6v12M6 13l6 6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </main>

          <section
            id="content"
            className={`w-full px-6 py-40 md:px-12 transition duration-1000 ease-out border-t border-white/5 bg-gradient-to-b from-[#0B1020] to-[#05070F] pointer-events-auto ${
              contentVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-20"
            }`}
          >
            <div className="mx-auto flex max-w-6xl flex-col items-center space-y-16">
              <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 mb-10">
                <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-[0.9]">
                  Just-in-Time <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F2B94B] to-[#FFD16D]">
                    Autonomous
                  </span>{" "}
                  <br />
                  Cross-chain Kernel
                </h1>
                <p className="text-lg md:text-xl text-gray-400 font-medium tracking-tight max-w-2xl mx-auto leading-relaxed">
                  Evolve past transaction-centric DeFi. Command agents that
                  navigate liquidity, honor policies, and settle intents with
                  provable integrity.
                </p>
              </div>

              <div className="text-center space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.8em] text-[#F2B94B]">
                  Core Infrastructure
                </p>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">
                  Policy-Constrained <br /> Private Execution (PCPE)
                </h2>
              </div>

              <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-3">
                {momentumMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-3xl border border-white/5 bg-[#0F1A2E]/50 p-10 text-center space-y-4 hover:border-[#F2B94B]/30 transition-all group"
                  >
                    <p className="text-5xl font-black text-white tracking-tighter group-hover:text-[#F2B94B] transition-colors">
                      {metric.value}
                    </p>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
                        {metric.label}
                      </p>
                      <p className="text-xs text-gray-400 font-medium">
                        {metric.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-8 md:grid-cols-2 w-full pt-20">
                {highlightTiles.map((tile) => (
                  <article
                    key={tile.title}
                    className="relative group p-10 rounded-[32px] border border-white/5 bg-[#0F1A2E]/50 shadow-2xl overflow-hidden hover:border-white/20 transition-all"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-[#F2B94B]/5 transition-colors" />
                    <div className="relative z-10 space-y-6">
                      <span
                        className={`${tile.accent} inline-flex items-center rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.4em]`}
                      >
                        {tile.badge}
                      </span>
                      <h3 className="text-3xl font-black text-white tracking-tighter">
                        {tile.title}
                      </h3>
                      <p className="text-gray-400 font-medium leading-relaxed">
                        {tile.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <footer className="relative w-full px-6 py-20 bg-[#05070F] border-t border-white/5 text-center pointer-events-auto">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 mx-auto border border-white/10">
                <span className="font-space text-2xl font-black text-white">
                  J
                </span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <ChangelogDrawer
                  changelogText={changelogRaw}
                  theme="landing"
                  version={landingVersion}
                />
                <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-500">
                  Built for the future of cross-chain interoperability · Research by Lukas.lat
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 text-[9px] font-black uppercase tracking-[0.35em] text-gray-500">
                <a
                  href={docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Docs
                </a>
                <a
                  href={dashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Dashboard
                </a>
                <a
                  href={`${whitepaperBasePath}/${whitepaperManifest.canonicalPdf}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Whitepaper
                </a>
                <a
                  href="https://github.com/hashpass-tech/JACK"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>

          <button
            type="button"
            onClick={scrollToTop}
            className={`fixed right-10 bottom-10 z-[100] p-4 rounded-2xl bg-[#F2B94B] text-[#0B1020] shadow-[0_10px_30px_rgba(242,185,75,0.3)] hover:scale-110 transition-all duration-500 pointer-events-auto ${
              contentVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path
                d="M12 18V6M5 11l7-7 7 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {activeModalLayer && (
        <Suspense fallback={null}>
          <LayerVideoModal
            layer={activeModalLayer}
            onClose={handleCloseModal}
            onDeepDive={handleStartDeepDive}
          />
        </Suspense>
      )}

      {deepDiveActive && (
        <DeepDiveOverlay
          onClose={() => {
            setDeepDiveActive(false);
            setDeepDiveStartLayer(0);
            setCinematicSpin(false);
          }}
          onLayerChange={(idx) => setSelected3DLayer(idx)}
          onCinematicSpin={setCinematicSpin}
          startLayerIdx={deepDiveStartLayer}
        />
      )}
    </div>
  );
};

export default LandingPage;
