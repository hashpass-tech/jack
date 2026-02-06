<div align="center">
<img width="400" alt="JACK Logo" src="./apps/landing/public/Jack.png" />
</div>

# JACK - XChain Exec Kernel

[![Docs](https://img.shields.io/badge/docs-latest-blue.svg)](https://github.com/hashpass-tech/jack/docs)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Overview

JACK is a cross-chain execution kernel that enables seamless interoperability between different blockchain networks. **Mission:** provide deterministic, intent-first execution by pairing a Kernel state machine with policy Hooks that enforce routing and settlement guardrails.

## Architecture

```mermaid
graph TB
    A[User Interface] --> B[JACK Core]
    B --> C[Policy Hook]
    B --> D[Settlement Adapter]
    C --> E[Chain A]
    C --> F[Chain B]
    D --> G[Cross-Chain Bridge]
    G --> H[Destination Chain]
    
    subgraph "JACK Components"
        B
        C
        D
    end
    
    subgraph "Blockchain Networks"
        E
        F
        H
    end
```

## Features

- **Cross-Chain Execution**: Execute transactions across multiple blockchain networks
- **Policy Management**: Flexible policy hooks for transaction validation
- **Settlement Layer**: Robust settlement adapter for finalizing cross-chain operations
- **Developer SDK**: Comprehensive SDK for integration with existing applications
- **Dashboard Interface**: Intuitive web dashboard for monitoring and management

## 3-Step Setup Guide

**Prerequisites:** Node.js, Git

1. **Clone + install**
   ```bash
   git clone https://github.com/hashpass-tech/jack.git
   cd jack
   pnpm install
   ```

2. **Configure environment**
   ```bash
   cp .env.production.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Run the apps**
   ```bash
   pnpm dev:landing   # http://localhost:3000
   pnpm dev:dashboard # http://localhost:3001
   pnpm dev:docs      # http://localhost:3002
   ```

   Or run all apps concurrently:
   ```bash
   pnpm dev:all
   ```

## Project Structure

```
jack/
├── apps/
│   ├── dashboard/          # Web dashboard
│   ├── docs/              # Docusaurus documentation app
│   └── landing/           # Landing page
├── contracts/             # Smart contracts
├── packages/
│   └── sdk/               # TypeScript SDK
├── components/            # Shared React components
└── docs/                  # Documentation
```

## Documentation

- [Docs Platform](https://docs.jack.lukas.money)
- [Mission & Overview](./apps/docs/docs/overview.md)
- [Architecture](./apps/docs/docs/architecture.md)
- [Demo Narrative](./docs/demo-script.md)
- [Contracts Deployment Runbook](./apps/docs/docs/operations/contracts-deployment.md)
- [MVP Critical Roadmap](./apps/docs/docs/operations/mvp-critical-roadmap.md)

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Releases

Releases are driven by `@edcalderon/versioning` and the `pnpm release*` scripts in the root package. After you commit every change set, run the release helper to bump the version, regenerate the changelog, build `landing` + `dashboard`, and (optionally) run the docs release step and sync artifacts to your configured GCloud buckets.

Supported commands:

```bash
pnpm release        # patch release
pnpm release:minor  # minor release
pnpm release:major  # major release
pnpm release -- --with-docs         # include docs build
pnpm release -- --with-docs-deploy  # include docs build + trigger Pages deploy workflow
pnpm release:docs                   # docs-only build
pnpm release:docs:deploy            # docs-only build + workflow dispatch
```

The helper respects these environment variables to upload every release to GCloud:

- `GCLOUD_PROJECT`: target GCloud project ID.
- `GCLOUD_LANDING_BUCKET`: target bucket for the landing build (`dist/`).
- `GCLOUD_LANDING_REGION`: bucket region (defaults to `us-west1` in setup script).
- `GCLOUD_WHITEPAPER_BUCKET`: optional bucket to keep the `public/whitepapper/` exports in sync with the release path.
- `GCLOUD_RUN_SERVICE`: Cloud Run service name for the dashboard deployment.
- `GCLOUD_RUN_REGION`: Cloud Run region (e.g. `us-west1`).
- `GCLOUD_RUN_ALLOW_UNAUTH`: set to `true` to allow unauthenticated access.
- `GOOGLE_APPLICATION_CREDENTIALS`: path to a service account JSON key used for `gcloud`/`gsutil` auth.

The script uses `gsutil -m rsync -r` to mirror the built artifacts into `gs://<bucket>/` and `gs://<bucket>/releases/v<version>/…`, then deploys the dashboard to Cloud Run if `GCLOUD_RUN_SERVICE` is defined. Make sure `gcloud` + `gsutil` are installed and authenticated before running the release command.

### Docs deployment + DNS

- GitHub Pages workflow: `.github/workflows/deploy-docs-pages.yml`
- Docs custom domain file: `apps/docs/static/CNAME`
- Cloud DNS helper: `scripts/gcloud/configure-docs-dns.sh`

Example DNS mapping command:

```bash
GCLOUD_PROJECT=your-project \
GCLOUD_DNS_ZONE=lukas-money \
DOCS_DOMAIN=docs.jack.lukas.money \
DOCS_GITHUB_PAGES_TARGET=hashpass-tech.github.io \
./scripts/gcloud/configure-docs-dns.sh
```

### Testnet setup

Use the helper scripts in `scripts/gcloud/` to configure a bucket for `https://testnet.jack.lukas.money` and deploy the current `develop` release:

```bash
GCLOUD_PROJECT=your-project \
GCLOUD_LANDING_BUCKET=your-landing-bucket \
GCLOUD_LANDING_REGION=us-west1 \
GCLOUD_LANDING_PUBLIC=true \
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
./scripts/gcloud/setup-testnet.sh

GCLOUD_PROJECT=your-project \
GCLOUD_LANDING_BUCKET=your-landing-bucket \
GCLOUD_RUN_SERVICE=jack-dashboard-testnet \
GCLOUD_RUN_REGION=us-west1 \
GCLOUD_RUN_ALLOW_UNAUTH=true \
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
./scripts/gcloud/deploy-testnet.sh
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
