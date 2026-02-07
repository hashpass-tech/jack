import { NextRequest, NextResponse } from 'next/server';
import { getIntents, saveIntent } from '@/lib/store';
import { fetchLifiQuote, fetchLifiRoute, fetchLifiStatus, type LifiFallback } from '@/lib/lifi';
import type { IntentParams } from '../../../../../../packages/sdk';

type FallbackReason = LifiFallback & { stage: 'QUOTE' | 'ROUTE' | 'STATUS' };

type StepStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';

type NotificationMapping = {
    status: string;
    step: string;
    stepStatus?: StepStatus;
};

type Erc7824StateIntent = 'OPERATE' | 'INITIALIZE' | 'RESIZE' | 'FINALIZE';
type Erc7824ChannelStatus = 'VOID' | 'INITIAL' | 'ACTIVE' | 'DISPUTE' | 'FINAL';

type Erc7824Amount = {
    token?: string;
    amount?: string | number;
};

type Erc7824Allocation = {
    destination?: string;
    token?: string;
    amount?: string | number;
};

type Erc7824ChannelConfig = {
    participants?: string[];
    adjudicator?: string;
    challenge?: number;
    nonce?: number;
};

type Erc7824StateSnapshot = {
    intent?: Erc7824StateIntent | string;
    version?: number;
    data?: string;
    allocations?: Erc7824Allocation[];
    sigs?: string[];
};

type ProviderNotification = {
    intentId: string;
    event?: string;
    status?: string;
    timestamp?: number;
    reasonCode?: string;
    operatorLog?: string;
    settlementTx?: string;
    sessionId?: string;
    channel?: string | Erc7824ChannelConfig;
    channelId?: string;
    channelStatus?: Erc7824ChannelStatus | string;
    stateIntent?: Erc7824StateIntent | string;
    stateVersion?: number;
    stateHash?: string;
    challengeExpiration?: number;
    challengePeriod?: number;
    adjudicator?: string;
    nonce?: number;
    transfer?: Erc7824Amount;
    channelConfig?: Erc7824ChannelConfig;
    state?: Erc7824StateSnapshot;
    proofs?: Erc7824StateSnapshot[];
    provider?: string;
    details?: string;
    metadata?: Record<string, unknown>;
};

const EVENT_STATUS_MAP: Record<string, NotificationMapping> = {
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
    },
    created: {
        status: 'CREATED',
        step: 'Channel Created (ERC-7824 / Nitrolite)'
    },
    joined: {
        status: 'EXECUTING',
        step: 'Channel Joined (ERC-7824 / Nitrolite)',
        stepStatus: 'IN_PROGRESS'
    },
    opened: {
        status: 'EXECUTING',
        step: 'Channel Opened (ERC-7824 / Nitrolite)',
        stepStatus: 'IN_PROGRESS'
    },
    challenged: {
        status: 'EXECUTING',
        step: 'Channel Challenged (ERC-7824 / Nitrolite)',
        stepStatus: 'IN_PROGRESS'
    },
    checkpointed: {
        status: 'EXECUTING',
        step: 'Channel Checkpointed (ERC-7824 / Nitrolite)'
    },
    resized: {
        status: 'EXECUTING',
        step: 'Channel Resized (ERC-7824 / Nitrolite)'
    },
    closed: {
        status: 'SETTLED',
        step: 'Channel Closed (ERC-7824 / Nitrolite)'
    }
};

const CHANNEL_STATUS_MAP: Record<string, NotificationMapping> = {
    void: {
        status: 'CREATED',
        step: 'Channel Status: VOID (ERC-7824)'
    },
    initial: {
        status: 'QUOTED',
        step: 'Channel Status: INITIAL (ERC-7824)',
        stepStatus: 'IN_PROGRESS'
    },
    active: {
        status: 'EXECUTING',
        step: 'Channel Status: ACTIVE (ERC-7824)',
        stepStatus: 'IN_PROGRESS'
    },
    dispute: {
        status: 'EXECUTING',
        step: 'Channel Status: DISPUTE (ERC-7824)',
        stepStatus: 'IN_PROGRESS'
    },
    final: {
        status: 'SETTLED',
        step: 'Channel Status: FINAL (ERC-7824)'
    }
};

const STATE_INTENT_MAP: Record<string, NotificationMapping> = {
    initialize: {
        status: 'QUOTED',
        step: 'State Intent: INITIALIZE (ERC-7824)',
        stepStatus: 'IN_PROGRESS'
    },
    operate: {
        status: 'EXECUTING',
        step: 'State Intent: OPERATE (ERC-7824)',
        stepStatus: 'IN_PROGRESS'
    },
    resize: {
        status: 'EXECUTING',
        step: 'State Intent: RESIZE (ERC-7824)'
    },
    finalize: {
        status: 'SETTLED',
        step: 'State Intent: FINALIZE (ERC-7824)'
    }
};

