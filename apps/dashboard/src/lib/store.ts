import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'intents-store.json');

export function getIntents(): Record<string, Record<string, unknown>> {
    if (!fs.existsSync(STORE_PATH)) {
        return {};
    }
    const data = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(data) as Record<string, Record<string, unknown>>;
}

export function saveIntent(intentId: string, intent: Record<string, unknown>): void {
    const intents = getIntents();
    intents[intentId] = intent;
    fs.writeFileSync(STORE_PATH, JSON.stringify(intents, null, 2));
}

export function getIntent(intentId: string): Record<string, unknown> | undefined {
    const intents = getIntents();
    return intents[intentId];
}
