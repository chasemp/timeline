# Timeline Site Migration Roadmap
**Moving timeline.523.life from chasemp.github.io to timeline repository**

**Created:** October 15, 2025  
**Status:** Planning Phase  
**Goal:** Isolate timeline deployment to eliminate GitHub Pages caching issues

---

## 📋 Executive Summary

### Problem
- Timeline site currently deployed from `chasemp.github.io` (username.github.io namesake repo)
- Experiencing excessive caching issues with GitHub Pages
- Namesake repos have special GitHub Pages behavior that may cause issues
- Timeline and blog assets are mixed in one repository

### Solution
- Migrate timeline.523.life to dedicated `timeline` repository
- Keep `chasemp.github.io` for blog-only content
- Clean separation of concerns and deployment pipelines
- Independent caching and deployment control

### Reference Architecture
Using proven `/src → /docs` deployment pattern from `peadoubleueh` project:
- Source code in clear directory structure
- Automated builds via GitHub Actions
- `/docs` directory for GitHub Pages deployment
- Clean git history with proper artifact management

---

## 🎯 Migration Goals

- ✅ Move all timeline assets to `timeline` repository
- ✅ Set up GitHub Pages deployment from `/docs` in timeline repo
- ✅ Configure timeline.523.life custom domain on timeline repo
- ✅ Preserve all data sources (blog posts, Bluesky, Readwise, GitHub, Wikipedia)
- ✅ Maintain GitHub Actions automation (4-hour updates)
- ✅ Remove timeline artifacts from chasemp.github.io
- ✅ Remove CNAME from chasemp.github.io (freeing timeline.523.life)
- ✅ Keep chasemp.github.io for future blog-only use

---

## 📦 Phase 1: Inventory & Analysis

### Assets to Move FROM chasemp.github.io TO timeline

#### Core Timeline Application
```
chasemp.github.io/astro/          → timeline/astro/
├── src/                          → timeline/astro/src/
│   ├── components/
│   │   └── Timeline.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── blog/[slug].astro
│   └── data/
│       └── timeline.json
├── scripts/                      → timeline/astro/scripts/
│   ├── fetch-blog.mts
│   ├── fetch-bluesky.mts
│   ├── fetch-github-releases.mts
│   ├── fetch-readwise-reader.mts
│   ├── fetch-readwise.mts
│   ├── fetch-wikipedia.mts
│   ├── merge-sources.mts
│   └── README.md
├── data/sources/                 → timeline/astro/data/sources/
│   ├── blog.json
│   ├── bluesky.json
│   ├── github-releases.json
│   ├── readwise.json
│   └── wikipedia.json
├── public/                       → timeline/astro/public/
│   ├── CNAME                     (timeline.523.life)
│   └── assets/                   (copy from root assets)
├── package.json                  → timeline/astro/package.json
├── package-lock.json             → timeline/astro/package-lock.json
├── astro.config.mjs              → timeline/astro/astro.config.mjs
└── tsconfig.json                 → timeline/astro/tsconfig.json
```

#### Blog Content (Data Source)
```
chasemp.github.io/_posts/         → timeline/_posts/
└── *.md                          (36 blog post markdown files)
```

#### Assets (Referenced by blog posts)
```
chasemp.github.io/assets/         → timeline/assets/
├── audio/
│   └── chasealarm.wav
├── images/
│   ├── bio-photo.jpg
│   ├── me_sf.jpeg
│   ├── ione/
│   │   ├── i1first.png
│   │   └── ione-back2.png
│   └── post/
│       ├── 21musingsheader.png
│       └── namecomhack*.png (4 files)
├── md_examples/                  (8 markdown examples)
├── pdf/                          (2 PDF files)
└── slides/                       (2 PDF files)
```

#### Deployment Scripts
```
chasemp.github.io/deploy.sh       → timeline/deploy.sh
chasemp.github.io/fetch.sh        → timeline/fetch.sh
```

#### Documentation
```
chasemp.github.io/READWISE_SETUP.md → timeline/READWISE_SETUP.md
chasemp.github.io/README.md       → timeline/README.md (already exists, merge content)
```

