# JACK Spec System 🎯

A Kiro-inspired spec management system for structured feature development.

## Overview

This system provides a workflow similar to [Kiro IDE](https://kiro.dev) for managing feature specs with:
- **Requirements** - User stories and acceptance criteria
- **Design** - Architecture and technical decisions  
- **Tasks** - Phased task lists with progress tracking

## Structure

```
.kiro/
├── bin/
│   └── jack-spec.js       # CLI tool for spec management
├── specs/
│   └── <spec_name>/
│       ├── requirements.md # What we're building and why
│       ├── design.md       # How we're building it
│       └── tasks.md        # Step-by-step implementation tasks
└── README.md               # This file
```

## Quick Start

### List all specs
```bash
node .kiro/bin/jack-spec.js list
```

### View spec status
```bash
node .kiro/bin/jack-spec.js status pwa_migration
```

### Run a task
```bash
node .kiro/bin/jack-spec.js run --task PWA-1
```

### Create a new spec
```bash
node .kiro/bin/jack-spec.js new my_feature_name
```

## VS Code Integration

Tasks are available in the Command Palette:
1. `Ctrl+Shift+P` → "Tasks: Run Task"
2. Select a `🎯 JACK:` or `📋` task

## Task Syntax

Tasks use markdown annotations for machine parsing:

```markdown
<!-- @task id="FEAT-1" status="pending" priority="high" depends="SETUP-1" -->
### Task FEAT-1: Implement Feature
**Status:** 🔵 Pending | **Priority:** High | **Estimate:** 2h

**Description:**
What needs to be done...

**Commands:**
\`\`\`bash
npm run build
\`\`\`

**Target File:** `src/feature.ts`

**Acceptance Criteria:**
- [ ] Feature works correctly
- [ ] Tests pass

**Run Task:** `[▶ Execute Task FEAT-1]`
<!-- @endtask -->
```

## Status Icons

| Status | Icon | Description |
|--------|------|-------------|
| pending | 🔵 | Not started |
| in-progress | 🔄 | Currently working |
| completed | ✅ | Done and verified |
| blocked | 🔴 | Cannot proceed |

## Priority Levels

| Priority | Color | Use Case |
|----------|-------|----------|
| critical | 🔴 Red | Must complete for MVP |
| high | 🟡 Yellow | Important for release |
| medium | 🔵 Blue | Nice to have |
| low | ⚪ Gray | Backlog items |

## Creating Good Specs

### Requirements.md
- Write clear user stories with acceptance criteria
- Include technical requirements
- List dependencies and related issues

### Design.md  
- Add architecture diagrams (ASCII or Mermaid)
- Document key technical decisions
- Include risk assessment

### Tasks.md
- Group tasks into logical phases
- Keep tasks small (< 4 hours)
- Include clear acceptance criteria
- Add commands where applicable

## Integration with Antigravity

Use the `/spec` workflow command in Antigravity:
```
/spec
```

This will show quick commands for managing specs.

---

## 📚 Full Documentation

For comprehensive documentation, see the `docs/` folder:

| Document | Description |
|----------|-------------|
| [docs/agent-orchestration.md](../apps/docs/agent-orchestration.md) | Complete system overview |
| [docs/spec-system.md](../apps/docs/spec-system.md) | Detailed spec system guide |
| [docs/spec-quickstart.md](../apps/docs/spec-quickstart.md) | 5-minute tutorial |
| [docs/multi-agent-config.md](../apps/docs/multi-agent-config.md) | Multi-agent configuration |

---

## Compatibility

This spec system is designed to be **agent-agnostic** and works with:

- **Kiro IDE** - Native support for `.kiro/specs/` structure
- **Antigravity** - Via CLI and VS Code tasks
- **Claude Code** - Via YAML export and CLI
- **Any Markdown-aware agent** - Just read the spec files!
