import { NextRequest, NextResponse } from 'next/server';
import { getIntents, saveIntent } from '@/lib/store';
import { fetchLifiQuote, fetchLifiRoute, fetchLifiStatus, type LifiFallback } from '@/lib/lifi';
import type { IntentParams } from '../../../../../../packages/sdk';

type FallbackReason = LifiFallback & { stage: 'QUOTE' | 'ROUTE' | 'STATUS' };

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const intentId = `JK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const timestamp = Date.now();

        const params: IntentParams = {
            sourceChain: body.sourceChain,
            destinationChain: body.destinationChain,
            tokenIn: body.tokenIn,
            tokenOut: body.tokenOut,
            amountIn: body.amountIn,
            minAmountOut: body.minAmountOut,
            deadline: body.deadline,
            signature: body.signature
        } as IntentParams;

        const intent = {
            id: intentId,
            ...body,
            params,
            status: 'CREATED',
            createdAt: timestamp,
            executionSteps: [
                { step: 'Intent Signed & Broadcast', status: 'COMPLETED', timestamp }
            ],
            fallbackMode: {
                enabled: false,
                reasons: [] as FallbackReason[]
            }
        };

        saveIntent(intentId, intent);

        // Start async execution simulation
        executeIntent(intentId, params);

        return NextResponse.json({ intentId, status: 'CREATED' });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}

export async function GET() {
    const intents = getIntents();
    const list = Object.values(intents).sort((a: any, b: any) => b.createdAt - a.createdAt);
    return NextResponse.json(list);
}

async function executeIntent(intentId: string, params: IntentParams) {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const updateIntent = (updates: Record<string, any>) => {
        const intents = getIntents();
        const intent = intents[intentId];
        if (intent) {
            Object.assign(intent, updates);
            saveIntent(intentId, intent);
        }
    };

    const addFallback = (fallback: LifiFallback | undefined, stage: FallbackReason['stage']) => {
        if (!fallback) return;
        const intents = getIntents();
        const intent = intents[intentId];
        if (!intent) return;
        const fallbackMode = intent.fallbackMode ?? { enabled: false, reasons: [] };
        fallbackMode.enabled = true;
        fallbackMode.reasons = [...(fallbackMode.reasons ?? []), { ...fallback, stage }];
        intent.fallbackMode = fallbackMode;
        saveIntent(intentId, intent);
    };

    const appendStep = (status: string, step: string, details: string) => {
        const intents = getIntents();
        const intent = intents[intentId];
        if (intent) {
            intent.status = status;
            intent.executionSteps.push({
                step,
                status: 'COMPLETED',
                timestamp: Date.now(),
                details
            });
            saveIntent(intentId, intent);
        }
    };

    // 1. LI.FI Quote (QUOTED)
    await sleep(1500);
    const quote = await fetchLifiQuote(params);
    updateIntent({ lifi: { quote } });
    addFallback(quote.fallback, 'QUOTE');
    appendStep(
        'QUOTED',
        `Solver Matching (${quote.provider === 'lifi' ? 'LI.FI Live Quote' : 'Fallback Quote'})`,
        quote.fallback
            ? `Fallback enabled (${quote.fallback.reasonCode}): ${quote.fallback.message}`
            : `Quote ID ${quote.routeId} with est. output ${quote.quote.amountOut}`
    );

    // 2. LI.FI Route (EXECUTING)
    await sleep(2500);
    const route = await fetchLifiRoute(params);
    updateIntent({ lifi: { quote, route } });
    addFallback(route.fallback, 'ROUTE');
    appendStep(
        'EXECUTING',
        `Cross-Chain Routing (${route.provider === 'lifi' ? 'LI.FI Route' : 'Fallback Route'})`,
        route.fallback
            ? `Fallback enabled (${route.fallback.reasonCode}): ${route.fallback.message}`
            : `Route ${route.routeId} with ${route.route?.steps?.length ?? 0} step(s)`
    );

    // 3. LI.FI Status (SETTLING)
    await sleep(2500);
    const status = await fetchLifiStatus(undefined);
    updateIntent({ lifi: { quote, route, status } });
    addFallback(status.fallback, 'STATUS');
    appendStep(
        'SETTLING',
        `Route Status (${status.provider === 'lifi' ? 'LI.FI Status' : 'Fallback Status'})`,
        status.fallback
            ? `Fallback enabled (${status.fallback.reasonCode}): ${status.fallback.message}`
            : `Status: ${status.status.state}${status.status.substatus ? ` (${status.status.substatus})` : ''}`
    );

    // 4. Finality (SETTLED)
    await sleep(2000);
    const intents = getIntents();
    const intent = intents[intentId];
    if (intent) {
        intent.status = 'SETTLED';
        intent.settlementTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        intent.executionSteps.push({
            step: 'Settlement Complete',
            status: 'COMPLETED',
            timestamp: Date.now(),
            details: intent.fallbackMode?.enabled
                ? 'Finalized with fallback routing mode.'
                : 'Finalized with LI.FI routing metadata.'
        });
        saveIntent(intentId, intent);
    }
}
