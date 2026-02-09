import { NextRequest, NextResponse } from "next/server";
import { SEPOLIA_CONTRACTS } from "@/lib/settlement";

/**
 * Settlement info API — returns contract addresses and status for
 * Yellow Network and Uniswap v4 settlement methods.
 */
export async function GET() {
  return NextResponse.json({
    methods: {
      lifi: {
        status: "live",
        description: "LI.FI cross-chain bridge aggregator",
      },
      yellow: {
        status: "demo",
        network: "sepolia",
        chainId: 11155111,
        contracts: SEPOLIA_CONTRACTS.yellow,
        clearNodeUrl: "wss://clearnet-sandbox.yellow.com/ws",
        faucetUrl: "https://clearnet-sandbox.yellow.com/faucet/requestTokens",
      },
      v4: {
        status: "demo",
        network: "sepolia",
        chainId: 11155111,
        contracts: SEPOLIA_CONTRACTS.v4,
        etherscanBase: "https://sepolia.etherscan.io",
      },
    },
    testnetProofs: {
      yellow: "/api/settlement/proofs/yellow",
      v4: "/api/settlement/proofs/v4",
    },
  });
}

/**
 * POST — trigger settlement-specific actions (channel create, policy register, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = body.action as string;

    switch (action) {
      case "yellow:faucet": {
        // Proxy faucet request to ClearNode sandbox
        const userAddress = body.userAddress as string;
        if (!userAddress) {
          return NextResponse.json(
            { error: "Missing userAddress" },
            { status: 400 },
          );
        }
        try {
          const res = await fetch(
            "https://clearnet-sandbox.yellow.com/faucet/requestTokens",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userAddress }),
            },
          );
          const data = await res.json();
          return NextResponse.json({ status: "ok", faucet: data });
        } catch {
          return NextResponse.json({
            status: "fallback",
            message: "Faucet request failed — try directly",
          });
        }
      }

      case "v4:contracts": {
        return NextResponse.json({
          status: "ok",
          contracts: SEPOLIA_CONTRACTS.v4,
          deployer: "0x114d72D97Aa9C413A1ba3f0Cd37F439D668EA1aD",
          note: "PolicyHook owner is CREATE2 deployer, not wallet. SettlementAdapter owner is wallet.",
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
