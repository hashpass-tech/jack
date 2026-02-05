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
4. Sync landing build to the configured GCS bucket.
5. Deploy dashboard to Cloud Run.

## Testnet Dashboard (Cloud Build)
Config file: `apps/dashboard/cloudbuild.testnet.yaml`

Create a Cloud Build trigger:
- **Repo**: hashpass-tech/JACK
- **Branch**: develop
- **Config**: `apps/dashboard/cloudbuild.testnet.yaml`

## Landing (GCS Bucket)
The landing build is deployed to the bucket configured in `.env.testnet` for testnet and `.env` for prod.

## Notes
- Keep secrets in CI/Cloud Build or Secret Manager; never commit them.
- If the public site shows stale assets, invalidate CDN cache for `/` and `/assets/*`.
