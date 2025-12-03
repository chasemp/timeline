#!/bin/bash
# Test script to simulate GitHub Actions Readwise fetch
# This runs the same commands as the GitHub Action workflow

set -e

echo "🧪 Testing Readwise fetch (simulating GitHub Actions)"
echo ""

# Check if READWISE_TOKEN is set
if [ -z "$READWISE_TOKEN" ]; then
  echo "❌ ERROR: READWISE_TOKEN is not set"
  echo "   Set it with: export READWISE_TOKEN='your_token_here'"
  exit 1
fi

# Set environment variables to match GitHub Actions
export READWISE_TAG_FILTER="${READWISE_TAG_FILTER:-classic,pub}"
export READWISE_FULL_FETCH="${READWISE_FULL_FETCH:-false}"

echo "📋 Environment:"
echo "   READWISE_TOKEN: ${READWISE_TOKEN:0:10}... (hidden)"
echo "   READWISE_TAG_FILTER: ${READWISE_TAG_FILTER}"
echo "   READWISE_FULL_FETCH: ${READWISE_FULL_FETCH}"
echo ""

# Run the fetch script
echo "🚀 Running fetch script..."
npm run fetch:readwise

echo ""
echo "✅ Fetch complete!"
echo ""
echo "📊 Checking results..."
if [ -f "data/sources/readwise.json" ]; then
  ITEM_COUNT=$(node -e "const data = require('./data/sources/readwise.json'); console.log(data.length);")
  echo "   Found $ITEM_COUNT items in readwise.json"
  
  # Show first few items
  echo ""
  echo "📝 First 5 items:"
  node -e "
    const data = require('./data/sources/readwise.json');
    data.slice(0, 5).forEach((item, i) => {
      console.log(\`   \${i+1}. [\${item.timestamp}] \${item.title || 'Untitled'}\`);
      console.log(\`      Tags: \${JSON.stringify(item.tags || [])}\`);
    });
  "
else
  echo "   ❌ readwise.json not found!"
fi

