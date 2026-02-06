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

The spec system (`/.kiro/`) provides a Kiro-inspired workflow for feature development with structured documentation.

### Directory Structure

```
.kiro/
├── bin/
│   └── jack-spec.js         # CLI tool for spec management
├── specs/
│   └── <spec_name>/
│       ├── requirements.md  # What we're building
│       ├── design.md        # How we're building it
│       └── tasks.md         # Step-by-step implementation
└── README.md                # Quick reference
```

### Spec Files

#### `requirements.md`
Contains user stories and acceptance criteria:

```markdown
## User Stories

### US-1: Feature Name
**As a** user type  
**I want to** action  
**So that** benefit

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
```

#### `design.md`
Contains architecture and technical decisions:

```markdown
## Architecture Overview

[ASCII/Mermaid diagrams]

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
```

#### `tasks.md`
Contains phased task list with machine-parseable annotations:

```markdown
<!-- @task id="FEAT-1" status="pending" priority="high" depends="SETUP-1" -->
### Task FEAT-1: Task Title
**Status:** 🔵 Pending | **Priority:** High | **Estimate:** 2h

**Description:**
What needs to be done...

**Commands:**
\`\`\`bash
npm install something
\`\`\`

**Acceptance Criteria:**
- [ ] Criterion 1

**Run Task:** `[▶ Execute Task FEAT-1]`
<!-- @endtask -->
```

### CLI Commands

```bash
# List all specs
node .kiro/bin/jack-spec.js list

# Show spec status with task breakdown
node .kiro/bin/jack-spec.js status <spec_name>

# Run a specific task
node .kiro/bin/jack-spec.js run --task <task_id>

# Run all pending tasks in a spec
node .kiro/bin/jack-spec.js run --spec <spec_name> --all

# Create a new spec with templates
node .kiro/bin/jack-spec.js new <spec_name>
```

---

## Task System (YAML-based)

The task system (`/.agent-tasks/`) provides machine-readable task definitions for automation.

### Directory Structure

```
.agent-tasks/
├── tasks.yaml       # Manual task definitions
├── day-1.yaml       # Auto-synced from GitHub Issues
└── templates/       # Task templates
```

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
      with details about what to implement.
    
    acceptance:
      - "Criterion 1"
      - "Criterion 2"
    
    context:
      - "path/to/relevant/file.ts"
    
    output:
      path: "src/feature.ts"
      type: "typescript"
    
    agent_config:
      kiro:
        mode: "expert"
      claude_code:
        temperature: 0.1
```

### npm Scripts

```bash
# Run agent on task file
pnpm agent:run .agent-tasks/tasks.yaml

# Sync GitHub issues to YAML
pnpm agent:sync <label>

# Open agent dashboard
pnpm agent:dashboard

# Track GitHub project progress
pnpm agent:tracker
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

### Agent-Specific Config

Each task can have agent-specific configuration:

```yaml
agent_config:
  kiro:
    mode: "expert"           # basic | expert
    context_window: 100000
  claude_code:
    temperature: 0.1
    max_tokens: 4000
  antigravity:
    workflows: ["/spec"]     # Available workflow commands
```

---

## GitHub Integration

### Syncing Issues to Tasks

```bash
# Sync all issues with 'auto-execute' label
pnpm agent:sync auto-execute
```

This creates/updates `.agent-tasks/<label>.yaml` with tasks from GitHub issues.

### GitHub Actions Workflow

The system includes a GitHub Actions workflow (`.github/workflows/agent-automation.yml`) that:

1. Triggers on workflow_dispatch
2. Syncs issues to YAML
3. Runs agent on tasks
4. Commits results back to repo

### Issue Template

Create issues with structured data for better sync:

```markdown
## Requirement
What needs to be done...

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Output
- Path: `src/feature.ts`
- Type: typescript
```

---

## Usage Guide

### Choosing the Right System

| Use Case | Recommended System |
|----------|-------------------|
| New feature with design phase | Spec System |
| Quick bug fix | Task System |
| Hackathon sprint tasks | Task System + GitHub sync |
| Long-term project with phases | Spec System |
| CI/CD automated generation | Task System |

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

6. **Track progress:**
   ```bash
   node .kiro/bin/jack-spec.js status my_feature
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

### Adding a New Agent

1. Create agent adapter in `scripts/agents/<agent-name>.ts`:

```typescript
export interface AgentAdapter {
  name: string;
  execute(task: Task): Promise<TaskResult>;
  supports(taskType: string): boolean;
}
```

2. Register in `scripts/agent-runner.ts`

3. Add configuration schema to task YAML

### Converting Between Formats

**Spec to YAML:**
```bash
node .kiro/bin/jack-spec.js export --spec my_feature --format yaml
```

**YAML to Spec:**
```bash
node .kiro/bin/jack-spec.js import --yaml .agent-tasks/tasks.yaml
```

### VS Code Integration

Tasks are available in `.vscode/tasks.json`:
- `Ctrl+Shift+P` → "Tasks: Run Task"
- Select `🎯 JACK:` tasks

Antigravity workflow available:
- Type `/spec` in Antigravity chat

---

## Related Documentation

- [Spec System README](../.kiro/README.md)
- [GitHub Tracker Docs](../.sisyphus/notepads/github-tracker-docs/)
- [Agent Automation Workflow](../.github/workflows/agent-automation.yml)
