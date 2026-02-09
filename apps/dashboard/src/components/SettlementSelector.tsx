"use client";

import { type FC } from "react";
import {
  SETTLEMENT_OPTIONS,
  SEPOLIA_CONTRACTS,
  type SettlementMethod,
} from "@/lib/settlement";

interface SettlementSelectorProps {
  selected: SettlementMethod;
  onChange: (method: SettlementMethod) => void;
}

export const SettlementSelector: FC<SettlementSelectorProps> = ({
  selected,
  onChange,
}) => {
  return (
    <div className="space-y-3">
      <p
        className="text-[10px] uppercase tracking-[0.2em] font-bold"
        style={{ color: "var(--fg-muted)" }}
      >
        Settlement Method
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {SETTLEMENT_OPTIONS.map((opt) => {
          const isActive = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className="text-left p-3 rounded-xl border transition-all hover:scale-[1.01]"
              style={{
                background: isActive
                  ? "rgba(242,185,75,0.10)"
                  : "var(--bg-tertiary)",
                borderColor: isActive
                  ? "var(--fg-accent)"
                  : "var(--border-secondary)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs font-bold"
                  style={{
                    color: isActive ? "var(--fg-accent)" : "var(--fg-primary)",
                  }}
                >
                  {opt.label}
                </span>
                <span
                  className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  style={{
                    background:
                      opt.status === "live"
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(56,189,248,0.15)",
                    color: opt.status === "live" ? "#22c55e" : "#38bdf8",
                  }}
                >
                  {opt.status}
                </span>
              </div>
              <p
                className="text-[9px] font-medium leading-relaxed"
                style={{ color: "var(--fg-muted)" }}
              >
                {opt.desc}
              </p>
              <p
                className="text-[8px] font-mono mt-1"
                style={{ color: "var(--fg-muted)", opacity: 0.7 }}
              >
                {opt.network}
              </p>
            </button>
          );
        })}
      </div>

      {/* Show contract addresses for selected method */}
      {selected === "yellow" && (
        <div
          className="rounded-lg p-2.5 border text-[9px] font-mono space-y-1"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: "var(--border-secondary)",
          }}
        >
          <p style={{ color: "var(--fg-muted)" }}>
            Custody:{" "}
            <span style={{ color: "var(--fg-info)" }}>
              {SEPOLIA_CONTRACTS.yellow.custody}
            </span>
          </p>
          <p style={{ color: "var(--fg-muted)" }}>
            Adjudicator:{" "}
            <span style={{ color: "var(--fg-info)" }}>
              {SEPOLIA_CONTRACTS.yellow.adjudicator}
            </span>
          </p>
        </div>
      )}
      {selected === "v4" && (
        <div
          className="rounded-lg p-2.5 border text-[9px] font-mono space-y-1"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: "var(--border-secondary)",
          }}
        >
          <p style={{ color: "var(--fg-muted)" }}>
            PolicyHook:{" "}
            <span style={{ color: "var(--fg-info)" }}>
              {SEPOLIA_CONTRACTS.v4.policyHook}
            </span>
          </p>
          <p style={{ color: "var(--fg-muted)" }}>
            Adapter:{" "}
            <span style={{ color: "var(--fg-info)" }}>
              {SEPOLIA_CONTRACTS.v4.settlementAdapter}
            </span>
          </p>
          <p style={{ color: "var(--fg-muted)" }}>
            PoolManager:{" "}
            <span style={{ color: "var(--fg-info)" }}>
              {SEPOLIA_CONTRACTS.v4.poolManager}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
