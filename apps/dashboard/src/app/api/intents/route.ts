import { NextRequest, NextResponse } from 'next/server';
import { getIntents, saveIntent, isValidIntentId } from '@/lib/store';
import { fetchLifiQuote, fetchLifiRoute, fetchLifiStatus, type LifiFallback, type LifiStatusPayload } from '@/lib/lifi';
import { getYellowProvider } from '@/lib/yellow';
import type { IntentParams } from '../../../../../../packages/sdk';

// ---------------------------------------------------------------------------
// Explicit types for intent records (replaces implicit `any`)
// ---------------------------------------------------------------------------

type IntentStatus =
    | 'CREATED'
    | 'QUOTED'
    | 'EXECUTING'
    | 'SETTLING'
    | 'SETTLED'
    | 'ABORTED'
    | 'EXPIRED';

type ExecutionStepStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';

interface ExecutionStep {
    step: string;
    status: ExecutionStepStatus;
    timestamp: number;
    details?: string;
}

interface ReasonCodeEntry {
    code: string;
    timestamp: number;
    source: string;
}

interface OperatorLogEntry {
    message: string;
    timestamp: number;
    source: string;
}

type FallbackReason = LifiFallback & { stage: 'QUOTE' | 'ROUTE' | 'STATUS' };

interface IntentRecord {
    id: string;
    params: IntentParams;
    status: IntentStatus;
    createdAt: number;
    updatedAt?: number;
    executionSteps: ExecutionStep[];
    reasonCodes: ReasonCodeEntry[];
    operatorLogs: OperatorLogEntry[];
    fallbackMode?: {
        enabled: boolean;
        reasons: FallbackReason[];
    };
    provider?: string;
    sessionId?: string;
    channel?: string;
    channelId?: string;
    channelStatus?: string;
    stateIntent?: string;
    stateVersion?: number;
    stateHash?: string;
    adjudicator?: string;
    challengePeriod?: number;
    challengeExpiration?: number;
    nonce?: number;
    settlementTx?: string;
    lifi?: {
        quote?: unknown;
        route?: unknown;
        status?: unknown;
    };
    providerMetadata?: Record<string, unknown>;
    [key: string]: unknown;
}

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

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Provider-driven status resolution helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a LI.FI status state string to an IntentStatus.
 * Maps LI.FI-specific states (e.g. "DONE", "FAILED", "PENDING", "NOT_FOUND")
 * to the intent lifecycle statuses used by the dashboard.
 */
const normalizeLifiState = (lifiState: string): IntentStatus => {
    const upper = lifiState.toUpperCase();
    switch (upper) {
        case 'DONE':
            return 'SETTLED';
        case 'FAILED':
            return 'ABORTED';
        case 'PENDING':
        case 'NOT_FOUND':
            return 'EXECUTING';
        case 'INVALID':
            return 'ABORTED';
        default:
            return 'EXECUTING';
    }
};

/**
 * Derive the final outcome for an intent based on the LI.FI status payload.
 * Returns the resolved IntentStatus and a human-readable label for the
 * execution step.
 */
