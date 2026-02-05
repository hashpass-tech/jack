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

## Kiro Configuration

### API Setup

```bash
# .env
KIRO_API_KEY=kiro-...
```

### Task Configuration

```yaml
agent_config:
  kiro:
    mode: "expert"        # basic | expert
    spec_driven: true     # Use .kiro/specs/ structure
    context_window: 100000
```

### Native Integration

If using Kiro IDE, the `.kiro/specs/` directory is automatically recognized:

1. Open project in Kiro
2. Navigate to Specs panel
3. View requirements, design, tasks visually
4. Run tasks with click

---

## Claude Code Configuration

### API Setup

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
```

### Task Configuration

```yaml
agent_config:
  claude_code:
    temperature: 0.1      # Lower = more deterministic
    max_tokens: 4000
    model: "claude-3-opus-20240229"
    system_prompt: |
      You are working on the JACK project.
      Follow existing code patterns.
```

### CLI Usage

```bash
# Run single task
pnpm agent:run .agent-tasks/tasks.yaml --task TASK-1

# Run all tasks
pnpm agent:run .agent-tasks/day-1.yaml --all
```

---

## Antigravity Configuration

### Workflow Integration

Antigravity reads workflows from `.agent/workflows/`:

```markdown
# .agent/workflows/spec.md
---
description: Kiro-style spec management
---
// turbo-all

### 1. List specs
\`\`\`bash
node .kiro/bin/jack-spec.js list
\`\`\`
```

### VS Code Tasks

Configure in `.vscode/tasks.json`:

```json
{
  "label": "▶️ JACK: Run Task",
  "type": "shell",
  "command": "node .kiro/bin/jack-spec.js run --task ${input:taskId}"
}
```

### Usage

1. Type `/spec` in Antigravity chat
2. Or use `Ctrl+Shift+P` → "Tasks: Run Task"

---

## Agent Adapters

### Creating a Custom Adapter

```typescript
// scripts/agents/custom-agent.ts
import { AgentAdapter, Task, TaskResult } from '../types';

export class CustomAgent implements AgentAdapter {
  name = 'custom-agent';
  
  async execute(task: Task): Promise<TaskResult> {
    // Implementation
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

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/agent-automation.yml
env:
  PREFERRED_AGENT: claude-code
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  KIRO_API_KEY: ${{ secrets.KIRO_API_KEY }}

steps:
  - name: Run agent tasks
    run: pnpm agent:run .agent-tasks/day-1.yaml
```

### Agent Fallback

Configure fallback agents if preferred is unavailable:

```yaml
# .agent-tasks/config.yaml
agent_fallback:
  - claude-code
  - kiro
  - antigravity

agent_capabilities:
  claude-code:
    - code_generation
    - code_modification
    - test
  kiro:
    - code_generation
    - spec_driven
  antigravity:
    - interactive
    - browser_actions
```

---

## Spec System Compatibility

All agents can work with the spec system:

| Agent | Reads Specs | Updates Status | Native UI |
|-------|-------------|----------------|-----------|
| Kiro | ✅ | ✅ | ✅ |
| Claude Code | ✅ | Via CLI | ❌ |
| Antigravity | ✅ | Via CLI | ❌ |

### Using Specs with Claude Code

```bash
# Convert spec to task
node .kiro/bin/jack-spec.js export --spec my_feature --format yaml > task.yaml

# Run with Claude
pnpm agent:run task.yaml
```

### Using Specs with Antigravity

Simply reference the spec in conversation:
> "Look at the tasks in .kiro/specs/pwa_migration/tasks.md and implement PWA-1"

---

## Best Practices

### 1. Choose the Right Agent

| Task Type | Recommended Agent |
|-----------|-------------------|
| Feature with design phase | Kiro |
| Quick code generation | Claude Code |
| Interactive debugging | Antigravity |
| CI/CD automation | Claude Code |
| Visual testing | Antigravity (browser) |

### 2. Use Consistent Configuration

Keep agent configs in a central location:

```yaml
# .agent-tasks/agents.yaml
defaults:
  temperature: 0.2
  max_retries: 3

agents:
  claude-code:
    model: "claude-3-opus-20240229"
  kiro:
    mode: "expert"
```

### 3. Document Agent-Specific Notes

In task definitions, note any agent-specific requirements:

```markdown
**Agent Notes:**
- Kiro: Use expert mode for this task
- Claude: Set temperature to 0.1
- Antigravity: May need browser interaction
```

---

## Troubleshooting

### Agent Not Responding

1. Check API keys are set
2. Verify network connectivity
3. Check agent-specific logs

### Status Not Updating

The CLI tool must be run to update markdown status:
```bash
node .kiro/bin/jack-spec.js run --task TASK-1
```

### Fallback Not Working

Ensure fallback agents have proper API keys configured.
