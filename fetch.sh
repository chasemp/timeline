#!/bin/bash

# Fetch script for timeline data
# This script fetches data from all sources and merges into timeline.json

set -e

echo "📊 Fetching timeline data from all sources..."
cd astro

# Load environment variables from .env if it exists
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

npm run generate

echo ""
echo "✅ Fetch complete!"
echo "Data has been updated in:"
echo "  - astro/data/sources/*.json (individual sources)"
echo "  - astro/src/data/timeline.json (merged timeline)"
echo ""
echo "💡 Next steps:"
echo "  - Run './deploy.sh' to build and deploy the site"
echo "  - Or run 'git add . && git commit && git push' to commit data changes"