#### GitHub Actions
```
chasemp.github.io/.github/workflows/fetch-timeline.yml → timeline/.github/workflows/fetch-timeline.yml
```

### Assets to REMOVE from chasemp.github.io

#### Timeline-Related (after migration)
```
❌ chasemp.github.io/_posts/              (moved to timeline)
❌ chasemp.github.io/astro/               (moved to timeline)
❌ chasemp.github.io/assets/              (moved to timeline)
❌ chasemp.github.io/docs/                (timeline build output - delete)
❌ chasemp.github.io/deploy.sh            (moved to timeline)
❌ chasemp.github.io/fetch.sh             (moved to timeline)
❌ chasemp.github.io/READWISE_SETUP.md    (moved to timeline)
❌ chasemp.github.io/CNAME                (CRITICAL - frees timeline.523.life)
❌ chasemp.github.io/.github/workflows/   (moved to timeline)
```

### Assets to KEEP in chasemp.github.io

#### Blog Artifacts (Legacy/Archive)
```
✅ chasemp.github.io/Alf/                 (unknown artifacts, keep for now)
✅ chasemp.github.io/index.html           (old blog index, keep for now)
✅ chasemp.github.io/README.md            (update to reflect blog-only status)
✅ chasemp.github.io/LICENSE              (keep)
```

---

## 🏗️ Phase 2: Timeline Repository Setup

### Directory Structure (Target)
```
timeline/
├── .github/
│   └── workflows/
│       └── fetch-timeline.yml        # GitHub Actions: fetch data & deploy
├── _posts/                           # Blog post markdown files
│   └── *.md                          (36 files)
├── assets/                           # Static assets for blog posts
│   ├── audio/
│   ├── images/
│   ├── md_examples/
│   ├── pdf/
│   └── slides/
├── astro/                            # Astro application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── data/
│   ├── scripts/                      # Data fetchers
│   ├── data/sources/                 # Source JSON files
│   ├── public/
│   │   ├── CNAME                     # timeline.523.life
│   │   └── assets/                   # Static assets (symlink or copy)
│   ├── package.json
│   ├── package-lock.json
│   ├── astro.config.mjs
│   └── tsconfig.json
├── docs/                             # BUILD OUTPUT (GitHub Pages serves this)
│   ├── index.html                    # Generated by Astro
│   ├── blog/                         # Generated blog post pages
│   ├── assets/                       # Bundled & optimized
│   └── CNAME                         # Copied from astro/public/CNAME
├── deploy.sh                         # Build & deploy script
├── fetch.sh                          # Data fetch script
├── .gitignore                        # Ignore node_modules, etc.
├── LICENSE                           # Project license
├── README.md                         # Project documentation
├── READWISE_SETUP.md                 # Readwise integration guide
└── MIGRATION_ROADMAP.md              # This file
```

### Key Configuration Changes

#### 1. GitHub Actions Workflow Updates
**File:** `.github/workflows/fetch-timeline.yml`

Changes needed:
- Update branch references from `master` to `main` (if timeline uses main)
- Ensure working paths are correct (already uses `./astro`, should be fine)
- Verify all secrets are configured in timeline repo settings

#### 2. Astro Configuration
**File:** `astro/astro.config.mjs`

Current (OK as-is):
```javascript
export default defineConfig({
  output: 'static',
  site: 'https://timeline.523.life',  // ✅ Correct
  vite: {
    server: {
      fs: { allow: ['..'] },  // Allows access to _posts/ in parent dir
    },
  },
});
```

#### 3. Package.json Scripts
**File:** `astro/package.json`

Current (OK as-is):
```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "generate": "npm run fetch:readwise && npm run fetch:blog && npm run fetch:bluesky && npm run fetch:github && npm run fetch:wikipedia && npm run merge"
  }
}
```

#### 4. Deploy Script
**File:** `deploy.sh`

