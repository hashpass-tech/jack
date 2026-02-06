# Codex Per-Issue Solver

This repo’s agent system supports a **Codex-first, one-issue-at-a-time** workflow with **reproducible toolchains** (Docker) and **auditable changes** (Git + PRs).

## Core principles

- **Agents evolve code and specs** (source control), not live containers.
- **Containers are immutable artifacts** built by CI, not mutated by agents.
- **No secrets in repo or images**. Inject secrets at runtime (CI secrets, Vault/Doppler, etc.).

## Task format (YAML)

Tasks live in `.agent-tasks/*.yaml` and are usually generated from GitHub issues via `pnpm agent:sync <label>`.

Recommended fields for Codex workflows:

- `workspace`: `contracts` | `sdk` | `ui` | `general`
- `verify`: list of shell commands to validate the change (run only with `--verify`)

Example:

```yaml
tasks:
  - id: "GH-1"
    title: "Contracts MVP: Uniswap v4 Hook + Adapter"
    workspace: "contracts"
    output:
      path: "contracts/src/JACKPolicyHook.sol"
    verify:
      - "cd contracts && forge test"
```

## Recommended workflow (per issue)

1. Create a branch:
   ```bash
   git checkout -b issue/GH-1-contracts-hook-policy
   ```

2. Sync issues → tasks:
   ```bash
   pnpm agent:sync day-1
   ```

3. Run *one* task with Codex (and optional verification):
   ```bash
   PREFERRED_AGENT=codex pnpm agent:run .agent-tasks/day-1.yaml --task GH-1 --verify --no-commit
   ```

4. Commit + PR:
   ```bash
   git add -A
   git commit -m "fix: GH-1 policy hook verification"
   ```

## Reproducible environments (Docker)

Use the agent environment templates in `docker/agent-env/`:

- Contracts shell (Foundry):
  ```bash
  docker compose -f docker/agent-env/compose.yml run --rm contracts
  ```
- UI shell:
  ```bash
  docker compose -f docker/agent-env/compose.yml run --rm ui
  ```
- SDK shell:
  ```bash
  docker compose -f docker/agent-env/compose.yml run --rm sdk
  ```

These containers are intended for **build/test parity**, not for storing state or secrets.