const normalizeEvent = (value?: string) =>
    value ? value.trim().toLowerCase().replace(/[\s-]+/g, '_') : '';

const parseOptionalInt = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const extractChannelConfig = (notification: ProviderNotification): Erc7824ChannelConfig | undefined => {
    if (notification.channelConfig) return notification.channelConfig;
    if (notification.channel && typeof notification.channel === 'object') {
        return notification.channel;
    }
    return undefined;
};

const extractChannelId = (request: NextRequest, notification: ProviderNotification): string => {
    const fromHeaders =
        request.headers.get('x-yellow-channel-id') ||
        request.headers.get('x-yellow-channel') ||
        '';
    if (notification.channelId) return notification.channelId;
    if (typeof notification.channel === 'string') return notification.channel;
    return fromHeaders;
};

const extractAdjudicator = (request: NextRequest, notification: ProviderNotification): string => {
    const channelConfig = extractChannelConfig(notification);
    const fromHeaders = request.headers.get('x-yellow-adjudicator') || '';
    return notification.adjudicator || channelConfig?.adjudicator || fromHeaders;
};

const extractChallengePeriod = (request: NextRequest, notification: ProviderNotification): number | undefined => {
    const channelConfig = extractChannelConfig(notification);
    const fromHeader = parseOptionalInt(request.headers.get('x-yellow-challenge-period'));
    return parseOptionalInt(notification.challengePeriod) ??
        parseOptionalInt(channelConfig?.challenge) ??
        fromHeader;
};

const extractChallengeExpiration = (request: NextRequest, notification: ProviderNotification): number | undefined =>
    parseOptionalInt(notification.challengeExpiration) ??
    parseOptionalInt(request.headers.get('x-yellow-challenge-expiration'));

const extractChannelStatus = (notification: ProviderNotification): string | undefined =>
    notification.channelStatus;

const extractStateIntent = (notification: ProviderNotification): string | undefined =>
    notification.stateIntent || notification.state?.intent;

const extractStateVersion = (notification: ProviderNotification): number | undefined =>
    parseOptionalInt(notification.stateVersion) ?? parseOptionalInt(notification.state?.version);

const inferNotificationMapping = (notification: ProviderNotification): NotificationMapping | undefined => {
    const normalizedEvent = normalizeEvent(notification.event || notification.status);
    if (normalizedEvent && EVENT_STATUS_MAP[normalizedEvent]) {
        return EVENT_STATUS_MAP[normalizedEvent];
    }

    const channelStatus = normalizeEvent(extractChannelStatus(notification));
    if (channelStatus && CHANNEL_STATUS_MAP[channelStatus]) {
        return CHANNEL_STATUS_MAP[channelStatus];
    }

    const stateIntent = normalizeEvent(extractStateIntent(notification));
    if (stateIntent && STATE_INTENT_MAP[stateIntent]) {
        return STATE_INTENT_MAP[stateIntent];
    }

    return undefined;
};

const isProviderNotification = (body: unknown): body is ProviderNotification => {
    if (!body || typeof body !== 'object') {
        return false;
    }

    const candidate = body as Record<string, unknown>;

    return Boolean(
        typeof candidate.intentId === 'string' &&
        (
            candidate.event ||
            candidate.status ||
            candidate.provider ||
            candidate.channelId ||
            candidate.channelStatus ||
            candidate.stateIntent
        )
    );
};