Current (OK as-is):
```bash
#!/bin/bash
set -e
cd astro
npx astro build
cd ..
rm -rf docs
mkdir -p docs
cp -r astro/dist/* docs/
cp astro/dist/.nojekyll docs/ 2>/dev/null || true
```

#### 5. Asset Handling Strategy

**Option A: Copy assets to astro/public/assets/ (Recommended)**
- Simple, self-contained
- Assets bundled with Astro app
- No symlink issues with Git

**Option B: Symlink astro/public/assets → ../assets**
- Assets stay at root level
- Shared between _posts/ and Astro
- May have cross-platform issues

**Decision:** Use Option A (copy) for reliability.

---

## 🚀 Phase 3: Migration Execution Plan

### Step 3.1: Prepare Timeline Repository

**Action:** Create directory structure and copy files

```bash
# Navigate to timeline repo
cd /Users/cpettet/git/chasemp/timeline

# Create directory structure
mkdir -p .github/workflows
mkdir -p _posts
mkdir -p assets/{audio,images,pdf,slides,md_examples}
mkdir -p astro
mkdir -p docs  # Will be populated by build

# Copy astro application
cp -r ../chasemp.github.io/astro/* astro/

# Copy blog posts
cp -r ../chasemp.github.io/_posts/* _posts/

# Copy assets
cp -r ../chasemp.github.io/assets/* assets/

# Copy assets into astro/public for bundling
mkdir -p astro/public/assets
cp -r assets/* astro/public/assets/

# Copy scripts
cp ../chasemp.github.io/deploy.sh .
cp ../chasemp.github.io/fetch.sh .

# Copy documentation
cp ../chasemp.github.io/READWISE_SETUP.md .
# README.md already exists, will merge content manually

# Copy GitHub Actions
cp ../chasemp.github.io/.github/workflows/fetch-timeline.yml .github/workflows/

# Copy LICENSE if needed
cp ../chasemp.github.io/LICENSE .
```

**Verification:**
```bash
# Verify structure
ls -la
tree -L 2 -a

# Check CNAME is correct
cat astro/public/CNAME
# Should output: timeline.523.life
```

### Step 3.2: Update README

**Action:** Merge README content from chasemp.github.io into timeline/README.md

```bash
# The comprehensive README from chasemp.github.io should replace
# the minimal one in timeline
cp ../chasemp.github.io/README.md README.md
```

**Verification:**
```bash
# README should mention:
# - timeline.523.life
# - All data sources
# - Architecture diagram
# - Local development instructions
# - Deployment instructions
```

### Step 3.3: Configure Git

**Action:** Create .gitignore

```bash
cat > .gitignore <<'EOF'
# Dependencies
node_modules/
astro/node_modules/

# Environment
.env
.env.local

# Build artifacts (at root and in astro)
/build
/build-info.json
astro/build
astro/build-info.json

# Astro
astro/dist/
.astro/

# IDE
.vscode/
.idea/
*.swp
.DS_Store

# Logs
*.log
npm-debug.log*
EOF
```

**Note:** Unlike peadoubleueh PWA pattern, we DO commit `/docs` because GitHub Pages serves from it.

### Step 3.4: Test Local Build

**Action:** Build and test locally

```bash
cd /Users/cpettet/git/chasemp/timeline

# Install dependencies
cd astro
npm install

# Fetch data (will use existing or fail gracefully)
npm run generate

# Build site
npm run build

# Verify build output
ls -la dist/

# Copy to docs
cd ..
./deploy.sh

# Verify docs
ls -la docs/
cat docs/CNAME  # Should be: timeline.523.life

# Test locally
cd astro
npm run preview
# Visit http://localhost:4321
```

**Verification Checklist:**
- [ ] Site loads at localhost:4321
- [ ] Timeline items display correctly
- [ ] Filters work (Blog, Saved, Bluesky)
- [ ] Individual blog posts load
- [ ] Images and assets load correctly
- [ ] CNAME file present in docs/

### Step 3.5: Commit Timeline Repository

**Action:** Initial commit of migrated content

