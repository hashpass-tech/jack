---
title: Agent Interface Philosophy
sidebar_position: 2
---

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
    C --> D3[Cursor Backend]
    C --> D4[OpenClaw Backend]
    D1 & D2 & D3 & D4 --> E[Output Verification Layer]
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

## How to Use

### 1. Define Your Tasks
Create a YAML file in `.agent-tasks/` following the schema.

### 2. Run the Orchestrator
```bash
# Execute all tasks in a file
pnpm agent:run .agent-tasks/day-1.yaml

# Target a specific agent
PREFERRED_AGENT=kiro pnpm agent:run .agent-tasks/day-1.yaml
```

### 3. Verification & Commitment
The system automatically:
1. Runs verification scripts (e.g., `forge build`).
2. Creates a git commit with the agent's log.
3. References and closes relevant GitHub issues.

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
