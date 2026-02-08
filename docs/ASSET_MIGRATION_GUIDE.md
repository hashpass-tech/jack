# Asset Migration Guide

## Problem

The dashboard video at `https://testnet.jack.lukas.money/videos/walkthrough.mp4` returns 404 because:
1. Assets are bundled in the Docker image
2. Next.js static file serving can be unreliable in production
3. No CDN or proper asset hosting infrastructure

## Solution

Move all public assets (videos, images) to Google Cloud Storage buckets with:
- Reliable hosting and availability
- CDN-ready infrastructure
- Proper cache headers
- Public accessibility

## Migration Steps

### 1. Setup Infrastructure (One-time)

```bash
# Install dependencies
pnpm install

# Create and configure testnet bucket
pnpm setup:bucket:testnet

# Create and configure production bucket (when ready)
pnpm setup:bucket:production
```

This creates:
- GCS buckets with public read access
- CORS configuration for cross-origin requests
- Cache headers (1 year immutable)

### 2. Upload Existing Assets

```bash
# Upload to testnet
pnpm upload:assets:testnet

# Verify upload
gsutil ls gs://jack-dashboard-testnet-assets/videos/
```

Expected output:
```
gs://jack-dashboard-testnet-assets/videos/walkthrough.mp4
```

### 3. Test Asset Access

```bash
# Test direct access
curl -I https://storage.googleapis.com/jack-dashboard-testnet-assets/videos/walkthrough.mp4

# Should return:
# HTTP/2 200
# content-type: video/mp4
# cache-control: public, max-age=31536000, immutable
```

### 4. Update Environment Variables

Already done in:
- `apps/dashboard/.env.local`
- `apps/dashboard/.env.testnet`
- `.env.production.example`

```bash
NEXT_PUBLIC_CDN_URL=https://storage.googleapis.com/jack-dashboard-testnet-assets
```

### 5. Update Code References

Already done in `apps/dashboard/src/components/Dashboard.tsx`:

```tsx
// Before
<video src="/videos/walkthrough.mp4" />

// After
<video 
  src={process.env.NEXT_PUBLIC_CDN_URL 
    ? `${process.env.NEXT_PUBLIC_CDN_URL}/videos/walkthrough.mp4` 
    : "/videos/walkthrough.mp4"
  } 
/>
```

### 6. Update Deployment Pipeline

Already done in:
- `apps/dashboard/cloudbuild.testnet.yaml`
- `apps/dashboard/cloudbuild.yaml`
- `apps/dashboard/Dockerfile`

Cloud Build now:
1. Uploads assets to GCS
2. Builds Docker image with CDN URL
3. Deploys to Cloud Run

### 7. Deploy and Verify

```bash
# Trigger testnet deployment
git push origin main

# After deployment, verify:
# 1. Visit https://testnet.jack.lukas.money
# 2. Open browser console
# 3. Check video source URL
# 4. Verify video loads and plays
```

## Rollback Plan

If issues occur:

1. **Revert code changes**:
   ```bash
   git revert <commit-hash>
   ```

2. **Fallback to local assets**:
   - Remove `NEXT_PUBLIC_CDN_URL` from environment
   - Assets will load from `/public` directory

3. **Emergency fix**:
   ```tsx
   // Force local assets
   <video src="/videos/walkthrough.mp4" />
   ```

## Verification Checklist

- [ ] Buckets created and configured
- [ ] Assets uploaded successfully
- [ ] Direct URL access works (curl test)
- [ ] Environment variables set
- [ ] Code updated to use CDN URL
- [ ] Deployment pipeline updated
- [ ] Testnet deployment successful
- [ ] Video loads in browser
- [ ] No console errors
- [ ] Cache headers correct

## Future Assets

When adding new assets:

1. **Add to repository**:
   ```bash
   # Place in apps/dashboard/public/
   cp new-video.mp4 apps/dashboard/public/videos/
   ```

2. **Upload to bucket**:
   ```bash
   pnpm upload:assets:testnet
   ```

3. **Reference in code**:
   ```tsx
   <video 
     src={`${process.env.NEXT_PUBLIC_CDN_URL || ''}/videos/new-video.mp4`}
   />
   ```

4. **Deploy**:
   ```bash
   git add .
   git commit -m "feat: add new video asset"
   git push
   ```

## Monitoring

### Check bucket usage
```bash
gsutil du -sh gs://jack-dashboard-testnet-assets
```

### Check access logs
```bash
# Enable logging (one-time)
gsutil logging set on -b gs://jack-dashboard-testnet-assets-logs \
  gs://jack-dashboard-testnet-assets

# View logs
gsutil ls gs://jack-dashboard-testnet-assets-logs
```

### Monitor costs
- Visit [Google Cloud Console](https://console.cloud.google.com)
- Navigate to Storage > Browser
- Check bucket details and usage

## Support

For issues:
1. Check [Asset Management Guide](./ASSET_MANAGEMENT.md)
2. Check [Dashboard Assets README](../apps/dashboard/ASSETS.md)
3. Review Cloud Build logs
4. Check GCS bucket permissions

## Timeline

- **Phase 1** (Immediate): Testnet migration
- **Phase 2** (Before mainnet launch): Production migration
- **Phase 3** (Future): Cloud CDN integration, custom domain
