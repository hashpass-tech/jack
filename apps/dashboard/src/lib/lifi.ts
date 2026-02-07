import type { IntentParams } from '../../../../packages/sdk';

const LIFI_BASE_URL = 'https://li.quest/v1';

type LifiProvider = 'lifi' | 'fallback';

export type LifiReasonCode =
  | 'MISSING_PARAMS'
  | 'INVALID_AMOUNT'
  | 'UNSUPPORTED_CHAIN'
  | 'UNSUPPORTED_TOKEN'
  | 'LIFI_BAD_REQUEST'
  | 'LIFI_RATE_LIMITED'
  | 'LIFI_SERVER_ERROR'
  | 'LIFI_UNAVAILABLE'
  | 'LIFI_EMPTY_RESPONSE'
  | 'MISSING_TX_HASH';

export interface LifiFallback {
  enabled: true;
  reasonCode: LifiReasonCode;
  message: string;
}

export interface LifiQuotePayload {
  provider: LifiProvider;
  routeId: string;
  timestamp: number;
  quote: {
    amountIn: string;
    amountOut: string;
    minAmountOut?: string;
    fromChainId: number;
    toChainId: number;
    fromToken: string;
    toToken: string;
    estimatedGasUsd?: string;
  };
  raw?: unknown;
  fallback?: LifiFallback;
}

export interface LifiRoutePayload {
  provider: LifiProvider;
  routeId: string;
  timestamp: number;
  route?: {
    fromChainId: number;
    toChainId: number;
    fromToken: string;
    toToken: string;
    steps?: unknown[];
    tags?: string[];
    estimatedDuration?: number;
  };
  raw?: unknown;
  fallback?: LifiFallback;
}

export interface LifiStatusPayload {
  provider: LifiProvider;
  timestamp: number;
  status: {
    state: string;
    substatus?: string;
    txHash?: string;
  };
  raw?: unknown;
  fallback?: LifiFallback;
}

type LifiRouteStep = {
  estimate?: {
    duration?: number;
  };
};

const CHAIN_NAME_TO_ID: Record<string, number> = {
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  polygon: 137
};

const TOKEN_ADDRESS_BY_CHAIN: Record<number, Record<string, { address: string; decimals: number }>> = {
  42161: {
    USDC: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
    WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
    ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 }
  },
  10: {
    USDC: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 }
  },
  8453: {
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18 },
    ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 }
  },
  137: {
    USDC: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
    WETH: { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
    ETH: { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 }
  }
};

const FALLBACK_RATES: Record<string, number> = {
  'USDC:WETH': 0.0004,
  'USDC:ETH': 0.0004,
  'ETH:USDC': 2500,
  'WETH:USDC': 2500,
  'ETH:WETH': 1,
  'WETH:ETH': 1
};

const getChainId = (name: string | undefined) => {
  if (!name) return undefined;
  return CHAIN_NAME_TO_ID[name.toLowerCase()];
};

const getTokenInfo = (chainId: number | undefined, symbol: string | undefined) => {
  if (!chainId || !symbol) return undefined;
  return TOKEN_ADDRESS_BY_CHAIN[chainId]?.[symbol.toUpperCase()];
};

const toBaseUnits = (amount: string, decimals: number) => {
  const [whole = '0', fraction = ''] = amount.split('.');
  const normalizedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const base = `${whole}${normalizedFraction}`.replace(/^0+(?=\d)/, '');
  return base.length ? base : '0';
};

const fromBaseUnits = (amount: string, decimals: number) => {
  if (!amount || amount === '0') return '0';
  const padded = amount.padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals) || '0';
  const fraction = padded.slice(-decimals).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
};

const deterministicId = (seed: string) => {
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  return `JK-LIFI-${(hash >>> 0).toString(36).toUpperCase()}`;
};

