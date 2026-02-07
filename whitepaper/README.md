# Whitepaper Source of Truth

This directory is the canonical source for JACK whitepaper versioning.

## Structure

- `manifest.json`: latest version pointer, release metadata, changelog, and source pointers.
- `tex/`: versioned LaTeX source files.
- `markdown/`: simplified markdown companions used in docs.

## Build and Sync

```bash
pnpm whitepaper:build
```

This compiles `.tex -> .pdf` (local LaTeX or Docker fallback), then syncs artifacts to:

- `apps/landing/public/whitepaper/` (canonical public downloads)
- `apps/docs/static/whitepaper/` (Docusaurus downloads/embeds)
- legacy compatibility mirrors under `whitepapper/`

It also updates docs outputs:

- `apps/docs/docs/whitepaper/changelog.md` (generated from manifest)
- `apps/docs/docs/whitepaper/whitepaper-v<latest>.md` (copied from markdown companion)

## Validation

```bash
pnpm whitepaper:validate
```

This verifies:

- manifest format and latest version consistency
- all versioned PDF artifacts exist in landing/docs public trees
- canonical PDF is byte-equal to latest versioned PDF
- public manifest copies match canonical manifest
- docs changelog + markdown companion are synced
