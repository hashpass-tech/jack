/**
 * Settlement method configuration for the dashboard.
 * Connects intent creation to Yellow Network (state channels) or
 * Uniswap v4 (on-chain hook settlement) flows.
 */

export type SettlementMethod = "lifi" | "yellow" | "v4";

export interface SettlementOption {
  id: SettlementMethod;
  label: string;
  desc: string;
  network: string;
  status: "live" | "demo";
}

export const SETTLEMENT_OPTIONS: SettlementOption[] = [
  {
    id: "lifi",
    label: "LI.FI Cross-Chain",
    desc: "Route via LI.FI bridge aggregator with best-rate discovery",
    network: "Multi-chain",
    status: "live",
  },
  {
    id: "yellow",
    label: "Yellow Network",
    desc: "Off-chain state channel settlement via ClearNode sandbox",
    network: "Sepolia",
    status: "demo",
  },
  {
    id: "v4",
    label: "Uniswap v4 Hook",
    desc: "On-chain policy-enforced settlement via JACKPolicyHook",
    network: "Sepolia",
    status: "demo",
  },
];

// Contract addresses for display
export const SEPOLIA_CONTRACTS = {
  yellow: {
    custody: "0x019B65A265EB3363822f2752141b3dF16131b262",
    adjudicator: "0x7c7ccbc98469190849BCC6c926307794fDfB11F2",
  },
  v4: {
    policyHook: "0xE8142B1Ff0DA631866fec5771f4291CbCe718080",
    settlementAdapter: "0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A",
    poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
  },
} as const;
