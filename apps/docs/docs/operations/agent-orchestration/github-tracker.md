---
title: GitHub Project Tracker
sidebar_position: 3
---

# GitHub Project Tracker

## Overview

The GitHub Project Tracker is a terminal-based visual interface (TUI) designed to provide real-time visibility into GitHub issues and the progress of agent-led tasks. It serves as the "Mission Control" for the JACK development lifecycle, allowing developers to monitor issue status, task assignments, and agent orchestration from a single unified view.

Built with the `blessed` library, it integrates directly with the GitHub CLI (`gh`) and the local `.agent-tasks/` directory to bridge the gap between high-level project management and low-level execution.

---

## Quick Start

### Prerequisites

- **GitHub CLI**: Installed and authenticated (`gh auth login`).
- **Repository Access**: Access to the `hashpass-tech/JACK` repository.

### Running the Tracker

Execute the following command from the project root:

```bash
pnpm agent:tracker
```

---

## Features

- **Real-Time Sync**: Fetches the latest issue data directly from GitHub.
- **Visual Status Indicators**: Color-coded icons for issue states (Open/Closed) and labels (Bug, Feature, Agent).
- **Agent Visibility**: Monitors the `.agent-tasks/` directory to show active task definitions.
- **Auto-Refresh**: Automatically updates data every 30 seconds to ensure the view is never stale.
- **Keyboard-First Navigation**: Optimized for speed with vim-like navigation and shortcuts.

---

## UI Layout

The tracker interface is divided into four primary panels:

1.  **GitHub Issues (Left)**: A scrollable list of the most recent 50 issues. Displays issue numbers, titles, and color-coded label indicators.
2.  **Issue Details (Top Right)**: Detailed view of the currently selected issue, including the full description, assignees, and labels.
3.  **Agent Orchestration (Bottom Right)**: Shows the status of the agent system, listing available task files in `.agent-tasks/` and supported agent backends (Kiro, Claude Code, Cursor).
4.  **Status Bar (Bottom)**: Displays the current system status, the timestamp of the last refresh, and a quick reference for keyboard shortcuts.

---

## Keyboard Shortcuts

| Key                    | Action                                |
| :--------------------- | :------------------------------------ |
| `↑` / `k`              | Move selection up in the issue list   |
| `↓` / `j`              | Move selection down in the issue list |
| `Enter`                | Select issue and update details panel |
| `r`                    | Manually trigger a data refresh       |
| `q` / `Esc` / `Ctrl+C` | Quit the tracker                      |

---

## Architecture

The tracker acts as a presentation layer that aggregates data from GitHub and the local filesystem.

```mermaid
graph TD
    A[GitHub Project Tracker] --> B[GitHub CLI / API]
    A --> C[Local Filesystem]
    B --> D[GitHub Issues & Metadata]
    C --> E[.agent-tasks/*.yaml]
    A --> F[Terminal UI (blessed)]
    F --> G[Issue List Panel]
    F --> H[Details Panel]
    F --> I[Agent Status Panel]
```

### Integration with Agent Orchestration

The tracker complements the `agent:run` and `agent:sync` workflows:

- **Sync Phase**: Use `pnpm agent:sync` to pull issues. The tracker will immediately show the new `.yaml` files in the Agent Orchestration panel.
- **Execution Phase**: While an agent is running, the tracker provides a high-level view of the requirements being addressed.
- **Completion Phase**: Once a task is committed and pushed, the tracker reflects the "Closed" status of the issue upon the next refresh.

---

## Web Expansion Roadmap

While the TUI is the primary interface for developers, the architecture is designed to support a future web-based dashboard:

1.  **Shared Data Layer**: Extract the data fetching logic into a shared package.
2.  **WebSocket Integration**: Implement a local server to stream updates from the agent runner to a web UI.
3.  **Dashboard App**: A React-based interface at `apps/dashboard` that mirrors the TUI functionality with enhanced visualizations and historical trends.

---

## Troubleshooting

### "Error fetching issues"

- **Cause**: GitHub CLI is not authenticated or has no internet connection.
- **Fix**: Run `gh auth status` to verify your connection and `gh auth login` if necessary.

### "No active agent tasks found"

- **Cause**: The `.agent-tasks/` directory does not exist or is empty.
- **Fix**: Run `pnpm agent:sync <label>` to generate task files from GitHub issues.

### UI is distorted

- **Cause**: Terminal window is too small.
- **Fix**: Resize your terminal to at least 100x30 characters and press `r` to redraw.