```bash
cd /Users/cpettet/git/chasemp/timeline

# Check status
git status

# Add all files
git add .

# Commit
git commit -m "feat: migrate timeline site from chasemp.github.io

- Copy complete Astro application from chasemp.github.io/astro
- Copy blog posts from chasemp.github.io/_posts
- Copy assets from chasemp.github.io/assets
- Copy deployment scripts (deploy.sh, fetch.sh)
- Copy GitHub Actions workflow
- Add comprehensive README from chasemp.github.io
- Build initial /docs for GitHub Pages deployment

This migration isolates timeline.523.life deployment to resolve
GitHub Pages caching issues with the namesake repo."

# Push to GitHub
git push origin main
```

### Step 3.6: Configure GitHub Pages

**Action:** Enable GitHub Pages for timeline repository

1. **Navigate to Repository Settings:**
   - Go to: https://github.com/chasemp/timeline/settings/pages

2. **Configure Source:**
   - Source: "Deploy from a branch"
   - Branch: `main`
   - Folder: `/docs` ← **CRITICAL**
   - Click "Save"

3. **Configure Custom Domain:**
   - Custom domain: `timeline.523.life`
   - Click "Save"
   - Wait for DNS check (may take a few minutes)

4. **Enable HTTPS:**
   - Check "Enforce HTTPS" (after DNS propagates)

**Verification:**
```bash
# Check GitHub Pages status
# Visit: https://github.com/chasemp/timeline/settings/pages
# Status should show: "Your site is live at https://timeline.523.life"
```

**Note:** DNS may take time to propagate. See Step 3.8 for DNS configuration.

### Step 3.7: Configure Repository Secrets

**Action:** Add secrets for GitHub Actions

1. **Navigate to Secrets:**
   - Go to: https://github.com/chasemp/timeline/settings/secrets/actions

2. **Add Secrets:**

   | Secret Name | Value | Required? | Purpose |
   |-------------|-------|-----------|---------|
   | `READWISE_TOKEN` | (from chasemp.github.io) | Optional | Fetch Readwise documents |
   | `GH_PAT` | (GitHub Personal Access Token) | Optional | Fetch GitHub releases |

3. **Configure Variables:**
   - Go to: https://github.com/chasemp/timeline/settings/variables/actions
   - Add: `READWISE_TAG_FILTER` = `classic` (or desired tag)

**Verification:**
```bash
# Manually trigger workflow to test
# Go to: https://github.com/chasemp/timeline/actions
# Click "Fetch Timeline Data" → "Run workflow"
# Monitor execution for errors
```

### Step 3.8: DNS Configuration

**Action:** Verify DNS points to timeline repo

**Current DNS (should already exist):**
```
Type: CNAME
Name: timeline (or timeline.523.life)
Value: chasemp.github.io
TTL: 3600 (or auto)
```

**No change needed!** GitHub Pages will automatically serve timeline repo's `/docs` when:
1. CNAME file exists in timeline repo's `/docs/CNAME` ✅
2. Custom domain configured in timeline repo settings ✅
3. Old CNAME removed from chasemp.github.io (see Phase 4)

**DNS Propagation Check:**
```bash
# Check DNS resolution
dig timeline.523.life +short
# Should resolve to chasemp.github.io

# Check GitHub Pages serving timeline
curl -I https://timeline.523.life
# Should return 200 OK (after deployment)
```

### Step 3.9: Test Timeline Deployment

**Action:** Verify timeline.523.life works from timeline repo

**Wait Time:** 2-5 minutes after GitHub Pages configuration

**Verification Checklist:**
- [ ] `https://timeline.523.life` loads (not 404)
- [ ] Timeline items display
- [ ] Blog posts load at `/blog/post-slug`
- [ ] Assets load (images, PDFs)
- [ ] Footer shows version number
- [ ] Check browser console for errors
- [ ] Test on mobile device
- [ ] Verify HTTPS works

