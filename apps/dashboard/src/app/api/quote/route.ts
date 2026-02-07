import { NextRequest, NextResponse } from 'next/server';
import { fetchLifiQuote, buildQuoteRequest } from '@/lib/lifi';
import type { IntentParams } from '../../../../../../packages/sdk';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const params: IntentParams = {
    sourceChain: searchParams.get('sourceChain') ?? '',
    destinationChain: searchParams.get('destinationChain') ?? '',
    tokenIn: searchParams.get('tokenIn') ?? '',
    tokenOut: searchParams.get('tokenOut') ?? '',
    amountIn: searchParams.get('amountIn') ?? '',
    minAmountOut: searchParams.get('minAmountOut') ?? '',
    deadline: Number(searchParams.get('deadline') ?? 0)
  };

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
