# LinkedIn Data Export Setup Guide

Since LinkedIn API doesn't provide access to personal posts and comments, we'll use LinkedIn's **data export feature** (GDPR compliance) to get your complete activity history.

## Step 1: Request LinkedIn Data Export

1. **Visit LinkedIn Data Export**: https://www.linkedin.com/psettings/data-export
2. **Select Data Types**:
   - ✅ Posts and Comments
   - ✅ Connections
   - ✅ Profile Information
   - ✅ Activity Logs
3. **Submit Request**: LinkedIn will email you when ready (usually 24-48 hours)
4. **Download ZIP**: When ready, download the ZIP file

## Step 2: Extract Export Data

1. **Extract ZIP file** to a temporary location
2. **Find the relevant files**:
   - `Posts.json` - Your posts and comments
   - `Connections.json` - Your connections
   - `Profile.json` - Your profile info
3. **Copy to project directory**:
   ```bash
   mkdir -p astro/data/sources/linkedin-export
   cp path/to/extracted/*.json astro/data/sources/linkedin-export/
   ```

## Step 3: Process Export Data

```bash
cd astro
npm run fetch:linkedin-export
```

This will:
- Parse your LinkedIn export files
- Convert to timeline format
- Save to `linkedin.json`
- Merge with other timeline sources

## Step 4: Automate Export Updates

### Option A: Manual Monthly Updates
- Request new export monthly
- Replace files in `linkedin-export/` directory
- Run `npm run fetch:linkedin-export`

### Option B: GitHub Actions with Manual Trigger
- Upload export files to GitHub repository
- Trigger workflow manually when new data available
- Automated processing and commit

## Step 5: GitHub Actions Integration

Create `.github/workflows/linkedin-export.yml`:

```yaml
name: LinkedIn Export Processing

on:
  workflow_dispatch: # Manual trigger only
  push:
    paths:
      - 'astro/data/sources/linkedin-export/**'

jobs:
  process-export:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: astro/package-lock.json
        
    - name: Install dependencies
      working-directory: astro
      run: npm ci
      
    - name: Process LinkedIn export
      working-directory: astro
      run: npm run fetch:linkedin-export
      
    - name: Commit changes
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add .
        if git diff --staged --quiet; then
          echo "No changes to commit"
        else
          git commit -m "Update LinkedIn activity from export [automated]"
          git push
        fi
```

## Export File Structure

LinkedIn export files typically contain:

### Posts.json
```json
[
  {
    "id": "post_id",
    "created_time": "2024-01-01T00:00:00Z",
    "content": "Your post content...",
    "media": ["image_url1", "image_url2"],
    "likes_count": 10,
    "comments_count": 5,
    "shares_count": 2
  }
]
```

### Comments.json
```json
[
  {
    "id": "comment_id",
    "post_id": "post_id",
    "created_time": "2024-01-01T00:00:00Z",
    "content": "Your comment...",
    "likes_count": 3
  }
]
```

## Customizing the Parser

The export parser (`fetch-linkedin-export.mts`) is designed to be flexible. You may need to adjust it based on your actual export format:

1. **Check export structure**: Look at your actual JSON files
2. **Update interfaces**: Modify `LinkedInExportData` interface
3. **Adjust converter**: Update `convertToTimelinePost` method
4. **Test parsing**: Run `npm run fetch:linkedin-export`

## Advantages of Data Export Approach

✅ **Complete Data**: Access to all your posts and comments
✅ **No API Limits**: No rate limiting or restrictions
✅ **Privacy Compliant**: Uses official LinkedIn data export
✅ **Reliable**: Doesn't depend on API changes
✅ **Comprehensive**: Includes engagement metrics

## Limitations

⚠️ **Manual Process**: Requires manual export requests
⚠️ **Delayed Data**: Export takes 24-48 hours to generate
⚠️ **Static Snapshots**: Data is point-in-time, not real-time
⚠️ **File Management**: Need to manage export files

## Troubleshooting

### Common Issues

1. **"Export directory not found"**:
   - Create `astro/data/sources/linkedin-export/` directory
   - Add your export JSON files

2. **"No posts found"**:
   - Check file format (should be JSON)
   - Verify file structure matches expected format
   - Check console for parsing errors

3. **"Could not parse export file"**:
   - Verify JSON format is valid
   - Check file encoding (should be UTF-8)
   - Look for special characters in content

### Getting Help

- LinkedIn Help: https://www.linkedin.com/help/linkedin
- Data Export FAQ: https://www.linkedin.com/help/linkedin/answer/50191
- GitHub Issues: Create issue in this repository

## Security Best Practices

- ✅ Store export files locally only
- ✅ Don't commit export files to repository
- ✅ Use `.gitignore` to exclude export directory
- ✅ Delete old export files after processing
- ✅ Encrypt sensitive data if needed

