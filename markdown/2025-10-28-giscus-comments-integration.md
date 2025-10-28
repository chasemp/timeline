---
title: "Giscus comments integration"
categories:
  - Blog
tags:
  - Giscus
  - Comments
  - GitHub Discussions
---

I added comment functionality to the timeline site using Giscus, a comments system powered by GitHub Discussions.

## Why Giscus

Requirements for a comments system were simple: no database, minimal maintenance, and direct moderation within the existing workflow. Giscus fits these constraints by using GitHub Discussions as the backend. Comments appear on timeline items and blog posts, stored as GitHub Discussions and manageable within the repository.

## Implementation

The integration has three components: global configuration, per-item control, and rendering.

### Global Configuration

Comments can be disabled site-wide via `config.ts`:

```typescript
export const config = {
  commentsEnabled: true,
} as const;
```

When set to false, comments are hidden everywhere. Individual items can still disable comments via hashtags.

### Per-Item Control

Specific items can disable comments using the `#nocomments` or `#nc` hashtag. This works across content types:

- Blog posts: add the tag to markdown frontmatter
- Timeline items: add the hashtag in content text or as a tag

### Rendering

For blog posts, Giscus loads with a pathname mapping strategy. Each post gets its own discussion thread. The script loads when the page loads and renders below the content.

For timeline items, Giscus loads dynamically when opening an item. The script is removed when closing the panel to avoid conflicts. This keeps the timeline responsive.

## Technical Details

### Configuration

Giscus connects to the `chasemp/timeline` repository with the category "Ideas" (category ID `DIC_kwDOQDOMbM4CxLZb`). The mapping strategy is "specific" for timeline items, using the item ID as the discussion term. Blog posts use pathname mapping.

A custom theme in `giscus-custom.css` centers the sign-in button and positions it at the top of the comments section.

### Error Handling

If Giscus fails to load, the comments section hides after a 10-second timeout. This prevents displaying empty sections and keeps the interface clean.

### References

- [Giscus documentation](https://giscus.app/)
- [GitHub Discussions configuration](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/enabling-or-disabling-github-discussions-for-a-repository)

