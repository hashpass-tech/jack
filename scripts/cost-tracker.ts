// cost-tracker.ts
// Logs API calls, agent usage, and compute time per issue/branch.
// Usage: Import and call logCost(issueId, agent, api, cost, details)

import * as fs from 'fs';
import * as path from 'path';

const COSTS_DIR = path.join(__dirname, '../costs');

export interface CostEntry {
  timestamp: string;
  agent: string;
  api: string;
  cost: number;
  details?: string;
}

export function logCost(issueId: string, agent: string, api: string, cost: number, details?: string) {
  const file = path.join(COSTS_DIR, `cost-${issueId}.json`);
  let entries: CostEntry[] = [];
  if (fs.existsSync(file)) {
    entries = JSON.parse(fs.readFileSync(file, 'utf-8'));
  }
  entries.push({
    timestamp: new Date().toISOString(),
    agent,
    api,
    cost,
    details
  });
  fs.writeFileSync(file, JSON.stringify(entries, null, 2));
}

export function getTotalCost(issueId: string): number {
  const file = path.join(COSTS_DIR, `cost-${issueId}.json`);
  if (!fs.existsSync(file)) return 0;
  const entries: CostEntry[] = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return entries.reduce((sum, e) => sum + e.cost, 0);
}
