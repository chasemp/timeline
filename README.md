# timeline.523.life

A personal timeline aggregating blog posts, saved articles, and social media activity into a unified chronological view.

**Live Site:** https://timeline.523.life

## Overview

This project transforms my online history into an interactive timeline, replacing the previous Jekyll blog with a modern Astro-based timeline application. The timeline automatically updates every 4 hours via GitHub Actions, fetching new content from multiple sources.

## Data Sources

### 1. **Blog Posts**
- Sourced from Jekyll markdown files in `markdown/`
- Converted to HTML via `marked` library
- Full content available as separate pages
- Topics: Security, DevOps, Python, Networking

### 2. **Bluesky Posts**
- Fetched via AT Protocol API
- Handle: [@chase523.bsky.social](https://bsky.app/profile/chase523.bsky.social)
- **Images automatically cached** to `/assets/cached-images/bluesky/`
- Incremental updates (only fetches new posts)
- No authentication required

### 3. **Pixelfed Posts**
- Fetched via ActivityPub Atom feed
- Account: [@chase523@gram.social](https://gram.social/chase523)
- **Images automatically cached** to `/assets/cached-images/pixelfed/`
- Incremental updates (only fetches new posts)
- No authentication required

### 4. **HackerNews Comments**
- Fetched via HackerNews Firebase API
- User: [chasemp](https://news.ycombinator.com/user?id=chasemp)
- Incremental updates (only fetches new comments)
- Includes parent story context and links
- No authentication required

### 5. **Wikipedia Contributions**
- Fetched via Wikipedia API
- User: [Chasemp](https://en.wikipedia.org/wiki/User:Chasemp)
- Shows edits and page creations
- No authentication required

### 6. **GitHub Releases**
- Fetched via GitHub API
- Organization/User: chasemp
- Shows project releases and tags
- No authentication required

### 7. **Readwise Reader**
- Fetched via Readwise Reader API v3
- **⚠️ Tag Filtering Required**: Only articles tagged with `classic` OR `pub` will appear on the timeline
  - This is intentional curation - tag articles in Readwise Reader to make them visible
  - Articles without these tags are ignored (by design)
- Documents tagged with `full` display complete article content instead of summary
- Includes highlights and reading metadata
- Requires API token

## Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                           Data Sources                                 │
├────────┬────────┬─────────┬──────────┬──────────┬──────────┬─────────┤
│markdown│Bluesky │Pixelfed │HackerNews│Wikipedia │GitHub    │Readwise │
│  .md   │  API   │ Atom    │   API    │   API    │  API     │Reader   │
└───┬────┴───┬────┴────┬────┴─────┬────┴─────┬────┴────┬─────┴────┬────┘
    │        │         │          │          │         │          │
    ▼        ▼         ▼          ▼          ▼         ▼          ▼
┌───────────────────────────────────────────────────────────────────────┐
│               Data Fetching Scripts (Node.js + Image Cache)            │
├────────┬────────┬─────────┬──────────┬──────────┬──────────┬─────────┤
│fetch-  │fetch-  │fetch-   │fetch-    │fetch-    │fetch-    │fetch-   │
│blog    │bluesky │pixelfed │hackernews│wikipedia │github    │readwise │
│        │ +cache │ +cache  │          │          │releases  │-reader  │
└───┬────┴───┬────┴────┬────┴─────┬────┴─────┬────┴────┬─────┴────┬────┘
    │        │         │          │         │            │
    └────────┴─────────┴──────────┴─────────┴────────────┘
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
├── markdown/                        # Original Jekyll blog posts (markdown)
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
│   │   ├── fetch-bluesky.mts       # Fetch Bluesky posts + cache images
│   │   ├── fetch-pixelfed.mts      # Fetch Pixelfed posts + cache images
│   │   ├── fetch-hackernews.mts    # Fetch HackerNews comments
│   │   ├── fetch-wikipedia.mts     # Fetch Wikipedia contributions
│   │   ├── fetch-github-releases.mts # Fetch GitHub releases
│   │   ├── fetch-readwise-reader.mts # Fetch Readwise Reader docs
│   │   └── merge-sources.mts       # Merge all sources
│   ├── data/sources/               # Individual source JSON files
│   │   ├── blog.json
│   │   ├── bluesky.json
│   │   ├── pixelfed.json
│   │   ├── hackernews.json
│   │   ├── wikipedia.json
│   │   ├── github-releases.json
│   │   └── readwise.json
│   ├── public/
│   │   └── assets/cached-images/  # Cached images from social media
│   │       ├── bluesky/            # Cached Bluesky images
│   │       └── pixelfed/           # Cached Pixelfed images
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

# Fetch data (optional - will use existing data if not fetched)
npm run generate

# Start dev server
npm run dev
```

Visit http://localhost:4321 to see the timeline.

### Available Scripts

- **`npm run dev`** - Start development server (uses existing data)
- **`npm run dev:fetch`** - Fetch fresh data, then start dev server
- **`npm run build`** - Build site (uses existing data)
- **`npm run build:fetch`** - Fetch fresh data, then build site
- **`npm run preview`** - Preview built site
- **`npm run generate`** - Fetch all data sources and merge
- **`npm run fetch:blog`** - Fetch blog posts only
- **`npm run fetch:bluesky`** - Fetch Bluesky posts (with image caching)
- **`npm run fetch:pixelfed`** - Fetch Pixelfed posts (with image caching)
- **`npm run fetch:hackernews`** - Fetch HackerNews comments
- **`npm run fetch:wikipedia`** - Fetch Wikipedia contributions
- **`npm run fetch:github`** - Fetch GitHub releases
- **`npm run fetch:readwise`** - Fetch Readwise documents
- **`npm run merge`** - Merge source files into timeline.json

### Environment Variables

Optional environment variables for data fetching:

```bash
# Readwise Reader API token (optional)
export READWISE_TOKEN="your_token_here"

# Filter Readwise by tag (optional, overrides default tags: 'classic' OR 'pub')
# If not set, only articles tagged with 'classic' OR 'pub' will appear on timeline
export READWISE_TAG_FILTER="classic"

# GitHub API token (optional, increases rate limits)
export GITHUB_TOKEN="your_token_here"
```

**Notes:**
- Get Readwise token: https://readwise.io/access_token
- GitHub token is optional but recommended to avoid rate limits
- All other data sources work without authentication

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

1. Fetches new blog posts (from `markdown/` directory)
2. Fetches new Bluesky posts + caches images (no auth required)
3. Fetches new Pixelfed posts + caches images (no auth required)
4. Fetches new HackerNews comments (no auth required)
5. Fetches new Wikipedia contributions (no auth required)
6. Fetches new GitHub releases (optional auth for higher rate limits)
7. Fetches new Readwise documents (if `READWISE_TOKEN` provided)
8. Merges all sources into `timeline.json`
9. Commits and pushes data + cached images using `GITHUB_TOKEN`

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
- **Filter controls** for content types (Read, Written, Posted, Released, Contributed)
- **Hashtag filtering** with dropdown selector
- **Search functionality** via Pagefind (production builds)
- **Timeline nodes** with color-coded dots by type
- **Responsive design** optimized for mobile

### Content Display
- **Blog posts:** Open as full pages (mobile-friendly, better for long content)
- **Other content:** Opens in modal panels (quick preview for short content)
- **Image support:** Photos from Bluesky and Pixelfed display inline
- **Link previews:** External links show cards with thumbnails
- **Search params:** Timeline state preserved in URL

### User Experience
- **Dual themes:** Dark theme (default) and light theme toggle
- **Theme persistence:** Remembers preference via cookies across 523.life domain
- **Hover tooltips** on timeline nodes with timestamps
- **Keyboard navigation** (ESC to close panels)
- **Scroll lock** when panels are open
- **Mobile gestures:** Swipe down to close panels on mobile
- **Comments:** GitHub Discussions integration via giscus
- **RSS feed:** Available at `/rss.xml`

### Image Caching
- **Automatic caching:** Bluesky and Pixelfed images cached locally during fetch
- **Resilient:** Site works even if remote CDNs go down
- **Fast loading:** Images served from your domain
- **Cached location:** `public/assets/cached-images/{bluesky,pixelfed}/`
- **Size:** ~4 MB total (committed to git)

## Data Format

All timeline entries follow this schema:

```typescript
interface TimelineEntry {
  id: string;                    // Unique ID (e.g., "blog:post-slug")
  type: 'blog' | 'saved' | 'bluesky' | 'pixelfed' | 'wikipedia' | 'release';
  timestamp: string;             // ISO 8601 date
  title: string;
  summary?: string;
  url: string | null;
  canonical_url?: string;
  author?: string;
  tags: string[];
  content_html?: string;
  media?: {                      // For posts with images
    type: 'image' | 'video';
    images?: string[];           // Local or remote URLs
    alt?: string | string[];
  };
  metadata?: Record<string, any>;
}
```

## Configuration

### Site Configuration (`astro/src/config.ts`)

The site behavior can be customized via `config.ts`:

```typescript
export const config = {
  // Enable/disable giscus comments site-wide
  commentsEnabled: true,
  
  // Disable comments for specific content types
  // HackerNews entries are comments themselves, so no meta-comments needed
  disableCommentsForTypes: ['hackernews'],
} as const;
```

**Comment Control Options:**
1. **Global disable**: Set `commentsEnabled: false` to disable all comments site-wide
2. **Per-type disable**: Add content types to `disableCommentsForTypes` array (e.g., `['hackernews', 'release']`)
3. **Per-item disable**: Add `#nocomments` or `#nc` hashtag to any individual timeline item

**Why disable comments for HackerNews?**  
HackerNews entries are themselves comments on other discussions. Adding a comment box to discuss a comment creates unnecessary meta-commentary. The "Direct link to comment" provides access to the original HN discussion thread.

### Astro Configuration
- Build output: `static` (pre-rendered HTML)
- Build directory: `dist/`

### GitHub Pages
- Source: `/docs` directory
- Custom domain: `timeline.523.life`
- CNAME: Managed via `astro/public/CNAME`

## Troubleshooting

### Site loads but has no CSS styling (cards are plain, no timeline dots)

**Symptom:** The site appears broken - no colors, no timeline dots/spine, plain white cards.

**Cause:** The `docs/.nojekyll` file is missing. GitHub Pages uses Jekyll by default, which ignores directories starting with underscores (like `_astro/`). This causes all CSS/JS files to return 404 errors.

**Fix:**
```bash
touch docs/.nojekyll
git add docs/.nojekyll
git commit -m "Add .nojekyll for GitHub Pages"
git push
```

**Prevention:** The `docs/.nojekyll` file contains a warning comment explaining why it's critical. **DO NOT DELETE IT!**

### GitHub Pages not updating after push

GitHub Pages can take 2-10 minutes to deploy changes. Check:
1. The Actions tab in GitHub to see deployment status
2. Try a hard refresh in your browser (Cmd+Shift+R / Ctrl+Shift+R)
3. Check the commit history to ensure changes were pushed

## Contributing

This is a personal project, but feel free to fork it for your own timeline!

## Related Projects

- **Main Site:** https://523.life
- **Bluesky:** [@chase523.bsky.social](https://bsky.app/profile/chase523.bsky.social)

## License

Content is © Chase Pettet. Code is MIT licensed.

---

**Note:** This project replaced a Jekyll-based blog. The original posts are preserved in `markdown/` and rendered through the new timeline interface.
