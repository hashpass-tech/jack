"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type FormEvent,
  type FC,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { useSignTypedData, useAccount } from "wagmi";
import { JACK_SDK, IntentParams } from "@jack-kernel/sdk";
import { SettlementSelector } from "./SettlementSelector";
import type { SettlementMethod } from "@/lib/settlement";

/* ═══════════════════════════════════════════════════════════════════
   SVG Icon Components (futuristic, no emojis)
   ═══════════════════════════════════════════════════════════════════ */

const Icon = {
  Bolt: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Grid: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Sliders: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
  Mic: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  Upload: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Bridge: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 20h20" />
      <path d="M5 20V8" />
      <path d="M19 20V8" />
      <path d="M5 8c0-4 14-4 14 0" />
      <path d="M9 20V12" />
      <path d="M15 20V12" />
    </svg>
  ),
  Scale: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="3" x2="12" y2="21" />
      <polyline points="8 8 4 4" />
      <polyline points="16 8 20 4" />
      <path d="M4 4l4 8h-8l4-8z" />
      <path d="M20 4l4 8h-8l4-8z" />
    </svg>
  ),
  TrendUp: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Shield: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  CreditCard: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  Building: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22V6h6v16" />
      <path d="M8 6h8" />
      <path d="M8 10h8" />
      <path d="M8 14h8" />
    </svg>
  ),
  Check: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Key: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
  Swap: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  Lock: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Activity: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Globe: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Crosshair: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  ),
  Clock: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  ArrowRight: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Scan: ({
    className = "w-4 h-4",
    style,
  }: {
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

type InputMode = "quick" | "templates" | "advanced";
type SubmitStatus =
  | "IDLE"
  | "RESOLVING"
  | "PLANNING"
  | "SIGNING"
  | "EXECUTING"
  | "DONE"
  | "ERROR";

interface CreateIntentViewProps {
  onIntentSubmitted: (id: string) => void;
}

interface ResolvedRoute {
  provider: string;
  amountOut: string;
  minAmountOut: string;
  estimatedGasUsd: string;
  isFallback: boolean;
  routeId: string;
}

interface PlanData {
  route: string;
  worstCase: string;
  deadline: string;
  bridgeRisk: "Low" | "Medium" | "High";
  whyThisPlan: [string, string];
  whatCanGoWrong: string;
  fallback: string | null;
  estimatedGas: string;
  estimatedTime: string;
  resolvedRoute: ResolvedRoute | null;
}

/* ═══════════════════════════════════════════════════════════════════
   Intent Templates (SVG icons)
   ═══════════════════════════════════════════════════════════════════ */

const INTENT_TEMPLATES: {
  id: string;
  iconKey: keyof typeof Icon;
  label: string;
  desc: string;
  defaults: {
    sourceChain: string;
    destChain: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minOut: string;
  };
}[] = [
  {
    id: "bridge-buy",
    iconKey: "Bridge",
    label: "Bridge & Buy",
    desc: "Move tokens cross-chain and swap in one intent",
    defaults: {
      sourceChain: "Arbitrum",
      destChain: "Base",
      tokenIn: "USDC",
      tokenOut: "WETH",
      amountIn: "1000",
      minOut: "0.45",
    },
  },
  {
    id: "rebalance-stable",
    iconKey: "Scale",
    label: "Rebalance to Stable",
    desc: "Convert volatile holdings to stablecoins across chains",
    defaults: {
      sourceChain: "Base",
      destChain: "Arbitrum",
      tokenIn: "WETH",
      tokenOut: "USDC",
      amountIn: "0.5",
      minOut: "1100",
    },
  },
  {
    id: "dca",
    iconKey: "TrendUp",
    label: "DCA (Dollar-Cost Average)",
    desc: "Schedule recurring buys with policy-enforced min receive",
    defaults: {
      sourceChain: "Arbitrum",
      destChain: "Base",
      tokenIn: "USDC",
      tokenOut: "WETH",
      amountIn: "250",
      minOut: "0.11",
    },
  },
  {
    id: "protect-downside",
    iconKey: "Shield",
    label: "Protect Downside",
    desc: "Auto-sell to stable if price drops below threshold",
    defaults: {
      sourceChain: "Base",
      destChain: "Arbitrum",
      tokenIn: "WETH",
      tokenOut: "USDC",
      amountIn: "1",
      minOut: "2200",
    },
  },
  {
    id: "pay-merchant",
    iconKey: "CreditCard",
    label: "Pay Merchant",
    desc: "Pay in any token, merchant receives preferred currency",
    defaults: {
      sourceChain: "Arbitrum",
      destChain: "Base",
      tokenIn: "USDC",
      tokenOut: "USDC",
      amountIn: "50",
      minOut: "49.50",
    },
  },
  {
    id: "treasury-guardrails",
    iconKey: "Building",
    label: "Treasury Guardrails",
    desc: "Convert revenue to stable with max slippage & pool allowlist",
    defaults: {
      sourceChain: "Base",
      destChain: "Arbitrum",
      tokenIn: "WETH",
      tokenOut: "USDC",
      amountIn: "10",
      minOut: "22000",
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════
   NLP Parser
   ═══════════════════════════════════════════════════════════════════ */

const CHAIN_ALIASES: Record<string, string> = {
  arb: "Arbitrum",
  arbitrum: "Arbitrum",
  base: "Base",
  op: "Optimism",
  optimism: "Optimism",
  poly: "Polygon",
  polygon: "Polygon",
  eth: "Ethereum",
  ethereum: "Ethereum",
};
const TOKEN_ALIASES: Record<string, string> = {
  usdc: "USDC",
  usdt: "USDT",
  eth: "ETH",
  weth: "WETH",
  wbtc: "WBTC",
  link: "LINK",
  dai: "DAI",
};

function parseQuickIntent(raw: string): Partial<{
  sourceChain: string;
  destChain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minOut: string;
  deadlineMinutes: number;
}> {
  const s = raw.toLowerCase().trim();
  const result: ReturnType<typeof parseQuickIntent> = {};

  const amtMatch = s.match(
    /(\d+(?:\.\d+)?)\s+(usdc|usdt|eth|weth|wbtc|link|dai)/,
  );
  if (amtMatch) {
    result.amountIn = amtMatch[1];
    result.tokenIn = TOKEN_ALIASES[amtMatch[2]] ?? amtMatch[2].toUpperCase();
  }

  const chainMatch = s.match(
    /(?:from\s+)?(arb(?:itrum)?|base|op(?:timism)?|poly(?:gon)?|eth(?:ereum)?)\s*(?:→|->|to)\s*(arb(?:itrum)?|base|op(?:timism)?|poly(?:gon)?|eth(?:ereum)?)/,
  );
  if (chainMatch) {
    result.sourceChain = CHAIN_ALIASES[chainMatch[1]] ?? chainMatch[1];
    result.destChain = CHAIN_ALIASES[chainMatch[2]] ?? chainMatch[2];
  }

  const outMatch = s.match(
    /(?:→|->|to)\s+(?:arb(?:itrum)?|base|op(?:timism)?|poly(?:gon)?|eth(?:ereum)?)?\s*,?\s*(usdc|usdt|eth|weth|wbtc|link|dai)/,
  );
  if (!outMatch) {
    const buyMatch = s.match(
      /(?:buy|get|receive|swap\s+(?:for|to))\s+(usdc|usdt|eth|weth|wbtc|link|dai)/,
    );
    if (buyMatch)
      result.tokenOut = TOKEN_ALIASES[buyMatch[1]] ?? buyMatch[1].toUpperCase();
  } else {
    result.tokenOut = TOKEN_ALIASES[outMatch[1]] ?? outMatch[1].toUpperCase();
  }

  const minMatch = s.match(
    /(?:min(?:imum)?|at\s*least|floor)\s+(\d+(?:\.\d+)?)/,
  );
  if (minMatch) result.minOut = minMatch[1];

  const dlMatch = s.match(/(?:by|in|within)\s+(\d+)\s*(?:m(?:in(?:utes?)?)?)/);
  if (dlMatch) result.deadlineMinutes = parseInt(dlMatch[1]);

  return result;
}

/* ═══════════════════════════════════════════════════════════════════
   Receipt OCR parser (extract amount, token, chain from text)
   ═══════════════════════════════════════════════════════════════════ */

function parseReceiptText(text: string): Partial<{
  amountIn: string;
  tokenIn: string;
  destChain: string;
  tokenOut: string;
}> {
  const s = text.toLowerCase();
  const result: ReturnType<typeof parseReceiptText> = {};

  const amtMatch = s.match(
    /(?:total|amount|pay|send|transfer)\s*[:\-]?\s*\$?(\d+(?:[.,]\d+)?)\s*(usdc|usdt|usd|dai)?/,
  );
  if (amtMatch) {
    result.amountIn = amtMatch[1].replace(",", ".");
    result.tokenIn = TOKEN_ALIASES[amtMatch[2] ?? "usdc"] ?? "USDC";
  }

  for (const [alias, chain] of Object.entries(CHAIN_ALIASES)) {
    if (s.includes(alias)) {
      result.destChain = chain;
      break;
    }
  }

  for (const [alias, token] of Object.entries(TOKEN_ALIASES)) {
    if (
      s.includes(`receive ${alias}`) ||
      s.includes(`get ${alias}`) ||
      s.includes(`→ ${alias}`)
    ) {
      result.tokenOut = token;
      break;
    }
  }

  return result;
}

/* ═══════════════════════════════════════════════════════════════════
   Policy Badge data (SVG icon keys)
   ═══════════════════════════════════════════════════════════════════ */

const POLICY_BADGES: {
  iconKey: keyof typeof Icon;
  label: string;
  desc: string;
}[] = [
  {
    iconKey: "Check",
    label: "Guaranteed Minimum Receive",
    desc: "Enforced by Uniswap v4 JACK Hook on-chain",
  },
  {
    iconKey: "Crosshair",
    label: "Venue Allowlist",
    desc: "Only approved liquidity pools accepted",
  },
  {
    iconKey: "Globe",
    label: "Bridge Allowlist",
    desc: "LI.FI allowlisted bridges only",
  },
  {
    iconKey: "Shield",
    label: "Max Fee Cap",
    desc: "Total solver + gas fee capped",
  },
  {
    iconKey: "Clock",
    label: "Deadline Enforced",
    desc: "Auto-refund if not settled in time",
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export const CreateIntentView: FC<CreateIntentViewProps> = ({
  onIntentSubmitted,
}) => {
  const { isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [mode, setMode] = useState<InputMode>("quick");
  const [quickInput, setQuickInput] = useState("");
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    sourceChain: "Arbitrum",
    destChain: "Base",
    tokenIn: "USDC",
    tokenOut: "WETH",
    amountIn: "1000",
    minOut: "0.45",
    privacy: false,
  });

  const [status, setStatus] = useState<SubmitStatus>("IDLE");
  const [settlementMethod, setSettlementMethod] =
    useState<SettlementMethod>("lifi");

  /* ── Route resolver: calls /api/quote ── */
  const resolveRoute = useCallback(
    async (f: typeof form): Promise<ResolvedRoute | null> => {
      try {
        const params = new URLSearchParams({
          sourceChain: f.sourceChain.toLowerCase(),
          destinationChain: f.destChain.toLowerCase(),
          tokenIn: f.tokenIn,
          tokenOut: f.tokenOut,
          amountIn: f.amountIn,
          minAmountOut: f.minOut,
          deadline: String(Math.floor(Date.now() / 1000) + 1200),
        });
        const res = await fetch(`/api/quote?${params}`);
        const data = await res.json();
        if (data.status === "ok" && data.quote) {
          return {
            provider: "LI.FI",
            amountOut: data.quote.amountOut ?? f.minOut,
            minAmountOut: data.quote.minAmountOut ?? f.minOut,
            estimatedGasUsd: data.quote.estimatedGasUsd ?? "~$12",
            isFallback: false,
            routeId: data.routeId ?? "auto",
          };
        }
        return {
          provider: "fallback",
          amountOut: f.minOut,
          minAmountOut: f.minOut,
          estimatedGasUsd: "~$12",
          isFallback: true,
          routeId: "fallback-static",
        };
      } catch {
        return {
          provider: "fallback",
          amountOut: f.minOut,
          minAmountOut: f.minOut,
          estimatedGasUsd: "~$12",
          isFallback: true,
          routeId: "fallback-error",
        };
      }
    },
    [],
  );

  /* ── Generate plan (now uses resolver) ── */
  const generatePlan = useCallback(
    async (f: typeof form): Promise<PlanData> => {
      setStatus("RESOLVING");
      const resolved = await resolveRoute(f);
      const gas = resolved?.estimatedGasUsd ?? "~$12";
      const bestOut =
        resolved && !resolved.isFallback ? resolved.amountOut : null;

      const settlementLabel =
        settlementMethod === "yellow"
          ? "Yellow Network State Channel"
          : settlementMethod === "v4"
            ? "Uniswap v4 Hook (Sepolia)"
            : (resolved?.provider ?? "LI.FI");

      return {
        route: `${f.sourceChain} ${f.tokenIn} → ${settlementLabel} → ${f.destChain} ${f.tokenOut}`,
        worstCase: `${f.minOut} ${f.tokenOut}`,
        deadline: "20 min",
        bridgeRisk: resolved?.isFallback ? "Medium" : "Low",
        whyThisPlan: [
          settlementMethod === "yellow"
            ? "Off-chain state channel settlement — instant, zero gas for transfers"
            : settlementMethod === "v4"
              ? "On-chain policy hook enforces min-receive before swap executes"
              : bestOut
                ? `Best rate found: ${bestOut} ${f.tokenOut} via ${resolved?.provider} route`
                : "Best rate via Stargate bridge with lowest slippage impact",
          settlementMethod === "yellow"
            ? "ClearNode sandbox on Sepolia — channel create/close are on-chain"
            : settlementMethod === "v4"
              ? "JACKPolicyHook validates constraints atomically in beforeSwap"
              : "Policy hook enforces min-receive on-chain before settlement",
        ],
        whatCanGoWrong:
          settlementMethod === "yellow"
            ? "Channel dispute could delay settlement; challenge period protects you."
            : "Bridge congestion could delay settlement; deadline refund protects you.",
        fallback:
          "If route fails, intent auto-reverts. Tokens stay in your wallet.",
        estimatedGas:
          settlementMethod === "yellow"
            ? "~$0 (off-chain)"
            : gas.startsWith("$") || gas.startsWith("~")
              ? gas
              : `$${gas}`,
        estimatedTime: "~45s",
        resolvedRoute: resolved,
      };
    },
    [resolveRoute, settlementMethod],
  );

  /* ── Quick Intent handler ── */
  const handleQuickPlan = useCallback(async () => {
    const parsed = parseQuickIntent(quickInput);
    const updated = {
      sourceChain: parsed.sourceChain ?? form.sourceChain,
      destChain: parsed.destChain ?? form.destChain,
      tokenIn: parsed.tokenIn ?? form.tokenIn,
      tokenOut: parsed.tokenOut ?? form.tokenOut,
      amountIn: parsed.amountIn ?? form.amountIn,
      minOut: parsed.minOut ?? form.minOut,
      privacy: form.privacy,
    };
    setForm(updated);
    const planData = await generatePlan(updated);
    setPlan(planData);
    setStatus("PLANNING");
  }, [quickInput, form, generatePlan]);

  /* ── Template handler ── */
  const handleTemplate = useCallback(
    async (tpl: (typeof INTENT_TEMPLATES)[0]) => {
      const updated = { ...tpl.defaults, privacy: false };
      setForm(updated);
      const planData = await generatePlan(updated);
      setPlan(planData);
      setStatus("PLANNING");
    },
    [generatePlan],
  );

  /* ── Advanced form handler ── */
  const handleAdvancedPlan = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const planData = await generatePlan(form);
      setPlan(planData);
      setStatus("PLANNING");
    },
    [form, generatePlan],
  );

  /* ── Voice input via Web Speech API ── */
  const handleVoiceInput = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionCtor =
      w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert(
        "Voice input is not supported in this browser. Try Chrome or Edge.",
      );
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuickInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  }, [isListening]);

  /* ── Receipt / image upload ── */
  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadedFileName(file.name);

      if (
        file.type.startsWith("text/") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".csv")
      ) {
        const reader = new FileReader();
        reader.onload = () => {
          const text = reader.result as string;
          const parsed = parseReceiptText(text);
          const updated = {
            ...form,
            amountIn: parsed.amountIn ?? form.amountIn,
            tokenIn: parsed.tokenIn ?? form.tokenIn,
            destChain: parsed.destChain ?? form.destChain,
            tokenOut: parsed.tokenOut ?? form.tokenOut,
          };
          setForm(updated);
          setQuickInput(
            `${updated.amountIn} ${updated.tokenIn} ${form.sourceChain} → ${updated.tokenOut} ${updated.destChain}`,
          );
        };
        reader.readAsText(file);
      } else {
        // For images: extract any text from filename as hint, show as pending
        const nameParsed = parseReceiptText(file.name.replace(/[-_]/g, " "));
        if (nameParsed.amountIn) {
          setForm((prev) => ({
            ...prev,
            amountIn: nameParsed.amountIn ?? prev.amountIn,
          }));
        }
        setQuickInput(`Receipt: ${file.name} — edit details above or tap Plan`);
      }
      // Reset file input so same file can be re-selected
      e.target.value = "";
    },
    [form],
  );

  /* ── Cleanup speech recognition on unmount ── */
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  /* ── Authorize execution ── */
  const handleAuthorize = useCallback(async () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    try {
      setStatus("SIGNING");
      const sdk = new JACK_SDK({ baseUrl: "/api" });
      const intentParams: IntentParams = {
        sourceChain: form.sourceChain,
        destinationChain: form.destChain,
        tokenIn: form.tokenIn,
        tokenOut: form.tokenOut,
        amountIn: form.amountIn,
        minAmountOut: form.minOut,
        deadline: Math.floor(Date.now() / 1000) + 3600,
        settlementMethod,
      };
      const typedData = sdk.getIntentTypedData(intentParams);
      const signature = await signTypedDataAsync({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: "Intent",
        message: typedData.message,
      });
      setStatus("EXECUTING");
      const executionId = await sdk.submitIntent(intentParams, signature);
      setTimeout(() => {
        setStatus("DONE");
        onIntentSubmitted(executionId);
      }, 1500);
    } catch (error) {
      console.error("Execution failed:", error);
      setStatus("ERROR");
      setTimeout(() => {
        setStatus("IDLE");
        setPlan(null);
      }, 3000);
    }
  }, [
    isConnected,
    form,
    settlementMethod,
    signTypedDataAsync,
    onIntentSubmitted,
  ]);

  const resetPlan = useCallback(() => {
    setPlan(null);
    setStatus("IDLE");
    setUploadedFileName(null);
  }, []);

  const handleQuickKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && quickInput.trim().length > 5) {
      e.preventDefault();
      handleQuickPlan();
    }
  };

  /* ═══════════════════════════════════════════════════════════════
	   Mode selector configuration
	   ═══════════════════════════════════════════════════════════════ */
  const modeButtons: {
    key: InputMode;
    label: string;
    iconKey: keyof typeof Icon;
  }[] = [
    { key: "quick", label: "Quick Intent", iconKey: "Bolt" },
    { key: "templates", label: "Templates", iconKey: "Grid" },
    { key: "advanced", label: "Advanced", iconKey: "Sliders" },
  ];

  /* ═══════════════════════════════════════════════════════════════
	   Overlay for signing / executing / resolving
	   ═══════════════════════════════════════════════════════════════ */
  const renderOverlay = () => {
    if (status === "RESOLVING") {
      return (
        <div
          className="absolute inset-0 z-20 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
          style={{ background: "var(--overlay)" }}
        >
          <div className="w-16 h-16 relative">
            <div
              className="absolute inset-0 border-2 rounded-full opacity-30"
              style={{ borderColor: "var(--fg-accent)" }}
            />
            <div
              className="absolute inset-0 border-t-2 border-r-2 rounded-full animate-spin"
              style={{ borderColor: "var(--fg-accent)" }}
            />
            <div
              className="absolute inset-2 border-b-2 border-l-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--fg-info)",
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            />
          </div>
          <div className="space-y-2">
            <h3
              className="text-xl font-space font-bold uppercase tracking-widest"
              style={{ color: "var(--fg-primary)" }}
            >
              Resolving Best Route
            </h3>
            <p
              className="text-sm font-mono"
              style={{ color: "var(--fg-muted)" }}
            >
              Querying LI.FI for optimal cross-chain path...
            </p>
          </div>
        </div>
      );
    }
    if (status === "SIGNING" || status === "EXECUTING") {
      return (
        <div
          className="absolute inset-0 z-20 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
          style={{ background: "var(--overlay)" }}
        >
          <div className="w-16 h-16 relative">
            <div
              className="absolute inset-0 border-2 rounded-full"
              style={{ borderColor: "var(--border-accent)" }}
            />
            <div
              className="absolute inset-0 border-t-2 rounded-full animate-spin"
              style={{ borderColor: "var(--fg-accent)" }}
            />
          </div>
          <div className="space-y-2">
            <h3
              className="text-xl font-space font-bold uppercase tracking-widest"
              style={{ color: "var(--fg-primary)" }}
            >
              {status === "SIGNING" ? "Awaiting Signature" : "Kernel Executing"}
            </h3>
            <p
              className="text-sm font-mono"
              style={{ color: "var(--fg-muted)" }}
            >
              {status === "SIGNING"
                ? "Verify typed data in your wallet..."
                : "Routing intent through solvers..."}
            </p>
          </div>
          <div
            className="w-64 h-1 rounded-full overflow-hidden"
            style={{ background: "var(--border-secondary)" }}
          >
            <div
              className={`h-full transition-all duration-1000 ${status === "EXECUTING" ? "w-full" : "w-1/3"}`}
              style={{ background: "var(--fg-accent)" }}
            />
          </div>
        </div>
      );
    }
    if (status === "ERROR") {
      return (
        <div className="absolute inset-0 z-20 bg-red-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
            <svg
              className="w-8 h-8"
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
          </div>
          <h3 className="text-xl font-space font-bold text-white uppercase tracking-widest">
            Execution Failed
          </h3>
          <p className="text-red-200 text-sm font-mono">
            Check console for details
          </p>
        </div>
      );
    }
    return null;
  };

  /* ═══════════════════════════════════════════════════════════════
	   Plan Card
	   ═══════════════════════════════════════════════════════════════ */
  const renderPlanCard = () => {
    if (!plan || status === "IDLE" || status === "RESOLVING") return null;
    const resolved = plan.resolvedRoute;
    return (
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <h3
            className="text-lg font-space font-black uppercase tracking-widest flex items-center gap-2"
            style={{ color: "var(--fg-accent)" }}
          >
            <Icon.Activity className="w-5 h-5" />
            Execution Plan
          </h3>
          <button
            onClick={resetPlan}
            className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
            style={{
              color: "var(--fg-muted)",
              borderColor: "var(--border-secondary)",
            }}
          >
            Edit
          </button>
        </div>

        {/* Resolved route banner */}
        {resolved && (
          <div
            className="rounded-xl p-3 border flex items-center gap-3"
            style={{
              background: resolved.isFallback
                ? "rgba(234,179,8,0.08)"
                : "rgba(34,197,94,0.08)",
              borderColor: resolved.isFallback
                ? "rgba(234,179,8,0.25)"
                : "rgba(34,197,94,0.25)",
            }}
          >
            {resolved.isFallback ? (
              <Icon.Activity
                className="w-4 h-4 shrink-0"
                style={{ color: "#eab308" }}
              />
            ) : (
              <Icon.Check
                className="w-4 h-4 shrink-0"
                style={{ color: "#22c55e" }}
              />
            )}
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: resolved.isFallback ? "#eab308" : "#22c55e" }}
              >
                {resolved.isFallback
                  ? "Fallback Route"
                  : `Live Quote via ${resolved.provider}`}
              </p>
              <p
                className="text-[10px] font-mono"
                style={{ color: "var(--fg-muted)" }}
              >
                {resolved.isFallback
                  ? "LI.FI unavailable — using static fallback rates. Policy still enforced."
                  : `Expected: ${resolved.amountOut} ${form.tokenOut} | Gas: ${resolved.estimatedGasUsd} | Route: ${resolved.routeId}`}
              </p>
            </div>
          </div>
        )}

        {/* You Pay / You Receive */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-4 border"
            style={{
              background: "var(--bg-tertiary)",
              borderColor: "var(--border-secondary)",
            }}
          >
            <p
              className="text-[10px] uppercase tracking-widest font-bold mb-1"
              style={{ color: "var(--fg-muted)" }}
            >
              You Pay
            </p>
            <p
              className="text-xl font-black font-mono"
              style={{ color: "var(--fg-primary)" }}
            >
              {form.amountIn}{" "}
              <span className="text-sm" style={{ color: "var(--fg-accent)" }}>
                {form.tokenIn}
              </span>
            </p>
            <p
              className="text-[10px] font-semibold mt-1"
              style={{ color: "var(--fg-muted)" }}
            >
              on {form.sourceChain}
            </p>
          </div>
          <div
            className="rounded-xl p-4 border"
            style={{
              background: "var(--bg-tertiary)",
              borderColor: "var(--border-secondary)",
            }}
          >
            <p
              className="text-[10px] uppercase tracking-widest font-bold mb-1"
              style={{ color: "var(--fg-muted)" }}
            >
              You Receive
            </p>
            <p
              className="text-xl font-black font-mono"
              style={{ color: "var(--fg-primary)" }}
            >
              {resolved && !resolved.isFallback ? (
                <>
                  {resolved.amountOut}{" "}
                  <span
                    className="text-sm"
                    style={{ color: "var(--fg-accent)" }}
                  >
                    {form.tokenOut}
                  </span>
                </>
              ) : (
                <>
                  ≥ {form.minOut}{" "}
                  <span
                    className="text-sm"
                    style={{ color: "var(--fg-accent)" }}
                  >
                    {form.tokenOut}
                  </span>
                </>
              )}
            </p>
            <p
              className="text-[10px] font-semibold mt-1"
              style={{ color: "var(--fg-muted)" }}
            >
              on {form.destChain}
            </p>
          </div>
        </div>

        {/* Route timeline with SVG icons */}
        <div
          className="rounded-xl p-4 border"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: "var(--border-secondary)",
          }}
        >
          <p
            className="text-[10px] uppercase tracking-widest font-bold mb-3"
            style={{ color: "var(--fg-muted)" }}
          >
            Route Timeline
          </p>
          <div className="flex items-center justify-between relative">
            <div
              className="absolute top-3.5 left-6 right-6 h-px"
              style={{ background: "var(--border-accent)" }}
            />
            {[
              { label: "Sign", iconKey: "Key" as const },
              { label: "Bridge", iconKey: "Bridge" as const },
              { label: "Swap", iconKey: "Swap" as const },
              { label: "Settle", iconKey: "Lock" as const },
            ].map((step, i) => {
              const StepIcon = Icon[step.iconKey];
              return (
                <div
                  key={i}
                  className="flex flex-col items-center relative z-10 flex-1"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center border"
                    style={{
                      background: "var(--bg-secondary)",
                      borderColor: "var(--border-accent)",
                    }}
                  >
                    <StepIcon
                      className="w-3.5 h-3.5"
                      style={{ color: "var(--fg-accent)" }}
                    />
                  </div>
                  <span
                    className="text-[9px] font-bold mt-1.5 uppercase tracking-wide"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan details */}
        <div
          className="rounded-xl p-4 border space-y-3"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: "var(--border-secondary)",
          }}
        >
          {[
            {
              label: "Best Route",
              value: plan.route,
              color: "var(--fg-primary)",
            },
            {
              label: "Worst-Case Receive",
              value: plan.worstCase,
              color: "var(--fg-accent)",
            },
            {
              label: "Bridge Risk",
              value: plan.bridgeRisk,
              color:
                plan.bridgeRisk === "Low"
                  ? "#22c55e"
                  : plan.bridgeRisk === "Medium"
                    ? "#eab308"
                    : "#ef4444",
            },
            {
              label: "Deadline",
              value: plan.deadline,
              color: "var(--fg-primary)",
            },
            {
              label: "Estimated Gas",
              value: plan.estimatedGas,
              color: "var(--fg-info)",
            },
            {
              label: "Kernel Latency",
              value: plan.estimatedTime,
              color: "var(--fg-info)",
            },
          ].map((row, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span
                className="font-bold uppercase tracking-tight"
                style={{ color: "var(--fg-muted)" }}
              >
                {row.label}
              </span>
              <span
                className="font-mono font-semibold"
                style={{ color: row.color }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Why this plan */}
        <div
          className="rounded-xl p-4 border space-y-2"
          style={{
            background: "rgba(34,197,94,0.05)",
            borderColor: "rgba(34,197,94,0.20)",
          }}
        >
          <p
            className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5"
            style={{ color: "#22c55e" }}
          >
            <Icon.Check className="w-3 h-3" style={{ color: "#22c55e" }} /> Why
            This Plan
          </p>
          {plan.whyThisPlan.map((bullet, i) => (
            <p
              key={i}
              className="text-xs font-medium flex items-start gap-2"
              style={{ color: "var(--fg-secondary)" }}
            >
              <span className="shrink-0 mt-0.5" style={{ color: "#22c55e" }}>
                —
              </span>{" "}
              {bullet}
            </p>
          ))}
        </div>

        {/* What can go wrong */}
        <div
          className="rounded-xl p-4 border space-y-2"
          style={{
            background: "rgba(239,68,68,0.05)",
            borderColor: "rgba(239,68,68,0.15)",
          }}
        >
          <p
            className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5"
            style={{ color: "#f87171" }}
          >
            <Icon.Shield className="w-3 h-3" style={{ color: "#f87171" }} />{" "}
            Risk Assessment
          </p>
          <p
            className="text-xs font-medium"
            style={{ color: "var(--fg-secondary)" }}
          >
            <span style={{ color: "#f87171" }}>—</span> {plan.whatCanGoWrong}
          </p>
          {plan.fallback && (
            <p
              className="text-xs font-medium"
              style={{ color: "var(--fg-secondary)" }}
            >
              <Icon.ArrowRight
                className="w-3 h-3 inline mr-1"
                style={{ color: "var(--fg-accent)" }}
              />
              <strong>Fallback:</strong> {plan.fallback}
            </p>
          )}
        </div>

        {/* Privacy */}
        <div
          className="p-4 rounded-xl border flex items-center justify-between gap-4"
          style={{
            background: "rgba(56,189,248,0.05)",
            borderColor: "rgba(56,189,248,0.20)",
          }}
        >
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center border shrink-0"
              style={{
                background: "rgba(56,189,248,0.10)",
                borderColor: "rgba(56,189,248,0.20)",
              }}
            >
              <Icon.Lock
                className="w-5 h-5"
                style={{ color: "var(--fg-info)" }}
              />
            </div>
            <div>
              <p
                className="text-xs font-bold"
                style={{ color: "var(--fg-primary)" }}
              >
                Hide Constraints from Public Mempool
              </p>
              <p
                className="text-[10px] font-semibold"
                style={{ color: "var(--fg-muted)" }}
              >
                Constraints visible only to solver + settlement hook (CCM)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setForm({ ...form, privacy: !form.privacy })}
            className="w-12 h-6 rounded-full transition-all duration-300 relative p-0.5 shrink-0"
            style={{
              background: form.privacy ? "var(--fg-accent)" : "var(--fg-muted)",
            }}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${form.privacy ? "translate-x-6" : "translate-x-0"}`}
            />
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={handleAuthorize}
          disabled={status !== "PLANNING" || !isConnected}
          className="w-full py-4 md:py-5 font-black uppercase tracking-[0.15em] rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-3 text-sm"
          style={{
            background: "var(--fg-accent)",
            color: "var(--bg-primary)",
            boxShadow: "0 10px 40px var(--shadow-accent)",
          }}
        >
          <Icon.Shield className="w-5 h-5" />
          <span>
            {isConnected
              ? "Authorize Execution Plan"
              : "Connect Wallet to Authorize"}
          </span>
        </button>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════
	   Render
	   ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 animate-in fade-in duration-500">
      {/* ── Main panel ── */}
      <div className="lg:col-span-2 space-y-6">
        <div
          className="border rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-primary)",
          }}
        >
          {renderOverlay()}

          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-xl md:text-2xl font-space font-bold"
              style={{ color: "var(--fg-accent)" }}
            >
              Create Intent
            </h2>
            <div
              className="flex items-center space-x-2 px-3 py-1 rounded-full border"
              style={{
                borderColor: "var(--border-accent)",
                background: "rgba(242,185,75,0.08)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "#22c55e" }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: "var(--fg-accent)" }}
              >
                Execution Autopilot
              </span>
            </div>
          </div>

          {/* ── Mode selector ── */}
          {!plan && status !== "RESOLVING" && (
            <div
              className="flex p-1 rounded-xl border mb-6"
              style={{
                background: "var(--bg-primary)",
                borderColor: "var(--border-secondary)",
              }}
            >
              {modeButtons.map((m) => {
                const MIcon = Icon[m.iconKey];
                return (
                  <button
                    key={m.key}
                    onClick={() => {
                      setMode(m.key);
                      setPlan(null);
                      setStatus("IDLE");
                    }}
                    className="flex-1 px-3 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                    style={
                      mode === m.key
                        ? {
                            background: "var(--fg-accent)",
                            color: "var(--bg-primary)",
                            fontWeight: 900,
                          }
                        : { color: "var(--fg-muted)" }
                    }
                  >
                    <MIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{m.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ═══ Quick Intent mode ═══ */}
          {!plan && status !== "RESOLVING" && mode === "quick" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--fg-muted)" }}
              >
                Type, speak, or upload a receipt. JACK resolves the best route
                automatically.
              </p>

              {/* Input bar with voice + upload buttons */}
              <div className="relative">
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={handleQuickKeyDown}
                  placeholder="Swap 1000 USDC Arbitrum → WETH Base, min 0.45, by 20m"
                  className="w-full border rounded-xl px-4 py-4 pr-36 outline-none text-sm font-mono transition-all focus:ring-2"
                  style={
                    {
                      background: "var(--bg-input)",
                      borderColor: "var(--border-secondary)",
                      color: "var(--fg-primary)",
                      "--tw-ring-color": "var(--fg-accent)",
                    } as React.CSSProperties
                  }
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {/* Voice button */}
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className="p-2 rounded-lg transition-all hover:scale-110"
                    style={{
                      background: isListening
                        ? "rgba(239,68,68,0.20)"
                        : "var(--bg-tertiary)",
                      color: isListening ? "#ef4444" : "var(--fg-muted)",
                      border: isListening
                        ? "1px solid rgba(239,68,68,0.40)"
                        : "1px solid var(--border-secondary)",
                    }}
                    title="Voice input"
                  >
                    <Icon.Mic
                      className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`}
                    />
                  </button>

                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg transition-all hover:scale-110 border"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--fg-muted)",
                      borderColor: "var(--border-secondary)",
                    }}
                    title="Upload receipt or text file"
                  >
                    <Icon.Upload className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".txt,.csv,.json,image/*"
                    onChange={handleFileUpload}
                  />

                  {/* Plan button */}
                  <button
                    onClick={handleQuickPlan}
                    disabled={quickInput.trim().length < 5}
                    className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all disabled:opacity-30 flex items-center gap-1.5"
                    style={{
                      background: "var(--fg-accent)",
                      color: "var(--bg-primary)",
                    }}
                  >
                    <Icon.Bolt className="w-3.5 h-3.5" />
                    Plan
                  </button>
                </div>
              </div>

              {/* Status indicators */}
              {isListening && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border animate-pulse"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    borderColor: "rgba(239,68,68,0.25)",
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "#ef4444" }}
                  >
                    Listening... speak your intent
                  </span>
                </div>
              )}
              {uploadedFileName && !isListening && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{
                    background: "rgba(34,197,94,0.08)",
                    borderColor: "rgba(34,197,94,0.25)",
                  }}
                >
                  <Icon.Scan
                    className="w-3.5 h-3.5"
                    style={{ color: "#22c55e" }}
                  />
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: "#22c55e" }}
                  >
                    Loaded: {uploadedFileName}
                  </span>
                </div>
              )}

              {/* Example suggestions */}
              <div className="flex flex-wrap gap-2">
                {[
                  "Swap 1000 USDC Arb → WETH Base, min 0.45",
                  "Bridge 500 USDC Arb → Polygon",
                  "Buy 0.5 WETH on Base from Arb USDC",
                ].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setQuickInput(ex)}
                    className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-all hover:opacity-80 hover:border-[var(--fg-accent)]"
                    style={{
                      borderColor: "var(--border-secondary)",
                      color: "var(--fg-muted)",
                      background: "var(--bg-tertiary)",
                    }}
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {/* Settlement method selector */}
              <SettlementSelector
                selected={settlementMethod}
                onChange={setSettlementMethod}
              />
            </div>
          )}

          {/* ═══ Templates mode ═══ */}
          {!plan && status !== "RESOLVING" && mode === "templates" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-300">
              {INTENT_TEMPLATES.map((tpl) => {
                const TplIcon = Icon[tpl.iconKey];
                return (
                  <button
                    key={tpl.id}
                    onClick={() => handleTemplate(tpl)}
                    className="text-left p-4 rounded-xl border transition-all hover:scale-[1.02] hover:border-[var(--fg-accent)] group"
                    style={{
                      background: "var(--bg-tertiary)",
                      borderColor: "var(--border-secondary)",
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 transition-colors group-hover:border-[var(--fg-accent)]"
                        style={{
                          background: "rgba(242,185,75,0.08)",
                          borderColor: "var(--border-secondary)",
                        }}
                      >
                        <TplIcon
                          className="w-4.5 h-4.5"
                          style={{ color: "var(--fg-accent)" }}
                        />
                      </div>
                      <span
                        className="text-sm font-bold"
                        style={{ color: "var(--fg-primary)" }}
                      >
                        {tpl.label}
                      </span>
                    </div>
                    <p
                      className="text-[10px] font-medium leading-relaxed pl-12"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {tpl.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* ═══ Advanced mode ═══ */}
          {!plan && status !== "RESOLVING" && mode === "advanced" && (
            <form
              onSubmit={handleAdvancedPlan}
              className="space-y-5 animate-in fade-in duration-300"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    className="text-[10px] md:text-xs uppercase tracking-widest font-bold"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Source Chain
                  </label>
                  <select
                    value={form.sourceChain}
                    onChange={(e) =>
                      setForm({ ...form, sourceChain: e.target.value })
                    }
                    className="w-full border rounded-xl px-4 py-3 outline-none text-sm font-semibold"
                    style={{
                      background: "var(--bg-input)",
                      borderColor: "var(--border-secondary)",
                      color: "var(--fg-primary)",
                    }}
                  >
                    <option>Arbitrum</option>
                    <option>Optimism</option>
                    <option>Base</option>
                    <option>Polygon</option>
                    <option>Ethereum</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label
                    className="text-[10px] md:text-xs uppercase tracking-widest font-bold"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Destination Chain
                  </label>
                  <select
                    value={form.destChain}
                    onChange={(e) =>
                      setForm({ ...form, destChain: e.target.value })
                    }
                    className="w-full border rounded-xl px-4 py-3 outline-none text-sm font-semibold"
                    style={{
                      background: "var(--bg-input)",
                      borderColor: "var(--border-secondary)",
                      color: "var(--fg-primary)",
                    }}
                  >
                    <option>Base</option>
                    <option>Polygon</option>
                    <option>Arbitrum</option>
                    <option>Optimism</option>
                    <option>Ethereum</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    className="text-[10px] md:text-xs uppercase tracking-widest font-bold"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    You Pay
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={form.amountIn}
                      onChange={(e) =>
                        setForm({ ...form, amountIn: e.target.value })
                      }
                      className="w-2/3 border rounded-xl px-4 py-3 outline-none text-sm font-mono"
                      style={{
                        background: "var(--bg-input)",
                        borderColor: "var(--border-secondary)",
                        color: "var(--fg-primary)",
                      }}
                    />
                    <select
                      value={form.tokenIn}
                      onChange={(e) =>
                        setForm({ ...form, tokenIn: e.target.value })
                      }
                      className="w-1/3 border rounded-xl px-2 md:px-4 py-3 outline-none text-sm font-bold"
                      style={{
                        background: "var(--bg-input)",
                        borderColor: "var(--border-secondary)",
                        color: "var(--fg-primary)",
                      }}
                    >
                      <option>USDC</option>
                      <option>ETH</option>
                      <option>LINK</option>
                      <option>WETH</option>
                      <option>DAI</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label
                    className="text-[10px] md:text-xs uppercase tracking-widest font-bold"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    Guaranteed Minimum Receive
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={form.minOut}
                      onChange={(e) =>
                        setForm({ ...form, minOut: e.target.value })
                      }
                      className="w-2/3 border rounded-xl px-4 py-3 outline-none text-sm font-mono"
                      style={{
                        background: "var(--bg-input)",
                        borderColor: "var(--border-secondary)",
                        color: "var(--fg-primary)",
                      }}
                    />
                    <select
                      value={form.tokenOut}
                      onChange={(e) =>
                        setForm({ ...form, tokenOut: e.target.value })
                      }
                      className="w-1/3 border rounded-xl px-2 md:px-4 py-3 outline-none text-sm font-bold"
                      style={{
                        background: "var(--bg-input)",
                        borderColor: "var(--border-secondary)",
                        color: "var(--fg-primary)",
                      }}
                    >
                      <option>WETH</option>
                      <option>WBTC</option>
                      <option>USDC</option>
                      <option>DAI</option>
                    </select>
                  </div>
                </div>
              </div>

              <SettlementSelector
                selected={settlementMethod}
                onChange={setSettlementMethod}
              />

              <button
                type="submit"
                className="w-full py-4 font-black uppercase tracking-[0.15em] rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
                style={{
                  background: "var(--fg-accent)",
                  color: "var(--bg-primary)",
                  boxShadow: "0 10px 40px var(--shadow-accent)",
                }}
              >
                <Icon.Activity className="w-4 h-4" />
                Resolve Best Route
              </button>
            </form>
          )}

          {/* ═══ Plan Card ═══ */}
          {renderPlanCard()}
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <div className="space-y-6">
        {/* Policy Badges */}
        <div
          className="border rounded-2xl p-6 shadow-xl"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-primary)",
          }}
        >
          <h3
            className="text-[10px] font-space font-bold uppercase tracking-[0.3em] mb-5 flex items-center gap-2"
            style={{ color: "var(--fg-accent)" }}
          >
            <Icon.Shield
              className="w-3.5 h-3.5"
              style={{ color: "var(--fg-accent)" }}
            />
            On-Chain Policy Enforcement
          </h3>
          <div className="space-y-3">
            {POLICY_BADGES.map((badge, i) => {
              const BadgeIcon = Icon[badge.iconKey];
              return (
                <div
                  key={i}
                  className="flex items-start space-x-3 p-2.5 rounded-lg transition-all"
                  style={{ background: "var(--bg-tertiary)" }}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "rgba(34,197,94,0.12)" }}
                  >
                    <BadgeIcon
                      className="w-3.5 h-3.5"
                      style={{ color: "#22c55e" }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-xs font-bold"
                      style={{ color: "var(--fg-primary)" }}
                    >
                      {badge.label}
                    </p>
                    <p
                      className="text-[10px] font-medium"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {badge.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Execution Pipeline */}
        <div
          className="border rounded-2xl p-6 shadow-xl"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-primary)",
          }}
        >
          <h3
            className="text-[10px] font-space font-bold uppercase tracking-[0.3em] mb-5"
            style={{ color: "var(--fg-muted)" }}
          >
            Execution Pipeline
          </h3>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Solver Auction",
                desc: "Yellow Fusion+ bonded solvers compete",
                color: "#a78bfa",
                iconKey: "Crosshair" as const,
              },
              {
                step: "2",
                title: "Route Optimization",
                desc: "LI.FI selects best cross-chain path",
                color: "#38bdf8",
                iconKey: "Globe" as const,
              },
              {
                step: "3",
                title: "Policy Validation",
                desc: "v4 Hook enforces constraints on-chain",
                color: "#f2b94b",
                iconKey: "Shield" as const,
              },
              {
                step: "4",
                title: "Atomic Settlement",
                desc: "Uniswap v4 executes or reverts entirely",
                color: "#22c55e",
                iconKey: "Lock" as const,
              },
            ].map((item) => {
              const PipeIcon = Icon[item.iconKey];
              return (
                <div key={item.step} className="flex items-start space-x-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center border shrink-0"
                    style={{
                      background: `${item.color}15`,
                      borderColor: `${item.color}40`,
                    }}
                  >
                    <PipeIcon
                      className="w-3.5 h-3.5"
                      style={{ color: item.color }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-xs font-bold"
                      style={{ color: "var(--fg-primary)" }}
                    >
                      {item.title}
                    </p>
                    <p
                      className="text-[10px] font-medium"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kernel Guardrails */}
        <div
          className="border rounded-2xl p-5 shadow-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(242,185,75,0.15), transparent)",
            borderColor: "var(--border-accent)",
          }}
        >
          <p
            className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"
            style={{ color: "var(--fg-accent)" }}
          >
            <Icon.Activity className="w-3 h-3" /> Kernel Guardrails
          </p>
          <p
            className="text-[11px] leading-relaxed font-medium"
            style={{ color: "var(--fg-secondary)" }}
          >
            JACK is an execution autopilot, not a DEX. Every intent is
            policy-constrained: violations trigger fail-closed revert at the
            settlement hook. Your tokens never leave your wallet until execution
            is guaranteed.
          </p>
        </div>
      </div>
    </div>
  );
};