**Troubleshooting:**
```bash
# If 404 - Check GitHub Pages settings
# - Ensure source is "main" branch, "/docs" folder
# - Check deployment status: https://github.com/chasemp/timeline/deployments

# If wrong content - Check docs/CNAME
cat /Users/cpettet/git/chasemp/timeline/docs/CNAME
# Should be: timeline.523.life

# If assets missing - Check docs/assets exists
ls -la /Users/cpettet/git/chasemp/timeline/docs/assets/

# If HTTPS error - Wait for DNS propagation (up to 24 hours)
```

---

## 🧹 Phase 4: Clean Up chasemp.github.io

### Step 4.1: Remove CNAME (CRITICAL FIRST STEP)

**Action:** Remove CNAME to free timeline.523.life domain

```bash
cd /Users/cpettet/git/chasemp/chasemp.github.io

# CRITICAL: Remove root CNAME
rm CNAME

# Remove from docs (if present)
rm docs/CNAME 2>/dev/null || true

# Commit immediately
git add CNAME docs/CNAME
git commit -m "remove: CNAME for timeline.523.life (moved to timeline repo)"
git push origin main
```

**Why This Is Critical:**
- GitHub Pages only allows one repo to claim a custom domain
- Until chasemp.github.io releases timeline.523.life, timeline repo can't claim it
- Must do this BEFORE timeline.523.life will work from timeline repo

**Verification:**
```bash
# Confirm CNAME removed
git log -1 --stat
# Should show: CNAME | 1 deletion(-)

# Wait 2-5 minutes, then test timeline.523.life resolves to timeline repo
```

### Step 4.2: Remove Timeline Assets

**Action:** Delete migrated timeline files

```bash
cd /Users/cpettet/git/chasemp/chasemp.github.io

# Remove timeline directories
rm -rf _posts
rm -rf astro
rm -rf assets
rm -rf docs  # Generated site, no longer needed

# Remove timeline scripts
rm deploy.sh
rm fetch.sh

# Remove timeline docs
rm READWISE_SETUP.md

# Remove GitHub Actions (entire workflows directory)
rm -rf .github/workflows
```

**Verification:**
```bash
# Check what remains
ls -la

# Should only see:
# - Alf/
# - index.html
# - README.md
# - LICENSE
# - (any other old blog artifacts)
```

### Step 4.3: Update chasemp.github.io README

**Action:** Document that this repo is now blog-archive only

```bash
cd /Users/cpettet/git/chasemp/chasemp.github.io

cat > README.md <<'EOF'
# chasemp.github.io

**Status:** Archive / Blog Legacy

This repository previously hosted both a blog and the timeline.523.life application.

## Current Status

**Timeline Site:** Moved to dedicated repository
- Repository: https://github.com/chasemp/timeline
- Live Site: https://timeline.523.life

**This Repo:** Contains archived blog artifacts and legacy content
- Old blog index (index.html)
- Legacy directories (Alf/)
- May be repurposed for future blog content

## Migration

The timeline site was migrated on October 15, 2025 to resolve GitHub Pages caching issues with namesake repositories.

## Related Projects

- **Timeline Site:** https://timeline.523.life (main project)
- **Main Site:** https://523.life

## License

Content is © Chase Pettet. Code is MIT licensed.
EOF
```

### Step 4.4: Commit Cleanup

**Action:** Commit all removals

```bash
cd /Users/cpettet/git/chasemp/chasemp.github.io

# Check status (should show many deletions)
git status

# Stage deletions
git add -A

# Commit
git commit -m "refactor: remove timeline assets (migrated to timeline repo)

- Remove _posts/ (blog content moved to timeline)
- Remove astro/ (application moved to timeline)  
- Remove assets/ (static files moved to timeline)
- Remove docs/ (build output, now in timeline)
- Remove deploy.sh, fetch.sh (scripts moved to timeline)
- Remove .github/workflows (actions moved to timeline)
- Remove READWISE_SETUP.md (docs moved to timeline)
- Update README to reflect archive status

Timeline site now deployed from:
https://github.com/chasemp/timeline

This resolves GitHub Pages caching issues with namesake repos."

# Push
git push origin main
```

