<div align="center">
<img width="400" alt="JACK Logo" src="./apps/landing/public/Jack.png" />
</div>

# JACK - XChain Exec Kernel

[![Docs](https://img.shields.io/badge/docs-latest-blue.svg)](https://github.com/hashpass-tech/jack/docs)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Overview

JACK is a cross-chain execution kernel that enables seamless interoperability between different blockchain networks. This project provides a robust infrastructure for executing cross-chain transactions and managing multi-chain operations.

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

## Quick Start

**Prerequisites:** Node.js, Git

1. Clone the repository:
   ```bash
   git clone https://github.com/hashpass-tech/jack.git
   cd jack
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables (if needed):
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Run the landing page (http://localhost:3000):
   ```bash
   pnpm dev:landing
   ```

5. In another terminal, run the dashboard (http://localhost:3001):
   ```bash
   pnpm dev:dashboard
   ```

6. Or run both concurrently:
   ```bash
   pnpm dev:all
   ```

## Project Structure

```
jack/
├── apps/
│   ├── dashboard/          # Web dashboard
│   └── landing/           # Landing page
├── contracts/             # Smart contracts
├── packages/
│   └── sdk/               # TypeScript SDK
├── components/            # Shared React components
└── docs/                  # Documentation
```

## Documentation

- [API Reference](./docs/api.md)
- [Smart Contract Integration](./docs/contracts.md)
- [SDK Usage Guide](./docs/sdk.md)
- [Deployment Guide](./docs/deployment.md)

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Releases

Releases are driven by `@edcalderon/versioning` and the `pnpm release*` scripts in the root package. After you commit every change set, run the release helper to bump the version, regenerate the changelog, build `landing` + `dashboard`, and (optionally) sync the artifacts to your configured GCloud buckets.

Supported commands:

```bash
pnpm release        # patch release
pnpm release:minor  # minor release
pnpm release:major  # major release
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
