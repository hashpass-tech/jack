import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'intents-store.json');

/**
 * Validates that an intentId is safe to use as an object property key.
 * Prevents prototype pollution by rejecting dangerous keys.
 * @param intentId - The intent ID to validate (accepts any type for runtime safety)
 * @returns true if the intentId is safe, false otherwise
 */
export function isValidIntentId(intentId: unknown): intentId is string {
    return (
        typeof intentId === 'string' &&
        intentId.length > 0 &&
        intentId !== '__proto__' &&
        intentId !== 'constructor' &&
        intentId !== 'prototype'
    );
}

export function getIntents(): Record<string, Record<string, unknown>> {
    if (!fs.existsSync(STORE_PATH)) {
        return {};
    }
    const data = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(data) as Record<string, Record<string, unknown>>;
}

export function saveIntent(intentId: string, intent: Record<string, unknown>): void {
    if (!isValidIntentId(intentId)) {
        throw new Error('Invalid intent identifier');
    }
    const intents = getIntents();
    intents[intentId] = intent;
    fs.writeFileSync(STORE_PATH, JSON.stringify(intents, null, 2));
}

export function getIntent(intentId: string): Record<string, unknown> | undefined {
    if (!isValidIntentId(intentId)) {
        return undefined;
    }
    const intents = getIntents();
    return intents[intentId];
}
