# Asset Management Guide

## Overview

The JACK Dashboard uses Google Cloud Storage (GCS) buckets to host static assets (videos, images) for reliable CDN delivery. This ensures assets are always available and performant across all environments.

## Architecture

### Buckets

- **Testnet**: `jack-dashboard-testnet-assets`
  - URL: `https://storage.googleapis.com/jack-dashboard-testnet-assets`
  - Used by: testnet.jack.lukas.money

- **Production**: `jack-dashboard-assets`
  - URL: `https://storage.googleapis.com/jack-dashboard-assets`
  - Used by: jack.lukas.money

### Asset Types

- **Videos** (`/videos/`): MP4 files (e.g., walkthrough.mp4)
- **Images**: PNG, JPG, SVG files
- **Icons**: Favicon files, app icons
- **Manifests**: Web app manifest files

## Setup

### 1. Create Buckets

```bash
# Testnet bucket
pnpm setup:bucket:testnet

# Production bucket
pnpm setup:bucket:production
```

This script will:
- Create the GCS bucket if it doesn't exist
- Configure CORS for cross-origin access
- Set public read permissions
- Configure cache headers (1 year immutable)

### 2. Upload Assets

```bash
# Upload to testnet
pnpm upload:assets:testnet

# Upload to production
pnpm upload:assets:production

# Dry run (preview without uploading)
pnpm upload:assets --env=testnet --dry-run
```

The upload script will:
- Scan `apps/dashboard/public/` for assets
- Upload videos, images, and other static files
- Set appropriate content types and cache headers
- Make files publicly accessible

## Usage in Code

Assets are referenced using the `NEXT_PUBLIC_CDN_URL` environment variable:

```tsx
// Before (local only)
<video src="/videos/walkthrough.mp4" />

// After (CDN-backed)
<video 
  src={process.env.NEXT_PUBLIC_CDN_URL 
    ? `${process.env.NEXT_PUBLIC_CDN_URL}/videos/walkthrough.mp4` 
    : "/videos/walkthrough.mp4"
  } 
/>
```

This pattern:
- Uses CDN when available (production/testnet)
- Falls back to local files in development
- Maintains compatibility across environments

## Deployment Integration

### Cloud Build

Asset upload is integrated into the Cloud Build pipeline:

1. **Upload assets** to GCS bucket
2. **Build Docker image** with CDN URL
3. **Deploy** to Cloud Run

See `apps/dashboard/cloudbuild.testnet.yaml` and `apps/dashboard/cloudbuild.yaml` for implementation.

### Environment Variables

Set in `.env` files:

```bash
# Testnet
NEXT_PUBLIC_CDN_URL=https://storage.googleapis.com/jack-dashboard-testnet-assets

# Production
NEXT_PUBLIC_CDN_URL=https://storage.googleapis.com/jack-dashboard-assets
```

## Manual Operations

### List bucket contents

```bash
gsutil ls -r gs://jack-dashboard-testnet-assets
```

### Upload single file

```bash
gsutil cp apps/dashboard/public/videos/walkthrough.mp4 \
  gs://jack-dashboard-testnet-assets/videos/walkthrough.mp4
```

### Set cache headers

```bash
gsutil setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  gs://jack-dashboard-testnet-assets/videos/walkthrough.mp4
```

### Make file public

```bash
gsutil acl ch -u AllUsers:R \
  gs://jack-dashboard-testnet-assets/videos/walkthrough.mp4
```

## Troubleshooting

### 404 Errors

If assets return 404:

1. **Check bucket exists**:
   ```bash
   gsutil ls gs://jack-dashboard-testnet-assets
   ```

2. **Verify file uploaded**:
   ```bash
   gsutil ls gs://jack-dashboard-testnet-assets/videos/
   ```

3. **Check permissions**:
   ```bash
   gsutil iam get gs://jack-dashboard-testnet-assets
   ```

4. **Re-upload assets**:
   ```bash
   pnpm upload:assets:testnet
   ```

### CORS Issues

If browser blocks requests:

```bash
# Check CORS config
gsutil cors get gs://jack-dashboard-testnet-assets

# Re-apply CORS
pnpm setup:bucket:testnet
```

### Cache Issues

If old assets are served:

1. **Update with new filename** (recommended for immutable cache)
2. **Or clear CDN cache** (if using Cloud CDN)
3. **Or change cache headers**:
   ```bash
   gsutil setmeta -h "Cache-Control:public, max-age=300" \
     gs://jack-dashboard-testnet-assets/videos/walkthrough.mp4
   ```

## Best Practices

1. **Version assets**: Use versioned filenames for breaking changes (e.g., `walkthrough-v2.mp4`)
2. **Optimize before upload**: Compress videos and images before uploading
3. **Test locally first**: Use `--dry-run` to preview uploads
4. **Monitor costs**: Check GCS usage in Google Cloud Console
5. **Use immutable cache**: Set long cache times for static assets

## Cost Optimization

- **Storage**: ~$0.02/GB/month (Standard storage)
- **Bandwidth**: ~$0.12/GB (first 1TB)
- **Operations**: Minimal cost for GET requests

Tips:
- Compress videos (use H.264 codec, reasonable bitrate)
- Use appropriate image formats (WebP for photos, SVG for icons)
- Set long cache headers to reduce bandwidth

## Future Enhancements

- [ ] Cloud CDN integration for faster global delivery
- [ ] Custom domain (assets.jack.lukas.money)
- [ ] Automatic asset optimization pipeline
- [ ] Asset versioning and rollback
- [ ] Multi-region replication
