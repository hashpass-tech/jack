/**
 * Session Key Manager for Yellow Network ClearNode Authentication
 *
 * Handles session key generation, EIP-712 authentication flow, and session lifecycle.
 *
 * Authentication flow:
 * 1. Generate session keypair via viem's generatePrivateKey + privateKeyToAccount
 * 2. Send auth_request message with session key address, allowances, expiry, scope
 * 3. Receive auth_challenge from ClearNode
 * 4. Sign challenge with main wallet via EIP-712 typed data
 * 5. Send auth_verify with signed challenge
 * 6. Receive confirmation and store session state
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { WalletClient, Hex, LocalAccount } from 'viem';
import type { ClearNodeConnection } from './clear-node-connection.js';

// ============================================================================
// Local type stubs for @erc7824/nitrolite message factories
// These are defined locally since @erc7824/nitrolite is not installed.
// They mirror the expected API surface of the package.
// ============================================================================

/**
 * Signer function type used for signing messages.
 * Compatible with @erc7824/nitrolite's MessageSigner type.
 */
export type MessageSigner = (payload: Uint8Array) => Promise<Hex>;

/**
 * Parameters for creating an auth request message.
 */
interface AuthRequestParams {
  wallet: string;
  participant: string;
  allowances: Array<{ asset: string; amount: string }>;
  expire: number;
  scope: string;
}

/**
 * Auth challenge response from ClearNode.
 */
interface AuthChallengeResponse {
  method?: string;
  type?: string;
  challenge?: string;
  data?: {
    challenge?: string;
  };
}

/**
 * Auth verify confirmation response from ClearNode.
 */
interface AuthVerifyResponse {
  method?: string;
  type?: string;
  status?: string;
  data?: {
    status?: string;
    authenticated?: boolean;
  };
}

// ============================================================================
// Public Interfaces
// ============================================================================

/**
 * Parameters for authenticating with ClearNode.
 */
export interface AuthParams {
  /** Token allowances for the session */
  allowances: Array<{ asset: string; amount: string }>;
  /** Unix timestamp when the session expires. Default: now + 3600 seconds */
  expiresAt?: number;
  /** Application scope identifier. Default: "jack-kernel" */
  scope?: string;
}

/**
 * Information about the current authenticated session.
 */
export interface SessionInfo {
  /** The session key's Ethereum address */
  sessionAddress: string;
  /** Unix timestamp when the session expires */
  expiresAt: number;
  /** Whether the session is currently authenticated */
  authenticated: boolean;
}

// ============================================================================
// Message Factory Functions (local stubs for @erc7824/nitrolite)
// ============================================================================

/**
 * Create an auth_request message for ClearNode.
 *
 * This is a local implementation matching the @erc7824/nitrolite
 * createAuthRequestMessage API. It constructs a JSON-RPC style message
 * with the session key details and allowances.
 *
 * @param params - Auth request parameters
 * @returns JSON string of the auth_request message
 */
export function createAuthRequestMessage(params: AuthRequestParams): string {
  return JSON.stringify({
    method: 'auth_request',
    params: {
      wallet: params.wallet,
      participant: params.participant,
      allowances: params.allowances,
      expire: params.expire,
      scope: params.scope,
    },
  });
}

/**
 * Create an EIP-712 auth message signer using the provided wallet client.
 *
 * This is a local implementation matching the @erc7824/nitrolite
 * createEIP712AuthMessageSigner API. It returns a function that signs
 * a challenge string using EIP-712 typed data via the wallet client.
 *
 * The EIP-712 domain and types follow the Yellow Network auth protocol:
 * - Domain: { name: "Yellow ClearNode", version: "1" }
 * - Types: { Auth: [{ name: "challenge", type: "string" }] }
 *
 * @param walletClient - The viem WalletClient to sign with
 * @returns A function that takes a challenge string and returns the EIP-712 signature
 */
