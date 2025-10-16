#!/bin/bash

# Deploy script for Jekyll to Astro conversion
# This script builds the Astro site and deploys it to the root directory

set -e

echo "🚀 Building Astro site..."
cd astro

# Load environment variables from .env if it exists
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Build only (no data fetch) - use fetch.sh to update data first if needed
npm run build:only

echo "📦 Deploying to docs directory..."
cd ..
rm -rf docs
mkdir -p docs
cp -r astro/dist/* docs/
cp astro/dist/.nojekyll docs/ 2>/dev/null || true

echo "✅ Deployment complete!"
echo "The timeline site has been deployed to /docs"
echo "Visit https://timeline.523.life to see the changes."