const requireProviderAuth = (request: NextRequest, notification: ProviderNotification) => {
    const authToken = process.env.YELLOW_NETWORK_AUTH_TOKEN;
    const sessionId = process.env.YELLOW_NETWORK_SESSION_ID;
    const channelId = process.env.YELLOW_NETWORK_CHANNEL_ID || process.env.YELLOW_NETWORK_CHANNEL;
    const adjudicator = process.env.YELLOW_NETWORK_ADJUDICATOR;
    const challengePeriod = parseOptionalInt(process.env.YELLOW_NETWORK_CHALLENGE_PERIOD);

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

    if (channelId) {
        const provided = extractChannelId(request, notification);
        if (!provided || provided.toLowerCase() !== channelId.toLowerCase()) {
            return { ok: false, status: 403, message: 'Invalid provider ERC-7824 channelId' };
        }
    }

    if (adjudicator) {
        const provided = extractAdjudicator(request, notification);
        if (!provided || provided.toLowerCase() !== adjudicator.toLowerCase()) {
            return { ok: false, status: 403, message: 'Invalid provider adjudicator' };
        }
    }

    if (challengePeriod !== undefined) {
        const provided = extractChallengePeriod(request, notification);
        if (provided === undefined || provided !== challengePeriod) {
            return { ok: false, status: 403, message: 'Invalid provider challenge period' };
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

            const mapping = inferNotificationMapping(body);
            const status = mapping?.status || intent.status;
            const channelStatus = extractChannelStatus(body);
            const stateIntent = extractStateIntent(body);
            const stateVersion = extractStateVersion(body);
            const channelId = extractChannelId(request, body) || intent.channelId;
            const adjudicator = extractAdjudicator(request, body) || intent.adjudicator;
            const challengePeriod = extractChallengePeriod(request, body) ?? intent.challengePeriod;
            const challengeExpiration = extractChallengeExpiration(request, body) ?? intent.challengeExpiration;
            const channelConfig = extractChannelConfig(body);
            const stepLabel = body.event || body.status || channelStatus || stateIntent || 'UNKNOWN';
            const step = mapping?.step || `Provider Update (${stepLabel})`;
            const stepStatus = mapping?.stepStatus || 'COMPLETED';
            const timestamp = body.timestamp ?? Date.now();
            const erc7824Details = [
                channelId ? `channelId ${channelId}` : '',
                channelStatus ? `status ${channelStatus}` : '',
                stateIntent ? `intent ${stateIntent}` : '',
                stateVersion !== undefined ? `version ${stateVersion}` : ''
            ].filter(Boolean).join(' · ');
            const hasErc7824Metadata = Boolean(
                channelId ||
                channelStatus ||
                stateIntent ||
                stateVersion !== undefined ||
                body.stateHash ||
                challengePeriod !== undefined ||
                challengeExpiration !== undefined ||
                adjudicator ||
                body.nonce !== undefined ||
                channelConfig ||
                body.state ||
                (body.proofs && body.proofs.length)
            );

            intent.status = status;
            intent.updatedAt = timestamp;
            intent.provider = body.provider || intent.provider || 'Yellow Network';
            intent.sessionId = body.sessionId || intent.sessionId;
            if (typeof body.channel === 'string') {
                intent.channel = body.channel;
            }
            if (channelId) {
                intent.channelId = channelId;
            }
            if (channelStatus) {
                intent.channelStatus = channelStatus;
            }
            if (stateIntent) {
                intent.stateIntent = stateIntent;
            }
            if (stateVersion !== undefined) {
                intent.stateVersion = stateVersion;
            }
            if (body.stateHash) {
                intent.stateHash = body.stateHash;
            }
            if (adjudicator) {
                intent.adjudicator = adjudicator;
            }
            if (challengePeriod !== undefined) {
                intent.challengePeriod = challengePeriod;
            }
            if (challengeExpiration !== undefined) {
                intent.challengeExpiration = challengeExpiration;
            }
            if (body.nonce !== undefined) {
                intent.nonce = body.nonce;
            }
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
                details:
                    body.details ||
                    body.reasonCode ||
                    body.operatorLog ||
                    (erc7824Details ? `ERC-7824 ${erc7824Details}` : undefined)
            });

            if (body.metadata || hasErc7824Metadata) {
                const providerMetadataBase =
                    intent.providerMetadata && typeof intent.providerMetadata === 'object'
                        ? intent.providerMetadata
                        : {};
                const existingErc7824 =
                    providerMetadataBase.erc7824 && typeof providerMetadataBase.erc7824 === 'object'
                        ? providerMetadataBase.erc7824
                        : {};
                const nextProviderMetadata: Record<string, unknown> = {
                    ...providerMetadataBase,
                    ...(body.metadata || {})
                };

                if (hasErc7824Metadata) {
                    nextProviderMetadata.erc7824 = {
                        ...existingErc7824,
                        channelId,
                        channelStatus,
                        stateIntent,
                        stateVersion,
                        stateHash: body.stateHash,
                        challengePeriod,
                        challengeExpiration,
                        adjudicator,
                        nonce: body.nonce,
                        channel: channelConfig,
                        state: body.state,
                        proofsCount: body.proofs?.length ?? 0
                    };
                }

                intent.providerMetadata = nextProviderMetadata;
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
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}

export async function GET() {
    const intents = getIntents();
    const list = Object
        .values(intents)
        .sort(
            (a, b) =>
                Number((b as { createdAt?: number }).createdAt ?? 0) -
                Number((a as { createdAt?: number }).createdAt ?? 0)
        );
    return NextResponse.json(list);
}

async function executeIntent(intentId: string, params: IntentParams) {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const updateIntent = (updates: Record<string, unknown>) => {
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
