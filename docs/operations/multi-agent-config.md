---
title: Multi-Agent Configuration
sidebar_position: 4
---

# Multi-Agent Configuration

This guide explains how to configure and switch between different AI coding agents (Kiro, Claude Code, Antigravity, etc.) in the JACK orchestration system.

## Supported Agents

| Agent | Type | Best For |
|-------|------|----------|
| **Kiro** | IDE | Feature specs, visual workflows |
| **Claude Code** | CLI | Automated tasks, CI/CD |
| **Antigravity** | VS Code Extension | Interactive development |
| **GitHub Copilot** | VS Code Extension | Code completion |
| **Cursor** | IDE | Conversational coding |

---

## Agent Selection

### Environment Variable

Set the preferred agent for automated execution:

```bash
# In .env or CI secrets
PREFERRED_AGENT=claude-code  # Options: kiro | claude-code | antigravity
```

### Per-Task Override

Override agent selection for specific tasks:

```yaml
# .agent-tasks/tasks.yaml
tasks:
  - id: "TASK-1"
    title: "Complex refactor"
    agent_config:
      preferred: "kiro"  # Use Kiro for this task
      claude_code:
        temperature: 0.1
```

---

## Agent Adapters

### Creating a Custom Adapter

```typescript
// scripts/agents/custom-agent.ts
import { AgentAdapter, Task, TaskResult } from '../types';

export class CustomAgent implements AgentAdapter {
  name = 'custom-agent';

  async execute(task: Task): Promise<TaskResult> {
    return {
      success: true,
      output: { path: task.output.path, content: '...' }
    };
  }

  supports(taskType: string): boolean {
    return ['code_generation', 'code_modification'].includes(taskType);
  }
}
```

### Registering the Adapter

```typescript
// scripts/agent-runner.ts
import { CustomAgent } from './agents/custom-agent';

const agents: Record<string, AgentAdapter> = {
  'kiro': new KiroAgent(),
  'claude-code': new ClaudeCodeAgent(),
  'custom-agent': new CustomAgent(),
};
```

---

## Troubleshooting

1. Check API keys are set.
2. Verify network connectivity.
3. Confirm `PREFERRED_AGENT` is supported.
