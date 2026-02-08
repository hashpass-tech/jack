# Dashboard Assets

## Quick Start

### Upload assets to testnet
```bash
pnpm upload:assets:testnet
```

### Upload assets to production
```bash
pnpm upload:assets:production
```

## Asset URLs

### Testnet
- Bucket: `jack-dashboard-testnet-assets`
- URL: `https://storage.googleapis.com/jack-dashboard-testnet-assets`
- Example: `https://storage.googleapis.com/jack-dashboard-testnet-assets/videos/walkthrough.mp4`

### Production
- Bucket: `jack-dashboard-assets`
- URL: `https://storage.googleapis.com/jack-dashboard-assets`
- Example: `https://storage.googleapis.com/jack-dashboard-assets/videos/walkthrough.mp4`

## Adding New Assets

1. Place asset in `apps/dashboard/public/`
2. Upload to bucket: `pnpm upload:assets:testnet`
3. Reference in code using `NEXT_PUBLIC_CDN_URL`:

```tsx
<img 
  src={`${process.env.NEXT_PUBLIC_CDN_URL || ''}/path/to/asset.png`}
  alt="Description"
/>
```

## Deployment

Assets are automatically uploaded during Cloud Build deployment. See:
- `apps/dashboard/cloudbuild.testnet.yaml`
- `apps/dashboard/cloudbuild.yaml`

## Troubleshooting

### Video returns 404
```bash
# Check if file exists
gsutil ls gs://jack-dashboard-testnet-assets/videos/

# Re-upload
pnpm upload:assets:testnet
```

### Need to setup bucket
```bash
pnpm setup:bucket:testnet
```

For more details, see [Asset Management Guide](../../docs/ASSET_MANAGEMENT.md).
