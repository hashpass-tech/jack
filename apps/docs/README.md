# JACK Documentation

Welcome to the JACK project documentation.

## Quick Links

| Document | Description |
|----------|-------------|
| [Agent Orchestration](./agent-orchestration.md) | Overview of the entire agent system |
| [Codex Per-Issue Solver](./codex-issue-solver.md) | Codex-first workflow (one issue at a time) |
| [Spec System](./spec-system.md) | Kiro-style spec workflow details |
| [Quick Start](./spec-quickstart.md) | 5-minute tutorial for specs |
| [Multi-Agent Config](./multi-agent-config.md) | Configure different AI agents |
| [Agent Environments (Docker)](../../docker/agent-env/README.md) | Reproducible toolchains for contracts/sdk/ui |

---

## Getting Started

### For Feature Development (Kiro-style)

1. **Create a spec:**
   ```bash
   node .kiro/bin/jack-spec.js new my_feature
   ```

2. **Fill in requirements, design, and tasks**

3. **Execute tasks:**
   ```bash
   node .kiro/bin/jack-spec.js run --task FEAT-1
   ```

👉 See [Quick Start Guide](./spec-quickstart.md)

---

### For Automated Tasks (CI/CD)

1. **Create issues on GitHub**

2. **Sync to local YAML:**
   ```bash
   pnpm agent:sync day-1
   ```

3. **Run agent:**
   ```bash
   pnpm agent:run .agent-tasks/day-1.yaml
   ```

👉 See [Agent Orchestration](./agent-orchestration.md)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    JACK Agent Orchestration                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│   │    GitHub    │────►│  .agent-tasks│────►│   AI Agent   │   │
│   │    Issues    │     │    (YAML)    │     │  (Claude,    │   │
│   └──────────────┘     └──────────────┘     │ Codex, Kiro, │   │
│                                              │  Claude, …) │   │
│                                              └──────┬───────┘   │
│                                                     │           │
│   ┌──────────────────────────────────────────────────┘          │
│   │                                                              │
│   ▼                                                              │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                    .kiro/specs/                           │  │
│   │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │  │
│   │   │requirements  │ │   design     │ │    tasks     │     │  │
│   │   │     .md      │ │     .md      │ │     .md      │     │  │
│   │   └──────────────┘ └──────────────┘ └──────────────┘     │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
JACK/
├── .agent-tasks/         # YAML-based task automation
│   ├── tasks.yaml        # Manual tasks
│   └── day-1.yaml        # GitHub-synced tasks
│
├── .kiro/                # Kiro-style spec system
│   ├── bin/
│   │   └── jack-spec.js  # CLI tool
│   ├── specs/
│   │   └── <spec>/
│   │       ├── requirements.md
│   │       ├── design.md
│   │       └── tasks.md
│   └── README.md
│
├── .agent/               # Antigravity workflows
│   └── workflows/
│       └── spec.md
│
├── .vscode/              # VS Code integration
│   └── tasks.json
│
├── .github/              # GitHub Actions
│   └── workflows/
│       └── agent-automation.yml
│
├── apps/
│   └── docs/             # Documentation (you are here)
│       ├── README.md
│       ├── agent-orchestration.md
│       ├── codex-issue-solver.md
│       ├── spec-system.md
│       ├── spec-quickstart.md
│       └── multi-agent-config.md
│
├── docker/
│   └── agent-env/         # Reproducible toolchains (Docker)
│       ├── Dockerfile
│       ├── compose.yml
│       └── README.md
│
└── scripts/              # Agent automation scripts
    ├── agent-runner.ts
    ├── agent-dashboard.ts
    └── sync-github-tasks.ts
```

---

## npm Scripts

| Script | Description |
|--------|-------------|
| `pnpm agent:run <file>` | Run agent on task YAML |
| `pnpm agent:sync <label>` | Sync GitHub issues to YAML |
| `pnpm agent:dashboard` | Open agent dashboard |
| `pnpm agent:tracker` | Track GitHub project progress |

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `jack-spec list` | List all specs |
| `jack-spec status <spec>` | Show spec status |
| `jack-spec run --task <id>` | Run specific task |
| `jack-spec new <name>` | Create new spec |

> **Note:** Run with `node .kiro/bin/jack-spec.js` or add as npm script.

---

## Contributing

When adding new agent integrations or spec features:

1. Update the relevant documentation
2. Add examples to the quick start guide
3. Test with multiple agents
4. Update the architecture diagram if needed

---

## Related Resources

- [Kiro IDE](https://kiro.dev) - Visual spec-driven development
- [Claude Code](https://anthropic.com) - CLI-based AI coding
- [Antigravity](https://cloud.google.com/antigravity) - VS Code AI extension
