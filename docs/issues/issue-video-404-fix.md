# Issue: Video 404 Error - Resolution

## Problem Statement

The walkthrough video at `https://testnet.jack.lukas.money/videos/walkthrough.mp4` returns a 404 error. This occurs because:
- Assets are bundled in Docker images
- Next.js static file serving is unreliable in production Cloud Run deployments
- No proper CDN or asset hosting infrastructure

## Solution Implemented

Created a comprehensive asset management system using Google Cloud Storage buckets with automated upload scripts and deployment integration.

## Changes Made

### 1. Infrastructure Scripts

**`scripts/upload-assets.ts`**
- TypeScript script to upload assets to GCS buckets
- Supports testnet and production environments
- Handles videos, images, icons, and manifests
- Sets proper content types and cache headers
- Includes dry-run mode for testing

**`scripts/setup-asset-bucket.sh`**
- Bash script to create and configure GCS buckets
- Sets up CORS, public access, and cache policies
- Idempotent (safe to run multiple times)

### 2. Package Scripts

Added to `package.json`:
```json
{
  "upload:assets": "node --import tsx scripts/upload-assets.ts",
  "upload:assets:testnet": "node --import tsx scripts/upload-assets.ts --env=testnet",
  "upload:assets:production": "node --import tsx scripts/upload-assets.ts --env=production",
  "setup:bucket": "bash scripts/setup-asset-bucket.sh",
  "setup:bucket:testnet": "bash scripts/setup-asset-bucket.sh testnet",
  "setup:bucket:production": "bash scripts/setup-asset-bucket.sh production"
}
```

### 3. Code Updates

**`apps/dashboard/src/components/Dashboard.tsx`**
- Updated video source to use CDN URL
- Falls back to local assets in development
- Pattern: `${process.env.NEXT_PUBLIC_CDN_URL}/videos/walkthrough.mp4`

**`apps/dashboard/Dockerfile`**
- Added `NEXT_PUBLIC_CDN_URL` build argument
- Passes CDN URL to Next.js build process

### 4. Deployment Integration

**`apps/dashboard/cloudbuild.testnet.yaml`**
- Added asset upload step before Docker build
- Uploads videos, images, and other assets
- Sets cache headers automatically
- Passes CDN URL to Docker build

**`apps/dashboard/cloudbuild.yaml`** (production)
- Same asset upload integration
- Uses production bucket

### 5. Environment Configuration

Updated environment files:
- `apps/dashboard/.env.local`
- `apps/dashboard/.env.testnet`
- `.env.production.example`

Added:
```bash
NEXT_PUBLIC_CDN_URL=https://storage.googleapis.com/jack-dashboard-testnet-assets
```

### 6. CI/CD Automation

**`.github/workflows/upload-assets.yml`**
- GitHub Actions workflow for asset uploads
- Triggers on:
  - Manual dispatch (workflow_dispatch)
  - Push to main (testnet)
  - Release published (production)
- Includes verification and summary steps

### 7. Documentation

Created comprehensive guides:
- `docs/ASSET_MANAGEMENT.md` - Complete asset management guide
- `docs/ASSET_MIGRATION_GUIDE.md` - Step-by-step migration instructions
- `apps/dashboard/ASSETS.md` - Quick reference for developers

### 8. Dependencies

Added `@google-cloud/storage` to devDependencies for asset upload functionality.

## Bucket Configuration

### Testnet
- **Bucket**: `jack-dashboard-testnet-assets`
- **URL**: `https://storage.googleapis.com/jack-dashboard-testnet-assets`
- **Location**: US
- **Access**: Public read
- **Cache**: 1 year immutable

### Production
- **Bucket**: `jack-dashboard-assets`
- **URL**: `https://storage.googleapis.com/jack-dashboard-assets`
- **Location**: US
- **Access**: Public read
- **Cache**: 1 year immutable

## Usage

### Initial Setup
```bash
# 1. Create and configure bucket
pnpm setup:bucket:testnet

# 2. Upload assets
pnpm upload:assets:testnet

# 3. Verify
curl -I https://storage.googleapis.com/jack-dashboard-testnet-assets/videos/walkthrough.mp4
```

### Adding New Assets
```bash
# 1. Add file to apps/dashboard/public/
cp new-asset.mp4 apps/dashboard/public/videos/

# 2. Upload
pnpm upload:assets:testnet

# 3. Reference in code
<video src={`${process.env.NEXT_PUBLIC_CDN_URL}/videos/new-asset.mp4`} />
```

### Deployment
Assets are automatically uploaded during Cloud Build deployment. No manual intervention needed after initial setup.

## Benefits

1. **Reliability**: GCS provides 99.95% availability SLA
2. **Performance**: Assets served from Google's infrastructure
3. **Scalability**: Handles high traffic without issues
4. **Cost-effective**: Pay only for storage and bandwidth used
5. **CDN-ready**: Easy to add Cloud CDN in the future
6. **Automated**: Integrated into deployment pipeline
7. **Versioned**: Assets can be versioned for cache busting

## Testing Checklist

- [x] Scripts created and executable
- [x] Package.json updated with commands
- [x] Code updated to use CDN URLs
- [x] Dockerfile updated with build args
- [x] Cloud Build configs updated
- [x] Environment files updated
- [x] GitHub Actions workflow created
- [x] Documentation written
- [x] Dependencies installed

## Next Steps

1. **Setup buckets** (requires GCP access):
   ```bash
   pnpm setup:bucket:testnet
   ```

2. **Upload assets**:
   ```bash
   pnpm upload:assets:testnet
   ```

3. **Deploy dashboard**:
   ```bash
   git push origin main
   ```

4. **Verify** video loads at:
   - Direct: `https://storage.googleapis.com/jack-dashboard-testnet-assets/videos/walkthrough.mp4`
   - Dashboard: `https://testnet.jack.lukas.money` (check video player)

## Rollback Plan

If issues occur:
1. Remove `NEXT_PUBLIC_CDN_URL` from environment
2. Assets will fall back to local `/public` directory
3. Redeploy dashboard

## Future Enhancements

- [ ] Cloud CDN integration for global edge caching
- [ ] Custom domain (assets.jack.lukas.money)
- [ ] Automatic video transcoding and optimization
- [ ] Asset versioning and rollback system
- [ ] Multi-region replication
- [ ] Monitoring and alerting for asset availability

## Files Changed

- `scripts/upload-assets.ts` (new)
- `scripts/setup-asset-bucket.sh` (new)
- `package.json` (modified)
- `apps/dashboard/src/components/Dashboard.tsx` (modified)
- `apps/dashboard/Dockerfile` (modified)
- `apps/dashboard/cloudbuild.testnet.yaml` (modified)
- `apps/dashboard/cloudbuild.yaml` (modified)
- `apps/dashboard/.env.local` (modified)
- `apps/dashboard/.env.testnet` (modified)
- `.env.production.example` (modified)
- `.github/workflows/upload-assets.yml` (new)
- `docs/ASSET_MANAGEMENT.md` (new)
- `docs/ASSET_MIGRATION_GUIDE.md` (new)
- `apps/dashboard/ASSETS.md` (new)
- `docs/issues/issue-video-404-fix.md` (new)

## Resolution Status

✅ **Implementation Complete**

Awaiting:
- GCP bucket setup (requires credentials)
- Initial asset upload
- Deployment and verification
