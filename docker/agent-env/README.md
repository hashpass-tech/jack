# Agent Environment (Docker)

These images provide **reproducible toolchains** for Codex/agent work. The agent evolves **code**, not container layers:

`Agent → PR → CI rebuild → new image → deploy`

## Quick start

From the repo root:

```bash
docker compose -f docker/agent-env/compose.yml run --rm base
```

## Profiles

### Contracts (Foundry)

```bash
docker compose -f docker/agent-env/compose.yml run --rm contracts
```

Typical verification:

```bash
docker compose -f docker/agent-env/compose.yml run --rm contracts bash -lc "cd contracts && forge test"
```

### UI (Dashboard / Landing)

```bash
docker compose -f docker/agent-env/compose.yml run --rm ui
```

Typical verification:

```bash
docker compose -f docker/agent-env/compose.yml run --rm ui bash -lc "pnpm install && pnpm --filter dashboard lint"
```

### SDK

```bash
docker compose -f docker/agent-env/compose.yml run --rm sdk
```

Typical verification:

```bash
docker compose -f docker/agent-env/compose.yml run --rm sdk bash -lc "pnpm install && pnpm -w exec tsc -p tsconfig.json"
```

## Notes

- Do not bake secrets into images. Pass them at runtime via environment variables or secret managers.
- If you see permission issues on Linux, run with your host uid/gid: `--user "$(id -u):$(id -g)"`.

