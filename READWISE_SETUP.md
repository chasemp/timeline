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

# Optional: Force full fetch (fetch all documents instead of delta)
export READWISE_FULL_FETCH="true"

# Run the fetch
cd astro
npm run fetch:readwise
```

Or run it inline:

```bash
cd astro
READWISE_TOKEN="your_token_here" npm run fetch:readwise
```

### Delta Fetching (Default)

By default, the script performs **delta fetching** - it only fetches documents updated since your last **published** Readwise article in the timeline:

- If your last published article was 4 hours ago → fetches the last 4 hours
- If your last published article was 2 days ago → fetches the last 2 days  
- Maximum lookback: 30 days (to avoid excessive API calls after long gaps)

This significantly reduces API calls and speeds up the process.

To force a full fetch of all documents (useful for initial setup or when troubleshooting):

```bash
cd astro
READWISE_TOKEN="your_token_here" READWISE_FULL_FETCH="true" npm run fetch:readwise
```

## GitHub Actions (Automated)

### 1. Add Token as Repository Secret

1. Go to your repository: https://github.com/chasemp/chasemp.github.io
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `READWISE_TOKEN`
5. Value: Paste your token from https://readwise.io/access_token
6. Click **Add secret**

### 2. (Optional) Add Configuration Variables

If you want to customize the fetch behavior, add repository variables:

1. Go to your repository settings
2. Click **Settings** → **Secrets and variables** → **Actions** → **Variables** tab
3. Add these optional variables:
   - **`READWISE_TAG_FILTER`**: Only fetch documents with specific tag (e.g., `classic`)
   - **`READWISE_FULL_FETCH`**: Set to `true` to force full fetch instead of delta (rarely needed)

### 3. Delta Fetching (Default Behavior)

The workflow in `.github/workflows/fetch-timeline.yml` uses delta fetching by default:

```yaml
- name: Fetch Readwise Reader (optional)
  working-directory: ./astro
  run: npm run fetch:readwise || echo "Readwise fetch failed or skipped"
  env:
    READWISE_TOKEN: ${{ secrets.READWISE_TOKEN }}
    READWISE_TAG_FILTER: ${{ vars.READWISE_TAG_FILTER }}
    # Delta fetching by default (only new/updated docs). Set READWISE_FULL_FETCH=true to fetch all.
    READWISE_FULL_FETCH: ${{ vars.READWISE_FULL_FETCH }}
```

**How it works in GitHub Actions:**
- By default, only fetches documents updated since your last published article (delta fetch)
- Adapts to your publishing frequency: recent activity = shorter fetch window
- Capped at 30 days maximum lookback
- Significantly reduces API calls and execution time
- To force a full fetch, set the `READWISE_FULL_FETCH` repository variable to `true`

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

### Delta Fetching Optimization

To avoid rate limits and speed up fetches, the script now performs **delta fetching by default**:
- Only fetches documents updated since your last **published** Readwise article
- Automatically adapts: 4 hours old? Fetches 4 hours. 2 days old? Fetches 2 days.
- Capped at 30 days maximum to prevent excessive fetching after long gaps
- Drastically reduces API calls (from 1200+ documents to just a handful)
- Avoids hitting rate limits during regular updates

For the **initial setup** or when you need to rebuild from scratch, set `READWISE_FULL_FETCH=true` to fetch all documents. This may take several minutes for large libraries (100+ documents).

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

### Fetch Modes

**Delta Fetch (Default)**:
- Fetches documents updated since your last **published** Readwise article timestamp
- Example: Last article was 4 hours ago → fetches documents from the last 4 hours
- Capped at 30 days maximum to avoid excessive fetching after long periods
- Preserves all existing entries and merges in new/updated ones
- Fast and efficient for regular updates
- Automatically enabled when existing data is found

**Full Fetch**:
- Fetches ALL documents from your Readwise Reader library
- Useful for initial setup or troubleshooting
- Enabled by setting `READWISE_FULL_FETCH=true`
- Takes longer but ensures complete data sync

The script automatically chooses the appropriate mode:
- If no existing data exists → Full fetch
- If `READWISE_FULL_FETCH=true` → Full fetch
- Otherwise → Delta fetch (recommended, based on last published article date)

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

