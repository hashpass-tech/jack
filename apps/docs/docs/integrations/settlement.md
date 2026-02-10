# Settlement Methods

## Overview

JACK supports three settlement methods for cross-chain intent execution. Users select a method via the **SettlementSelector** component when creating an intent; the choice determines which provider and contracts handle the swap.

## Available Methods

| Method | ID | Status | Network | Description |
|---|---|---|---|---|
| **LI.FI Cross-Chain** | `lifi` | 🟢 Live | Multi-chain | Route via LI.FI bridge aggregator with best-rate discovery |
| **Yellow Network** | `yellow` | 🔵 Demo | Sepolia | Off-chain state channel settlement via ClearNode sandbox |
| **Uniswap v4 Hook** | `v4` | 🔵 Demo | Sepolia | On-chain policy-enforced settlement via JACKPolicyHook |

## Configuration (`lib/settlement.ts`)

Settlement methods are defined by the `SettlementMethod` type and `SETTLEMENT_OPTIONS` array:

```typescript
type SettlementMethod = "lifi" | "yellow" | "v4";

interface SettlementOption {
  id: SettlementMethod;
  label: string;
  desc: string;
  network: string;
  status: "live" | "demo";
}
```

### Sepolia Contract Addresses

All testnet contract addresses are exported from `SEPOLIA_CONTRACTS`:

#### Yellow Network

| Contract | Address |
|---|---|
| Custody | `0x019B65A265EB3363822f2752141b3dF16131b262` |
| Adjudicator | `0x7c7ccbc98469190849BCC6c926307794fDfB11F2` |

#### Uniswap v4

| Contract | Address |
|---|---|
| JACKPolicyHook | `0xE8142B1Ff0DA631866fec5771f4291CbCe718080` |
| JACKSettlementAdapter | `0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A` |
| PoolManager | `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543` |

## Settlement API

The dashboard exposes a `/api/settlement` endpoint that returns method configuration and supports settlement-specific actions.

### `GET /api/settlement`

Returns all settlement methods with their status, contracts, and endpoints.

```json
{
  "methods": {
    "lifi": {
      "status": "live",
      "description": "LI.FI cross-chain bridge aggregator"
    },
    "yellow": {
      "status": "demo",
      "network": "sepolia",
      "chainId": 11155111,
      "contracts": {
        "custody": "0x019B65A265EB3363822f2752141b3dF16131b262",
        "adjudicator": "0x7c7ccbc98469190849BCC6c926307794fDfB11F2"
      },
      "clearNodeUrl": "wss://clearnet-sandbox.yellow.com/ws",
      "faucetUrl": "https://clearnet-sandbox.yellow.com/faucet/requestTokens"
    },
    "v4": {
      "status": "demo",
      "network": "sepolia",
      "chainId": 11155111,
      "contracts": {
        "policyHook": "0xE8142B1Ff0DA631866fec5771f4291CbCe718080",
        "settlementAdapter": "0xd8f0415b488F2BA18EF14F5C41989EEf90E51D1A",
        "poolManager": "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543"
      },
      "etherscanBase": "https://sepolia.etherscan.io"
    }
  },
  "testnetProofs": {
    "yellow": "/api/settlement/proofs/yellow",
    "v4": "/api/settlement/proofs/v4"
  }
}
```

### `POST /api/settlement`

Trigger settlement-specific actions.

#### `yellow:faucet` — Request test tokens

```bash
curl -X POST /api/settlement \
  -H "Content-Type: application/json" \
  -d '{"action": "yellow:faucet", "userAddress": "0x..."}'
```

Returns `{ "status": "ok", "faucet": { ... } }` on success, or `{ "status": "fallback", "message": "..." }` if the ClearNode faucet is unreachable.

#### `v4:contracts` — Get v4 contract details

```bash
curl -X POST /api/settlement \
  -H "Content-Type: application/json" \
  -d '{"action": "v4:contracts"}'
```

Returns contract addresses plus the deployer address and ownership notes.

## Dashboard Components

### SettlementSelector

A 3-column card grid where users pick their settlement method. Selecting **Yellow** or **v4** shows the relevant contract addresses inline.

**Props:**

```typescript
interface SettlementSelectorProps {
  selected: SettlementMethod;
  onChange: (method: SettlementMethod) => void;
}
```

### ChannelStatusPanel

Displays real-time settlement status for Yellow or v4 intents:

- **Yellow Network**: channel ID, status (active/final/dispute), state version, state hash, adjudicator address, challenge period, settlement transaction
- **Uniswap v4**: PolicyHook and Adapter contract addresses, settlement transaction
- **ERC-7824 Metadata**: proof count and nonce (when available)

All addresses and transaction hashes link to Sepolia Etherscan.

**Props:**

```typescript
interface ChannelStatusPanelProps {
  channelId?: string;
  channelStatus?: string;
  stateIntent?: string;
  stateVersion?: number;
  stateHash?: string;
  adjudicator?: string;
  challengePeriod?: number;
  settlementTx?: string;
  provider?: string;          // "yellow" or "v4"
  providerMetadata?: Record<string, unknown>;
}
```

## Provider Singletons

Each settlement method has a singleton provider managed by the dashboard:

| Provider | Module | Init function | SDK Class |
|---|---|---|---|
| Yellow | `lib/yellow.ts` | `initYellowProvider(config, walletClient)` | `YellowProvider` |
| v4 | `lib/v4.ts` | `initV4Provider(walletClient, chainId?)` | `V4Provider` |
| LI.FI | `lib/lifi.ts` | — (direct API calls) | `LifiProvider` |

See [Yellow Network Integration](./yellow-network.md) and [Uniswap v4 Deployment](../contracts/uniswap-v4-deployment.md) for details on each provider.

## Architecture

```
                    ┌──────────────────┐
                    │  User selects    │
                    │  settlement      │
                    │  method          │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │   LI.FI    │  │   Yellow   │  │ Uniswap v4 │
     │ (live)     │  │ (demo)     │  │ (demo)     │
     ├────────────┤  ├────────────┤  ├────────────┤
     │ Multi-chain│  │ Sepolia    │  │ Sepolia    │
     │ Bridge     │  │ State      │  │ PolicyHook │
     │ Aggregator │  │ Channel    │  │ + Adapter  │
     └────────────┘  └────────────┘  └────────────┘
           │              │                │
           ▼              ▼                ▼
     ┌──────────────────────────────────────────┐
     │  Intent resolved → ChannelStatusPanel    │
     │  shows settlement proof + Etherscan link │
     └──────────────────────────────────────────┘
```

---

**Source files**: `apps/dashboard/src/lib/settlement.ts`, `apps/dashboard/src/app/api/settlement/route.ts`
