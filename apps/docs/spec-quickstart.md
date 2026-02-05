# Spec System Quick Start

Get up and running with the Kiro-style spec system in 5 minutes.

## Prerequisites

- Node.js 18+
- VS Code (recommended) or any text editor

## Step 1: Create Your First Spec

```bash
cd /path/to/JACK
node .kiro/bin/jack-spec.js new my_awesome_feature
```

This creates:
```
.kiro/specs/my_awesome_feature/
├── requirements.md
├── design.md
└── tasks.md
```

## Step 2: Define Requirements

Open `.kiro/specs/my_awesome_feature/requirements.md` and fill in:

```markdown
# Requirements: My Awesome Feature

## Overview
Add a dark mode toggle to the dashboard.

## User Stories

### US-1: Toggle Dark Mode
**As a** dashboard user
**I want to** toggle between light and dark mode
**So that** I can reduce eye strain at night

**Acceptance Criteria:**
- [ ] Toggle button visible in header
- [ ] Preference saved to localStorage
- [ ] Smooth transition animation
```

## Step 3: Create Design

Open `.kiro/specs/my_awesome_feature/design.md`:

```markdown
# Design: My Awesome Feature

## Architecture

\`\`\`
[Header] ──► [ThemeToggle] ──► [ThemeContext]
                                    │
                                    ▼
                              [localStorage]
\`\`\`

## Component: ThemeToggle
- Icon-based toggle (sun/moon)
- Uses React Context for state
- CSS variables for theming

## Technical Decision
Using CSS variables for theming to avoid runtime style recalculation.
```

## Step 4: Break Into Tasks

Open `.kiro/specs/my_awesome_feature/tasks.md`:

```markdown
# Task List / My Awesome Feature

## Phase 1: Foundation

<!-- @task id="DARK-1" status="pending" priority="high" -->
### Task DARK-1: Create Theme Context
**Status:** 🔵 Pending | **Priority:** High | **Estimate:** 30min

**Description:**
Create React context for theme state management.

**Target File:** \`apps/dashboard/src/contexts/ThemeContext.tsx\`

**Acceptance Criteria:**
- [ ] Context provides theme state
- [ ] useTheme hook exported

**Run Task:** \`[▶ Execute Task DARK-1]\`
<!-- @endtask -->

---

<!-- @task id="DARK-2" status="pending" priority="high" depends="DARK-1" -->
### Task DARK-2: Create Toggle Component
**Status:** 🔵 Pending | **Priority:** High | **Estimate:** 45min

**Description:**
Create the ThemeToggle component with sun/moon icons.

**Target File:** \`apps/dashboard/src/components/ThemeToggle.tsx\`

**Acceptance Criteria:**
- [ ] Toggle switches theme
- [ ] Icons animate on change

**Run Task:** \`[▶ Execute Task DARK-2]\`
<!-- @endtask -->
```

## Step 5: Check Status

```bash
node .kiro/bin/jack-spec.js status my_awesome_feature
```

Output:
```
 MY_AWESOME_FEATURE 

Phase 1: Foundation
  🔵 DARK-1: Create Theme Context
     [high] 30min
  🔵 DARK-2: Create Toggle Component
     [high] 45min
     └─ depends: DARK-1

──────────────────────────────────────────────────
Summary: ✅ 0 | 🔄 0 | 🔵 2 | 🔴 0
```

## Step 6: Execute Tasks

### Option A: Interactive CLI
```bash
node .kiro/bin/jack-spec.js run --task DARK-1
```

The CLI will:
1. Update status to in-progress
2. Open target file in VS Code
3. Show acceptance criteria
4. Ask if task is complete

### Option B: VS Code Tasks
1. Press `Ctrl+Shift+P`
2. Type "Tasks: Run Task"
3. Select `▶️ JACK: Run Task`
4. Enter `DARK-1`

### Option C: Antigravity
Just tell Antigravity:
> "Run task DARK-1 from the my_awesome_feature spec"

## Step 7: Track Progress

As you complete tasks, run:
```bash
node .kiro/bin/jack-spec.js list
```

Watch the progress bar fill up:
```
my_awesome_feature
  ├─ Requirements: ✅
  ├─ Design: ✅
  ├─ Tasks: ✅ (1/2)
  └─ Progress: [██████████░░░░░░░░░░] 50%
```

---

## Tips

### Use Phases
Group related tasks into phases:
```markdown
## Phase 1: Setup
## Phase 2: Core Features  
## Phase 3: Polish
```

### Add Commands
Include executable commands in tasks:
```markdown
**Commands:**
\`\`\`bash
npm install @heroicons/react
\`\`\`
```

### Track Dependencies
Use `depends="ID"` to enforce order:
```markdown
<!-- @task id="FEAT-2" status="pending" priority="high" depends="FEAT-1" -->
```

### Include Context
Reference relevant files:
```markdown
**Context:**
- \`apps/dashboard/src/App.tsx\`
- \`apps/dashboard/src/index.css\`
```

---

## Next Steps

- Read [Spec System Details](./spec-system.md)
- Explore [Agent Orchestration](./agent-orchestration.md)
- Check existing specs: `node .kiro/bin/jack-spec.js list`
