# GitHub Issues ↔ Agent System Integration Guide

## Two-Way Sync Between GitHub Projects and Agent Tasks

This integration ensures that GitHub Issues remain the single source of truth for the project while the Agent System handles the autonomous execution and verification.

---

## The Integration Flow

1.  **GitHub Issues**: Define tasks using the "Agent Task" template.
2.  **Sync**: Run `pnpm agent:sync` to pull issues into `.agent-tasks/` as YAML.
3.  **Execution**: Run `pnpm agent:run` to execute the tasks.
4.  **Auto-Commit**: The system commits results with "Closes #number" tags.
5.  **Auto-Close**: Pushing the commits automatically closes the GitHub issues and updates the Project board.

---

## Setup

1.  **Install GitHub CLI**: `brew install gh` or follow [cli.github.com](https://cli.github.com/).
2.  **Authenticate**: `gh auth login`.
3.  **Verify Access**: `gh issue list --repo hashpass-tech/JACK`.

---

## Daily Workflow

### 1. Create/Labels Issues
Ensure your issues have the appropriate labels (e.g., `day-1`, `agent-task`).

### 2. Sync to YAML
```bash
pnpm agent:sync day-1
```
This generates `.agent-tasks/day-1.yaml` from open GitHub issues.

### 3. Execute
```bash
pnpm agent:run .agent-tasks/day-1.yaml
```

### 4. Push Results
```bash
git push
```
GitHub will automatically close the linked issues.

---

## Structure of GitHub Agent Issues

To ensure the sync works correctly, follow the "Agent Task" template:

- **Title**: Should contain the task ID if preferred, but not required.
- **Body**:
    - **Output File**: `path/to/file`
    - **Requirement**: Description of work.
    - **Acceptance Criteria**: List starting with `- [ ]`.

---

## Verification

To verify your environment is ready:
```bash
pnpm agent:verify-gh
```