**Verification:**
```bash
# Confirm push successful
git log -1 --stat

# Check GitHub repo
# Visit: https://github.com/chasemp/chasemp.github.io
# Should be much smaller, only legacy artifacts
```

### Step 4.5: Disable GitHub Pages (Optional)

**Action:** Disable GitHub Pages for chasemp.github.io

**Options:**

**Option A: Keep Enabled (Recommended)**
- Allows future blog deployment to chasemp.github.io
- No harm in keeping it enabled
- Can serve simple HTML site

**Option B: Disable**
1. Go to: https://github.com/chasemp/chasemp.github.io/settings/pages
2. Source: "None"
3. Save

**Recommendation:** Keep enabled, may use for future blog.

---

## ✅ Phase 5: Verification & Testing

### Step 5.1: Verify Timeline Site

**Timeline Repository:**
- [ ] Repository: https://github.com/chasemp/timeline
- [ ] Code structure correct (astro/, _posts/, docs/)
- [ ] README.md comprehensive
- [ ] LICENSE present
- [ ] .gitignore configured

**Timeline Live Site:**
- [ ] Site loads: https://timeline.523.life
- [ ] HTTPS works (green padlock)
- [ ] Timeline displays all items
- [ ] Filters work (Blog/Saved/Bluesky)
- [ ] Blog posts load correctly
- [ ] Images and assets display
- [ ] Version in footer correct
- [ ] No console errors
- [ ] Mobile responsive

**GitHub Actions:**
- [ ] Workflow present in timeline repo
- [ ] Secrets configured (READWISE_TOKEN, GH_PAT)
- [ ] Manual trigger works
- [ ] Workflow runs successfully
- [ ] Auto-fetch scheduled (every 4 hours)

### Step 5.2: Verify chasemp.github.io Cleanup

**Repository:**
- [ ] CNAME removed (critical!)
- [ ] Timeline assets removed (_posts/, astro/, etc.)
- [ ] README updated
- [ ] Only legacy artifacts remain
- [ ] Git history clean

**GitHub Pages:**
- [ ] Custom domain NOT set (or set to different domain)
- [ ] No longer claims timeline.523.life

### Step 5.3: End-to-End Test

**Test Scenario: Data Fetch & Deploy**

```bash
# 1. Make a small change to test workflow
cd /Users/cpettet/git/chasemp/timeline
echo "# Test" >> README.md
git add README.md
git commit -m "test: verify workflow"
git push origin main

# 2. Manually trigger GitHub Actions
# Go to: https://github.com/chasemp/timeline/actions
# Click "Fetch Timeline Data" → "Run workflow"

# 3. Wait for workflow to complete (~2-3 minutes)

# 4. Check workflow status
# Should show green checkmark

# 5. Verify site updated
# Visit: https://timeline.523.life
# Check footer version or timestamp

# 6. Test scheduled run (wait 4 hours or adjust cron)
```

### Step 5.4: Cache Busting Verification

**Test Scenario: Verify caching issues resolved**

**Before Migration Issue:**
- Changes took excessive time to appear
- Hard refresh often required
- Inconsistent across browsers

**After Migration Test:**
```bash
# 1. Note current version
curl -I https://timeline.523.life | grep -i cache

# 2. Make a visible change
cd /Users/cpettet/git/chasemp/timeline/astro/src/pages
# Bump version in index.astro

# 3. Build and deploy
cd ../..
npm run build
cd ../..
./deploy.sh
git add docs/
git commit -m "test: bump version for cache test"
git push

# 4. Wait 2-3 minutes for GitHub Pages

# 5. Check site WITHOUT cache clearing
# Visit: https://timeline.523.life
# Should show new version

# 6. Test in different browsers
# Chrome, Firefox, Safari
# All should show new version

# 7. Test on mobile
# Should show new version
```

**Success Criteria:**
- [ ] Changes appear within 5 minutes
- [ ] No hard refresh needed
- [ ] Consistent across browsers
- [ ] Mobile updates correctly

---

## 📊 Phase 6: Monitoring & Maintenance

### Step 6.1: Monitor GitHub Actions

**Action:** Set up monitoring for scheduled workflows

