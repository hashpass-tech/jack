# JACKKERNEL Agent Execution Workflow

This document describes the step-by-step process for agents to pick, work on, and resolve issues, including cost tracking at each stage.

---

## 1. Issue Selection
- Agents (or maintainers) select an issue from the GitHub project board (Backlog or Ready).
- Create a new branch from `main` using the convention: `issue/<issue-id>-<short-description>`.

## 2. Task Assignment
- Define tasks in `.agent-tasks/*.yaml` (GitHub-synced via `pnpm agent:sync <label>` or hand-written).
- For Codex-first execution, keep tasks **small and per-issue** and include:
  - `workspace`: `contracts | sdk | ui | general`
  - `verify`: commands to validate the change (run with `pnpm agent:run ... --verify`)
- Specify which agent/backend is preferred via `PREFERRED_AGENT` or per-task `agent_config.preferred`.

## 2.1 Reproducible Environments (Docker)
- Use `docker/agent-env/` to run tasks in consistent toolchains (contracts/sdk/ui).
- Do not bake secrets into images; inject them at runtime.

## 3. Implementation
- Agents work on tasks as defined in the spec and task files.
- All code, config, and documentation changes are committed to the issue branch.
- Use the cost tracker (`scripts/cost-tracker.ts`) to log every API call, agent action, and compute time.

## 4. Cost and Budget Checks
- Periodically run the budget analysis script (`scripts/budget-analysis.ts`) to check total cost vs. budget.
- If over budget, alert and require review before further work.

## 5. Review and Merge
- When tasks are complete, open a PR to `main`.
- PR must reference the issue ID and pass automated checks.
- At least one agent or human must review the PR.
- Merge only if within budget or with explicit approval if over budget.

## 6. Monitoring and Feedback
- Update dashboards and logs with progress, cost, and agent performance.
- Use feedback to improve future task breakdowns and agent assignments.

---

This workflow ensures traceability, cost control, and efficient use of multi-agent resources for JACKKERNEL development.
