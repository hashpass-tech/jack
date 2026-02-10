# Yellow Network Integration

## Overview

JACK integrates with [Yellow Network](https://www.yellow.org/) to provide instant off-chain settlement through ERC-7824 state channels. The integration uses the ClearNode sandbox on Sepolia, with a singleton `YellowProvider` from `@jack-kernel/sdk` managing the channel lifecycle inside the dashboard.

## Integration Status

✅ **Live on Sepolia Testnet** — State channel settlement is available as a demo settlement method in the dashboard.

## Contracts (Sepolia)

| Contract | Address | Etherscan |
|---|---|---|
| **Custody** | `0x019B65A265EB3363822f2752141b3dF16131b262` | [View](https://sepolia.etherscan.io/address/0x019B65A265EB3363822f2752141b3dF16131b262) |
| **Adjudicator** | `0x7c7ccbc98469190849BCC6c926307794fDfB11F2` | [View](https://sepolia.etherscan.io/address/0x7c7ccbc98469190849BCC6c926307794fDfB11F2) |

### ClearNode Sandbox

| Endpoint | URL |
|---|---|
| WebSocket | `wss://clearnet-sandbox.yellow.com/ws` |
| Faucet | `https://clearnet-sandbox.yellow.com/faucet/requestTokens` |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                                       │
│  ┌─────────────────────┐  ┌───────────────────────────────┐    │
│  │  SettlementSelector │  │  ChannelStatusPanel           │    │
│  │  (settlement method │  │  - Channel ID / status        │    │
│  │   picker)           │  │  - State version / hash       │    │
│  └─────────┬───────────┘  │  - Adjudicator link           │    │
│            │              │  - Settlement tx (Etherscan)   │    │
│            ▼              │  - ERC-7824 metadata           │    │
│  ┌─────────────────────┐  └───────────────────────────────┘    │
│  │  lib/yellow.ts      │                                        │
│  │  (singleton mgr)    │                                        │
│  └─────────┬───────────┘                                        │
└────────────┼────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  @jack-kernel/sdk · YellowProvider                              │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │  State Channel Mgmt  │  │  Off-Chain Transfers │            │
│  │  - Open / close      │  │  - Instant payments  │            │
│  │  - Challenge period  │  │  - No gas fees       │            │
│  └──────────────────────┘  └──────────────────────┘            │
│              │                        │                          │
│              └────────────┬───────────┘                          │
│                           ▼                                      │
│              ┌──────────────────────┐                           │
│              │  On-Chain Settlement │                           │
│              │  Custody + Adjudicator                           │
│              │  (Sepolia)          │                            │
│              └──────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## Dashboard Integration

### Singleton Provider (`lib/yellow.ts`)

The dashboard manages a singleton `YellowProvider` instance:

```typescript
import { YellowProvider } from "@jack-kernel/sdk";
import type { YellowConfig, WalletClient } from "@jack-kernel/sdk";

// Sepolia addresses
const SEPOLIA_YELLOW_ADDRESSES = {
  custody: "0x019B65A265EB3363822f2752141b3dF16131b262",
  adjudicator: "0x7c7ccbc98469190849BCC6c926307794fDfB11F2",
};

const CLEARNODE_WS_URL = "wss://clearnet-sandbox.yellow.com/ws";
```

Four functions manage the provider lifecycle:

| Function | Purpose |
|---|---|
| `createSepoliaYellowConfig()` | Returns a `YellowConfig` with Sepolia addresses, chainId `11155111`, 3600 s challenge period, and ClearNode WebSocket URL |
| `initYellowProvider(config, walletClient)` | Creates and stores a `YellowProvider` singleton |
| `getYellowProvider()` | Returns the current singleton (or `null`) |
| `resetYellowProvider()` | Clears the singleton |

### Settlement Selector

When a user selects **Yellow Network** as the settlement method via the `SettlementSelector` component, the dashboard displays the custody and adjudicator contract addresses above the intent creation form.

### Channel Status Panel

The `ChannelStatusPanel` component renders real-time state channel information:

- **Channel ID** — truncated with full value on hover
- **Status** — colour-coded (`active` green, `final` blue, `dispute` red)
- **State Version** and **State Hash**
- **Adjudicator** — linked to Sepolia Etherscan
- **Challenge Period** — in seconds
- **Settlement Tx** — linked to Etherscan when available
- **ERC-7824 Metadata** — proof count, nonce

## Settlement API (`/api/settlement`)

The `GET /api/settlement` endpoint returns Yellow Network configuration:

```json
{
  "methods": {
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
    }
  }
}
```

The `POST /api/settlement` endpoint supports the `yellow:faucet` action, which proxies a token request to the ClearNode sandbox faucet:

```bash
curl -X POST /api/settlement \
  -H "Content-Type: application/json" \
  -d '{"action": "yellow:faucet", "userAddress": "0x..."}'
```

## Usage with the SDK

### Initialize

```typescript
import { createSepoliaYellowConfig, initYellowProvider } from "@/lib/yellow";

const config = createSepoliaYellowConfig();
const provider = initYellowProvider(config, walletClient);
```

### Open a Channel

```typescript
const channel = await provider.createChannel({
  counterparty: "0x...",
  asset: "0x...",
  initialAmount: parseEther("1.0"),
});
```

### Off-Chain Transfers

```typescript
await provider.transfer({
  channelId: channel.id,
  amount: parseEther("0.1"),
  recipient: "0x...",
});
```

### Close and Settle

```typescript
const tx = await provider.closeChannel({ channelId: channel.id });
console.log("Settlement:", `https://sepolia.etherscan.io/tx/${tx.hash}`);
```

## Resources

- [Yellow Network Documentation](https://docs.yellow.org/)
- [Yellow SDK / Nitrolite Protocol](https://github.com/layer-3/clearport-sdk)
- [ERC-7824 Specification](https://eips.ethereum.org/EIPS/eip-7824)
- [ClearNode Sandbox](https://clearnet-sandbox.yellow.com/)

---

**Integration Status**: ✅ Live on Sepolia  
**Settlement Method ID**: `yellow`  
**Network**: Sepolia (chain ID 11155111)
