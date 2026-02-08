# Asset Upload Quick Start

## Fix the 404 Video Error

The video at `https://testnet.jack.lukas.money/videos/walkthrough.mp4` returns 404. Here's how to fix it:

### Step 1: Setup Bucket (One-time)
```bash
pnpm setup:bucket:testnet
```

This creates a GCS bucket with proper permissions and caching.

### Step 2: Upload Assets
```bash
pnpm upload:assets:testnet
```

This uploads all videos and images from `apps/dashboard/public/` to the bucket.

### Step 3: Verify
```bash
# Test direct access
curl -I https://storage.googleapis.com/jack-dashboard-testnet-assets/videos/walkthrough.mp4

# Should return HTTP 200
```

### Step 4: Deploy
```bash
git push origin main
```

The Cloud Build pipeline will automatically upload assets and deploy with the CDN URL.

### Step 5: Test in Browser
Visit `https://testnet.jack.lukas.money` and verify the video loads.

## That's It!

The video will now load from Google Cloud Storage instead of the Docker container.

## For Production

When ready for production:
```bash
pnpm setup:bucket:production
pnpm upload:assets:production
```

## Troubleshooting

**Video still 404?**
```bash
# Check if file exists
gsutil ls gs://jack-dashboard-testnet-assets/videos/

# Re-upload
pnpm upload:assets:testnet
```

**Need more help?**
- See [Asset Management Guide](docs/ASSET_MANAGEMENT.md)
- See [Migration Guide](docs/ASSET_MIGRATION_GUIDE.md)
- See [Dashboard Assets](apps/dashboard/ASSETS.md)

## What Changed?

1. ✅ Created GCS buckets for asset hosting
2. ✅ Added upload scripts (`pnpm upload:assets`)
3. ✅ Updated code to use CDN URLs
4. ✅ Integrated into deployment pipeline
5. ✅ Added GitHub Actions automation

All assets now load from reliable GCS buckets with proper caching and CDN-ready infrastructure.
