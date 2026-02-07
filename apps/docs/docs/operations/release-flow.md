---
title: Release Flow
sidebar_position: 5
---

# Release Flow (Testnet & Mainnet)

## Summary

- **Develop** → testnet
- **Main** → mainnet

This repo uses the release script to bump versions, build, deploy, and create Git tags automatically.

## Tagging Policy

- **Main (prod)**: annotated tag `vX.Y.Z`
- **Develop (testnet)**: annotated tag `vX.Y.Z-testnet.N` (N increments per version)

This avoids confusion and keeps production tags clean.

## Release Script Behavior

Location: `scripts/release.js`

On every release:

1. Run `pnpm exec versioning <level>` to bump versions.
2. Create a tag based on the current branch:
   - `develop` → `vX.Y.Z-testnet.N`
   - `main`/`master` → `vX.Y.Z`
3. Build landing and dashboard.
4. Optionally build docs and trigger docs Pages deployment (`--with-docs` / `--with-docs-deploy`).
5. Sync landing build to the configured GCS bucket.
6. Deploy dashboard to Cloud Run.

### Docs Release Options

```bash
pnpm release:all
pnpm release:all:minor
pnpm release:all:major
pnpm release -- --with-docs
pnpm release -- --with-docs-deploy
pnpm release -- --skip-deploy
pnpm release:docs
pnpm release:docs:deploy
pnpm whitepaper:build
pnpm whitepaper:validate
pnpm docs:impact:check
pnpm version:check
```

`release:all*` runs the same version bump pipeline and always includes docs deployment, so landing, dashboard, and docs publish under the same semver build.

### Whitepaper Build Integration

- Canonical metadata: `whitepaper/manifest.json`
- Canonical LaTeX sources: `whitepaper/tex/*.tex`
- Canonical markdown companion: `whitepaper/markdown/*.md`

Every `pnpm release*` run now executes `pnpm whitepaper:build` before app builds. This compiles PDFs and syncs the manifest/artifacts into:

- `apps/landing/public/whitepaper/` (canonical)
- `apps/docs/static/whitepaper/` (docs downloads/embeds)
- `apps/landing/public/whitepapper/` and `apps/docs/static/whitepapper/` (legacy compatibility)

Docs deployment and DNS details are documented in [Docs Pages Deployment](./docs-pages-deployment.md).

### Testnet vs Mainnet Version Enforcement

- Testnet releases **require** `develop` to include the latest `main` history.
- Production releases will **fast-forward** `develop` to `main` when possible.
- If branches have diverged, the release will fail with instructions to merge manually.

## Testnet Dashboard (Cloud Build)

Config file: `apps/dashboard/cloudbuild.testnet.yaml`

Create a Cloud Build trigger:

- **Repo**: hashpass-tech/JACK
- **Branch**: develop
- **Config**: `apps/dashboard/cloudbuild.testnet.yaml`

## Landing (GCS Bucket)

The landing build is deployed to the bucket configured in `.env.testnet` for testnet and `.env.production` for prod.

## Production Setup Checklist

1. Create a **production** GCS bucket for landing (and enable static website hosting).
2. Create a **backend bucket + URL map** that serves https://jack.lukas.money.
3. Point DNS for `jack.lukas.money` to the load balancer IP.
4. Create `.env.production` locally (see `.env.production.example`).
5. Run release from `main` to publish `vX.Y.Z` tags and deploy mainnet.

## Notes

- Keep secrets in CI/Cloud Build or Secret Manager; never commit them.
- If the public site shows stale assets, invalidate CDN cache for `/` and `/assets/*`.
