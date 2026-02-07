---
title: Documentation Governance
sidebar_position: 8
---

# Documentation Governance

This runbook defines how JACK keeps docs aligned with contract and API behavior.

## Critical Change Paths

The docs-impact gate treats these paths as critical:

- `contracts/**` (excluding vendored `contracts/lib/**`)
- `apps/dashboard/src/app/api/**`
- `apps/dashboard/src/lib/**` integration paths (`lifi`, `yellow`, `intent`, `quote`, `route`, `execution`, `provider`)
- `packages/sdk/**`
- `scripts/contracts/**`

If a PR touches these paths, it must either:

1. Update docs (`README.md` and/or `apps/docs/docs/**`), or
2. Declare explicit no-impact metadata in PR body:

```txt
DOCS_IMPACT: none
DOCS_IMPACT_NOTE: <clear reason>
```

## PR Metadata Contract

Every PR should include:

```txt
DOCS_IMPACT: required|none
DOCS_IMPACT_NOTE: short explanation
DOC_CHANGELOG: one-line merged summary
```

Template location: `.github/pull_request_template.md`

## Automation

- PR gate workflow: `.github/workflows/docs-impact.yml`
- Check script: `scripts/check-doc-impact.js`
- Merge changelog workflow: `.github/workflows/docs-changelog.yml`
- Changelog updater script: `scripts/update-docs-changelog.js`
- Output changelog page: `apps/docs/docs/operations/documentation-changelog.md`

## Local Validation

Before opening a PR, run:

```bash
BASE_SHA=$(git merge-base HEAD origin/develop) \
HEAD_SHA=$(git rev-parse HEAD) \
node scripts/check-doc-impact.js
```

Adjust `origin/develop` to `origin/main` when your target branch is production.
