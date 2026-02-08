#!/bin/bash
# Setup Google Cloud Storage buckets for dashboard assets
# Usage: ./scripts/setup-asset-bucket.sh [testnet|production]

set -e

ENV=${1:-testnet}
PROJECT_ID="lsts-482607"

if [ "$ENV" = "testnet" ]; then
  BUCKET_NAME="jack-dashboard-testnet-assets"
  DOMAIN="assets-testnet.jack.lukas.money"
elif [ "$ENV" = "production" ]; then
  BUCKET_NAME="jack-dashboard-assets"
  DOMAIN="assets.jack.lukas.money"
else
  echo "Error: Invalid environment. Use 'testnet' or 'production'"
  exit 1
fi

echo "🚀 Setting up asset bucket for $ENV"
echo "================================"
echo "Project: $PROJECT_ID"
echo "Bucket: $BUCKET_NAME"
echo "Domain: $DOMAIN"
echo ""

# Set project
gcloud config set project $PROJECT_ID

# Create bucket if it doesn't exist
if gsutil ls -b gs://$BUCKET_NAME 2>/dev/null; then
  echo "✅ Bucket already exists: $BUCKET_NAME"
else
  echo "📦 Creating bucket: $BUCKET_NAME"
  gsutil mb -p $PROJECT_ID -c STANDARD -l US gs://$BUCKET_NAME
  echo "✅ Bucket created"
fi

# Configure CORS
echo "🔧 Configuring CORS..."
cat > /tmp/cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set /tmp/cors.json gs://$BUCKET_NAME
rm /tmp/cors.json
echo "✅ CORS configured"

# Make bucket publicly readable
echo "🔓 Making bucket publicly readable..."
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME
echo "✅ Public access granted"

# Set default cache control
echo "🕐 Setting default cache control..."
gsutil setmeta -h "Cache-Control:public, max-age=31536000, immutable" gs://$BUCKET_NAME/**
echo "✅ Cache control set"

echo ""
echo "================================"
echo "✅ Bucket setup complete!"
echo ""
echo "Bucket URL: https://storage.googleapis.com/$BUCKET_NAME"
echo ""
echo "Next steps:"
echo "  1. Run: pnpm upload:assets --env=$ENV"
echo "  2. (Optional) Setup Cloud CDN for better performance"
echo "  3. (Optional) Configure custom domain: $DOMAIN"
