# Documentation Management

This document describes the automated documentation management system for the JACK monorepo.

## Overview

The repository uses an automated system to keep the root directory clean by archiving non-essential documentation files to `docs/archive/`.

## Essential Root Files

Only these files should remain in the root directory:

- **README.md** - Project overview, getting started guide
- **CHANGELOG.md** - Version history and release notes
- **LICENSE.md** / **LICENSE** - Project license
- **CONTRIBUTING.md** - Contribution guidelines
- **CODE_OF_CONDUCT.md** - Community standards
- **SECURITY.md** - Security policies and reporting

## Archived Files

All other markdown files are automatically archived, including:

- SDK release summaries (`SDK_RELEASE_*.md`)
- Integration summaries (`*_INTEGRATION_SUMMARY.md`)
- Deployment reports (`*_DEPLOYMENT_REPORT.md`)
- Verification reports (`*_VERIFICATION_REPORT.md`)
- Status files (`*_STATUS.md`)
- Setup guides (`*_SETUP.md`)
- Task completion summaries (`TASK_COMPLETION_SUMMARY.md`)
- PR integration reports (`PR_INTEGRATION_SUMMARY.md`)
- Workflow documentation (`*_WORKFLOW.md`)

## Automatic Archiving

The `clean:docs` script runs automatically in these scenarios:

### 1. Pre-Commit Hook

Every time you commit, the script runs to archive any new documentation files:

```bash
git add .
git commit -m "your message"
# → clean:docs runs automatically
```

### 2. Manual Execution

You can manually run the script anytime:

```bash
pnpm clean:docs
```

### 3. Release Process

The script should be integrated into the release workflow to ensure clean releases.

## How It Works

### Script Location

```
scripts/clean-docs.ts
```

### Archive Location

```
docs/archive/
```

### Archive Format

Files are archived with timestamps:

```
ORIGINAL_FILENAME_YYYY-MM-DD.md
```

If multiple files are archived on the same day:

```
ORIGINAL_FILENAME_YYYY-MM-DD_HH-MM-SS-mmm.md
```

### Example

```bash
# Before
./SDK_RELEASE_v1.2.1.md

# After archiving
./docs/archive/SDK_RELEASE_v1.2.1_2026-02-08.md
```

## Configuration

### Adding Files to Keep in Root

Edit `scripts/clean-docs.ts` and add to the `KEEP_IN_ROOT` set:

```typescript
const KEEP_IN_ROOT = new Set([
  'README.md',
  'CHANGELOG.md',
  'LICENSE.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  // Add your file here
  'YOUR_FILE.md',
]);
```

### Disabling Auto-Archive

To disable automatic archiving on commit, remove from `.husky/pre-commit`:

```bash
# Remove this line:
pnpm clean:docs
```

## Best Practices

### When Creating Documentation

1. **Temporary docs** (summaries, reports, status) → Will be auto-archived
2. **Permanent docs** (README, CHANGELOG) → Add to `KEEP_IN_ROOT`
3. **Feature docs** → Place in `docs/` or `apps/docs/docs/` directly

### When Referencing Archived Files

1. Check `docs/archive/` for the file with timestamp
2. Most recent version has the latest date
3. Files are preserved for historical reference

### When Updating Essential Files

Essential files (README, CHANGELOG, etc.) are never archived, so update them freely:

```bash
# These are safe to edit anytime
vim README.md
vim CHANGELOG.md
git commit -m "docs: update README"
# → Files stay in root
```

## Integration with Release Process

### Current Integration

The script is integrated into:
- ✅ Pre-commit hook (`.husky/pre-commit`)
- ✅ Manual execution (`pnpm clean:docs`)

### Recommended Integration

Add to release scripts:

```json
{
  "scripts": {
    "release": "pnpm clean:docs && node scripts/release.js patch",
    "release:minor": "pnpm clean:docs && node scripts/release.js minor",
    "release:major": "pnpm clean:docs && node scripts/release.js major"
  }
}
```

## Troubleshooting

### Script Fails on Commit

If the script fails during commit:

```bash
# Check what files would be archived
pnpm clean:docs

# If there's an error, fix it and retry
git commit --no-verify  # Skip hooks temporarily
```

### Need to Restore Archived File

```bash
# Find the file in archive
ls docs/archive/ | grep FILENAME

# Copy back to root (if really needed)
cp docs/archive/FILENAME_2026-02-08.md ./FILENAME.md

# Or just reference it from archive
cat docs/archive/FILENAME_2026-02-08.md
```

### Want to Keep a File in Root

Add it to `KEEP_IN_ROOT` in `scripts/clean-docs.ts`:

```typescript
const KEEP_IN_ROOT = new Set([
  // ... existing files
  'MY_IMPORTANT_FILE.md',
]);
```

## Archive Maintenance

### Periodic Cleanup

The archive directory will grow over time. Consider:

1. **Quarterly review** - Remove very old files (>1 year)
2. **Consolidation** - Merge similar reports into summary docs
3. **Compression** - Zip old archives to save space

### Archive Size

Monitor archive size:

```bash
du -sh docs/archive/
```

If it grows too large (>100MB), consider:
- Removing files older than 1 year
- Creating yearly archive subdirectories
- Compressing old files

## Examples

### Example 1: Creating a Release Summary

```bash
# Create release summary
echo "# Release Summary" > SDK_RELEASE_v1.3.0.md

# Commit (auto-archives)
git add SDK_RELEASE_v1.3.0.md
git commit -m "docs: add SDK v1.3.0 release summary"
# → File automatically moved to docs/archive/SDK_RELEASE_v1.3.0_2026-02-08.md
```

### Example 2: Updating CHANGELOG

```bash
# Update CHANGELOG (stays in root)
vim CHANGELOG.md
git add CHANGELOG.md
git commit -m "docs: update changelog for v1.3.0"
# → CHANGELOG.md stays in root (it's in KEEP_IN_ROOT)
```

### Example 3: Manual Archive

```bash
# Create multiple summary files
touch SUMMARY1.md SUMMARY2.md SUMMARY3.md

# Archive them all at once
pnpm clean:docs
# → All moved to docs/archive/ with timestamps
```

## Summary

The documentation management system:

- ✅ Keeps root directory clean and organized
- ✅ Preserves all documentation in timestamped archives
- ✅ Runs automatically on every commit
- ✅ Configurable via `KEEP_IN_ROOT` set
- ✅ Easy to use: `pnpm clean:docs`
- ✅ Integrated with git hooks

This ensures the repository stays clean while preserving all historical documentation for reference and audit purposes.