const deriveFinalOutcome = (
    statusPayload: LifiStatusPayload
): { status: IntentStatus; stepLabel: string; stepStatus: ExecutionStepStatus } => {
    if (statusPayload.provider === 'lifi') {
        const resolved = normalizeLifiState(statusPayload.status.state);
        return {
            status: resolved,
            stepLabel: resolved === 'SETTLED' ? 'Settlement Complete' : `Settlement Status: ${statusPayload.status.state}`,
            stepStatus: resolved === 'SETTLED' ? 'COMPLETED' : 'FAILED'
        };
    }
    // Fallback provider – cannot confirm settlement
    return {
        status: 'ABORTED',
        stepLabel: 'Settlement Unavailable',
        stepStatus: 'FAILED'
    };
};

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as Record<string, unknown>;

        if (isProviderNotification(body)) {
            const authCheck = requireProviderAuth(request, body);
            if (!authCheck.ok) {
                return NextResponse.json({ error: authCheck.message }, { status: authCheck.status });
            }

            const intents = getIntents() as Record<string, IntentRecord>;
            const rawIntentId = (body as { intentId?: unknown }).intentId;
            if (typeof rawIntentId !== 'string' || !isValidIntentId(rawIntentId)) {
                return NextResponse.json({ error: 'Invalid intent identifier' }, { status: 403 });
            }
            const intentFromStore: IntentRecord | undefined = intents[rawIntentId];
            if (!intentFromStore) {
                return NextResponse.json({ error: 'Intent not found' }, { status: 404 });
            }
            // Clone into a fresh object before mutating to avoid operating on a potentially polluted prototype chain.
            const safeIntent: IntentRecord = { ...intentFromStore };

            const mapping = inferNotificationMapping(body);
            const status = (mapping?.status || safeIntent.status) as IntentStatus;
            const channelStatus = extractChannelStatus(body);
            const stateIntent = extractStateIntent(body);
            const stateVersion = extractStateVersion(body);
            const channelId = extractChannelId(request, body) || safeIntent.channelId;
            const adjudicator = extractAdjudicator(request, body) || safeIntent.adjudicator;
            const challengePeriod = extractChallengePeriod(request, body) ?? safeIntent.challengePeriod;
            const challengeExpiration = extractChallengeExpiration(request, body) ?? safeIntent.challengeExpiration;
            const channelConfig = extractChannelConfig(body);
            const stepLabel = body.event || body.status || channelStatus || stateIntent || 'UNKNOWN';
            const step = mapping?.step || `Provider Update (${stepLabel})`;
            const stepStatus: ExecutionStepStatus = mapping?.stepStatus || 'COMPLETED';
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
                (body.proofs && (body.proofs as unknown[]).length)
            );

            safeIntent.status = status;
            safeIntent.updatedAt = timestamp as number;
            safeIntent.provider = (body as { provider?: unknown }).provider || safeIntent.provider || 'Yellow Network';
            safeIntent.sessionId = (body as { sessionId?: unknown }).sessionId || safeIntent.sessionId;
            if (typeof (body as { channel?: unknown }).channel === 'string') {
                safeIntent.channel = (body as { channel: string }).channel;
            }
            if (channelId) {
                safeIntent.channelId = channelId;
            }
            if (channelStatus) {
                safeIntent.channelStatus = channelStatus;
            }
            if (stateIntent) {
                safeIntent.stateIntent = stateIntent;
            }
            if (stateVersion !== undefined) {
                safeIntent.stateVersion = stateVersion;
            }
            if ((body as { stateHash?: unknown }).stateHash) {
                safeIntent.stateHash = (body as { stateHash: string }).stateHash;
            }
            if (adjudicator) {
                safeIntent.adjudicator = adjudicator;
            }
            if (challengePeriod !== undefined) {
                safeIntent.challengePeriod = challengePeriod;
            }
            if (challengeExpiration !== undefined) {
                safeIntent.challengeExpiration = challengeExpiration;
            }
            if ((body as { nonce?: unknown }).nonce !== undefined) {
                safeIntent.nonce = (body as { nonce: number }).nonce;
            }
            intent.reasonCodes = intent.reasonCodes ?? [];
            intent.operatorLogs = intent.operatorLogs ?? [];

            if (body.reasonCode) {
                intent.reasonCodes.push({
                    code: body.reasonCode as string,
                    timestamp: timestamp as number,
                    source: intent.provider as string
                });
            }

            if (body.operatorLog) {
                intent.operatorLogs.push({
                    message: body.operatorLog as string,
                    timestamp: timestamp as number,
                    source: intent.provider as string
                });
            }

            if (body.settlementTx) {
                intent.settlementTx = body.settlementTx as string;
            }

            const executionSteps = intent.executionSteps ?? [];
            executionSteps.push({
                step,
                status: stepStatus,
                timestamp: timestamp as number,
                details:
                    (body.details as string | undefined) ||
                    (body.reasonCode as string | undefined) ||
                    (body.operatorLog as string | undefined) ||
                    (erc7824Details ? `ERC-7824 ${erc7824Details}` : undefined)
            });
            intent.executionSteps = executionSteps;

            if (body.metadata || hasErc7824Metadata) {
                const providerMetadataBase =
                    intent.providerMetadata && typeof intent.providerMetadata === 'object'
                        ? intent.providerMetadata
                        : {};
                const existingErc7824 =
                    providerMetadataBase.erc7824 && typeof providerMetadataBase.erc7824 === 'object'
                        ? (providerMetadataBase.erc7824 as Record<string, unknown>)
                        : {};
                const nextProviderMetadata: Record<string, unknown> = {
                    ...providerMetadataBase,
                    ...((body.metadata as Record<string, unknown>) || {})
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
                        proofsCount: (body.proofs as unknown[] | undefined)?.length ?? 0
                    };
                }

                intent.providerMetadata = nextProviderMetadata;
            }

            saveIntent(body.intentId, intent);

            // Update YellowProvider local channel state if available (Requirement 12.2)
            // This is fire-and-forget: we don't await or block the response.
            // The existing notification ingestion path above is preserved for backward compatibility.
            if (channelId) {
                const yellowProvider = getYellowProvider();
                if (yellowProvider) {
                    try {
                        // Trigger a cache refresh by querying the channel state.
                        // getChannelState updates the ChannelStateManager's local cache
                        // with the latest on-chain data for this channel.
                        yellowProvider.getChannelState(channelId).catch(() => {
                            // Non-fatal: swallow errors from the async cache refresh
                        });
                    } catch {
                        // Non-fatal: notification processing must not fail
                        // if YellowProvider update fails
                    }
                }
            }

            return NextResponse.json({ intentId: body.intentId, status: intent.status });
        }

        // --- New intent creation (non-provider-notification) ---
        const intentId = `JK-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
        const timestamp = Date.now();

        const params: IntentParams = {
            sourceChain: body.sourceChain as string,
            destinationChain: body.destinationChain as string,
            tokenIn: body.tokenIn as string,
            tokenOut: body.tokenOut as string,
            amountIn: body.amountIn as string,
            minAmountOut: (body.minAmountOut as string) ?? '',
            deadline: (body.deadline as number) ?? 0,
            signature: (body.signature as string) ?? ''
        } as IntentParams;

        const intent: IntentRecord = {
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
    const intents = getIntents() as Record<string, IntentRecord>;
    const list = Object
        .values(intents)
        .sort(
            (a, b) =>
                Number(b.createdAt ?? 0) -
                Number(a.createdAt ?? 0)
        );
    return NextResponse.json(list);
}

// ---------------------------------------------------------------------------
// Async intent lifecycle execution
// ---------------------------------------------------------------------------

async function executeIntent(intentId: string, params: IntentParams) {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const updateIntent = (updates: Record<string, unknown>) => {
        const intents = getIntents() as Record<string, IntentRecord>;
        const intent: IntentRecord | undefined = intents[intentId];
        if (intent) {
            Object.assign(intent, updates);
            saveIntent(intentId, intent);
        }
    };

    const addFallback = (fallback: LifiFallback | undefined, stage: FallbackReason['stage']) => {
        if (!fallback) return;
        const intents = getIntents() as Record<string, IntentRecord>;
        const intent: IntentRecord | undefined = intents[intentId];
        if (!intent) return;
        const fallbackMode = intent.fallbackMode ?? { enabled: false, reasons: [] };
        fallbackMode.enabled = true;
        fallbackMode.reasons = [...(fallbackMode.reasons ?? []), { ...fallback, stage }];
        intent.fallbackMode = fallbackMode;
        saveIntent(intentId, intent);
    };

    const appendStep = (status: IntentStatus, step: string, details: string) => {
        const intents = getIntents() as Record<string, IntentRecord>;
        const intent: IntentRecord | undefined = intents[intentId];
        if (intent) {
            intent.status = status;
            const executionSteps: ExecutionStep[] = intent.executionSteps ?? [];
            executionSteps.push({
                step,
                status: 'COMPLETED',
                timestamp: Date.now(),
                details
            });
            intent.executionSteps = executionSteps;
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
    const intents = getIntents() as Record<string, IntentRecord>;
    const intent: IntentRecord | undefined = intents[intentId];
    if (intent) {
        const outcome = deriveFinalOutcome(status);
        intent.status = outcome.status;
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
        const executionSteps: ExecutionStep[] = intent.executionSteps ?? [];
        executionSteps.push({
            step: outcome.stepLabel,
            status: outcome.stepStatus,
            timestamp: Date.now(),
            details: intent.fallbackMode?.enabled
                ? 'Finalized with fallback routing mode.'
                : 'Finalized with LI.FI routing metadata.'
        });
        intent.executionSteps = executionSteps;
        saveIntent(intentId, intent);
    }
}