const buildFallbackQuote = (params: IntentParams, reason: LifiFallback): LifiQuotePayload => {
  const fromChainId = getChainId(params.sourceChain) ?? 0;
  const toChainId = getChainId(params.destinationChain) ?? 0;
  const rateKey = `${params.tokenIn}:${params.tokenOut}`.toUpperCase();
  const rate = FALLBACK_RATES[rateKey] ?? 1;
  const amountInNum = Number(params.amountIn || '0');
  const amountOut = Number.isFinite(amountInNum) ? (amountInNum * rate).toFixed(6) : params.amountIn;
  const seed = `${params.sourceChain}-${params.destinationChain}-${params.tokenIn}-${params.tokenOut}-${params.amountIn}`;

  return {
    provider: 'fallback',
    routeId: deterministicId(seed),
    timestamp: Date.now(),
    quote: {
      amountIn: params.amountIn,
      amountOut,
      minAmountOut: params.minAmountOut,
      fromChainId,
      toChainId,
      fromToken: params.tokenIn,
      toToken: params.tokenOut,
      estimatedGasUsd: '0'
    },
    fallback: reason
  };
};

const mapHttpError = (status: number): LifiReasonCode => {
  if (status === 400 || status === 422) return 'LIFI_BAD_REQUEST';
  if (status === 429) return 'LIFI_RATE_LIMITED';
  if (status >= 500) return 'LIFI_SERVER_ERROR';
  return 'LIFI_UNAVAILABLE';
};

export const buildQuoteRequest = (params: IntentParams) => {
  if (
    !params?.sourceChain ||
    !params?.destinationChain ||
    !params?.tokenIn ||
    !params?.tokenOut ||
    !params?.amountIn
  ) {
    return { ok: false as const, reason: 'MISSING_PARAMS' as LifiReasonCode, message: 'Missing quote parameters.' };
  }

  const fromChainId = getChainId(params.sourceChain);
  const toChainId = getChainId(params.destinationChain);
  if (!fromChainId || !toChainId) {
    return { ok: false as const, reason: 'UNSUPPORTED_CHAIN' as LifiReasonCode, message: 'Unsupported chain.' };
  }

  const fromToken = getTokenInfo(fromChainId, params.tokenIn);
  const toToken = getTokenInfo(toChainId, params.tokenOut);
  if (!fromToken || !toToken) {
    return { ok: false as const, reason: 'UNSUPPORTED_TOKEN' as LifiReasonCode, message: 'Unsupported token.' };
  }

  const amount = Number(params.amountIn);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, reason: 'INVALID_AMOUNT' as LifiReasonCode, message: 'Amount must be greater than zero.' };
  }

  return {
    ok: true as const,
    fromChainId,
    toChainId,
    fromToken,
    toToken,
    fromAmount: toBaseUnits(params.amountIn, fromToken.decimals),
    minAmountOut: params.minAmountOut
  };
};

export const fetchLifiQuote = async (params: IntentParams): Promise<LifiQuotePayload> => {
  const request = buildQuoteRequest(params);
  if (!request.ok) {
    return buildFallbackQuote(params, {
      enabled: true,
      reasonCode: request.reason,
      message: request.message
    });
  }

  const url = new URL(`${LIFI_BASE_URL}/quote`);
  url.searchParams.set('fromChain', request.fromChainId.toString());
  url.searchParams.set('toChain', request.toChainId.toString());
  url.searchParams.set('fromToken', request.fromToken.address);
  url.searchParams.set('toToken', request.toToken.address);
  url.searchParams.set('fromAmount', request.fromAmount);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      return buildFallbackQuote(params, {
        enabled: true,
        reasonCode: mapHttpError(response.status),
        message: `LI.FI quote request failed with status ${response.status}.`
      });
    }

    const data = await response.json();
    if (!data) {
      return buildFallbackQuote(params, {
        enabled: true,
        reasonCode: 'LIFI_EMPTY_RESPONSE',
        message: 'LI.FI returned an empty response.'
      });
    }

    const amountOut = typeof data.estimate?.toAmount === 'string'
      ? fromBaseUnits(data.estimate.toAmount, request.toToken.decimals)
      : params.minAmountOut ?? params.amountIn;

    return {
      provider: 'lifi',
      routeId: data.id ?? deterministicId(JSON.stringify(data)),
      timestamp: Date.now(),
      quote: {
        amountIn: params.amountIn,
        amountOut,
        minAmountOut: params.minAmountOut,
        fromChainId: request.fromChainId,
        toChainId: request.toChainId,
        fromToken: request.fromToken.address,
        toToken: request.toToken.address,
        estimatedGasUsd: data.estimate?.gasCosts?.[0]?.amountUSD ?? undefined
      },
      raw: data
    };
  } catch (error) {
    return buildFallbackQuote(params, {
      enabled: true,
      reasonCode: 'LIFI_UNAVAILABLE',
      message: error instanceof Error ? error.message : 'LI.FI is unavailable.'
    });
  }
};

