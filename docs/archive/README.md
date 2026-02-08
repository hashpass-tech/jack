# Documentation Archive

This directory contains archived documentation files that were previously in the root directory.

## Purpose

The root directory should only contain essential documentation files like:
- `README.md` - Project overview and getting started
- `CHANGELOG.md` - Version history and changes
- `LICENSE.md` - Project license
- `CONTRIBUTING.md` - Contribution guidelines
- `CODE_OF_CONDUCT.md` - Community guidelines
- `SECURITY.md` - Security policies

All other documentation files (summaries, reports, status files, etc.) are automatically archived here to keep the root clean and organized.

## Archive Format

Files are archived with a timestamp suffix:
```
ORIGINAL_FILENAME_YYYY-MM-DD.md
```

If multiple files are archived on the same day, a full timestamp is added:
```
ORIGINAL_FILENAME_YYYY-MM-DD_HH-MM-SS.md
```

## Automatic Archiving

The `clean:docs` script runs automatically:
- **On every commit** (via pre-commit hook)
- **On every release** (via release workflow)
- **Manually** via `pnpm clean:docs`

## Manual Archiving

To manually archive documentation files:

```bash
pnpm clean:docs
```

This will move all non-essential `.md` files from the root to this archive directory.

## Retrieving Archived Files

If you need to reference an archived file:

1. Check this directory for the file with timestamp
2. The most recent version will have the latest date
3. Copy or move it back to root if needed (but consider if it should stay in root)

## Best Practices

- Keep root documentation minimal and essential
- Use this archive for historical reference
- Summary and status files should be archived after completion
- Integration reports should be archived after merge
- Release notes can be archived after the release is stable

## Archive Contents

This directory contains:
- SDK release summaries and reports
- Integration summaries (LI.FI, Yellow, etc.)
- PR integration reports
- Workflow fix summaries
- Deployment reports
- Verification reports
- Task completion summaries
- Other temporary documentation

All files are preserved for historical reference and audit purposes.
