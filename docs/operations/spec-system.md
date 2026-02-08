---
title: Spec System (Kiro-style)
sidebar_position: 2
---

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

### 2. Design (Architecture Phase)

**Purpose:** Define HOW we're building it.

**Contents:**
- Architecture diagrams
- Component design
- Data flow
- Technical decisions with rationale
- Risk assessment

### 3. Tasks (Implementation Phase)

**Purpose:** Break down into executable steps.

**Contents:**
- Phased task list
- Dependencies between tasks
- Commands and target files
- Progress tracking

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

## CLI Reference

```bash
# List all specs
node .kiro/bin/jack-spec.js list

# Show spec status with task breakdown
node .kiro/bin/jack-spec.js status <spec_name>

# Run a specific task
node .kiro/bin/jack-spec.js run --task <task_id>
```

---

## Best Practices

1. **Be specific** - Vague stories lead to vague implementations.
2. **Draw diagrams** - ASCII art or Mermaid helps align the team.
3. **Keep tasks small** - Under 4 hours each.
4. **Set dependencies** - Order matters.

---

## Next Steps

- Continue with the [Spec System Quick Start](./spec-quickstart)
- Review [Agent Orchestration](./agent-orchestration/)
