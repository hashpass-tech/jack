"use client";

import { type FC } from "react";
import { SEPOLIA_CONTRACTS } from "@/lib/settlement";

interface ChannelStatusPanelProps {
  channelId?: string;
  channelStatus?: string;
  stateIntent?: string;
  stateVersion?: number;
  stateHash?: string;
  adjudicator?: string;
  challengePeriod?: number;
  settlementTx?: string;
  provider?: string;
  providerMetadata?: Record<string, unknown>;
}

export const ChannelStatusPanel: FC<ChannelStatusPanelProps> = ({
  channelId,
  channelStatus,
  stateIntent,
  stateVersion,
  stateHash,
  adjudicator,
  challengePeriod,
  settlementTx,
  provider,
  providerMetadata,
}) => {
  const isYellow = provider?.toLowerCase().includes("yellow") || !!channelId;
  const isV4 =
    provider?.toLowerCase().includes("v4") ||
    provider?.toLowerCase().includes("uniswap");
  const erc7824 = providerMetadata?.erc7824 as
    | Record<string, unknown>
    | undefined;

  if (!isYellow && !isV4 && !channelId && !settlementTx) return null;

  const statusColor = (s?: string) => {
    if (!s) return "var(--fg-muted)";
    const lower = s.toLowerCase();
    if (lower === "active" || lower === "open") return "#22c55e";
    if (lower === "final" || lower === "closed") return "#38bdf8";
    if (lower === "dispute") return "#ef4444";
    return "#eab308";
  };

  const etherscanTx = (hash: string) =>
    `https://sepolia.etherscan.io/tx/${hash}`;
  const etherscanAddr = (addr: string) =>
    `https://sepolia.etherscan.io/address/${addr}`;

  return (
    <div
      className="border rounded-2xl p-5 shadow-xl space-y-4"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-primary)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: isYellow ? "#eab308" : "#a78bfa" }}
        />
        <h3
          className="text-[10px] font-black uppercase tracking-[0.3em]"
          style={{ color: isYellow ? "#eab308" : "#a78bfa" }}
        >
          {isYellow
            ? "Yellow Network · State Channel"
            : "Uniswap v4 · Hook Settlement"}
        </h3>
      </div>

      {/* Channel info */}
      {channelId && (
        <div className="space-y-2">
          <Row label="Channel ID" value={channelId} mono truncate />
          {channelStatus && (
            <Row
              label="Status"
              value={channelStatus.toUpperCase()}
              color={statusColor(channelStatus)}
            />
          )}
          {stateIntent && <Row label="State Intent" value={stateIntent} />}
          {stateVersion !== undefined && (
            <Row label="State Version" value={String(stateVersion)} />
          )}
          {stateHash && (
            <Row label="State Hash" value={stateHash} mono truncate />
          )}
          {adjudicator && (
            <Row
              label="Adjudicator"
              value={adjudicator}
              mono
              truncate
              link={etherscanAddr(adjudicator)}
            />
          )}
          {challengePeriod !== undefined && (
            <Row label="Challenge Period" value={`${challengePeriod}s`} />
          )}
        </div>
      )}

      {/* V4 contract info */}
      {isV4 && !channelId && (
        <div className="space-y-2">
          <Row
            label="PolicyHook"
            value={SEPOLIA_CONTRACTS.v4.policyHook}
            mono
            truncate
            link={etherscanAddr(SEPOLIA_CONTRACTS.v4.policyHook)}
          />
          <Row
            label="Adapter"
            value={SEPOLIA_CONTRACTS.v4.settlementAdapter}
            mono
            truncate
            link={etherscanAddr(SEPOLIA_CONTRACTS.v4.settlementAdapter)}
          />
        </div>
      )}

      {/* Settlement tx */}
      {settlementTx && (
        <a
          href={etherscanTx(settlementTx)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:border-[var(--fg-accent)]"
          style={{
            background: "rgba(34,197,94,0.08)",
            borderColor: "rgba(34,197,94,0.25)",
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "#22c55e" }}
          />
          <span className="text-[10px] font-bold" style={{ color: "#22c55e" }}>
            Settlement Tx
          </span>
          <span
            className="text-[9px] font-mono ml-auto"
            style={{ color: "var(--fg-muted)" }}
          >
            {settlementTx.slice(0, 10)}...{settlementTx.slice(-8)}
          </span>
        </a>
      )}

      {/* ERC-7824 metadata */}
      {erc7824 && (
        <div
          className="rounded-lg p-2.5 border space-y-1"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: "var(--border-secondary)",
          }}
        >
          <p
            className="text-[8px] font-bold uppercase tracking-wider"
            style={{ color: "var(--fg-muted)" }}
          >
            ERC-7824 Metadata
          </p>
          {erc7824.proofsCount !== undefined && (
            <p
              className="text-[9px] font-mono"
              style={{ color: "var(--fg-secondary)" }}
            >
              Proofs: {String(erc7824.proofsCount)}
            </p>
          )}
          {erc7824.nonce !== undefined && (
            <p
              className="text-[9px] font-mono"
              style={{ color: "var(--fg-secondary)" }}
            >
              Nonce: {String(erc7824.nonce)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const Row: FC<{
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
  color?: string;
  link?: string;
}> = ({ label, value, mono, truncate, color, link }) => {
  const display =
    truncate && value.length > 20
      ? `${value.slice(0, 10)}...${value.slice(-8)}`
      : value;

  const content = (
    <div className="flex justify-between items-center text-[10px]">
      <span
        className="font-bold uppercase tracking-tight"
        style={{ color: "var(--fg-muted)" }}
      >
        {label}
      </span>
      <span
        className={`font-semibold ${mono ? "font-mono" : ""} ${link ? "underline decoration-dotted" : ""}`}
        style={{ color: color || "var(--fg-primary)" }}
        title={truncate ? value : undefined}
      >
        {display}
      </span>
    </div>
  );

  if (link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        className="block hover:opacity-80 transition-opacity"
      >
        {content}
      </a>
    );
  }
  return content;
};
