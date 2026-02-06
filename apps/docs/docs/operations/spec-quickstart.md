---
title: Spec System Quick Start
sidebar_position: 3
---

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

[Header] ──► [ThemeToggle] ──► [ThemeContext]
                                │
                                ▼
                          [localStorage]
```

## Step 4: Break Into Tasks

Open `.kiro/specs/my_awesome_feature/tasks.md` and define your tasks with annotations.

## Step 5: Check Status

```bash
node .kiro/bin/jack-spec.js status my_awesome_feature
```

## Step 6: Execute Tasks

```bash
node .kiro/bin/jack-spec.js run --task DARK-1
```

## Step 7: Track Progress

```bash
node .kiro/bin/jack-spec.js list
```

---

## Next Steps

- Read [Spec System Details](./spec-system)
- Explore [Agent Orchestration](./agent-orchestration/)
