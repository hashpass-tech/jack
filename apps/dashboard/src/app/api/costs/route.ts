import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

interface CostEntry {
  cost: number;
}

interface IssueCost {
  issueId: string;
  totalCost: number;
  budget: number;
  overBudget: boolean;
}

const COSTS_DIR = path.join(process.cwd(), 'costs');
const BUDGET_FILE = path.join(process.cwd(), 'config', 'budget.json');

const readIssueCosts = (): IssueCost[] => {
  const budgets: Record<string, number> = fs.existsSync(BUDGET_FILE)
    ? JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf-8'))
    : {};

  if (!fs.existsSync(COSTS_DIR)) {
    return [];
  }

  return fs.readdirSync(COSTS_DIR)
    .filter((filename) => filename.startsWith('cost-') && filename.endsWith('.json'))
    .map((filename) => {
      const issueId = filename.replace('cost-', '').replace('.json', '');
      const filePath = path.join(COSTS_DIR, filename);
      const entries: CostEntry[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const totalCost = entries.reduce((sum, entry) => sum + entry.cost, 0);
      const budget = budgets[issueId] ?? 0;
      return {
        issueId,
        totalCost,
        budget,
        overBudget: totalCost > budget
      };
    });
};

export function GET() {
  return NextResponse.json({ issueCosts: readIssueCosts() });
}
