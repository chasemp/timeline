# Timeline Site (Astro)

Static, accessible timeline aggregating content from multiple sources:
- **Blog posts** from legacy Jekyll `_posts/` directory
- **Bluesky posts** from [@chase523.bsky.social](https://bsky.app/profile/chase523.bsky.social)
- **Saved articles** from Readwise Reader (tagged "classic")

Newest items appear at the top. Click a timeline node to view details.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (auto-generates data)
npm run dev

# Visit http://localhost:4321
```

## Data Sources

### 1. Blog Posts (36 posts)
- Source: `../_posts/*.md` (Jekyll markdown files)
- Script: `scripts/fetch-blog.mts`
- Output: `data/sources/blog.json`
- Converts markdown to HTML using `marked`

### 2. Bluesky Posts (4 posts)
- Source: AT Protocol API
- Script: `scripts/fetch-bluesky.mts`
- Output: `data/sources/bluesky.json`
- Fetches posts from chase523.bsky.social
- No authentication required

### 3. Readwise Reader (10 documents)
- Source: Readwise Reader API v3
- Script: `scripts/fetch-readwise-reader.mts`
- Output: `data/sources/readwise.json`
- Filters by tag: `READWISE_TAG_FILTER=classic`
- Requires: `READWISE_TOKEN` (get at https://readwise.io/access_token)

## Data Generation

### Automatic (Pre-build Hook)
Data is automatically generated before dev/build via `predev` and `prebuild` hooks in `package.json`.

### Manual
```bash
# Fetch all sources and merge
npm run generate

# Or run individually
npm run fetch:blog
npm run fetch:bluesky
READWISE_TOKEN=xxx npm run fetch:readwise
npm run merge
```

### Environment Variables

For local development:
```bash
# Required for Readwise Reader
export READWISE_TOKEN="your_token_here"

# Optional: Filter Readwise by tag (e.g., "classic")
export READWISE_TAG_FILTER="classic"
```

For GitHub Actions: Set these as repository secrets in GitHub Settings. See [Repository Secrets](../README.md#repository-secrets) in the main README.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 4321) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run generate` | Fetch all data sources and merge |
| `npm run fetch:blog` | Fetch blog posts from `_posts/` |
| `npm run fetch:bluesky` | Fetch Bluesky posts |
| `npm run fetch:readwise` | Fetch Readwise Reader documents |
| `npm run merge` | Merge all sources into `timeline.json` |

## Project Structure

```
astro/
├── src/
│   ├── components/
│   │   └── Timeline.astro          # Main timeline component with filters
│   ├── pages/
│   │   ├── index.astro             # Timeline page
│   │   └── blog/[slug].astro       # Dynamic blog post pages
│   └── data/
│       └── timeline.json           # Merged timeline data (gitignored)
├── scripts/
│   ├── fetch-blog.mts              # Fetch Jekyll posts
│   ├── fetch-bluesky.mts           # Fetch Bluesky via AT Protocol
│   ├── fetch-readwise-reader.mts   # Fetch Readwise Reader docs
│   ├── merge-sources.mts           # Merge all sources
│   └── README.md                   # Scripts documentation
├── data/
│   └── sources/                    # Individual source JSON files
│       ├── blog.json
│       ├── bluesky.json
│       └── readwise.json
├── public/
│   └── CNAME                       # Custom domain: timeline.523.life
├── dist/                           # Build output (gitignored)
└── package.json
```

## Build & Deploy

### Local Build
```bash
npm run build
# Output: dist/
```

### Deploy to GitHub Pages
From project root:
```bash
bash ../deploy.sh
```

This script:
1. Builds the Astro site (`npm run build`)
2. Copies `dist/` contents to `../docs/`
3. Ready for GitHub Pages to serve

## Features

### Timeline Component
- **Vertical timeline** with chronological ordering
- **Filter controls** for content types (Blog, Saved, Bluesky)
- **Timeline nodes** with color-coded dots
- **Hover tooltips** showing post previews
- **Detail panel** for full content
- **Responsive design** optimized for mobile

### Content Display
- **Blog posts**: Link to full pages (`/blog/[slug]`)
- **Bluesky/Saved**: Open in modal panel
- **Search params**: Timeline state in URL

### Styling
- Dark theme matching 523.life
- CSS custom properties for theming
- Minimal, accessible design
- Mobile-first responsive layout

## Data Flow

```
Source Files          Scripts              JSON Files         Astro Pages
───────────          ────────              ──────────        ───────────
_posts/*.md    →  fetch-blog.mts    →  blog.json      ┐
Bluesky API    →  fetch-bluesky.mts →  bluesky.json   ├→ merge-sources → timeline.json → index.astro
Reader API     →  fetch-readwise    →  readwise.json  ┘                                → blog/[slug].astro
```

## Development Tips

### Debug Data Fetching
```bash
# Run individual fetchers to see output
node --experimental-strip-types scripts/fetch-blog.mts
node --experimental-strip-types scripts/fetch-bluesky.mts
READWISE_TOKEN=xxx node --experimental-strip-types scripts/fetch-readwise-reader.mts

# Check generated data
cat data/sources/blog.json | jq '.[] | {id, title}'
cat src/data/timeline.json | jq 'length'
```

### Watch Mode
Dev server (`npm run dev`) has hot-reload but doesn't re-fetch data automatically. To refresh data while developing:
```bash
# In another terminal
npm run generate
# Dev server will hot-reload with new data
```

### Add New Data Source
1. Create `scripts/fetch-newsource.mts`
2. Output to `data/sources/newsource.json`
3. Add script to `package.json`
4. Update `generate` script to include it
5. Ensure `merge-sources.mts` reads from `data/sources/`

## Configuration

### Astro Config (`astro.config.mjs`)
- Output: `static` (pre-rendered HTML)
- Site: `https://timeline.523.life`

### Package.json
- Node: v20+
- Dependencies: Astro, gray-matter, marked
- Scripts: See above

## Troubleshooting

### "READWISE_TOKEN is not set"
This is normal if you haven't configured Readwise. The site will build with just blog and Bluesky posts.

### Missing timeline items
Run `npm run generate` manually to ensure all data is fetched.

### Build errors
Check that all dependencies are installed: `npm install`

### Dev server not starting
Ensure port 4321 is available or set a different port:
```bash
npm run dev -- --port 3000
```

## Related Docs

- **Main README**: `../README.md` - Project overview
- **Scripts README**: `scripts/README.md` - Detailed script documentation
- **Readwise Setup**: `../READWISE_SETUP.md` - Readwise integration guide
- **Deploy Script**: `../deploy.sh` - Deployment process

## Production

Live site: https://timeline.523.life

Auto-deploys via GitHub Actions every 4 hours. See `../.github/workflows/fetch-timeline.yml`.