export const fetchLifiRoute = async (params: IntentParams): Promise<LifiRoutePayload> => {
  const request = buildQuoteRequest(params);
  if (!request.ok) {
    return {
      provider: 'fallback',
      routeId: deterministicId(JSON.stringify(params)),
      timestamp: Date.now(),
      fallback: {
        enabled: true,
        reasonCode: request.reason,
        message: request.message
      }
    };
  }

  const url = new URL(`${LIFI_BASE_URL}/routes`);
  url.searchParams.set('fromChain', request.fromChainId.toString());
  url.searchParams.set('toChain', request.toChainId.toString());
  url.searchParams.set('fromToken', request.fromToken.address);
  url.searchParams.set('toToken', request.toToken.address);
  url.searchParams.set('fromAmount', request.fromAmount);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      return {
        provider: 'fallback',
        routeId: deterministicId(JSON.stringify(params)),
        timestamp: Date.now(),
        fallback: {
          enabled: true,
          reasonCode: mapHttpError(response.status),
          message: `LI.FI route request failed with status ${response.status}.`
        }
      };
    }

    const data = (await response.json()) as { routes?: Array<Record<string, unknown>> };
    const route = data?.routes?.[0];
    if (!route) {
      return {
        provider: 'fallback',
        routeId: deterministicId(JSON.stringify(params)),
        timestamp: Date.now(),
        fallback: {
          enabled: true,
          reasonCode: 'LIFI_EMPTY_RESPONSE',
          message: 'LI.FI did not return any routes.'
        }
      };
    }

    const steps = Array.isArray(route.steps) ? (route.steps as LifiRouteStep[]) : undefined;

    return {
      provider: 'lifi',
      routeId: route.id ?? deterministicId(JSON.stringify(route)),
      timestamp: Date.now(),
      route: {
        fromChainId: request.fromChainId,
        toChainId: request.toChainId,
        fromToken: request.fromToken.address,
        toToken: request.toToken.address,
        steps,
        tags: Array.isArray(route.tags) ? (route.tags as string[]) : undefined,
        estimatedDuration: steps?.reduce((sum, step) => sum + (step.estimate?.duration ?? 0), 0)
      },
      raw: route
    };
  } catch (error) {
    return {
      provider: 'fallback',
      routeId: deterministicId(JSON.stringify(params)),
      timestamp: Date.now(),
      fallback: {
        enabled: true,
        reasonCode: 'LIFI_UNAVAILABLE',
        message: error instanceof Error ? error.message : 'LI.FI is unavailable.'
      }
    };
  }
};

export const fetchLifiStatus = async (txHash: string | undefined): Promise<LifiStatusPayload> => {
  if (!txHash) {
    return {
      provider: 'fallback',
      timestamp: Date.now(),
      status: { state: 'NOT_AVAILABLE' },
      fallback: {
        enabled: true,
        reasonCode: 'MISSING_TX_HASH',
        message: 'No transaction hash available for LI.FI status.'
      }
    };
  }

  const url = new URL(`${LIFI_BASE_URL}/status`);
  url.searchParams.set('txHash', txHash);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      return {
        provider: 'fallback',
        timestamp: Date.now(),
        status: { state: 'UNKNOWN', txHash },
        fallback: {
          enabled: true,
          reasonCode: mapHttpError(response.status),
          message: `LI.FI status request failed with status ${response.status}.`
        }
      };
    }

    const data = (await response.json()) as { status?: string; substatus?: string };
    return {
      provider: 'lifi',
      timestamp: Date.now(),
      status: {
        state: data?.status ?? 'UNKNOWN',
        substatus: data?.substatus,
        txHash
      },
      raw: data
    };
  } catch (error) {
    return {
      provider: 'fallback',
      timestamp: Date.now(),
      status: { state: 'UNKNOWN', txHash },
      fallback: {
        enabled: true,
        reasonCode: 'LIFI_UNAVAILABLE',
        message: error instanceof Error ? error.message : 'LI.FI is unavailable.'
      }
    };
  }
};
