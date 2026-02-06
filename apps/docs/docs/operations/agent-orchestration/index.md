---
title: Agent Orchestration
sidebar_position: 1
---

# Agent Orchestration System

The JACK project uses a flexible agent orchestration system that supports multiple AI coding assistants (Kiro, Claude Code, Antigravity, etc.) through a unified spec-based workflow.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Spec System (Kiro-style)](#spec-system-kiro-style)
4. [Task System (YAML-based)](#task-system-yaml-based)
5. [Agent Configuration](#agent-configuration)
6. [GitHub Integration](#github-integration)
7. [Usage Guide](#usage-guide)
8. [Environment Readiness](#environment-readiness)
9. [Extending the System](#extending-the-system)

---

## Overview

The agent orchestration system provides two complementary approaches for managing development tasks:

| System | Format | Best For | Agent Support |
|--------|--------|----------|---------------|
| **Spec System** | Markdown (`.kiro/specs/`) | Feature development, structured workflows | Kiro, Antigravity, any markdown-aware agent |
| **Task System** | YAML (`.agent-tasks/`) | CI/CD automation, GitHub sync | Claude Code, automated pipelines |

Both systems can be used together:
- **Specs** for human-readable feature documentation
- **Tasks** for machine-executable automation

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JACK Agent Orchestration                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────┐         ┌───────────────────┐                      │
│   │   GitHub Issues   │◄───────►│   GitHub Project  │                      │
│   └─────────┬─────────┘         └───────────────────┘                      │
│             │                                                               │
│             ▼ pnpm agent:sync                                               │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                    .agent-tasks/                                   │    │
│   │   ├── tasks.yaml        (manual tasks)                            │    │
│   │   └── day-1.yaml        (synced from GitHub)                      │    │
│   └────────────────────────────┬──────────────────────────────────────┘    │
│                                │                                            │
│             ┌──────────────────┴──────────────────┐                        │
│             │         Agent Selection             │                        │
│             │  (PREFERRED_AGENT env var)          │                        │
│             └──────────────────┬──────────────────┘                        │
│                                │                                            │
│         ┌──────────────────────┼──────────────────────┐                    │
│         ▼                      ▼                      ▼                    │
│   ┌───────────┐          ┌───────────┐          ┌───────────┐              │
│   │   Kiro    │          │Claude Code│          │Antigravity│              │
│   │  IDE/API  │          │    CLI    │          │  (VS Code)│              │
│   └─────┬─────┘          └─────┬─────┘          └─────┬─────┘              │
│         │                      │                      │                    │
│         └──────────────────────┼──────────────────────┘                    │
│                                ▼                                            │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                       .kiro/specs/                                │    │
│   │   └── <spec_name>/                                                │    │
│   │       ├── requirements.md   (user stories, acceptance criteria)  │    │
│   │       ├── design.md         (architecture, technical decisions)  │    │
│   │       └── tasks.md          (phased task list with status)       │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Spec System (Kiro-style)

The spec system (`/.kiro/`) provides a Kiro-inspired workflow for feature development with structured documentation. For a full breakdown, see the [Spec System](../spec-system) guide.

## Task System (YAML-based)

The task system (`/.agent-tasks/`) provides machine-readable task definitions for automation.

### Task Schema

```yaml
version: "1.0"
project: "JACK"
sprint: "day-1"

tasks:
  - id: "TASK-1"
    title: "Task Title"
    type: "code_generation"  # code_generation | code_modification | test | docs
    priority: "critical"     # critical | high | medium | low
    estimate: "2h"
    depends_on: ["SETUP-1"]
    requirement: |
      Multi-line requirement description
    acceptance:
      - "Criterion 1"
    output:
      path: "src/feature.ts"
      type: "typescript"
```

---

## Agent Configuration

### Environment Variables

```bash
# .env or CI secrets
PREFERRED_AGENT=claude-code  # kiro | claude-code | antigravity
ANTHROPIC_API_KEY=sk-...     # For Claude Code
KIRO_API_KEY=kiro-...        # For Kiro API
```

---

## GitHub Integration

- Sync issues to tasks: `pnpm agent:sync <label>`
- Execute tasks: `pnpm agent:run .agent-tasks/<label>.yaml`

For deeper details see:
- [GitHub Integration Guide](./github-integration)
- [GitHub Project Tracker](./github-tracker)

---

## Usage Guide

### Workflow: Kiro-style Spec Development

1. **Create the spec:**
   ```bash
   node .kiro/bin/jack-spec.js new my_feature
   ```
2. **Define requirements** in `requirements.md`
3. **Design the solution** in `design.md`
4. **Break into tasks** in `tasks.md`
5. **Execute tasks:**
   ```bash
   node .kiro/bin/jack-spec.js run --task FEAT-1
   ```

### Workflow: GitHub-Synced Tasks

1. **Create GitHub issues** with proper labels
2. **Sync to local YAML:**
   ```bash
   pnpm agent:sync day-1
   ```
3. **Run agent:**
   ```bash
   pnpm agent:run .agent-tasks/day-1.yaml
   ```
4. **Review and commit** generated code

---

## Environment Readiness

Agent tasks often require additional tooling (contracts and containers). Use the environment checklist before starting work, and add required tools + verification commands to new issues.  

See the full guide here: [Agent Environment Readiness](./agent-orchestration/agent-environment.md)

---

## Extending the System

- Add a new agent adapter in `scripts/agents/<agent-name>.ts`
- Register it in `scripts/agent-runner.ts`
- Update task schema as needed

See [Multi-Agent Configuration](../multi-agent-config) for more details.
