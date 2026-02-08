# Yellow Network Dashboard Implementation Guide

## Quick Start: Minimal Viable Integration

This guide provides step-by-step instructions for integrating Yellow Network into the dashboard with minimal changes to existing code.

## Step 1: Environment Configuration

Add Yellow Network configuration to `.env.local`:

```bash
# Yellow Network Configuration
NEXT_PUBLIC_YELLOW_CLEARNODE_URL=wss://clearnet-sandbox.yellow.com/ws
NEXT_PUBLIC_YELLOW_CUSTODY_ADDRESS=0x1234567890123456789012345678901234567890
NEXT_PUBLIC_YELLOW_ADJUDICATOR_ADDRESS=0x0987654321098765432109876543210987654321
NEXT_PUBLIC_YELLOW_CHAIN_ID=11155111
NEXT_PUBLIC_YELLOW_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_YELLOW_CHALLENGE_DURATION=3600
NEXT_PUBLIC_YELLOW_SESSION_EXPIRY=3600
```

## Step 2: Update `yellow.ts` Utility

Enhance the Yellow utility to handle initialization with wallet client:

```typescript
// apps/dashboard/src/lib/yellow.ts
import { YellowProvider } from '@jack-kernel/sdk';
import type { YellowConfig } from '@jack-kernel/sdk';
import type { WalletClient } from 'viem';

let provider: YellowProvider | null = null;
let isConnecting = false;
let connectionError: string | null = null;

/**
 * Initialize and connect YellowProvider with wallet client.
 * 
 * This is an async operation that establishes WebSocket connection
 * and authenticates with ClearNode.
 */
export async function initAndConnectYellowProvider(
  walletClient: WalletClient
): Promise<{ success: boolean; error?: string }> {
  if (isConnecting) {
    return { success: false, error: 'Connection already in progress' };
  }

  if (provider && provider.isConnected) {
    return { success: true };
  }

  isConnecting = true;
  connectionError = null;

  try {
    const config: YellowConfig = {
      clearNodeUrl: process.env.NEXT_PUBLIC_YELLOW_CLEARNODE_URL,
      custodyAddress: process.env.NEXT_PUBLIC_YELLOW_CUSTODY_ADDRESS as `0x${string}`,
      adjudicatorAddress: process.env.NEXT_PUBLIC_YELLOW_ADJUDICATOR_ADDRESS as `0x${string}`,
      chainId: Number(process.env.NEXT_PUBLIC_YELLOW_CHAIN_ID),
      rpcUrl: process.env.NEXT_PUBLIC_YELLOW_RPC_URL,
      challengeDuration: Number(process.env.NEXT_PUBLIC_YELLOW_CHALLENGE_DURATION),
      sessionExpiry: Number(process.env.NEXT_PUBLIC_YELLOW_SESSION_EXPIRY),
    };

    provider = new YellowProvider(config, walletClient);
    const result = await provider.connect();

    if (!result.connected) {
      connectionError = result.fallback?.message ?? 'Connection failed';
      provider = null;
      return { success: false, error: connectionError };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    connectionError = message;
    provider = null;
    return { success: false, error: message };
  } finally {
    isConnecting = false;
  }
}

/**
 * Get the current YellowProvider instance.
 */
export function getYellowProvider(): YellowProvider | null {
  return provider;
}

/**
 * Check if Yellow Network is available and connected.
 */
export function isYellowAvailable(): boolean {
  return provider !== null && provider.isConnected;
}

/**
 * Get the current connection status.
 */
export function getYellowStatus(): {
  connected: boolean;
  connecting: boolean;
  error: string | null;
} {
  return {
    connected: provider?.isConnected ?? false,
    connecting: isConnecting,
    error: connectionError,
  };
}

/**
 * Disconnect and cleanup YellowProvider.
 */
export async function disconnectYellowProvider(): Promise<void> {
  if (provider) {
    await provider.disconnect();
    provider = null;
  }
  connectionError = null;
}

/**
 * Reset the singleton (for testing).
 */
export function resetYellowProvider(): void {
  provider = null;
  isConnecting = false;
  connectionError = null;
}
```

## Step 3: Add Provider Selection to CreateIntentView

Update `CreateIntentView.tsx` to include provider selection:

