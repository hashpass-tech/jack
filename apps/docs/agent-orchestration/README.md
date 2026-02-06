# Agent-Agnostic Task Orchestration System

## Kiro-Style Workflow Without Vendor Lock-in

This system implements a robust, standardized interface for task management across multiple AI agents. By treating agents like interchangeable backends, we eliminate vendor lock-in and ensure JACK's development can scale regardless of which tool is currently leading the market.

---

## Core Philosophy: The Agent Interface Pattern

The system follows a tiered architecture that separates planning from execution:

```mermaid
graph TD
    A[High-Level Planning (GitHub Projects)] --> B[Task Specification (JSON/YAML)]
    B --> C[Agent Interface Layer (Agnostic)]
    C --> D1[Kiro Backend]
    C --> D2[Claude Code Backend]
    C --> D3[Codex Backend]
    C --> D4[Cursor Backend]
    C --> D5[OpenClaw Backend (future)]
    D1 & D2 & D3 & D4 & D5 --> E[Output Verification Layer]
    E --> F[Back to GitHub (auto-close issues)]
```

**Key insight**: Treat agents like **HTTP backends** - standardize the interface, swap implementations.

---

## The Kiro Pattern

We adopt the highly effective Kiro workflow:
1.  **Requirement document**: Clear definition of what and why.
2.  **Task breakdown**: Atomic, verifiable units of work.
3.  **Agent execution**: Autonomous or assisted processing.
4.  **Verification**: Automated checks (compilation, tests, linting).
5.  **Feedback loop**: Retries or adjustments based on failure.

---

## Architecture

### Layer 1: Task Specification (.agent-tasks/)

All tasks are defined in version-controlled YAML files. This ensures that the context and requirements are always synchronized with the codebase.

Example Task (`.agent-tasks/day-1.yaml`):
```yaml
tasks:
  - id: "D1-CRIT-1"
    title: "Create JACKPolicyHook.sol skeleton"
    workspace: "contracts"
    requirement: |
      Create a Uniswap v4 hook contract that enforces slippage policies.
    acceptance:
      - "Contract compiles with forge build"
      - "Inherits from BaseHook"
    output:
      path: "contracts/src/JACKPolicyHook.sol"
    verify:
      - "cd contracts && forge build"
```

### Layer 2: Universal Agent Runner (scripts/agent-runner.ts)

The runner acts as the central orchestrator. It parses tasks, selects the appropriate agent backend based on availability or preference, and executes the lifecycle.

Supported Backends:
- **Kiro**: Full autonomous integration via API.
- **Claude Code**: High-performance CLI integration.
- **Codex**: Per-issue solver (best with explicit `workspace` + `verify`).
- **Cursor**: Directed prompts for manual Composer execution.
- **OpenClaw**: Placeholder for open-source autonomous execution.

---

## How to Use

### 1. Define Your Tasks
Create a YAML file in `.agent-tasks/` following the schema.

### 2. Run the Orchestrator
```bash
# Execute all tasks in a file
pnpm agent:run .agent-tasks/day-1.yaml

# Execute one task (per-issue solver)
pnpm agent:run .agent-tasks/day-1.yaml --task GH-1

# Target a specific agent
PREFERRED_AGENT=kiro pnpm agent:run .agent-tasks/day-1.yaml
```

### 3. Verification & Commitment
The runner can optionally:
1. Run task-level verification commands (`verify:`) when `--verify` is passed.
2. Create a git commit per task (disable with `--no-commit`).

See:
- `apps/docs/codex-issue-solver.md`
- `docker/agent-env/README.md`

---

## Monitoring (The Agent Dashboard)

Use the TUI dashboard to monitor multiple agents working in parallel:
```bash
pnpm agent:dashboard
```

---

## Cost & Performance Tracking

Every execution logs:
- **Duration**: How long the agent took to solve the task.
- **Success Rate**: Automated verification results.
- **Cost**: Estimated USD/Token consumption per agent.

This data allows the team to optimize agent selection for specialized tasks (e.g., using cheaper agents for boilerplate and premium ones for security logic).
