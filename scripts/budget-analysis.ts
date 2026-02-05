// budget-analysis.ts
// Estimates costs for each agent/API per issue, checks thresholds, and generates reports.

import * as fs from 'fs';
import * as path from 'path';

const COSTS_DIR = path.join(__dirname, '../costs');
const BUDGET_FILE = path.join(__dirname, '../config/budget.json');

export function getBudget(issueId: string): number {
  if (!fs.existsSync(BUDGET_FILE)) return 0;
  const budgets = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf-8'));
  return budgets[issueId] || 0;
}

export function getTotalCost(issueId: string): number {
  const file = path.join(COSTS_DIR, `cost-${issueId}.json`);
  if (!fs.existsSync(file)) return 0;
  const entries = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return entries.reduce((sum: number, e: any) => sum + e.cost, 0);
}

export function isOverBudget(issueId: string): boolean {
  return getTotalCost(issueId) > getBudget(issueId);
}

export function generateReport(issueId: string): string {
  const total = getTotalCost(issueId);
  const budget = getBudget(issueId);
  const over = total > budget;
  return `Issue: ${issueId}\nTotal Cost: $${total.toFixed(2)}\nBudget: $${budget.toFixed(2)}\nStatus: ${over ? 'OVER BUDGET' : 'Within Budget'}`;
}

export function alertIfOverBudget(issueId: string) {
  if (isOverBudget(issueId)) {
    console.warn(`ALERT: Issue ${issueId} is over budget!`);
  }
}
