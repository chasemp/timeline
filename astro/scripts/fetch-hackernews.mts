#!/usr/bin/env node
/**
 * Fetch HackerNews comments for a specific user
 * Uses the HackerNews Firebase API
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HN_USERNAME = 'chasemp'; // HackerNews username
const OUTPUT_FILE = join(__dirname, '../data/sources/hackernews.json');
const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';

interface HNItem {
  id: number;
  type: 'comment' | 'story' | 'job' | 'poll' | 'pollopt';
  by: string;
  time: number; // Unix timestamp
  text?: string; // HTML content
  parent?: number;
  deleted?: boolean;
  dead?: boolean;
  kids?: number[];
}

interface HNUser {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[]; // List of item IDs
}

interface TimelineEntry {
  id: string;
  type: 'hackernews';
  timestamp: string;
  title: string;
  summary?: string;
  url: string | null;
  canonical_url?: string;
  tags: string[];
  content_html?: string;
  metadata?: {
    story_id?: number;
    story_title?: string;
    story_url?: string;
    parent_id?: number;
  };
}

/**
 * Fetch user data from HN API
 */
async function fetchUser(username: string): Promise<HNUser | null> {
  console.log(`👤 Fetching user data for: ${username}`);
  
  try {
    const response = await fetch(`${HN_API_BASE}/user/${username}.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status} ${response.statusText}`);
    }
    
    const user = await response.json();
    return user;
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    return null;
  }
}

/**
 * Fetch an item (comment, story, etc.) from HN API
 */
async function fetchItem(id: number): Promise<HNItem | null> {
  try {
    const response = await fetch(`${HN_API_BASE}/item/${id}.json`);
    
    if (!response.ok) {
      return null;
    }
    
    const item = await response.json();
    return item;
  } catch (error) {
    console.warn(`  ⚠️ Failed to fetch item ${id}:`, error.message);
    return null;
  }
}

/**
 * Get the parent story for a comment
 */
async function getParentStory(item: HNItem): Promise<HNItem | null> {
  let current = item;
  
  // Walk up the chain until we find a story
  while (current && current.parent) {
    const parent = await fetchItem(current.parent);
    if (!parent) break;
    
    if (parent.type === 'story') {
      return parent;
    }
    
    current = parent;
  }
  
  return null;
}

/**
 * Convert HTML entities and clean up HN comment HTML
 */
function cleanHNHTML(html: string): string {
  if (!html) return '';
  
  // HN uses <p> tags for paragraphs, convert to line breaks for consistency
  return html
    .replace(/<p>/g, '<br>')
    .replace(/<\/p>/g, '')
    .trim();
}

/**
 * Convert HN comment to timeline entry
 */
async function convertToTimelineEntry(item: HNItem): Promise<TimelineEntry | null> {
  if (!item.text || item.deleted || item.dead) {
    return null;
  }
  
  // Get the parent story
  const story = await getParentStory(item);
  
  // Extract comment text for summary and hashtags
  const textContent = item.text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Use the story title as the entry title (or fallback to comment excerpt)
  let title: string;
  if (story && story.title) {
    title = story.title;
  } else {
    // Fallback: create a title from the first line or first 60 chars of the comment
    const firstLine = textContent.split('\n')[0];
    title = firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine;
  }
  
  // Build the HN URL
  const commentUrl = `https://news.ycombinator.com/item?id=${item.id}`;
  
  // Extract hashtags from comment text (if any)
  const hashtagMatches = textContent.match(/#\w+/g) || [];
  const hashtags = hashtagMatches.map(tag => tag.toLowerCase());
  
  const entry: TimelineEntry = {
    id: `hackernews:${item.id}`,
    type: 'hackernews',
    timestamp: new Date(item.time * 1000).toISOString(),
    title: title || 'Comment',
    summary: textContent.substring(0, 200),
    url: commentUrl,
    canonical_url: commentUrl,
    tags: hashtags,
    content_html: cleanHNHTML(item.text),
    metadata: {
      parent_id: item.parent
    }
  };
  
  // Add story metadata if available
  if (story) {
    entry.metadata!.story_id = story.id;
    entry.metadata!.story_title = story.title;
    entry.metadata!.story_url = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
  }
  
  return entry;
}

/**
 * Load existing entries from JSON file
 */
function loadExistingEntries(): TimelineEntry[] {
  if (!existsSync(OUTPUT_FILE)) {
    return [];
  }
  
  try {
    const content = readFileSync(OUTPUT_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.warn('Failed to load existing entries, starting fresh:', err);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  console.log('💬 Fetching HackerNews comments...');
  
  try {
    // Fetch user data
    const user = await fetchUser(HN_USERNAME);
    
    if (!user || !user.submitted) {
      console.error('❌ Could not fetch user data or no submissions found');
      process.exit(1);
    }
    
    console.log(`✓ User ${user.id} has ${user.submitted.length} total submissions`);
    
    // Load existing entries
    const existing = loadExistingEntries();
    const existingIds = new Set(existing.map(e => e.id));
    console.log(`📋 Loaded ${existing.length} existing entries`);
    
    // Fetch items and filter for comments only
    console.log('📥 Fetching submissions...');
    const entries: TimelineEntry[] = [];
    let commentCount = 0;
    let newCount = 0;
    
    // Fetch items in batches to be respectful to the API
    const batchSize = 10;
    for (let i = 0; i < user.submitted.length; i += batchSize) {
      const batch = user.submitted.slice(i, i + batchSize);
      
      const items = await Promise.all(
        batch.map(async (id) => {
          const item = await fetchItem(id);
          return item;
        })
      );
      
      for (const item of items) {
        if (!item) continue;
        
        // Only process comments
        if (item.type === 'comment') {
          commentCount++;
          
          // Skip if we already have this comment
          if (existingIds.has(`hackernews:${item.id}`)) {
            continue;
          }
          
          const entry = await convertToTimelineEntry(item);
          if (entry) {
            entries.push(entry);
            newCount++;
          }
        }
      }
      
      console.log(`  Processed ${Math.min(i + batchSize, user.submitted.length)}/${user.submitted.length} submissions (${commentCount} comments found, ${newCount} new)...`);
      
      // Rate limiting - be nice to HN API
      if (i + batchSize < user.submitted.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Merge with existing entries
    const allEntries = [...existing, ...entries];
    
    // Sort by timestamp (newest first)
    allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Write to file
    mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify(allEntries, null, 2));
    
    console.log(`✅ Wrote ${allEntries.length} total comments to ${OUTPUT_FILE}`);
    console.log(`   (${newCount} new, ${existing.length} existing)`);
    
  } catch (error) {
    console.error('❌ Error fetching HackerNews comments:', error);
    process.exit(1);
  }
}

main();

