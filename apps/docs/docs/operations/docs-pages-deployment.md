---
title: Docs Pages Deployment
sidebar_position: 6
---

# Docs Pages Deployment

This runbook covers how JACK docs are deployed to GitHub Pages and mapped to `docs.jack.lukas.money`.

## Deployment Workflow

- Workflow file: `.github/workflows/deploy-docs-pages.yml`
- Trigger: push to `main` when docs or workflow files change
- Manual trigger: `workflow_dispatch`
- Build output: `apps/docs/build`

The docs app includes `apps/docs/static/CNAME`, so every deploy keeps the custom domain pinned to:

```txt
docs.jack.lukas.money
```

## Docs Governance Automation

- PR docs-impact gate: `.github/workflows/docs-impact.yml`
- Merge-time docs changelog writer: `.github/workflows/docs-changelog.yml`
- Version/changelog sync check: `.github/workflows/version-sync.yml`
- Whitepaper artifact validation: `pnpm whitepaper:validate`
- Check script: `scripts/check-doc-impact.js`
- Changelog updater: `scripts/update-docs-changelog.js`
- Version sync checker: `scripts/check-version-sync.js`

If critical contract/API/SDK paths are changed, PRs must include docs updates or explicit no-impact metadata:

```txt
DOCS_IMPACT: none
DOCS_IMPACT_NOTE: <why docs are not required>
```

`deploy-docs-pages.yml` also runs version sync and whitepaper validation before docs build, so root/dashboard versions, changelog entries, and whitepaper manifest/assets stay aligned.
## GitHub Repository Settings

1. Open repository settings: `Settings -> Pages`.
2. Set **Source** to **GitHub Actions**.
3. Ensure the Pages environment deploys successfully at least once from the workflow.

## Release Script Integration

Standalone docs release:

```bash
pnpm release:docs
```

Build + trigger Pages deploy workflow:

```bash
pnpm release:docs:deploy
```

Integrate docs into standard release script:

```bash
pnpm release -- --with-docs
pnpm release:minor -- --with-docs-deploy
```

- `--with-docs`: build docs during release.
- `--with-docs-deploy`: build docs and dispatch the Pages workflow.

## Cloud DNS Mapping (GCloud)

Use the helper script:

```bash
GCLOUD_PROJECT=<project-id> \
GCLOUD_DNS_ZONE=<managed-zone-name> \
DOCS_DOMAIN=docs.jack.lukas.money \
DOCS_GITHUB_PAGES_TARGET=hashpass-tech.github.io \
./scripts/gcloud/configure-docs-dns.sh
```

Optional:

- `DOCS_DNS_TTL` (default `300`)
- `GOOGLE_APPLICATION_CREDENTIALS` (service account key path)

## Verification

```bash
dig +short docs.jack.lukas.money
```

Expected result: CNAME chain to `hashpass-tech.github.io` and GitHub Pages IPs.

Then verify site headers:

```bash
curl -I https://docs.jack.lukas.money
```