export function createEIP712AuthMessageSigner(
  walletClient: WalletClient
): (challenge: string) => Promise<Hex> {
  return async (challenge: string): Promise<Hex> => {
    const account = walletClient.account;
    if (!account) {
      throw new Error('WalletClient must have an account attached for EIP-712 signing');
    }

    const signature = await walletClient.signTypedData({
      account,
      domain: {
        name: 'Yellow ClearNode',
        version: '1',
      },
      types: {
        Auth: [{ name: 'challenge', type: 'string' }],
      },
      primaryType: 'Auth',
      message: {
        challenge,
      },
    });

    return signature;
  };
}

// ============================================================================
// SessionKeyManager
// ============================================================================

/** Default session expiry: 1 hour in seconds */
const DEFAULT_SESSION_EXPIRY = 3600;

/** Default application scope */
const DEFAULT_SCOPE = 'jack-kernel';

/** Timeout for auth messages in milliseconds */
const AUTH_TIMEOUT = 30_000;

/**
 * Manages session key generation, ClearNode authentication, and session lifecycle.
 *
 * The SessionKeyManager generates ephemeral session keypairs for signing offchain
 * messages, authenticates them with ClearNode via EIP-712, and tracks session expiry
 * to support automatic re-authentication when the session expires.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export class SessionKeyManager {
  private readonly walletClient: WalletClient;
  private readonly connection: ClearNodeConnection;

  private sessionAccount: LocalAccount | null = null;
  private sessionPrivateKey: Hex | null = null;
  private _sessionInfo: SessionInfo | null = null;
  private lastAuthParams: AuthParams | null = null;

  /**
   * @param walletClient - The main wallet's viem WalletClient for EIP-712 signing
   * @param connection - The ClearNodeConnection for sending/receiving auth messages
   */
  constructor(walletClient: WalletClient, connection: ClearNodeConnection) {
    this.walletClient = walletClient;
    this.connection = connection;
  }

  /**
   * Generate a session keypair and authenticate with ClearNode.
   *
   * Flow:
   * 1. Generate session keypair (Requirement 2.1)
   * 2. Send auth_request with session address, allowances, expiry, scope (Requirement 2.2)
   * 3. Receive auth_challenge from ClearNode
   * 4. Sign challenge with main wallet via EIP-712 (Requirement 2.3)
   * 5. Send auth_verify with signed challenge
   * 6. Receive confirmation and store session state (Requirement 2.4)
   *
   * @param params - Authentication parameters including allowances and optional expiry/scope
   * @returns Session information including address, expiry, and authentication status
   * @throws Error if authentication fails or times out (Requirement 2.5)
   */
  async authenticate(params: AuthParams): Promise<SessionInfo> {
    // Store params for potential re-authentication (Requirement 2.6)
    this.lastAuthParams = params;

    // Step 1: Generate session keypair (Requirement 2.1)
    this.sessionPrivateKey = generatePrivateKey();
    this.sessionAccount = privateKeyToAccount(this.sessionPrivateKey);

    const sessionAddress = this.sessionAccount.address;
    const walletAddress = this.walletClient.account?.address;

    if (!walletAddress) {
      throw new Error('WalletClient must have an account attached for authentication');
    }

    const expiresAt = params.expiresAt ?? Math.floor(Date.now() / 1000) + DEFAULT_SESSION_EXPIRY;
    const scope = params.scope ?? DEFAULT_SCOPE;

    // Step 2: Send auth_request (Requirement 2.2)
    const authRequestMsg = createAuthRequestMessage({
      wallet: walletAddress,
      participant: sessionAddress,
      allowances: params.allowances,
      expire: expiresAt,
      scope,
    });

    let challengeResponse: AuthChallengeResponse;
    try {
      challengeResponse = await this.connection.sendAndWait<AuthChallengeResponse>(
        authRequestMsg,
        'auth_challenge',
        AUTH_TIMEOUT
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Authentication failed: could not receive auth_challenge - ${message}`);
    }

    // Step 3: Extract challenge and sign with main wallet via EIP-712 (Requirement 2.3)
    const challenge = challengeResponse.challenge
      ?? challengeResponse.data?.challenge;

    if (!challenge || typeof challenge !== 'string') {
      throw new Error('Authentication failed: invalid auth_challenge response - missing challenge string');
    }

    const eip712Signer = createEIP712AuthMessageSigner(this.walletClient);

    let signature: Hex;
    try {
      signature = await eip712Signer(challenge);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Authentication failed: EIP-712 signing error - ${message}`);
    }

    // Step 4: Send auth_verify with signed challenge
    const authVerifyMsg = JSON.stringify({
      method: 'auth_verify',
      params: {
        participant: sessionAddress,
        signature,
        challenge,
      },
    });

    let verifyResponse: AuthVerifyResponse;
    try {
      verifyResponse = await this.connection.sendAndWait<AuthVerifyResponse>(
        authVerifyMsg,
        'auth_verify',
        AUTH_TIMEOUT
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Authentication failed: could not receive auth_verify confirmation - ${message}`);
    }

    // Step 5: Validate confirmation and store session state (Requirement 2.4)
    const isConfirmed =
      verifyResponse.data?.authenticated === true
      || verifyResponse.status === 'ok'
      || verifyResponse.data?.status === 'ok'
      || verifyResponse.data?.status === 'authenticated';

    if (!isConfirmed) {
      throw new Error('Authentication failed: ClearNode rejected the auth_verify request');
    }

    this._sessionInfo = {
      sessionAddress,
      expiresAt,
      authenticated: true,
    };

    return { ...this._sessionInfo };
  }

  /**
   * Check if the current session is valid and not expired.
   *
   * Returns false if:
   * - No session has been established
   * - The session has been invalidated
   * - The session has expired (Requirement 2.6)
   */
  get isAuthenticated(): boolean {
    if (!this._sessionInfo || !this._sessionInfo.authenticated) {
      return false;
    }

    // Check expiry (Requirement 2.6)
    const now = Math.floor(Date.now() / 1000);
    if (now >= this._sessionInfo.expiresAt) {
      // Session has expired - mark as not authenticated
      this._sessionInfo.authenticated = false;
      return false;
    }

    return true;
  }

  /**
   * Get the session signer function for signing offchain messages.
   *
   * The returned function signs arbitrary payloads using the session private key.
   * This is used for signing state channel messages without exposing the main wallet.
   *
   * @throws Error if no authenticated session exists
   */
  get sessionSigner(): MessageSigner {
    if (!this.sessionAccount) {
      throw new Error('No authenticated session - call authenticate() first');
    }

    const account = this.sessionAccount;
    return async (payload: Uint8Array): Promise<Hex> => {
      const signature = await account.signMessage({
        message: { raw: payload },
      });
      return signature;
    };
  }

  /**
   * Get the session key's Ethereum address.
   *
   * @throws Error if no session key has been generated
   */
  get sessionAddress(): string {
    if (!this.sessionAccount) {
      throw new Error('No session key generated - call authenticate() first');
    }
    return this.sessionAccount.address;
  }

  /**
   * Invalidate the current session.
   *
   * Clears all session state including the keypair and authentication status.
   * After invalidation, a new authenticate() call is required.
   */
  invalidate(): void {
    this.sessionAccount = null;
    this.sessionPrivateKey = null;
    this._sessionInfo = null;
  }

  /**
   * Re-authenticate using the last authentication parameters.
   *
   * This is called internally when a session has expired and a new operation
   * requires an active session (Requirement 2.6).
   *
   * @returns Session information from the new authentication
   * @throws Error if no previous auth params exist or re-authentication fails
   */
  async reauthenticate(): Promise<SessionInfo> {
    if (!this.lastAuthParams) {
      throw new Error('Cannot re-authenticate: no previous authentication parameters available');
    }

    // Invalidate current session before re-authenticating
    this.invalidate();

    return this.authenticate(this.lastAuthParams);
  }

  /**
   * Ensure the session is authenticated, re-authenticating if expired.
   *
   * This is a convenience method for use by other components that need
   * to ensure an active session before performing operations.
   *
   * Requirement 2.6: Auto-reauthentication on next operation when expired.
   *
   * @returns The current or newly created session info
   * @throws Error if authentication fails
   */
  async ensureAuthenticated(): Promise<SessionInfo> {
    if (this.isAuthenticated && this._sessionInfo) {
      return { ...this._sessionInfo };
    }

    // Session expired or not established - re-authenticate
    return this.reauthenticate();
  }
}
