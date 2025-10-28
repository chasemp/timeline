# Comments Configuration

This document explains how to control comments on the timeline site.

## Global Configuration

To disable comments across the entire site, edit `astro/src/config.ts`:

```typescript
export const config = {
  // Set to false to disable all comments site-wide
  commentsEnabled: false,
} as const;
```

Setting `commentsEnabled: false` will:
- Remove comments from all blog posts
- Remove comments from all timeline items
- Comments can still be re-enabled per-item using hashtags (see below)

## Per-Item Comment Control

You can disable comments for specific items using hashtags.

### Supported Hashtags

- `#nocomments` or `#nocomment` - Disable comments for this item
- `#nc` - Short form to disable comments

### How to Use

#### For Blog Posts (Markdown frontmatter)

Add the tag to your markdown frontmatter:

```markdown
---
title: My Post
date: 2023-01-01
tags: [tech, development, nocomments]
---

Post content here...
```

#### For Timeline Items

Tags are extracted from multiple sources:
- Frontmatter tags (from blog posts, Readwise, etc.)
- Hashtags in content text (title, summary, content_html)

Examples:
- Add `#nocomments` in any content text
- Add `nocomments` to the tags array
- Add `#nc` anywhere in the content

### Priority

1. **Global config** - If `commentsEnabled: false` in config, all comments are disabled
2. **Item hashtags** - If an item has `#nocomments` or `#nc`, comments are disabled for that item only
3. **Default** - If neither, comments are enabled

### Examples

**Disable comments for a specific blog post:**
```markdown
---
title: My Post
tags: [tech, nocomments]
---
```

**Disable comments for all items globally:**
```typescript
// astro/src/config.ts
export const config = {
  commentsEnabled: false,
} as const;
```

**Enable comments except for specific items:**
```typescript
// astro/src/config.ts
export const config = {
  commentsEnabled: true, // Comments enabled by default
} as const;
```

Then add `#nocomments` to items where you want to disable comments.

