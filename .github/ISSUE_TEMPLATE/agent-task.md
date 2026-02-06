---
name: Agent Task
about: Task that can be executed by the autonomous agent system
labels: agent-task
---

## Task: [Brief description]

**Output File:** `path/to/file.ext`

**Requirement:**
Detailed description of what needs to be built.

**Environment Requirements:**
- Tooling needed (e.g., `pnpm`, `forge`, `docker`)
- Env vars or secrets (if any)

**Verification Commands:**
- `pnpm lint`
- `pnpm test`
- `forge build` (contracts)
- `docker build -f Dockerfile ...` (containers)

**Acceptance Criteria:**
- [ ] Compiles successfully
- [ ] Tests pass
- [ ] Implementation aligns with requirements

**Estimate:** 2h

**Dependencies:** #12
