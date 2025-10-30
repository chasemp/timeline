/**
 * Site configuration
 */

export const config = {
  // Enable/disable giscus comments site-wide
  // Can be overridden per item with #nocomments or #nc hashtag
  commentsEnabled: true,
  
  // Disable comments for specific content types
  // HackerNews entries are comments themselves, so no meta-comments needed
  disableCommentsForTypes: ['hackernews'] as const,
} as const;

export type Config = typeof config;

