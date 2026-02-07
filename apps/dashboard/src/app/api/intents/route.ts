import { NextRequest, NextResponse } from 'next/server';
import { getIntents, saveIntent } from '@/lib/store';
import { fetchLifiQuote, fetchLifiRoute, fetchLifiStatus, type LifiFallback } from '@/lib/lifi';
import type { IntentParams } from '../../../../../../packages/sdk';

type FallbackReason = LifiFallback & { stage: 'QUOTE' | 'ROUTE' | 'STATUS' };

type ProviderNotification = {
    intentId: string;
    event?: string;
    status?: string;
    timestamp?: number;
    reasonCode?: string;
    operatorLog?: string;
    settlementTx?: string;
    sessionId?: string;
    channel?: string;
    provider?: string;
    details?: string;
    metadata?: Record<string, unknown>;
};

const EVENT_STATUS_MAP: Record<
    string,
    { status: string; step: string; stepStatus?: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED' }
> = {
    quote_accepted: {
        status: 'QUOTED',
        step: 'Solver Quote Accepted (Yellow Network)'
    },
    solver_quoted: {
        status: 'QUOTED',
        step: 'Solver Quote Received (Yellow Network)'
    },
    execution_started: {
        status: 'EXECUTING',
        step: 'Execution Started (Yellow Network)',
        stepStatus: 'IN_PROGRESS'
    },
    routing_started: {
        status: 'EXECUTING',
        step: 'Cross-Chain Routing Started (Yellow Network)',
        stepStatus: 'IN_PROGRESS'
    },
    settlement_submitted: {
        status: 'SETTLING',
        step: 'Settlement Submitted (Yellow Network)',
        stepStatus: 'IN_PROGRESS'
    },
    settled: {
        status: 'SETTLED',
        step: 'Settlement Finalized (Yellow Network)'
    },
    settlement_finalized: {
        status: 'SETTLED',
        step: 'Settlement Finalized (Yellow Network)'
    },
    failed: {
        status: 'ABORTED',
        step: 'Execution Failed (Yellow Network)',
        stepStatus: 'FAILED'
    },
    execution_failed: {
        status: 'ABORTED',
        step: 'Execution Failed (Yellow Network)',
        stepStatus: 'FAILED'
    },
    settlement_failed: {
        status: 'ABORTED',
        step: 'Settlement Failed (Yellow Network)',
        stepStatus: 'FAILED'
    },
    expired: {
        status: 'EXPIRED',
        step: 'Intent Expired (Yellow Network)',
        stepStatus: 'FAILED'
    },
    canceled: {
        status: 'ABORTED',
        step: 'Intent Canceled (Yellow Network)',
        stepStatus: 'FAILED'
    }
};

const normalizeEvent = (value?: string) =>
    value ? value.trim().toLowerCase().replace(/[\s-]+/g, '_') : '';

const isProviderNotification = (body: any): body is ProviderNotification =>
    Boolean(body?.intentId && (body?.event || body?.status || body?.provider));

const requireProviderAuth = (request: NextRequest, notification: ProviderNotification) => {
    const authToken = process.env.YELLOW_NETWORK_AUTH_TOKEN;
    const sessionId = process.env.YELLOW_NETWORK_SESSION_ID;
    const channel = process.env.YELLOW_NETWORK_CHANNEL;

    if (authToken) {
        const authorization = request.headers.get('authorization');
        const token = authorization?.startsWith('Bearer ')
            ? authorization.slice('Bearer '.length)
            : authorization;
        if (!token || token !== authToken) {
            return { ok: false, status: 401, message: 'Unauthorized provider request' };
        }
    }

    if (sessionId) {
        const provided = notification.sessionId || request.headers.get('x-yellow-session-id') || '';
        if (!provided || provided !== sessionId) {
            return { ok: false, status: 403, message: 'Invalid provider session' };
        }
    }

    if (channel) {
        const provided = notification.channel || request.headers.get('x-yellow-channel') || '';
        if (!provided || provided !== channel) {
            return { ok: false, status: 403, message: 'Invalid provider channel' };
        }
    }

    return { ok: true, status: 200, message: 'OK' };
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (isProviderNotification(body)) {
            const authCheck = requireProviderAuth(request, body);
            if (!authCheck.ok) {
                return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
            }

            const intents = getIntents();
            const intent = intents[body.intentId];
            if (!intent) {
                return NextResponse.json({ error: 'Intent not found' }, { status: 404 });
            }

            const normalized = normalizeEvent(body.event || body.status);
            const mapping = EVENT_STATUS_MAP[normalized];
            const status = mapping?.status || intent.status;
            const step = mapping?.step || `Provider Update (${body.event || body.status || 'UNKNOWN'})`;
            const stepStatus = mapping?.stepStatus || 'COMPLETED';
            const timestamp = body.timestamp ?? Date.now();

            intent.status = status;
            intent.updatedAt = timestamp;
            intent.provider = body.provider || intent.provider || 'Yellow Network';
            intent.sessionId = body.sessionId || intent.sessionId;
            intent.channel = body.channel || intent.channel;
            intent.reasonCodes = intent.reasonCodes || [];
            intent.operatorLogs = intent.operatorLogs || [];

            if (body.reasonCode) {
                intent.reasonCodes.push({
                    code: body.reasonCode,
                    timestamp,
                    source: intent.provider
                });
            }

            if (body.operatorLog) {
                intent.operatorLogs.push({
                    message: body.operatorLog,
                    timestamp,
                    source: intent.provider
                });
            }

            if (body.settlementTx) {
                intent.settlementTx = body.settlementTx;
            }

            intent.executionSteps.push({
                step,
                status: stepStatus,
                timestamp,
                details: body.details || body.reasonCode || body.operatorLog
            });

            if (body.metadata) {
                intent.providerMetadata = {
                    ...intent.providerMetadata,
                    ...body.metadata
                };
            }

            saveIntent(body.intentId, intent);

            return NextResponse.json({ intentId: body.intentId, status: intent.status });
        }

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
            reasonCodes: [],
            operatorLogs: [],
            fallbackMode: {
                enabled: false,
                reasons: [] as FallbackReason[]
            }
        };

        saveIntent(intentId, intent);

        // Start async LI.FI lifecycle execution
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

    const statusTxHash = typeof route.raw === 'object' && route.raw && 'transactionHash' in (route.raw as Record<string, unknown>)
        ? String((route.raw as Record<string, unknown>).transactionHash)
        : undefined;

    // 3. LI.FI Status (SETTLING)
    await sleep(2500);
    const status = await fetchLifiStatus(statusTxHash);
    updateIntent({ lifi: { quote, route, status } });
    addFallback(status.fallback, 'STATUS');
    appendStep(
        'SETTLING',
        `Route Status (${status.provider === 'lifi' ? 'LI.FI Status' : 'Fallback Status'})`,
        status.fallback
            ? `Fallback enabled (${status.fallback.reasonCode}): ${status.fallback.message}`
            : `Status: ${status.status.state}${status.status.substatus ? ` (${status.status.substatus})` : ''}`
    );

    // 4. Finality (provider status-derived)
    await sleep(2000);
    const intents = getIntents();
    const intent = intents[intentId];
    if (intent) {
        intent.status = status.provider === 'lifi' ? 'SETTLED' : 'ABORTED';
        intent.reasonCodes = intent.reasonCodes ?? [];
        if (status.fallback?.reasonCode) {
            intent.reasonCodes.push({
                code: status.fallback.reasonCode,
                timestamp: Date.now(),
                source: status.provider
            });
        }
        if (status.status.txHash) {
            intent.settlementTx = status.status.txHash;
        }
        intent.executionSteps.push({
            step: status.provider === 'lifi' ? 'Settlement Complete' : 'Settlement Unavailable',
            status: status.provider === 'lifi' ? 'COMPLETED' : 'FAILED',
            timestamp: Date.now(),
            details: intent.fallbackMode?.enabled
                ? 'Finalized with fallback routing mode.'
                : 'Finalized with LI.FI routing metadata.'
        });
        saveIntent(intentId, intent);
    }
}