1. **Enable Notifications:**
   - Go to: https://github.com/chasemp/timeline/settings
   - Watch: "Custom" → Check "Actions"

2. **Check Workflow Health:**
   ```bash
   # View recent runs
   # https://github.com/chasemp/timeline/actions
   
   # Should run every 4 hours
   # All runs should be green
   ```

3. **Set Up Alerts (Optional):**
   - GitHub will email on workflow failures
   - Can use StatusCake or UptimeRobot for site monitoring

### Step 6.2: Verify Data Sources

**Action:** Confirm all data sources fetching correctly

**Data Source Health Check:**
```bash
cd /Users/cpettet/git/chasemp/timeline

# Check source files
ls -la astro/data/sources/
# Should contain:
# - blog.json (36 posts)
# - bluesky.json (4+ posts)
# - github-releases.json
# - readwise.json (10+ docs)
# - wikipedia.json

# Check merged timeline
cat astro/src/data/timeline.json | jq length
# Should output: 50+ items

# Check timeline.json on live site
curl -s https://timeline.523.life/data/timeline.json | jq length
```

**Expected Data Counts:**
- Blog: 36 posts (static, from _posts/)
- Bluesky: 4+ posts (incremental)
- Readwise: 10+ docs (filtered by "classic" tag)
- GitHub: Variable (releases)
- Wikipedia: Variable (contributions)

### Step 6.3: Performance Monitoring

**Action:** Establish performance baselines

**Metrics to Track:**
- Page load time: < 2 seconds
- Time to Interactive (TTI): < 3 seconds
- Lighthouse score: 90+
- Deployment time: < 5 minutes from push

**Tools:**
```bash
# Lighthouse CLI
npm install -g lighthouse
lighthouse https://timeline.523.life --view

# WebPageTest
# https://www.webpagetest.org/
# Test URL: https://timeline.523.life

# Chrome DevTools
# Network tab → Disable cache → Reload
# Check: DOMContentLoaded, Load time
```

### Step 6.4: Documentation Updates

**Action:** Keep documentation current

**Files to Maintain:**
- `README.md` - Update data counts, features
- `READWISE_SETUP.md` - Keep API instructions current
- `MIGRATION_ROADMAP.md` - Add post-migration notes
- `CHANGELOG.md` (create if desired) - Track changes

---

## 🚨 Rollback Plan

### If Migration Fails

**Immediate Rollback (within 24 hours):**

```bash
# 1. Restore CNAME to chasemp.github.io
cd /Users/cpettet/git/chasemp/chasemp.github.io
echo "timeline.523.life" > CNAME
git add CNAME
git commit -m "rollback: restore timeline.523.life CNAME"
git push origin main

# 2. Disable GitHub Pages on timeline repo
# Go to: https://github.com/chasemp/timeline/settings/pages
# Source: "None"

# 3. Wait 5 minutes for DNS/Pages propagation

# 4. Verify timeline.523.life serves from chasemp.github.io again
curl -I https://timeline.523.life
```

**Long-term Rollback (if issues persist):**

```bash
# 1. Restore all files to chasemp.github.io
cd /Users/cpettet/git/chasemp/chasemp.github.io
git log --oneline  # Find commit before cleanup
git revert <commit-hash-of-cleanup>
git push origin main

# 2. Rebuild docs
./deploy.sh
git add docs/
git commit -m "rollback: rebuild docs"
git push origin main

# 3. Disable timeline repo GitHub Pages
# (as above)
```

---

## 📈 Success Metrics

### Technical Success
- ✅ Timeline repo deploys successfully to timeline.523.life
- ✅ GitHub Actions run every 4 hours without errors
- ✅ All data sources fetch correctly
- ✅ Site performance: Lighthouse score 90+
- ✅ No 404 errors or broken links
- ✅ HTTPS enabled and enforced

### Caching Success (Primary Goal)
- ✅ Changes appear within 5 minutes of deployment
- ✅ No hard refresh required to see updates
- ✅ Consistent behavior across browsers
- ✅ Mobile updates correctly
- ✅ Cache headers appropriate