```typescript
// Add to state
const [provider, setProvider] = useState<'lifi' | 'yellow'>('lifi');
const [yellowStatus, setYellowStatus] = useState<{
  connected: boolean;
  connecting: boolean;
  error: string | null;
}>({ connected: false, connecting: false, error: null });

// Add useEffect to check Yellow status
useEffect(() => {
  const checkYellowStatus = () => {
    const status = getYellowStatus();
    setYellowStatus(status);
  };

  checkYellowStatus();
  const interval = setInterval(checkYellowStatus, 2000);
  return () => clearInterval(interval);
}, []);

// Add provider selection UI (insert after the route topology section)
<div className="border rounded-2xl p-6 shadow-xl" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
  <h3 className="text-[10px] font-space font-bold uppercase tracking-[0.3em] mb-6" style={{ color: "var(--fg-muted)" }}>
    Execution Provider
  </h3>
  
  <div className="space-y-4">
    {/* LI.FI Option */}
    <button
      type="button"
      onClick={() => setProvider('lifi')}
      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
        provider === 'lifi'
          ? 'border-[var(--fg-accent)] bg-[var(--fg-accent)]/10'
          : 'border-[var(--border-secondary)] hover:border-[var(--fg-accent)]/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--fg-primary)" }}>LI.FI Bridge</p>
          <p className="text-[10px] font-semibold mt-1" style={{ color: "var(--fg-muted)" }}>
            Cross-chain aggregation
          </p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          provider === 'lifi' ? 'border-[var(--fg-accent)]' : 'border-[var(--border-secondary)]'
        }`}>
          {provider === 'lifi' && (
            <div className="w-3 h-3 rounded-full" style={{ background: "var(--fg-accent)" }} />
          )}
        </div>
      </div>
    </button>

    {/* Yellow Network Option */}
    <button
      type="button"
      onClick={() => setProvider('yellow')}
      disabled={!yellowStatus.connected}
      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
        provider === 'yellow'
          ? 'border-[#F2B94B] bg-[#F2B94B]/10'
          : 'border-[var(--border-secondary)] hover:border-[#F2B94B]/50'
      } ${!yellowStatus.connected ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--fg-primary)" }}>
            Yellow Network
            {yellowStatus.connecting && (
              <span className="ml-2 text-[10px] text-[#F2B94B]">(Connecting...)</span>
            )}
          </p>
          <p className="text-[10px] font-semibold mt-1" style={{ color: "var(--fg-muted)" }}>
            {yellowStatus.connected
              ? 'State channel clearing'
              : yellowStatus.error
              ? `Error: ${yellowStatus.error}`
              : 'Not connected'}
          </p>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          provider === 'yellow' ? 'border-[#F2B94B]' : 'border-[var(--border-secondary)]'
        }`}>
          {provider === 'yellow' && (
            <div className="w-3 h-3 rounded-full bg-[#F2B94B]" />
          )}
        </div>
      </div>
    </button>
  </div>

  {!yellowStatus.connected && !yellowStatus.connecting && (
    <p className="text-[10px] font-semibold mt-4 text-center" style={{ color: "var(--fg-muted)" }}>
      Connect your wallet to enable Yellow Network
    </p>
  )}
</div>
```

## Step 4: Initialize Yellow on Wallet Connection

Add Yellow initialization logic to `CreateIntentView.tsx`:

```typescript
import { useWalletClient } from 'wagmi';
import { initAndConnectYellowProvider, getYellowStatus } from '@/lib/yellow';

// Add to component
const { data: walletClient } = useWalletClient();

// Add useEffect to initialize Yellow when wallet connects
useEffect(() => {
  if (walletClient && isConnected) {
    initAndConnectYellowProvider(walletClient).catch((error) => {
      console.error('Failed to initialize Yellow Network:', error);
    });
  }
}, [walletClient, isConnected]);
```

## Step 5: Update Quote API to Support Yellow

