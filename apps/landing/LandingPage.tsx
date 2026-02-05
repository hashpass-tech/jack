import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Stars } from '@react-three/drei';
import Scene3D from '@/components/Scene3Dv2';

const whitepaperVersions = [
  { label: 'Latest', filename: 'JACK-Whitepaper.pdf' },
  { label: 'v1.0.1', filename: 'JACK-Whitepaper-v1.0.1.pdf' }
];

const layerExplanations: Record<string, string> = {
  INTENT: 'Captures the user’s high-level cross-chain goal and lets the kernel strategize the best execution path.',
  ROUTE: 'Deploys the solver network along optimal bridges and liquidity pools, balancing cost, speed, and risk.',
  CONSTRAINTS: 'Keeps private policies and guardrails enforced through Fhenix encryption and policy hooks.',
  SETTLEMENT: 'Finalizes the execution with atomic settlement adapters so every chain sees a consistent state.'
};

const highlightTiles = [
  {
    title: 'Intent-First Workflows',
    description: 'Express what you want to accomplish, not how to do it. JACK derives the route, privacy, and settlement hooks automatically.',
    accent: 'bg-[#F2B94B]/20 text-[#F2B94B]',
    badge: 'Autonomous'
  },
  {
    title: 'Solver-Powered Routing',
    description: 'The Yellow Fusion solver continuously evaluates liquidity, policies, and costs to stay inside budget.',
    accent: 'bg-[#38BDF8]/20 text-[#38BDF8]',
    badge: 'Dynamic'
  },
  {
    title: 'Policy-as-Code',
    description: 'Embed compliance, privacy, and security checks directly into settlement hooks and execution constraints.',
    accent: 'bg-[#A855F7]/20 text-[#A855F7]',
    badge: 'Shielded'
  },
  {
    title: 'Live Cost Telemetry',
    description: 'Observe every agent’s spend per issue, overlay budgets, and react before an execution drifts out of bounds.',
    accent: 'bg-[#34D399]/20 text-[#34D399]',
    badge: 'Transparent'
  }
];

const momentumMetrics = [
  { value: '12+', label: 'Chains orchestrated', detail: 'Arbitrum, Base, Optimism, Polygon, and partners' },
  { value: '2.8s', label: 'Avg settlement time', detail: 'Across agents committed to JIT hooks' },
  { value: '98%', label: 'Constraints enforced', detail: 'Private policies honored on every execution' }
];

const deriveDashboardUrl = (): string => {
  const envUrl = import.meta.env.VITE_DASHBOARD_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    if (hostname.includes('localhost')) {
      return 'http://localhost:3001';
    }
    return new URL('/dashboard', origin).href;
  }

  return 'http://localhost:3001';
};