### Operational Success
- ✅ Documentation complete and accurate
- ✅ Local development workflow clear
- ✅ Deployment process automated
- ✅ Monitoring in place
- ✅ No manual intervention needed for data updates

---

## 🎓 Lessons from peadoubleueh Reference

### Applied Patterns

1. **Clean Source/Build Separation:**
   - Source: `astro/src/`, `_posts/`, `assets/`
   - Build: `docs/` (committed for GitHub Pages)
   - Clear separation prevents confusion

2. **Automated Builds:**
   - GitHub Actions handle fetch + build + deploy
   - No manual steps required
   - Consistent builds every time

3. **Build Metadata:**
   - Version in footer
   - Build info for debugging
   - Cache busting via content changes

4. **Documentation First:**
   - Comprehensive README
   - Migration roadmap (this file)
   - Setup guides (READWISE_SETUP.md)

### Differences from peadoubleueh

| Aspect | peadoubleueh PWA | Timeline Site |
|--------|------------------|---------------|
| Build Tool | Vite | Astro |
| Source Dir | `/src` | `/astro/src`, `/_posts` |
| Static Assets | `/public` | `/astro/public`, `/assets` |
| Build Output | `/docs` (committed) | `/docs` (committed) |
| Deployment | GitHub Pages from /docs | GitHub Pages from /docs |
| Pre-commit Hook | Yes (enforces build) | No (GitHub Actions builds) |
| Build Metadata | `build`, `build-info.json` | Version in footer |
| Multi-page | Yes (settings.html) | Yes (blog/[slug].astro) |

---

## 📝 Post-Migration Tasks

### Immediate (Day 1)
- [ ] Verify timeline.523.life loads
- [ ] Test all filters and blog posts
- [ ] Check GitHub Actions first scheduled run
- [ ] Monitor for 404s or errors

### Short-term (Week 1)
- [ ] Monitor cache behavior daily
- [ ] Verify all data sources updating
- [ ] Check Lighthouse scores
- [ ] Test on multiple devices/browsers
- [ ] Update any external links to point to timeline repo

### Long-term (Month 1)
- [ ] Review GitHub Actions logs for patterns
- [ ] Analyze any cache-related issues
- [ ] Optimize build times if needed
- [ ] Consider adding more data sources
- [ ] Document any learnings

---

## 🔗 Reference Links

### Repositories
- **Timeline:** https://github.com/chasemp/timeline
- **Old Blog:** https://github.com/chasemp/chasemp.github.io
- **Reference (PWA):** https://github.com/chasemp/peadoubleueh

### Live Sites
- **Timeline:** https://timeline.523.life
- **Main Site:** https://523.life

### Documentation
- **Astro Docs:** https://docs.astro.build
- **GitHub Pages:** https://docs.github.com/en/pages
- **GitHub Actions:** https://docs.github.com/en/actions

### Tools
- **Readwise:** https://readwise.io/access_token
- **Bluesky:** https://bsky.app/profile/chase523.bsky.social

---

## 🎉 Migration Complete Checklist

Use this checklist to confirm migration success:

### Pre-Migration
- [ ] Backup chasemp.github.io (git commits are backup)
- [ ] Document current state (data counts, versions)
- [ ] Note any custom configurations

### Migration Execution
- [ ] ✅ Phase 1: Inventory complete
- [ ] ✅ Phase 2: Timeline repo setup
- [ ] ✅ Phase 3: Files copied and tested
- [ ] ✅ Phase 4: chasemp.github.io cleaned
- [ ] ✅ Phase 5: Verification passed
- [ ] ✅ Phase 6: Monitoring established

### Post-Migration
- [ ] Timeline.523.life serves from timeline repo
- [ ] GitHub Actions running successfully
- [ ] All data sources fetching
- [ ] Cache behavior improved
- [ ] Documentation updated
- [ ] Team notified (if applicable)

---

**End of Migration Roadmap**

*For questions or issues, refer to README.md or create a GitHub issue in the timeline repository.*

