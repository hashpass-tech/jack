# JACK Docs Site

This documentation site is built with [Docusaurus](https://docusaurus.io/) and is configured for deployment at `https://docs.jack.lukas.money`.

## Installation

```bash
pnpm install
```

## Local Development

```bash
pnpm start
```

This command starts a local development server and opens a browser window. Most changes are reflected live without restarting.

## Build

```bash
pnpm build
```

This command generates static content into the `build` directory and can be served with any static hosting service.

## Deployment

- GitHub Pages workflow: `.github/workflows/deploy-docs-pages.yml`
- Custom domain source: `static/CNAME` (`docs.jack.lukas.money`)

From repo root:

```bash
pnpm release:docs
pnpm release:docs:deploy
```

## Documentation Map

- [Overview](./docs/overview.md)
- [Setup](./docs/setup.md)
- [Architecture](./docs/architecture.md)
- [Demo Script](./docs/demo-script.md)
- [Operations](./docs/operations/index.md)
- [Agent Orchestration](./docs/operations/agent-orchestration/index.md)
- [Agent Environment Readiness](./docs/operations/agent-orchestration/agent-environment.md)
