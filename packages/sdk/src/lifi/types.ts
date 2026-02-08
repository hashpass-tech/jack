export type LifiProviderType = 'lifi' | 'fallback';

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
  provider: LifiProviderType;
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
  provider: LifiProviderType;
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
  provider: LifiProviderType;
  timestamp: number;
  status: {
    state: string;
    substatus?: string;
    txHash?: string;
  };
  raw?: unknown;
  fallback?: LifiFallback;
}
