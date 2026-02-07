/**
 * Unit tests for CostTracker
 * 
 * Tests the CostTracker class methods for querying execution costs and budgets.
 * Validates Requirements 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CostTracker } from '../../src/costs.js';
import { JackClient } from '../../src/client.js';
import { APIError, NetworkError } from '../../src/errors.js';
import type { CostsResponse, IssueCost } from '../../src/types.js';

describe('CostTracker', () => {
  let mockClient: JackClient;
  let tracker: CostTracker;

  const mockCostsResponse: CostsResponse = {
    issueCosts: [
      {
        issueId: 'ISSUE-001',
        totalCost: 100,
        budget: 150,
        overBudget: false,
      },
      {
        issueId: 'ISSUE-002',
        totalCost: 200,
        budget: 180,
        overBudget: true,
      },
      {
        issueId: 'ISSUE-003',
        totalCost: 50,
        budget: 100,
        overBudget: false,
      },
      {
        issueId: 'ISSUE-004',
        totalCost: 300,
        budget: 250,
        overBudget: true,
      },
    ],
  };

  beforeEach(() => {
    // Create a real client instance for testing
    mockClient = new JackClient({
      baseUrl: 'https://api.jack.test',
      timeout: 5000,
      maxRetries: 0, // Disable retries for unit tests
    });

    tracker = new CostTracker(mockClient);
  });

  describe('constructor', () => {
    it('should create a CostTracker instance', () => {
      expect(tracker).toBeInstanceOf(CostTracker);
    });

    it('should accept a JackClient instance', () => {
      const client = new JackClient({ baseUrl: 'https://api.jack.test' });
      const costTracker = new CostTracker(client);
      expect(costTracker).toBeInstanceOf(CostTracker);
    });
  });

  describe('getCosts', () => {
    it('should make GET request to /api/costs', async () => {
      const getSpy = vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      const costs = await tracker.getCosts();

      expect(getSpy).toHaveBeenCalledWith('/api/costs');
      expect(costs).toEqual(mockCostsResponse);
    });

    it('should return CostsResponse with issueCosts array (Requirement 4.1)', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      const costs = await tracker.getCosts();

      expect(costs).toHaveProperty('issueCosts');
      expect(Array.isArray(costs.issueCosts)).toBe(true);
      expect(costs.issueCosts.length).toBe(4);
    });

    it('should return properly typed IssueCost objects', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      const costs = await tracker.getCosts();

      costs.issueCosts.forEach((issueCost) => {
        expect(issueCost).toHaveProperty('issueId');
        expect(issueCost).toHaveProperty('totalCost');
        expect(issueCost).toHaveProperty('budget');
        expect(issueCost).toHaveProperty('overBudget');
        expect(typeof issueCost.issueId).toBe('string');
        expect(typeof issueCost.totalCost).toBe('number');
        expect(typeof issueCost.budget).toBe('number');
        expect(typeof issueCost.overBudget).toBe('boolean');
      });
    });

    it('should handle empty issueCosts array', async () => {
      const emptyResponse: CostsResponse = {
        issueCosts: [],
      };

      vi.spyOn(mockClient, 'get').mockResolvedValue(emptyResponse);

      const costs = await tracker.getCosts();

      expect(costs.issueCosts).toEqual([]);
      expect(costs.issueCosts.length).toBe(0);
    });

    it('should propagate API errors', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new APIError('Server error', 500)
      );

      await expect(tracker.getCosts()).rejects.toThrow(APIError);
    });

    it('should propagate network errors', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new NetworkError('Connection failed', new Error('Network error'))
      );

      await expect(tracker.getCosts()).rejects.toThrow(NetworkError);
    });

    it('should handle 404 errors', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new APIError('Not found', 404)
      );

      await expect(tracker.getCosts()).rejects.toThrow(APIError);
    });
  });

  describe('getIssueCost', () => {
    it('should filter costs by issueId (Requirement 4.2)', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      const issueCost = await tracker.getIssueCost('ISSUE-002');

      expect(issueCost).not.toBeNull();
      expect(issueCost?.issueId).toBe('ISSUE-002');
      expect(issueCost?.totalCost).toBe(200);
      expect(issueCost?.budget).toBe(180);
      expect(issueCost?.overBudget).toBe(true);
    });

    it('should return null for non-existent issueId', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      const issueCost = await tracker.getIssueCost('ISSUE-999');

      expect(issueCost).toBeNull();
    });

    it('should return first matching issue if multiple exist', async () => {
      const duplicateResponse: CostsResponse = {
        issueCosts: [
          {
            issueId: 'ISSUE-001',
            totalCost: 100,
            budget: 150,
            overBudget: false,
          },
          {
            issueId: 'ISSUE-001',
            totalCost: 200,
            budget: 150,
            overBudget: true,
          },
        ],
      };

      vi.spyOn(mockClient, 'get').mockResolvedValue(duplicateResponse);

      const issueCost = await tracker.getIssueCost('ISSUE-001');

      expect(issueCost).not.toBeNull();
      expect(issueCost?.totalCost).toBe(100);
    });

    it('should return null when issueCosts array is empty', async () => {
      const emptyResponse: CostsResponse = {
        issueCosts: [],
      };

      vi.spyOn(mockClient, 'get').mockResolvedValue(emptyResponse);

      const issueCost = await tracker.getIssueCost('ISSUE-001');

      expect(issueCost).toBeNull();
    });

    it('should make GET request to /api/costs', async () => {
      const getSpy = vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      await tracker.getIssueCost('ISSUE-001');

      expect(getSpy).toHaveBeenCalledWith('/api/costs');
    });

    it('should propagate API errors', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new APIError('Server error', 500)
      );

      await expect(tracker.getIssueCost('ISSUE-001')).rejects.toThrow(APIError);
    });

    it('should propagate network errors', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new NetworkError('Connection failed', new Error('Network error'))
      );

      await expect(tracker.getIssueCost('ISSUE-001')).rejects.toThrow(NetworkError);
    });

    it('should handle case-sensitive issueId matching', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      const lowerCase = await tracker.getIssueCost('issue-001');
      const upperCase = await tracker.getIssueCost('ISSUE-001');

      expect(lowerCase).toBeNull();
      expect(upperCase).not.toBeNull();
    });
  });

  describe('getOverBudgetIssues', () => {
    it('should filter issues by overBudget flag (Requirement 4.2)', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      const overBudget = await tracker.getOverBudgetIssues();

      expect(Array.isArray(overBudget)).toBe(true);
      expect(overBudget.length).toBe(2);
      expect(overBudget[0].issueId).toBe('ISSUE-002');
      expect(overBudget[1].issueId).toBe('ISSUE-004');
    });

    it('should return only issues with overBudget=true', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      const overBudget = await tracker.getOverBudgetIssues();

      overBudget.forEach((issue) => {
        expect(issue.overBudget).toBe(true);
      });
    });

    it('should return empty array when no issues are over budget', async () => {
      const noBudgetIssues: CostsResponse = {
        issueCosts: [
          {
            issueId: 'ISSUE-001',
            totalCost: 100,
            budget: 150,
            overBudget: false,
          },
          {
            issueId: 'ISSUE-002',
            totalCost: 50,
            budget: 100,
            overBudget: false,
          },
        ],
      };

      vi.spyOn(mockClient, 'get').mockResolvedValue(noBudgetIssues);

      const overBudget = await tracker.getOverBudgetIssues();

      expect(overBudget).toEqual([]);
      expect(overBudget.length).toBe(0);
    });

    it('should return empty array when issueCosts is empty', async () => {
      const emptyResponse: CostsResponse = {
        issueCosts: [],
      };

      vi.spyOn(mockClient, 'get').mockResolvedValue(emptyResponse);

      const overBudget = await tracker.getOverBudgetIssues();

      expect(overBudget).toEqual([]);
      expect(overBudget.length).toBe(0);
    });

    it('should return all issues when all are over budget', async () => {
      const allOverBudget: CostsResponse = {
        issueCosts: [
          {
            issueId: 'ISSUE-001',
            totalCost: 200,
            budget: 150,
            overBudget: true,
          },
          {
            issueId: 'ISSUE-002',
            totalCost: 300,
            budget: 250,
            overBudget: true,
          },
        ],
      };

      vi.spyOn(mockClient, 'get').mockResolvedValue(allOverBudget);

      const overBudget = await tracker.getOverBudgetIssues();

      expect(overBudget.length).toBe(2);
      expect(overBudget[0].overBudget).toBe(true);
      expect(overBudget[1].overBudget).toBe(true);
    });

    it('should make GET request to /api/costs', async () => {
      const getSpy = vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      await tracker.getOverBudgetIssues();

      expect(getSpy).toHaveBeenCalledWith('/api/costs');
    });

    it('should propagate API errors', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new APIError('Server error', 500)
      );

      await expect(tracker.getOverBudgetIssues()).rejects.toThrow(APIError);
    });

    it('should propagate network errors', async () => {
      vi.spyOn(mockClient, 'get').mockRejectedValue(
        new NetworkError('Connection failed', new Error('Network error'))
      );

      await expect(tracker.getOverBudgetIssues()).rejects.toThrow(NetworkError);
    });

    it('should preserve all properties of over-budget issues', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      const overBudget = await tracker.getOverBudgetIssues();

      expect(overBudget[0]).toEqual({
        issueId: 'ISSUE-002',
        totalCost: 200,
        budget: 180,
        overBudget: true,
      });
      expect(overBudget[1]).toEqual({
        issueId: 'ISSUE-004',
        totalCost: 300,
        budget: 250,
        overBudget: true,
      });
    });
  });

  describe('integration scenarios', () => {
    it('should support querying all costs then filtering specific issue', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      // Get all costs
      const allCosts = await tracker.getCosts();
      expect(allCosts.issueCosts.length).toBe(4);

      // Get specific issue
      const issueCost = await tracker.getIssueCost('ISSUE-002');
      expect(issueCost?.issueId).toBe('ISSUE-002');
    });

    it('should support checking for over-budget issues', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      // Get over-budget issues
      const overBudget = await tracker.getOverBudgetIssues();
      expect(overBudget.length).toBe(2);

      // Verify specific issue is over budget
      const issue002 = await tracker.getIssueCost('ISSUE-002');
      expect(issue002?.overBudget).toBe(true);
    });

    it('should handle workflow: check all costs, identify over-budget, get details', async () => {
      vi.spyOn(mockClient, 'get').mockResolvedValue(mockCostsResponse);

      // Step 1: Get all costs
      const costs = await tracker.getCosts();
      expect(costs.issueCosts.length).toBeGreaterThan(0);

      // Step 2: Identify over-budget issues
      const overBudget = await tracker.getOverBudgetIssues();
      expect(overBudget.length).toBe(2);

      // Step 3: Get details for each over-budget issue
      for (const issue of overBudget) {
        const details = await tracker.getIssueCost(issue.issueId);
        expect(details).not.toBeNull();
        expect(details?.overBudget).toBe(true);
        expect(details?.totalCost).toBeGreaterThan(details?.budget || 0);
      }
    });
  });
});
