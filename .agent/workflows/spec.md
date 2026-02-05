---
description: Kiro-style spec management - create, view, and run specs from markdown
---

# JACK Spec Workflow

This workflow provides Kiro-style spec management for the JACK project.

## Quick Commands

// turbo-all

### 1. List all specs
```bash
node .kiro/bin/jack-spec.js list
```

### 2. Show spec status
```bash
node .kiro/bin/jack-spec.js status pwa_migration
```

### 3. Run a specific task
```bash
node .kiro/bin/jack-spec.js run --task PWA-1
```

### 4. Run all pending tasks in a spec
```bash
node .kiro/bin/jack-spec.js run --spec pwa_migration --all
```

### 5. Create a new spec
```bash
node .kiro/bin/jack-spec.js new my_new_feature
```

## Spec Structure

Each spec lives in `.kiro/specs/<spec_name>/` with these files:
- `requirements.md` - User stories, acceptance criteria, and technical requirements
- `design.md` - Architecture diagrams, component design, and technical decisions
- `tasks.md` - Phased task list with status tracking and run buttons

## Task Annotations

Tasks in `tasks.md` use special annotations:

```markdown
<!-- @task id="TASK-1" status="pending" priority="high" depends="OTHER-1" -->
### Task TASK-1: My Task Title
**Status:** 🔵 Pending | **Priority:** High | **Estimate:** 1h

**Description:**
Task details here...

**Commands:**
```bash
npm install something
```

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Run Task:** `[▶ Execute Task TASK-1]`
<!-- @endtask -->
```

## Status Values
- `pending` - 🔵 Not started
- `in-progress` - 🔄 Currently being worked on  
- `completed` - ✅ Done and verified
- `blocked` - 🔴 Cannot proceed (dependency or issue)

## VS Code Integration

Run tasks from Command Palette:
1. Press `Ctrl+Shift+P`
2. Type "Tasks: Run Task"
3. Select a JACK task

Or use the keybinding `Ctrl+Shift+B` for build tasks.
