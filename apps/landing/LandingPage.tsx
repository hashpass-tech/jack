
/// <reference types="@react-three/fiber" />
import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, PerspectiveCamera, Environment, Stars } from '@react-three/drei';
import Scene3D from '@/components/Scene3Dv2';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  useEffect(() => {
    // Tempo injects data-tempo-* and tempo-hot-reload-ts attributes.
    // R3F can throw when React tries to apply them to Three objects.
    // Remove them from any elements under this page as a guard.
    const stripTempoAttrs = () => {
      try {
        document
          .querySelectorAll('[data-tempo-hot-reload-ts], [tempo-hot-reload-ts], [data-tempo-hot-reload-ts], [data-tempo-*]');
      } catch {
        // ignore
      }

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

  const [activeModalLayer, setActiveModalLayer] = React.useState<string | null>(null);
  const [selected3DLayer, setSelected3DLayer] = React.useState<number | null>(0);

  const handleCloseModal = () => {
    setActiveModalLayer(null);
    setSelected3DLayer(null);
  };

  const layerExplanations: Record<string, string> = {
    "INTENT": "Captures the user's high-level cross-chain goal. It specifies what needs to be achieved without pre-defining the technical path, allowing the kernel to optimize for speed, cost, or privacy.",
    "ROUTE": "Calculates the most efficient execution path across multiple chains. It identifies bridges, DEXs, and liquidity sources to fulfill the intent with minimal slippage and maximum security.",
    "CONSTRAINTS": "Enforces private policies and compliance rules. Execution only proceeds if it satisfies user-defined constraints, institutional guardrails, and risk management parameters.",
    "SETTLEMENT": "Finalizes the cross-chain execution with guaranteed atomicity. It ensures that state transitions are recorded accurately on all involved chains, completing the lifecycle of the kernel process."
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0B1020]">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ antialias: true, stencil: false, depth: true, powerPreference: "high-performance" }}
        >
          <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />
          <color attach="background" args={['#0B1020']} />

          <Suspense fallback={null}>
            <Scene3D
              selectedLayer={selected3DLayer}
              onSelect={setSelected3DLayer}
              onViewDetails={(name) => setActiveModalLayer(name)}
            />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Environment preset="city" />
          </Suspense>

          {/* Intrinsic light elements now correctly typed via reference directive */}
          <ambientLight intensity={0.2} />
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

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 md:p-16 pointer-events-none">
        <header className="absolute top-0 left-0 w-full p-6 md:p-16 flex justify-between items-center max-w-7xl mx-auto right-0">
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-[#F2B94B] rounded-full flex items-center justify-center shadow-[0_0_20px_#F2B94B]">
              <span className="text-[#0B1020] font-bold text-lg md:text-xl">J</span>
            </div>
            <h1 className="text-xl md:text-2xl font-space font-bold tracking-widest text-[#F2B94B]">JACK</h1>
          </div>
          <nav className="hidden md:flex space-x-8 pointer-events-auto">
            <a href="https://storage.googleapis.com/jack-protocol-public/JACK-Whitepaper.pdf" target="_blank" rel="noopener noreferrer" download="JACK-Whitepaper.pdf" className="text-sm uppercase tracking-widest hover:text-[#38BDF8] transition-colors">Whitepaper</a>
            <a href="https://github.com/hashpass-tech/JACK" target="_blank" rel="noopener noreferrer" className="text-sm uppercase tracking-widest hover:text-[#38BDF8] transition-colors">Docs</a>
            <a href="https://github.com/hashpass-tech/JACK" target="_blank" rel="noopener noreferrer" className="text-sm uppercase tracking-widest hover:text-[#38BDF8] transition-colors">SDK</a>
            <a href="https://github.com/hashpass-tech/JACK" target="_blank" rel="noopener noreferrer" className="text-sm uppercase tracking-widest hover:text-[#38BDF8] transition-colors">GitHub</a>
          </nav>
        </header>

        <main className="flex flex-col items-center text-center space-y-6">
          <button
            onClick={onEnter}
            className="pointer-events-auto px-10 py-4 bg-[#F2B94B] text-[#0B1020] font-bold rounded-full 
                       hover:scale-105 transition-all shadow-[0_0_30px_rgba(242,185,75,0.4)]
                       active:scale-95 group flex items-center space-x-3"
          >
            <span className="font-space uppercase tracking-widest">Open Dashboard</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </main>

        <footer className="absolute bottom-8 w-full px-4 text-center pointer-events-auto">
          <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mb-2">
            Built for the future of Cross-Chain Interoperability
          </p>
          <a
            href="https://lukas.money"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] md:text-xs text-[#F2B94B]/60 hover:text-[#F2B94B] transition-colors uppercase tracking-[0.2em]"
          >
            Research by lukas.money Team
          </a>
        </footer>
      </div>

      {/* Details Modal */}
      {activeModalLayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1020]/80 backdrop-blur-sm">
          <div className="bg-[#151C2E] border border-[#F2B94B]/30 rounded-2xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto relative shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-300 pointer-events-auto">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className={`w-12 h-1 ${activeModalLayer === "INTENT" || activeModalLayer === "CONSTRAINTS" ? "bg-[#F2B94B]" : "bg-[#38BDF8]"} mb-4`} />
            <h2 className="text-2xl md:text-3xl font-space font-bold mb-4 tracking-tight text-white uppercase">{activeModalLayer} LAYER</h2>
            <p className="text-gray-300 leading-relaxed text-base md:text-lg">
              {layerExplanations[activeModalLayer]}
            </p>
            <div className="mt-8 pt-6 border-t border-gray-800">
              <button
                onClick={handleCloseModal}
                className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-bold uppercase tracking-widest text-sm transition-all text-white"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback Static Gradient (behind 3D) */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0B1020] via-[#0F1A2E] to-[#0B1020] -z-10" />
    </div>
  );
};

export default LandingPage;
