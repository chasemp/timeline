# timeline.523.life

A personal timeline aggregating blog posts, saved articles, and social media activity into a unified chronological view.

**Live Site:** https://timeline.523.life

## Overview

This project transforms my online history into an interactive timeline, replacing the previous Jekyll blog with a modern Astro-based timeline application. The timeline automatically updates every 4 hours via GitHub Actions, fetching new content from multiple sources.

## Data Sources

### 1. **Blog Posts** (36 posts)
- Sourced from Jekyll markdown files in `_posts/`
- Converted to HTML via `marked` library
- Full content available as separate pages
- Topics: Security, DevOps, Python, Networking

### 2. **Bluesky Posts** (4 posts)
- Fetched via AT Protocol API
- Handle: [@chase523.bsky.social](https://bsky.app/profile/chase523.bsky.social)
- Incremental updates (only fetches new posts)
- No authentication required

### 3. **Readwise Reader** (10 documents tagged "classic")
- Fetched via Readwise Reader API v3
- Documents tagged with "classic" from all locations (archive, inbox, later)
- Includes highlights and reading metadata
- Requires API token

**Total Timeline Items:** 50

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Data Sources                             │
├──────────────┬──────────────────┬───────────────────────────┤
│ _posts/*.md  │ Bluesky API      │ Readwise Reader API       │
│              │ (AT Protocol)    │ (v3)                       │
└──────┬───────┴────────┬─────────┴──────────┬────────────────┘
       │                │                    │
       ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Fetching Scripts (Node.js)                 │
├──────────────┬──────────────────┬───────────────────────────┤
│ fetch-blog   │ fetch-bluesky    │ fetch-readwise-reader     │
│              │                  │                            │
└──────┬───────┴────────┬─────────┴──────────┬────────────────┘
       │                │                    │
       └────────────────┼────────────────────┘
                        ▼
              ┌──────────────────┐
              │   merge-sources  │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │  timeline.json   │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │   Astro Build    │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │   docs/ (deploy) │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │  GitHub Pages    │
              └──────────────────┘
```

## Tech Stack

- **Framework:** [Astro](https://astro.build/) v4
- **Styling:** Custom CSS with dark theme
- **Deployment:** GitHub Pages (from `/docs` directory)
- **Automation:** GitHub Actions (every 4 hours)
- **Data Processing:** Node.js with TypeScript
- **Libraries:**
  - `gray-matter` - Parse front matter from markdown
  - `marked` - Convert markdown to HTML
  - Native `fetch` - API requests

## Project Structure

```
.
├── _posts/                          # Original Jekyll blog posts (markdown)
├── astro/                           # Astro application
│   ├── src/
│   │   ├── components/
│   │   │   └── Timeline.astro      # Timeline component with filters
│   │   ├── pages/
│   │   │   ├── index.astro         # Main timeline page
│   │   │   └── blog/[slug].astro   # Dynamic blog post pages
│   │   └── data/
│   │       └── timeline.json       # Merged timeline data
│   ├── scripts/
│   │   ├── fetch-blog.mts          # Fetch blog posts
│   │   ├── fetch-bluesky.mts       # Fetch Bluesky posts
│   │   ├── fetch-readwise-reader.mts # Fetch Readwise Reader docs
│   │   └── merge-sources.mts       # Merge all sources
│   ├── data/sources/               # Individual source JSON files
│   │   ├── blog.json
│   │   ├── bluesky.json
│   │   └── readwise.json
│   └── package.json
├── docs/                            # Deployed site (GitHub Pages)
│   ├── index.html
│   ├── blog/                        # Individual blog post pages
│   └── assets/
├── .github/workflows/
│   └── fetch-timeline.yml          # Auto-update workflow
├── deploy.sh                        # Build and deploy script
├── READWISE_SETUP.md               # Readwise integration guide
└── README.md                        # This file
```

## Local Development

### Prerequisites
- Node.js 20+
- npm

### Setup

```bash
# Clone the repository
git clone git@github.com:chasemp/chasemp.github.io.git
cd chasemp.github.io

# Install dependencies
cd astro
npm install

# Fetch data (optional - will use existing data if tokens not provided)
npm run generate

# Start dev server
npm run dev
```

Visit http://localhost:4321 to see the timeline.

### Environment Variables

Optional environment variables for data fetching:

```bash
# Readwise Reader API token
export READWISE_TOKEN="your_token_here"

# Filter Readwise by tag (optional)
export READWISE_TAG_FILTER="classic"
```

Get your Readwise token: https://readwise.io/access_token

## Deployment

The site is deployed by building locally and pushing to the `/docs` directory, which GitHub Pages serves.

### Manual Deploy

```bash
# Build and deploy to docs/
bash deploy.sh

# Commit and push
git add docs/
git commit -m "Deploy timeline update"
git push origin master
```

### After Data Updates

When GitHub Actions fetches new data (every 4 hours), pull and rebuild:

```bash
git pull origin master    # Get updated data
bash deploy.sh           # Build site with new data
git add docs/
git commit -m "Deploy timeline with updated data"
git push origin master
```

### Version Management & Cache Busting

The site includes a version system to force cache invalidation when needed. The version is displayed in the footer and embedded in the HTML.

**To bump the version:**

1. Edit `astro/src/pages/index.astro`
2. Change `const VERSION = "1.0.0";` to a new version (e.g., `"1.0.1"`, `"1.1.0"`, `"2.0.0"`)
3. Run `bash deploy.sh`
4. Commit and push

**Version is visible in:**
- Footer: `© 2025 Chase Pettet — 523.life v1.0.0`
- Meta tag: `<meta name="version" content="1.0.0">`
- Body attribute: `<body data-version="1.0.0">`

**When to bump the version:**
- Major UI/theme changes
- Significant feature additions
- When you want to ensure users see the latest version
- After fixing critical bugs

Users can verify they have the latest version by checking the footer.

## Repository Secrets

The GitHub Actions workflow requires the following repository secrets to be configured:

### Required Secrets

**None!** The workflow will run successfully with just the auto-provided `GITHUB_TOKEN` for blog and Bluesky posts.

### Optional Secrets

| Secret Name | Purpose | Required? | Setup Instructions |
|-------------|---------|-----------|-------------------|
| `READWISE_TOKEN` | Fetch saved articles from Readwise Reader | Optional | See [READWISE_SETUP.md](READWISE_SETUP.md) |
| `READWISE_TAG_FILTER` | Filter Readwise documents by tag (e.g., "classic") | Optional | See [READWISE_SETUP.md](READWISE_SETUP.md) |

### How to Add Secrets

1. Go to your repository: https://github.com/chasemp/chasemp.github.io
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the **Name** and **Value** from the table above
5. Click **Add secret**

### Auto-Provided Secrets

| Secret Name | Purpose | Setup Required? |
|-------------|---------|-----------------|
| `GITHUB_TOKEN` | Push data commits back to repository | ❌ No (automatic) |

The workflow has `contents: write` permission configured in `.github/workflows/fetch-timeline.yml` to allow automated data commits.

## GitHub Actions Workflow

The workflow (`.github/workflows/fetch-timeline.yml`) runs every 4 hours and:

1. Fetches new Bluesky posts (no auth required)
2. Fetches new blog posts (from `_posts/` directory)
3. Fetches new Readwise documents (if `READWISE_TOKEN` provided)
4. Merges all sources into `timeline.json`
5. Commits and pushes data changes using `GITHUB_TOKEN`

**Note:** The workflow **only fetches and commits data**. Building and deploying to `/docs` is done locally via `deploy.sh`.

**Trigger Conditions:**
- **Schedule:** Every 4 hours via cron
- **Manual:** Via workflow_dispatch
- **Push:** When fetch scripts or workflow file changes

**Local Build & Deploy:**
After GitHub Actions updates the data, pull changes and deploy:
```bash
git pull origin master
bash deploy.sh
git add docs/
git commit -m "Deploy timeline update"
git push origin master
```

## Features

### Timeline View
- **Vertical timeline** with chronological posts
- **Filter controls** for content types (Blog, Saved, Bluesky)
- **Timeline nodes** with color-coded dots by type
- **Responsive design** optimized for mobile

### Content Display
- **Blog posts:** Open as full pages (mobile-friendly, better for long content)
- **Saved articles & Bluesky:** Open in modal panels (quick preview for short content)
- **Search params:** Timeline state preserved in URL

### User Experience
- Dark theme matching 523.life aesthetic
- Hover tooltips on timeline nodes
- Keyboard navigation (ESC to close panels)
- Scroll lock when panels are open
- Reading time estimates for articles

## Data Format

All timeline entries follow this schema:

```typescript
interface TimelineEntry {
  id: string;                    // Unique ID (e.g., "blog:post-slug")
  type: 'blog' | 'saved' | 'bluesky';
  timestamp: string;             // ISO 8601 date
  title: string;
  summary?: string;
  url: string | null;
  canonical_url?: string;
  author?: string;
  tags: string[];
  content_html?: string;
  metadata?: Record<string, any>;
}
```

## Configuration

### Astro Configuration
- Build output: `static` (pre-rendered HTML)
- Build directory: `dist/`

### GitHub Pages
- Source: `/docs` directory
- Custom domain: `timeline.523.life`
- CNAME: Managed via `astro/public/CNAME`

## Contributing

This is a personal project, but feel free to fork it for your own timeline!

## Related Projects

- **Main Site:** https://523.life
- **Bluesky:** [@chase523.bsky.social](https://bsky.app/profile/chase523.bsky.social)

## License

Content is © Chase Pettet. Code is MIT licensed.

---

**Note:** This project replaced a Jekyll-based blog. The original posts are preserved in `_posts/` and rendered through the new timeline interface.
