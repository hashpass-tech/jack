# Branching Strategy and Conventions for JACKKERNEL Issue Resolution

## Branch Naming Convention
- Each critical issue gets a dedicated branch.
- Branch name format: `issue/<issue-id>-<short-description>`
  - Example: `issue/D1-CRIT-A1-uniswap-hook`
- Use lowercase, hyphens for spaces, and keep descriptions concise.

## Workflow
1. When an issue is picked, create a branch from `main` using the above convention.
2. All commits related to the issue must go to this branch.
3. When work is complete, open a Pull Request (PR) to `main`.
4. PR title should reference the issue ID and summary.
5. PR must pass automated checks and at least one agent/human review.
6. Merge only after cost and budget checks are complete.

## Agent Assignment and API Integration
- Use `PREFERRED_AGENT` (or per-task `agent_config.preferred`) to select an execution backend (`kiro | claude-code | codex | cursor`).
- Prefer **Codex as a per-issue solver** for most workstreams (contracts, SDK, UI).
- Keep tasks in `.agent-tasks/*.yaml` (synced via `pnpm agent:sync <label>`); run one issue/task via `pnpm agent:run ... --task <id>`.
- Include `workspace` + `verify` in tasks to enable reproducible Docker toolchains and explicit verification (`pnpm agent:run ... --verify`).

## Cost Tracking and Budget Analysis
- Implement a `cost-tracker.ts` module in `scripts/`.
- Log API calls, agent usage, and compute time per branch/issue.
- Store cost data in `costs/cost-<issue-id>.json`.
- Set budget thresholds in `config/budget.json`.
- Alert on overruns and require review before merging PRs that exceed budget.

## Example Directory Structure
```
/branches/
  issue/D1-CRIT-A1-uniswap-hook
  issue/D1-CRIT-B1-api-orchestrator
/scripts/
  cost-tracker.ts
/costs/
  cost-D1-CRIT-A1.json
/config/
  budget.json
```

---
This document standardizes the branching, agent assignment, and cost tracking conventions for JACKKERNEL critical issue resolution.
