#!/usr/bin/env node
/**
 * Fetch Bluesky posts from @chase523.bsky.social
 * Uses the AT Protocol API to fetch posts and store them as JSON
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BLUESKY_HANDLE = 'chase523.bsky.social';
const OUTPUT_FILE = join(__dirname, '../data/sources/bluesky.json');

interface BlueskyPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
  };
  record: {
    text: string;
    createdAt: string;
    embed?: any;
    facets?: any[];
  };
  embed?: any;
  replyCount: number;
  repostCount: number;
  likeCount: number;
  indexedAt: string;
}

interface TimelineEntry {
  id: string;
  type: 'bluesky';
  timestamp: string;
  title: string;
  summary?: string;
  url: string;
  embed_uri?: string;
  embed_cid?: string;
  content_html?: string;
  media?: {
    type: 'image' | 'video' | 'external';
    images?: string[];
    alt?: string[];
  };
  metadata?: {
    likes: number;
    reposts: number;
    replies: number;
  };
}

/**
 * Resolve a handle to a DID using the Bluesky API
 */
async function resolveDID(handle: string): Promise<string> {
  const url = `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to resolve handle: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.did;
}

/**
 * Fetch posts from Bluesky using the AT Protocol API
 */
async function fetchPosts(did: string, limit = 100, cursor?: string): Promise<{ posts: BlueskyPost[], cursor?: string }> {
  let url = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${did}&limit=${limit}&filter=posts_no_replies`;
  
  if (cursor) {
    url += `&cursor=${cursor}`;
  }
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.statusText}`);
  }
  
  const data = await response.json();
  return {
    posts: data.feed.map((item: any) => item.post),
    cursor: data.cursor
  };
}

/**
 * Convert Bluesky post to timeline entry
 */
function convertToTimelineEntry(post: BlueskyPost): TimelineEntry {
  const postId = post.uri.split('/').pop() || '';
  const url = `https://bsky.app/profile/${post.author.handle}/post/${postId}`;
  
  // Extract text content and truncate for summary
  let text = post.record.text;
  let summary = text.length > 200 ? text.substring(0, 197) + '...' : text;
  
  // Check for media embeds
  let media: TimelineEntry['media'] = undefined;
  let contentHtml = `<p>${text.replace(/\n/g, '<br>')}</p>`;
  
  if (post.embed) {
    const embedType = post.embed.$type;
    
    if (embedType === 'app.bsky.embed.images#view') {
      // Extract images
      const images = post.embed.images?.map((img: any) => img.fullsize || img.thumb) || [];
      const alts = post.embed.images?.map((img: any) => img.alt || '') || [];
      
      media = {
        type: 'image',
        images,
        alt: alts
      };
      
      // Add images to content HTML
      contentHtml += images.map((imgUrl: string, i: number) => 
        `<img src="${imgUrl}" alt="${alts[i] || 'Image from post'}" style="max-width: 100%; margin: 12px 0; border-radius: 8px;">`
      ).join('');
      
      // If text is very short and there's an image, enhance the summary
      if (text.length < 20 && images.length > 0) {
        summary = `${text} [${images.length} image${images.length > 1 ? 's' : ''}]`;
      }
    } else if (embedType === 'app.bsky.embed.external#view') {
      // Extract external link preview
      const external = post.embed.external;
      if (external) {
        const linkTitle = external.title || '';
        const linkDesc = external.description || '';
        const linkUrl = external.uri || '';
        const linkThumb = external.thumb || '';
        
        // Add external link card to content
        contentHtml += `
          <div style="margin: 16px 0; border: 1px solid var(--border, #d4c4a8); border-radius: 8px; overflow: hidden; background: var(--card-bg, #fdfbf7);">
            ${linkThumb ? `<img src="${linkThumb}" alt="${linkTitle}" style="width: 100%; height: auto; display: block; max-height: 200px; object-fit: cover;">` : ''}
            <div style="padding: 12px;">
              ${linkTitle ? `<div style="font-weight: 600; margin-bottom: 4px; color: var(--text, #3d2817);">${linkTitle}</div>` : ''}
              ${linkDesc ? `<div style="font-size: 13px; color: var(--muted, #7a6b5d); margin-bottom: 8px;">${linkDesc}</div>` : ''}
              ${linkUrl ? `<div style="font-size: 12px; color: var(--accent, #c17a4f); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">🔗 ${linkUrl}</div>` : ''}
            </div>
          </div>`;
        
        // Enhance summary with link info
        if (linkTitle) {
          summary = `${text} — ${linkTitle}`;
        }
      }
    }
  }
  
  // Generate a title from the first line or first 60 chars
  const firstLine = text.split('\n')[0];
  let title = firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
  
  // If title is very short and there's media, add indicator
  if (title.length < 20 && media?.images && media.images.length > 0) {
    title = `${title} 📷`;
  }
  
  return {
    id: `bluesky:${postId}`,
    type: 'bluesky',
    timestamp: post.record.createdAt,
    title: title || 'Post',
    summary: summary,
    url: url,
    embed_uri: post.uri,
    embed_cid: post.cid,
    content_html: contentHtml,
    media,
    metadata: {
      likes: post.likeCount || 0,
      reposts: post.repostCount || 0,
      replies: post.replyCount || 0
    }
  };
}

