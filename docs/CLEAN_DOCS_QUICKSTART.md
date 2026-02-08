# Clean Docs - Quick Start Guide

## What It Does

Automatically archives non-essential markdown files from the root directory to `docs/archive/` to keep the repository clean.

## Usage

### Automatic (Recommended)

The script runs automatically on every commit:

```bash
git add .
git commit -m "your message"
# → clean:docs runs automatically
```

### Manual

Run anytime to clean up the root:

```bash
pnpm clean:docs
```

## What Stays in Root

Only these essential files:
- ✅ `README.md`
- ✅ `CHANGELOG.md`
- ✅ `LICENSE.md` / `LICENSE`
- ✅ `CONTRIBUTING.md`
- ✅ `CODE_OF_CONDUCT.md`
- ✅ `SECURITY.md`

## What Gets Archived

Everything else:
- 📦 Release summaries (`SDK_RELEASE_*.md`)
- 📦 Integration reports (`*_INTEGRATION_SUMMARY.md`)
- 📦 Status files (`*_STATUS.md`)
- 📦 Setup guides (`*_SETUP.md`)
- 📦 Task summaries (`TASK_COMPLETION_SUMMARY.md`)
- 📦 All other `.md` files

## Archive Location

```
docs/archive/FILENAME_YYYY-MM-DD.md
```

## Examples

### Creating a Summary File

```bash
# Create file
echo "# Summary" > MY_SUMMARY.md

# Commit (auto-archives)
git add MY_SUMMARY.md
git commit -m "docs: add summary"
# → Moved to docs/archive/MY_SUMMARY_2026-02-08.md
```

### Updating Essential Files

```bash
# Edit essential file (stays in root)
vim README.md
git commit -am "docs: update README"
# → README.md stays in root
```

### Finding Archived Files

```bash
# List all archived files
ls docs/archive/

# Find specific file
ls docs/archive/ | grep SDK_RELEASE

# View archived file
cat docs/archive/SDK_RELEASE_v1.2.1_2026-02-08.md
```

## Configuration

### Add File to Keep in Root

Edit `scripts/clean-docs.ts`:

```typescript
const KEEP_IN_ROOT = new Set([
  'README.md',
  'CHANGELOG.md',
  // Add your file here
  'MY_IMPORTANT_FILE.md',
]);
```

### Disable Auto-Archive

Edit `.husky/pre-commit` and remove:

```bash
pnpm clean:docs
```

## Troubleshooting

### Script Fails

```bash
# Skip hooks temporarily
git commit --no-verify

# Or fix and retry
pnpm clean:docs
```

### Need Archived File

```bash
# Copy back to root (if really needed)
cp docs/archive/FILENAME_2026-02-08.md ./FILENAME.md
```

## More Info

See `docs/DOCUMENTATION_MANAGEMENT.md` for complete documentation.

## Quick Commands

```bash
# Clean root manually
pnpm clean:docs

# Check what's in root
ls *.md

# Check archive
ls docs/archive/

# Count archived files
ls docs/archive/*.md | wc -l
```

---

**TL;DR**: The script keeps your root clean by auto-archiving non-essential docs on every commit. Essential files (README, CHANGELOG, LICENSE) always stay in root.