const LandingPage: React.FC = () => {
  const dashboardUrl = deriveDashboardUrl();
  const [activeModalLayer, setActiveModalLayer] = useState<string | null>(null);
  const [selected3DLayer, setSelected3DLayer] = useState<number | null>(0);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    const stripTempoAttrs = () => {
      try {
        const all = Array.from(document.querySelectorAll('*')) as HTMLElement[];
        for (const el of all) {
          for (const attr of Array.from(el.attributes)) {
            if (attr.name.startsWith('data-tempo-') || attr.name === 'tempo-hot-reload-ts') {
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
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToContent = () => {
    document.getElementById('content')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseModal = () => {
    setActiveModalLayer(null);
    setSelected3DLayer(null);
  };

    return (
      <div className="relative w-full min-h-screen bg-[#0B1020] text-white">
      <div className="absolute inset-0 z-0 h-screen overflow-hidden">
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, stencil: false, depth: true, powerPreference: 'high-performance' }}
        >
          <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
          <color attach="background" args={['#0B1020']} />

          <Suspense fallback={null}>
            <Scene3D
              selectedLayer={selected3DLayer}
              onSelect={setSelected3DLayer}
              onViewDetails={(name) => setActiveModalLayer(name)}
            />
            <Stars radius={100} depth={50} count={6000} factor={4} saturation={0} fade speed={1} />
            <Environment preset="city" />
          </Suspense>

          <ambientLight intensity={0.25} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#F2B94B" />
          <spotLight position={[-5, 5, 5]} angle={0.15} penumbra={1} intensity={2} color="#38BDF8" castShadow />

          <OrbitControls
            enableZoom={false}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 3}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col pointer-events-none">
        <header className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between px-6 py-6 md:px-12">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F2B94B] shadow-[0_0_25px_rgba(242,185,75,0.6)]">
              <span className="font-space text-lg font-bold text-[#0B1020]">J</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.5em] text-gray-300">JACK</p>
              <p className="text-sm font-semibold text-white">Kernel</p>
            </div>
          </div>
          <nav className="hidden items-center space-x-8 text-xs uppercase tracking-[0.2em] text-gray-400 md:flex">
            <a href="https://github.com/hashpass-tech/JACK" target="_blank" rel="noreferrer" className="hover:text-[#38BDF8] transition-colors">Docs</a>
            <a href="https://github.com/hashpass-tech/JACK" target="_blank" rel="noreferrer" className="hover:text-[#38BDF8] transition-colors">SDK</a>
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 hover:text-[#38BDF8] transition-colors"
                aria-haspopup="true"
                aria-expanded="false"
              >
                Whitepaper
                <svg className="h-3 w-3 stroke-current" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="invisible absolute right-0 mt-3 w-56 rounded-2xl border border-white/10 bg-[#0B1020]/90 px-4 py-3 text-left text-[11px] uppercase tracking-[0.4em] text-gray-300 shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all duration-200 ease-out group-hover:visible">
                <p className="text-[9px] uppercase tracking-[0.6em] text-gray-500">Download</p>
                <div className="mt-2 space-y-1 text-[10px] tracking-[0.3em]">
                  {whitepaperVersions.map((paper) => (
                    <a
                      key={paper.filename}
                      href={`/whitepapper/${paper.filename}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl border border-white/10 px-3 py-2 text-white transition hover:border-white/40"
                    >
                      {paper.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <a href="https://github.com/hashpass-tech/JACK" target="_blank" rel="noreferrer" className="hover:text-[#38BDF8] transition-colors">GitHub</a>
          </nav>
        </header>

          <div className="flex flex-1 flex-col scroll-smooth snap-y snap-mandatory">
          <main
            id="hero"
              className="pointer-events-none relative flex flex-1 min-h-screen items-center justify-center snap-start"
          >
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#F2B94B] to-[#FFD16D] px-8 py-3 text-[12px] font-semibold uppercase tracking-[0.4em] text-[#0B1020] shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition hover:scale-[1.03]"
              >
                Open Dashboard
              </a>
            <button
              type="button"
              aria-label="Scroll to explore"
              onClick={scrollToContent}
              className={`pointer-events-auto absolute left-1/2 top-[calc(100vh-68px)] -translate-x-1/2 rounded-full border border-white/30 bg-black/30 px-6 py-3 text-[10px] uppercase tracking-[0.4em] text-white transition duration-500 ${
                contentVisible ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <span>Scroll to explore</span>
              <span className="mt-2 flex justify-center">
                <svg className="h-6 w-6 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 6v12" />
                  <path d="M6 13l6 6 6-6" />
                </svg>
              </span>
            </button>
          </main>

          <section
            id="content"
            className={`pointer-events-auto w-full px-4 pb-20 md:px-8 snap-start transition duration-700 ease-out ${
              contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <div className="mx-auto flex max-w-5xl flex-col items-center space-y-10 text-center">
              <p className="text-xs uppercase tracking-[0.5em] text-[#F2B94B]/80">Cross-Chain Execution Kernel</p>
              <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-white md:text-5xl">
                Autonomous intent orchestration with privacy-first policy checks and real-time cost telemetry.
              </h1>
              <p className="max-w-3xl text-base text-gray-300 md:text-lg">
                Command agents that negotiate liquidity, honor budgets, and settle outcomes across Base, Arbitrum, Optimism, Polygon, and beyond.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <a
                  href={dashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 rounded-full bg-[#F2B94B] px-10 py-4 text-sm font-bold uppercase tracking-[0.3em] text-[#0B1020] shadow-[0_0_30px_rgba(242,185,75,0.4)] transition hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F2B94B]"
                >
                  Open Dashboard
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 12h14" />
                    <path d="M14 5l7 7-7 7" />
                  </svg>
                </a>
                <a
                  href="https://github.com/hashpass-tech/JACK"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-gray-300 transition hover:text-white"
                >
                  View Repo
                </a>
              </div>
              <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
                {momentumMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left text-sm">
                    <p className="text-3xl font-semibold text-white">{metric.value}</p>
                    <p className="text-xs uppercase tracking-[0.5em] text-gray-400">{metric.label}</p>
                    <p className="text-[11px] text-gray-300">{metric.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto mt-16 flex max-w-5xl flex-col space-y-6 text-left">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Core Differentiators</p>
                <h2 className="text-2xl font-semibold text-white md:text-3xl">Why teams build on JACK</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {highlightTiles.map((tile) => (
                  <article
                    key={tile.title}
                    className="space-y-3 rounded-3xl border border-white/5 bg-white/5 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.4)] transition hover:border-white/30"
                  >
                    <span className={`${tile.accent} inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.5em]`}>{tile.badge}</span>
                    <h3 className="text-xl font-semibold text-white">{tile.title}</h3>
                    <p className="text-sm text-gray-300">{tile.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <footer className="pointer-events-auto relative mt-auto w-full px-6 pb-8 pt-4 text-center text-[10px] uppercase tracking-[0.5em] text-gray-500 snap-start">
            <p>Built for the future of cross-chain interoperability · Research by lukas.money</p>
          </footer>

          <button
            type="button"
            aria-label="Back to top"
            onClick={scrollToTop}
            className={`pointer-events-auto fixed right-6 bottom-6 flex items-center gap-2 rounded-full border border-white/30 bg-black/60 px-4 py-2 text-[10px] uppercase tracking-[0.4em] text-white shadow-[0_0_20px_rgba(0,0,0,0.4)] transition ${
              contentVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <span>Back to top</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 18V6" />
              <path d="M5 11l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {activeModalLayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1020]/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#F2B94B]/40 bg-[#151C2E] p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <button
              onClick={handleCloseModal}
              className="absolute right-4 top-4 text-gray-400 transition hover:text-white"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="mb-6 h-1 w-16 rounded-full bg-gradient-to-r from-[#F2B94B] to-[#38BDF8]" />
            <h2 className="text-2xl font-semibold uppercase tracking-[0.5em] text-white">{activeModalLayer} Layer</h2>
            <p className="mt-4 text-sm text-gray-200">{layerExplanations[activeModalLayer]}</p>
            <button
              onClick={handleCloseModal}
              className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white transition hover:border-white/50"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#0B1020] via-[#0F1A2E] to-[#05070F]" />
    </div>
  );
};

export default LandingPage;
