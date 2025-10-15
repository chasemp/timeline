# Readwise Reader Integration Setup

This guide explains how to set up Readwise Reader integration for your timeline.

**Note:** This integration uses the **Readwise Reader API (v3)**, not the classic Readwise API. Reader stores documents from various sources with your highlights and notes.

## Getting Your Readwise Token

1. Go to https://readwise.io/access_token
2. Sign in to your Readwise account
3. Copy your access token

## Local Development

Set the environment variable before running the fetch script:

```bash
export READWISE_TOKEN="your_token_here"

# Optional: Filter by tag
export READWISE_TAG_FILTER="timeline"

# Run the fetch
cd astro
npm run fetch:readwise
```

Or run it inline:

```bash
cd astro
READWISE_TOKEN="your_token_here" npm run fetch:readwise
```

## GitHub Actions (Automated)

### 1. Add Token as Repository Secret

1. Go to your repository: https://github.com/chasemp/chasemp.github.io
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `READWISE_TOKEN`
5. Value: Paste your token from https://readwise.io/access_token
6. Click **Add secret**

### 2. (Optional) Add Tag Filter

If you want to only fetch articles with a specific tag:

1. Same steps as above
2. Name: `READWISE_TAG_FILTER`
3. Value: Your tag name (e.g., `timeline`)

### 3. Update Workflow (Already Done!)

The workflow in `.github/workflows/fetch-timeline.yml` already references `READWISE_TOKEN`:

```yaml
- name: Fetch Readwise (optional)
  working-directory: ./astro
  run: npm run fetch:readwise || echo "Readwise fetch failed or skipped"
  env:
    READWISE_TOKEN: ${{ secrets.READWISE_TOKEN }}
    READWISE_TAG_FILTER: ${{ secrets.READWISE_TAG_FILTER }}
```

## Using Tag Filters

Tag filters are useful if you don't want ALL your Readwise articles on your timeline.

### Option 1: Tag in Readwise

1. In Readwise, tag articles you want on your timeline with a specific tag (e.g., "timeline" or "public")
2. Set `READWISE_TAG_FILTER` to that tag name

### Option 2: No Filter

If you don't set `READWISE_TAG_FILTER`, all articles will be fetched.

## Testing Locally

```bash
cd astro

# Test with your token
READWISE_TOKEN="your_token_here" npm run fetch:readwise

# Check the output
cat data/sources/readwise.json

# Merge and view
npm run merge
cat src/data/timeline.json | grep -A 5 "readwise"
```

## Rate Limiting

The Readwise API has rate limits:
- **20 requests per minute** for list endpoints
- The script automatically handles this with delays

For large libraries, the initial fetch may take several minutes.

## Troubleshooting

### "READWISE_TOKEN is not set. Skipping."

This is normal if you haven't set up Readwise yet. The script gracefully skips.

### "Failed to fetch books: 401"

Your token is invalid or expired. Get a new one from https://readwise.io/access_token

### "Failed to fetch books: 429"

You've hit the rate limit. The script should handle this automatically, but if you see this, wait a minute and try again.

## What Gets Fetched

- **Sources**: All Readwise Reader documents (articles, PDFs, tweets, etc.)
- **Locations**: Archive, Inbox, and Later (all locations fetched)
- **Content**: Document title, author, URL, notes, and reading progress
- **Metadata**: Cover images, word count, reading time, site name
- **Tags**: All tags are preserved for filtering (stored as objects in Reader API)

## Data Storage

Fetched documents are stored in:
- `astro/data/sources/readwise.json` (raw Readwise Reader data)
- `astro/src/data/timeline.json` (merged timeline data)

The script only fetches NEW or UPDATED documents on subsequent runs (incremental updates).

## API Differences: Reader vs Classic Readwise

This integration uses **Readwise Reader API (v3)**, not the classic Readwise API:

| Feature | Classic Readwise API | Reader API (v3) | Our Choice |
|---------|---------------------|-----------------|------------|
| **Endpoint** | `/api/v2/books/` | `/api/v3/list/` | ✅ Reader |
| **Tag Format** | Array: `["tag1", "tag2"]` | Object: `{"tag1": {...}, "tag2": {...}}` | ✅ Object |
| **Sources** | Kindle, books, articles | All Reader sources (articles, PDFs, tweets, etc.) | ✅ All sources |
| **Locations** | Single category filter | Archive, Inbox, Later | ✅ All locations |
| **Data** | Highlights focused | Full document + metadata | ✅ Full document |

**Why Reader API?**
- Access to your full Reader library (not just synced highlights)
- Better tag support and metadata
- Includes documents from all sources and locations
- More active development and features

