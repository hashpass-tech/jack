/**
 * Cost tracking module for JACK SDK
 * 
 * Provides methods to query execution costs and budgets.
 * Validates Requirements 4.1, 4.2
 */

import type { JackClient } from './client.js';
import type { CostsResponse, IssueCost } from './types.js';

/**
 * CostTracker class for querying execution costs and budgets
 * 
 * @example
 * ```typescript
 * const tracker = new CostTracker(client);
 * const costs = await tracker.getCosts();
 * const issueCost = await tracker.getIssueCost('ISSUE-123');
 * const overBudget = await tracker.getOverBudgetIssues();
 * ```
 */
export class CostTracker {
  constructor(private readonly client: JackClient) {}

  /**
   * Get all issue costs from the API
   * 
   * Makes a GET request to /api/costs and returns the complete response
   * with cost data for all issues.
   * 
   * @returns Promise resolving to CostsResponse with all issue costs
   * @throws {APIError} If the API request fails
   * @throws {NetworkError} If network connection fails
   * 
   * @example
   * ```typescript
   * const costs = await tracker.getCosts();
   * console.log(`Found ${costs.issueCosts.length} issues`);
   * ```
   * 
   * Validates Requirement 4.1
   */
  async getCosts(): Promise<CostsResponse> {
    return this.client.get<CostsResponse>('/api/costs');
  }

  /**
   * Get costs for a specific issue
   * 
   * Fetches all costs and filters by the specified issue ID.
   * Returns null if the issue is not found.
   * 
   * @param issueId - The issue identifier to filter by
   * @returns Promise resolving to IssueCost or null if not found
   * @throws {APIError} If the API request fails
   * @throws {NetworkError} If network connection fails
   * 
   * @example
   * ```typescript
   * const issueCost = await tracker.getIssueCost('ISSUE-123');
   * if (issueCost) {
   *   console.log(`Total cost: ${issueCost.totalCost}`);
   *   console.log(`Budget: ${issueCost.budget}`);
   *   console.log(`Over budget: ${issueCost.overBudget}`);
   * }
   * ```
   * 
   * Validates Requirement 4.2
   */
  async getIssueCost(issueId: string): Promise<IssueCost | null> {
    const response = await this.getCosts();
    const issueCost = response.issueCosts.find(
      (cost) => cost.issueId === issueId
    );
    return issueCost ?? null;
  }

  /**
   * Get all issues that are over budget
   * 
   * Fetches all costs and filters to only those with overBudget flag set to true.
   * Returns an empty array if no issues are over budget.
   * 
   * @returns Promise resolving to array of IssueCost objects that are over budget
   * @throws {APIError} If the API request fails
   * @throws {NetworkError} If network connection fails
   * 
   * @example
   * ```typescript
   * const overBudget = await tracker.getOverBudgetIssues();
   * if (overBudget.length > 0) {
   *   console.log(`Warning: ${overBudget.length} issues are over budget`);
   *   overBudget.forEach(issue => {
   *     console.log(`${issue.issueId}: ${issue.totalCost} / ${issue.budget}`);
   *   });
   * }
   * ```
   * 
   * Validates Requirement 4.2
   */
  async getOverBudgetIssues(): Promise<IssueCost[]> {
    const response = await this.getCosts();
    return response.issueCosts.filter((cost) => cost.overBudget);
  }
}
