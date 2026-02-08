# Agent Environment Readiness

This guide ensures future agents (Codex, Kiro, Claude Code, etc.) have the right tools to build and test JACK quickly, especially smart contracts and Docker-based services.

## Baseline Toolchain

Install these before running agent tasks:

- **Node.js** (LTS recommended)
- **pnpm** (package manager used by this repo)
- **Git**
- **Docker + Docker Compose** (for container builds and infra parity)

Quick verification:

```bash
node -v
pnpm -v
git --version
docker --version
docker compose version
```

## Smart Contract Toolchain (Foundry)

Contracts are built and tested with Foundry.

Install + verify:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge --version
```

Common commands:

```bash
cd contracts
forge build
forge test
forge fmt
```

## Repo Setup

```bash
pnpm install
```

If the task uses environment variables, copy the example file and update locally:

```bash
cp .env.example .env.local
```

## Docker Validation

Use Docker to validate production parity when relevant:

```bash
docker build -f Dockerfile -t jack-app .
```

Dashboard image:

```bash
docker build -f Dockerfile.dashboard -t jack-dashboard .
```

## Issue Checklist (for future tasks)

When creating issues for agent execution, include:

- **Required tools** (e.g., `forge`, `docker`, `pnpm`)
- **Verification commands** (e.g., `forge test`, `pnpm lint`, `docker build ...`)
- **Any environment variables or secrets**

This keeps agent environments reproducible and avoids missing toolchain errors.
