import { NextRequest, NextResponse } from 'next/server';
import { getIntents, saveIntent } from '@/lib/store';

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

        const intent = {
            id: intentId,
            ...body,
            status: 'CREATED',
            createdAt: timestamp,
            executionSteps: [
                { step: 'Intent Signed & Broadcast', status: 'COMPLETED', timestamp }
            ],
            reasonCodes: [],
            operatorLogs: []
        };

        saveIntent(intentId, intent);

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
