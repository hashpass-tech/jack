/**
 * Property-based tests for Session Key Management
 *
 * Feature: yellow-network-integration
 * Property 2: Session keypairs are unique
 *
 * Tests that for any N >= 2 session key generation requests,
 * all generated session addresses are distinct.
 *
 * Validates: Requirements 2.1
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// ============================================================================
// Generators
// ============================================================================

/**
 * Generates a count N >= 2 of session keys to generate.
 * Constrained to 2–20 to keep test execution time reasonable
 * while still exercising the uniqueness property meaningfully.
 */
const arbKeyCount = fc.integer({ min: 2, max: 20 });

// ============================================================================
// Property 2: Session keypairs are unique
// ============================================================================

describe('Feature: yellow-network-integration, Property 2: Session keypairs are unique', () => {
  /**
   * **Validates: Requirements 2.1**
   *
   * For any N >= 2 session key generation requests using viem's
   * generatePrivateKey + privateKeyToAccount, all resulting addresses
   * are distinct from each other.
   */
  it('all generated session addresses are distinct for any N >= 2', () => {
    fc.assert(
      fc.property(arbKeyCount, (n) => {
        const addresses: string[] = [];

        for (let i = 0; i < n; i++) {
          const privateKey = generatePrivateKey();
          const account = privateKeyToAccount(privateKey);
          addresses.push(account.address);
        }

        // All addresses must be unique
        const uniqueAddresses = new Set(addresses);
        expect(uniqueAddresses.size).toBe(n);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.1**
   *
   * For any N >= 2 session key generation requests, all generated
   * private keys are distinct from each other (stronger uniqueness
   * guarantee at the key level).
   */
  it('all generated private keys are distinct for any N >= 2', () => {
    fc.assert(
      fc.property(arbKeyCount, (n) => {
        const privateKeys: string[] = [];

        for (let i = 0; i < n; i++) {
          const privateKey = generatePrivateKey();
          privateKeys.push(privateKey);
        }

        // All private keys must be unique
        const uniqueKeys = new Set(privateKeys);
        expect(uniqueKeys.size).toBe(n);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.1**
   *
   * For any generated session keypair, the resulting address is a
   * valid Ethereum address (0x-prefixed, 42 characters, hex).
   */
  it('each generated session address is a valid Ethereum address', () => {
    fc.assert(
      fc.property(arbKeyCount, (n) => {
        for (let i = 0; i < n; i++) {
          const privateKey = generatePrivateKey();
          const account = privateKeyToAccount(privateKey);
          const address = account.address;

          // Valid Ethereum address: 0x prefix + 40 hex characters
          expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ============================================================================
// Property 3: Auth request message contains required fields
// ============================================================================

import { createAuthRequestMessage } from '../../src/yellow/session-key-manager.js';

/**
 * Generates a valid Ethereum address: 0x + 40 hex characters.
 */
const arbEthAddress = fc
  .hexaString({ minLength: 40, maxLength: 40 })
  .map((hex) => `0x${hex}`);

/**
 * Generates a single token allowance with an asset address and a positive amount string.
 */
const arbAllowance = fc.record({
  asset: arbEthAddress,
  amount: fc.bigUintN(128).map((n) => (n + 1n).toString()),
});

/**
 * Generates an array of 0–10 token allowances.
 */
const arbAllowances = fc.array(arbAllowance, { minLength: 0, maxLength: 10 });

/**
 * Generates a valid future expiry timestamp (unix seconds).
 * Range: current time to ~year 2100.
 */
const arbExpiry = fc.integer({ min: Math.floor(Date.now() / 1000), max: 4_102_444_800 });

/**
 * Generates a non-empty scope string (alphanumeric + hyphens).
 */
const arbScope = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), {
    minLength: 1,
    maxLength: 30,
  });

describe('Feature: yellow-network-integration, Property 3: Auth request message contains required fields', () => {
  /**
   * **Validates: Requirements 2.2**
   *
   * For any set of token allowances and expiry timestamp, the auth_request
   * message contains the session key address (participant), allowances,
   * expiry, and scope.
   */
  it('auth_request message contains participant, allowances, expiry, and scope for any inputs', () => {
    fc.assert(
      fc.property(
        arbEthAddress,
        arbEthAddress,
        arbAllowances,
        arbExpiry,
        arbScope,
        (wallet, participant, allowances, expire, scope) => {
          const message = createAuthRequestMessage({
            wallet,
            participant,
            allowances,
            expire,
            scope,
          });

          // Must be valid JSON
          const parsed = JSON.parse(message);

          // Method must be auth_request
          expect(parsed.method).toBe('auth_request');

          // params must exist
          expect(parsed.params).toBeDefined();

          // Must contain wallet address
          expect(parsed.params.wallet).toBe(wallet);

          // Must contain session key address (participant)
          expect(parsed.params.participant).toBe(participant);

          // Must contain allowances matching input
          expect(parsed.params.allowances).toEqual(allowances);

          // Must contain expiry timestamp
          expect(parsed.params.expire).toBe(expire);

          // Must contain scope
          expect(parsed.params.scope).toBe(scope);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.2**
   *
   * For any auth_request message, the params object contains exactly
   * the five required fields: wallet, participant, allowances, expire, scope.
   */
  it('auth_request params contain exactly the required fields', () => {
    fc.assert(
      fc.property(
        arbEthAddress,
        arbEthAddress,
        arbAllowances,
        arbExpiry,
        arbScope,
        (wallet, participant, allowances, expire, scope) => {
          const message = createAuthRequestMessage({
            wallet,
            participant,
            allowances,
            expire,
            scope,
          });

          const parsed = JSON.parse(message);
          const paramKeys = Object.keys(parsed.params).sort();

          expect(paramKeys).toEqual(['allowances', 'expire', 'participant', 'scope', 'wallet']);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.2**
   *
   * For any auth_request message with non-empty allowances, each allowance
   * in the message preserves the asset address and amount from the input.
   */
  it('auth_request preserves each allowance asset and amount', () => {
    const arbNonEmptyAllowances = fc.array(arbAllowance, { minLength: 1, maxLength: 10 });

    fc.assert(
      fc.property(
        arbEthAddress,
        arbEthAddress,
        arbNonEmptyAllowances,
        arbExpiry,
        arbScope,
        (wallet, participant, allowances, expire, scope) => {
          const message = createAuthRequestMessage({
            wallet,
            participant,
            allowances,
            expire,
            scope,
          });

          const parsed = JSON.parse(message);

          expect(parsed.params.allowances).toHaveLength(allowances.length);

          for (let i = 0; i < allowances.length; i++) {
            expect(parsed.params.allowances[i].asset).toBe(allowances[i].asset);
            expect(parsed.params.allowances[i].amount).toBe(allowances[i].amount);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