Modify `apps/dashboard/src/app/api/quote/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { fetchLifiQuote, buildQuoteRequest } from '@/lib/lifi';
import { getYellowProvider } from '@/lib/yellow';
import type { IntentParams } from '../../../../../../packages/sdk';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const provider = searchParams.get('provider') ?? 'lifi';
  const params: IntentParams = {
    sourceChain: searchParams.get('sourceChain') ?? '',
    destinationChain: searchParams.get('destinationChain') ?? '',
    tokenIn: searchParams.get('tokenIn') ?? '',
    tokenOut: searchParams.get('tokenOut') ?? '',
    amountIn: searchParams.get('amountIn') ?? '',
    minAmountOut: searchParams.get('minAmountOut') ?? '',
    deadline: Number(searchParams.get('deadline') ?? 0)
  };

  // Yellow Network quote
  if (provider === 'yellow') {
    const yellowProvider = getYellowProvider();
    
    if (!yellowProvider || !yellowProvider.isConnected) {
      return NextResponse.json(
        {
          status: 'error',
          provider: 'fallback',
          timestamp: Date.now(),
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: 'Yellow Network is not connected'
        },
        { status: 503 }
      );
    }

    try {
      const result = await yellowProvider.executeIntent(params);
      
      if (result.fallback) {
        return NextResponse.json(
          {
            status: 'error',
            provider: 'fallback',
            timestamp: result.timestamp,
            reasonCode: result.fallback.reasonCode,
            message: result.fallback.message
          },
          { status: 400 }
        );
      }

      // Normalize Yellow quote to match LI.FI format
      return NextResponse.json({
        status: 'ok',
        provider: 'yellow',
        timestamp: result.timestamp,
        quote: {
          routeId: result.intentId,
          amountOut: result.quote?.amountOut ?? params.minAmountOut,
          estimatedTime: result.quote?.estimatedTime ?? 60,
          solverId: result.quote?.solverId,
          channelId: result.channelId,
        },
        raw: result
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        {
          status: 'error',
          provider: 'fallback',
          timestamp: Date.now(),
          reasonCode: 'YELLOW_UNAVAILABLE',
          message: `Yellow Network error: ${message}`
        },
        { status: 500 }
      );
    }
  }

  // LI.FI quote (existing logic)
  const requestCheck = buildQuoteRequest(params);
  if (!requestCheck.ok) {
    return NextResponse.json(
      {
        status: 'error',
        provider: 'fallback',
        timestamp: Date.now(),
        reasonCode: requestCheck.reason,
        message: requestCheck.message
      },
      { status: 400 }
    );
  }

  const quote = await fetchLifiQuote(params);
  return NextResponse.json({ status: quote.provider === 'lifi' ? 'ok' : 'fallback', ...quote });
}
```

## Step 6: Update Intent Submission

Modify the `handleSubmit` function in `CreateIntentView.tsx`:

```typescript
const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!isConnected) {
    alert('Please connect your wallet first');
    return;
  }

  try {
    setStatus('SIGNING');
    
    const intentParams: IntentParams = {
      sourceChain: form.sourceChain,
      destinationChain: form.destChain,
      tokenIn: form.tokenIn,
      tokenOut: form.tokenOut,
      amountIn: form.amountIn,
      minAmountOut: form.minOut,
      deadline: Math.floor(Date.now() / 1000) + 3600
    };

    // Yellow Network flow
    if (provider === 'yellow') {
      const yellowProvider = getYellowProvider();
      
      if (!yellowProvider || !yellowProvider.isConnected) {
        alert('Yellow Network is not connected. Please try LI.FI instead.');
        setStatus('ERROR');
        setTimeout(() => setStatus('IDLE'), 3000);
        return;
      }

      setStatus('BROADCASTING');
      
      const result = await yellowProvider.executeIntent(intentParams);
      
      if (result.fallback) {
        alert(`Yellow Network error: ${result.fallback.message}\n\nPlease try LI.FI instead.`);
        setStatus('ERROR');
        setTimeout(() => setStatus('IDLE'), 3000);
        return;
      }

      setTimeout(() => {
        setStatus('DONE');
        onIntentSubmitted(result.intentId ?? 'unknown');
      }, 1500);
      return;
    }

    // LI.FI flow (existing logic)
    const sdk = new JACK_SDK({ baseUrl: '/api' });
    const typedData = sdk.getIntentTypedData(intentParams);

    const signature = await signTypedDataAsync({
      domain: typedData.domain,
      types: typedData.types,
      primaryType: 'Intent',
      message: typedData.message,
    });

    setStatus('BROADCASTING');
    const executionId = await sdk.submitIntent(intentParams, signature);

    setTimeout(() => {
      setStatus('DONE');
      onIntentSubmitted(executionId);
    }, 1500);
  } catch (error) {
    console.error('Submission failed:', error);
    setStatus('ERROR');
    setTimeout(() => setStatus('IDLE'), 3000);
  }
};
```

## Step 7: Enhance ExecutionDetailView

Add Yellow-specific data display to `ExecutionDetailView.tsx`:

