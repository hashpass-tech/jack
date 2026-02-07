"use client";

import { useState, useEffect, type FC } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CreateIntentView } from "./CreateIntentView";
import { ExecutionsListView } from "./ExecutionsListView";
import { ExecutionDetailView } from "./ExecutionDetailView";
import AgentCostDashboard from "./AgentCostDashboard";
import { ChangelogDrawer } from "@shared/drawer-changelog";

const ThemeToggle: FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("jack-theme") as "dark" | "light" | null;
    const initial = stored || "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

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

const Dashboard: FC<{ changelog?: string }> = ({ changelog = "" }) => {
  const [activeTab, setActiveTab] = useState<
    "create" | "executions" | "cost-dashboard"
  >("create");
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(
    null,
  );
  const [showTestnetModal, setShowTestnetModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [docsUrl, setDocsUrl] = useState(
    process.env.NEXT_PUBLIC_DOCS_URL ?? "https://docs.jack.lukas.money",
  );
  const dashboardVersion = process.env.NEXT_PUBLIC_DASHBOARD_VERSION ?? "0.0.0";
  const protocolTrack = process.env.NEXT_PUBLIC_JACK_PROTOCOL_TRACK ?? "v1";
  const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === "true";
  const landingUrl = isTestnet
    ? "https://testnet.jack.lukas.money"
    : "https://jack.lukas.money";
  const environmentLabel = isTestnet ? "TESTNET" : "MAINNET";

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.location.hostname.includes("localhost") ||
        window.location.hostname === "127.0.0.1")
    ) {
      setDocsUrl("http://localhost:3002");
    }
  }, []);

  useEffect(() => {
    if (isTestnet && typeof window !== "undefined") {
      const { hostname } = window.location;
      if (
        hostname === "jack.lukas.money" ||
        hostname === "www.jack.lukas.money"
      ) {
        setShowTestnetModal(true);
      }
    }
  }, [isTestnet]);

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
    { key: "create", label: "Build Intent", shortLabel: "Intent" },
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
            <a
              href={docsUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all hover:opacity-90"
              style={{ borderColor: "var(--border-secondary)", color: "var(--fg-secondary)" }}
            >
              Docs
            </a>
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

          {/* Mobile: theme toggle + hamburger */}
          <div className="flex items-center space-x-2 md:hidden">
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

      {/* ── Testnet Banner ────────────────────────────── */}
      {isTestnet && (
        <div
          className="px-4 py-2.5 text-center text-xs font-bold border-b"
          style={{ background: "var(--fg-accent)", color: "var(--bg-primary)", borderColor: "var(--border-accent)" }}
        >
          ⚠️ TESTNET MODE · For mainnet, visit{" "}
          <a href="https://jack.lukas.money/dashboard" className="underline font-black hover:opacity-80" target="_blank" rel="noopener noreferrer">
            jack.lukas.money/dashboard
          </a>
          <span className="ml-2 text-[10px] font-normal opacity-80">(mainnet launch Q3 2026)</span>
        </div>
      )}

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
      <main className="flex-1 overflow-y-auto p-4 md:p-8" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-5xl mx-auto">{renderContent()}</div>
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
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
