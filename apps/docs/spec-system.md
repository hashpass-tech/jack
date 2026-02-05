# Kiro-Style Spec System

A structured approach to feature development inspired by [Kiro IDE](https://kiro.dev).

## What is a Spec?

A **spec** is a folder containing three markdown files that guide feature development:

```
.kiro/specs/<feature_name>/
├── requirements.md   # WHAT we're building
├── design.md         # HOW we're building it
└── tasks.md          # STEP-BY-STEP implementation
```

## The Three-Document Flow

### 1. Requirements (Discovery Phase)

**Purpose:** Define WHAT we're building and WHY.

**Contents:**
- User stories with acceptance criteria
- Technical requirements
- Dependencies and constraints
- Priority and timeline

**Template:**
```markdown
# Requirements: Feature Name

## Overview
Brief description of the feature.

## User Stories

### US-1: Primary User Story
**As a** [user type]
**I want to** [action]
**So that** [benefit]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Requirements
- TR-1: Requirement details
- TR-2: Requirement details

## Dependencies
- Dependency 1
- Dependency 2

## Priority
High / Medium / Low
```

---

### 2. Design (Architecture Phase)

**Purpose:** Define HOW we're building it.

**Contents:**
- Architecture diagrams
- Component design
- Data flow
- Technical decisions with rationale
- Risk assessment

**Template:**
```markdown
# Design: Feature Name

## Architecture Overview

\`\`\`
┌─────────────┐     ┌─────────────┐
│  Component  │────►│  Component  │
└─────────────┘     └─────────────┘
\`\`\`

## Component Design

### Component Name
- Purpose
- Interface
- Implementation notes

## Data Flow
1. Step 1
2. Step 2
3. Step 3

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | PostgreSQL | ACID compliance needed |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API changes | Medium | High | Version pinning |
```

---

### 3. Tasks (Implementation Phase)

**Purpose:** Break down into executable steps.

**Contents:**
- Phased task list
- Dependencies between tasks
- Commands and target files
- Progress tracking

**Task Annotation Syntax:**
```markdown
<!-- @task id="ID" status="pending" priority="high" depends="OTHER-ID" -->
### Task ID: Title
**Status:** 🔵 Pending | **Priority:** High | **Estimate:** 2h

**Description:**
What needs to be done.

**Commands:**
\`\`\`bash
npm install package
\`\`\`

**Target File:** \`src/feature.ts\`

**Acceptance Criteria:**
- [ ] Tests pass
- [ ] No lint errors

**Run Task:** \`[▶ Execute Task ID]\`
<!-- @endtask -->
```

---

## Status Values

| Status | Icon | Annotation | Description |
|--------|------|------------|-------------|
| Pending | 🔵 | `status="pending"` | Not started |
| In Progress | 🔄 | `status="in-progress"` | Currently working |
| Completed | ✅ | `status="completed"` | Done and verified |
| Blocked | 🔴 | `status="blocked"` | Cannot proceed |
| Skipped | ⏭️ | `status="skipped"` | Intentionally skipped |

---

## Priority Levels

| Priority | Color | Use Case |
|----------|-------|----------|
| Critical | 🔴 | Must complete for MVP/deadline |
| High | 🟡 | Important for release |
| Medium | 🔵 | Should have |
| Low | ⚪ | Nice to have / backlog |

---

## CLI Reference

### List Specs
```bash
node .kiro/bin/jack-spec.js list
```

**Output:**
```
📋 JACK Specs

pwa_migration_and_enhancements
  ├─ Requirements: ✅
  ├─ Design: ✅
  ├─ Tasks: ✅ (0/8)
  └─ Progress: [░░░░░░░░░░░░░░░░░░░░] 0%
```

### Show Status
```bash
node .kiro/bin/jack-spec.js status <spec_name>
```

**Output:**
```
 PWA_MIGRATION_AND_ENHANCEMENTS 

Phase 1: Foundation Setup
  🔵 PWA-1: Install PWA Dependencies
     [critical] 30min
  🔵 PWA-2: Configure Vite PWA Plugin
     [critical] 1h
     └─ depends: PWA-1

──────────────────────────────────────────────────
Summary: ✅ 0 | 🔄 0 | 🔵 8 | 🔴 0
```

### Run Task
```bash
node .kiro/bin/jack-spec.js run --task <task_id>
```

The CLI will:
1. Check dependencies
2. Update status to "in-progress"
3. Execute commands (if any)
4. Open target file in VS Code
5. Show acceptance criteria
6. Ask for completion confirmation
7. Update status to "completed"

### Create New Spec
```bash
node .kiro/bin/jack-spec.js new <spec_name>
```

Creates a new spec folder with template files.

---

## IDE Integration

### VS Code Tasks

Available via `Ctrl+Shift+P` → "Tasks: Run Task":

| Task | Description |
|------|-------------|
| `🎯 JACK: List Specs` | List all specs |
| `🎯 JACK: Show Spec Status` | Show detailed status |
| `▶️ JACK: Run Task` | Run a specific task |
| `▶️ JACK: Run All Pending` | Run all pending in spec |
| `➕ JACK: Create New Spec` | Create new spec |

### Antigravity Workflow

Type `/spec` in Antigravity to access quick commands.

### Kiro IDE (Native)

If using Kiro IDE, the `.kiro/specs/` structure is automatically recognized.

---

## Best Practices

### Writing Good Requirements

1. **Be specific** - Vague stories lead to vague implementations
2. **Include acceptance criteria** - How do we know it's done?
3. **List dependencies** - What needs to exist first?
4. **Prioritize** - Not everything is critical

### Writing Good Designs

1. **Draw diagrams** - ASCII art or Mermaid
2. **Document decisions** - Future you will thank you
3. **Assess risks** - What could go wrong?
4. **Keep it updated** - Design evolves

### Writing Good Tasks

1. **Keep tasks small** - Under 4 hours each
2. **Include commands** - Make it executable
3. **Specify target files** - Where does code go?
4. **Clear acceptance** - Measurable criteria
5. **Set dependencies** - Order matters

---

## Comparison with Other Systems

| Feature | JACK Specs | Kiro | Linear | GitHub Issues |
|---------|------------|------|--------|---------------|
| Markdown-based | ✅ | ✅ | ❌ | ✅ |
| Three-document flow | ✅ | ✅ | ❌ | ❌ |
| Task dependencies | ✅ | ✅ | ✅ | ❌ |
| CLI tool | ✅ | ✅ | ❌ | ✅ |
| IDE integration | ✅ | ✅ | ❌ | ❌ |
| Agent-agnostic | ✅ | ❌ | ❌ | ✅ |
| Git-friendly | ✅ | ✅ | ❌ | ✅ |

---

## Next Steps

- See [Agent Orchestration](./agent-orchestration.md) for full system overview
- See [Quick Start](./spec-quickstart.md) for hands-on tutorial
- See [.kiro/README.md](../.kiro/README.md) for CLI details