/**
 * Load existing posts from JSON file
 */
function loadExistingPosts(): TimelineEntry[] {
  if (!existsSync(OUTPUT_FILE)) {
    return [];
  }
  
  try {
    const content = readFileSync(OUTPUT_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.warn('Failed to load existing posts, starting fresh:', err);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🦋 Fetching Bluesky posts...');
  
  try {
    // Resolve the handle to a DID
    console.log(`Resolving handle: ${BLUESKY_HANDLE}`);
    const did = await resolveDID(BLUESKY_HANDLE);
    console.log(`✓ Resolved to DID: ${did}`);
    
    // Load existing posts
    const existingPosts = loadExistingPosts();
    const existingIds = new Set(existingPosts.map(p => p.id));
    
    // Determine the most recent post timestamp
    let latestTimestamp: Date | null = null;
    if (existingPosts.length > 0) {
      latestTimestamp = new Date(
        Math.max(...existingPosts.map(p => new Date(p.timestamp).getTime()))
      );
      console.log(`✓ Latest existing post: ${latestTimestamp.toISOString()}`);
    }
    
    // Fetch new posts
    console.log('Fetching posts from Bluesky...');
    const allPosts: BlueskyPost[] = [];
    let cursor: string | undefined = undefined;
    let hasMore = true;
    let newPostsCount = 0;
    
    // Fetch until we hit a post we already have or run out of posts
    while (hasMore && allPosts.length < 1000) { // safety limit
      const { posts, cursor: nextCursor } = await fetchPosts(did, 50, cursor);
      
      for (const post of posts) {
        const postId = post.uri.split('/').pop() || '';
        
        // If we've seen this post, stop fetching
        if (existingIds.has(`bluesky:${postId}`)) {
          hasMore = false;
          break;
        }
        
        // If this post is older than our latest, skip it
        if (latestTimestamp && new Date(post.record.createdAt) <= latestTimestamp) {
          hasMore = false;
          break;
        }
        
        allPosts.push(post);
        newPostsCount++;
      }
      
      cursor = nextCursor;
      if (!cursor || posts.length === 0) {
        hasMore = false;
      }
    }
    
    console.log(`✓ Fetched ${newPostsCount} new posts`);
    
    // Convert to timeline entries
    const newEntries = allPosts.map(convertToTimelineEntry);
    
    // Merge with existing posts (new posts first)
    const allEntries = [...newEntries, ...existingPosts];
    
    // Sort by timestamp (newest first)
    allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Write to file
    mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify(allEntries, null, 2));
    console.log(`✅ Wrote ${allEntries.length} total posts to ${OUTPUT_FILE}`);
    console.log(`   (${newPostsCount} new, ${existingPosts.length} existing)`);
    
  } catch (error) {
    console.error('❌ Error fetching Bluesky posts:', error);
    process.exit(1);
  }
}

main();

