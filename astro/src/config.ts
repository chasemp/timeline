/**
 * Site configuration
 */

export const config = {
  // Enable/disable giscus comments site-wide
  // Can be overridden per item with #nocomments or #nc hashtag
  commentsEnabled: true,
} as const;

export type Config = typeof config;