```typescript
// Add after the main execution trace section
{intent?.provider === 'Yellow Network' && intent?.providerMetadata?.erc7824 && (
  <div className="border rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-xl" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-primary)" }}>
    <h3 className="text-xs font-space font-black uppercase tracking-[0.4em] mb-8" style={{ color: "var(--fg-muted)" }}>
      Yellow Network Channel State
    </h3>
    
    <div className="space-y-6">
      {/* Channel ID */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase" style={{ color: "var(--fg-muted)" }}>Channel ID</span>
        <span className="text-xs font-mono font-black" style={{ color: "var(--fg-accent)" }}>
          {intent.channelId}
        </span>
      </div>

      {/* Channel Status */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase" style={{ color: "var(--fg-muted)" }}>Status</span>
        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
          intent.channelStatus === 'ACTIVE' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
          intent.channelStatus === 'DISPUTE' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
          intent.channelStatus === 'FINAL' ? 'text-gray-400 bg-gray-400/10 border-gray-400/20' :
          'text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/20'
        }`}>
          {intent.channelStatus}
        </span>
      </div>

      {/* State Version */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase" style={{ color: "var(--fg-muted)" }}>State Version</span>
        <span className="text-xs font-black" style={{ color: "var(--fg-primary)" }}>
          {intent.stateVersion}
        </span>
      </div>

      {/* State Intent */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase" style={{ color: "var(--fg-muted)" }}>State Intent</span>
        <span className="text-xs font-black uppercase" style={{ color: "var(--fg-primary)" }}>
          {intent.stateIntent}
        </span>
      </div>

      {/* Allocations */}
      {intent.providerMetadata.erc7824.state?.allocations && (
        <div className="pt-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
          <p className="text-xs font-bold uppercase mb-4" style={{ color: "var(--fg-muted)" }}>Allocations</p>
          <div className="space-y-3">
            {intent.providerMetadata.erc7824.state.allocations.map((alloc: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-3 rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
                <div>
                  <p className="text-[10px] font-mono" style={{ color: "var(--fg-muted)" }}>
                    {alloc.destination.slice(0, 6)}...{alloc.destination.slice(-4)}
                  </p>
                  <p className="text-xs font-bold mt-1" style={{ color: "var(--fg-primary)" }}>
                    {alloc.amount} {alloc.token}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)}
```

## Step 8: Add Provider Badge to ExecutionsListView

Update the execution cards to show provider:

```typescript
// Add provider badge in the mobile card view
<div className="flex items-center justify-between">
  <span className="font-mono text-xs font-black tracking-tight" style={{ color: "var(--fg-accent)" }}>
    {exec.id}
  </span>
  <div className="flex items-center space-x-2">
    {/* Provider badge */}
    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${
      exec.provider === 'Yellow Network' 
        ? 'bg-[#F2B94B]/10 border border-[#F2B94B]/20 text-[#F2B94B]'
        : 'bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-[#38BDF8]'
    }`}>
      {exec.provider === 'Yellow Network' ? 'Yellow' : 'LI.FI'}
    </span>
    
    {/* Status badge */}
    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusColor(exec.status)}`}>
      {exec.status}
    </span>
  </div>
</div>
```

## Testing Checklist

### Manual Testing
- [ ] Wallet connects and Yellow initializes automatically
- [ ] Provider selection toggles between LI.FI and Yellow
- [ ] Yellow option is disabled when not connected
- [ ] Quote API returns Yellow quotes when provider=yellow
- [ ] Intent submission works with Yellow provider
- [ ] Execution detail shows Yellow-specific data
- [ ] Execution list shows provider badges
- [ ] Error messages are user-friendly
- [ ] Fallback to LI.FI works when Yellow fails

### Error Scenarios
- [ ] Yellow unavailable → shows error, LI.FI still works
- [ ] Authentication fails → shows reconnect message
- [ ] No solver quotes → suggests LI.FI alternative
- [ ] Insufficient channel balance → shows resize option
- [ ] Channel in dispute → blocks operations with clear message

## Deployment Notes

1. **Environment Variables**: Ensure all Yellow Network env vars are set in production
2. **WebSocket URL**: Use production ClearNode URL for mainnet
3. **Contract Addresses**: Verify custody and adjudicator addresses for target chain
4. **RPC URL**: Use reliable RPC provider (Infura, Alchemy, etc.)
5. **Monitoring**: Track Yellow connection status and fallback rates

## Next Steps

After completing this minimal integration:

1. Add channel management UI (create/resize/close)
2. Implement channel list view
3. Add gas savings calculator
4. Enhance error recovery flows
5. Add educational tooltips
6. Implement advanced analytics

## Support

For issues or questions:
- Check Yellow Network docs: https://docs.yellow.org
- Review SDK implementation: `packages/sdk/src/yellow/`
- Check integration spec: `.kiro/specs/yellow-network-integration/`
