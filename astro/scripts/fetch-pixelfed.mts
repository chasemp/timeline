#!/usr/bin/env node
/**
 * Fetch Pixelfed posts from https://gram.social/users/chase523
 * Uses ActivityPub RSS feed to fetch posts and store them as JSON
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PIXELFED_USER = 'chase523';
const PIXELFED_INSTANCE = 'gram.social';
const PIXELFED_URL = `https://${PIXELFED_INSTANCE}/users/${PIXELFED_USER}`;
const OUTPUT_FILE = join(__dirname, '../data/sources/pixelfed.json');

interface PixelfedEntry {
  id: string;
  type: 'pixelfed';
  timestamp: string;
  title: string;
  summary?: string;
  url: string;
  content_html?: string;
  media?: {
    type: 'image' | 'video';
    images?: string[];
    alt?: string;
  };
  metadata?: {
    likes?: number;
    comments?: number;
  };
}

/**
 * Parse RSS/Atom feed XML and extract entries
 */
function parseFeed(xml: string): PixelfedEntry[] {
  const entries: PixelfedEntry[] = [];
  
  // Simple XML parsing for Atom/RSS feed
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/g;
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  
  // Try Atom feed first
  let matches = [...xml.matchAll(entryRegex)];
  
  // If no entries found, try RSS format
  if (matches.length === 0) {
    matches = [...xml.matchAll(itemRegex)];
  }
  
  for (const match of matches) {
    const entryXml = match[1];
    
    // Extract title
    const titleMatch = entryXml.match(/<title[^>]*>(.*?)<\/title>/s);
    const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim() : 'Untitled';
    
    // Extract link
    const linkMatch = entryXml.match(/<link[^>]*href="([^"]*)"|href="([^"]*)"/);
    const link = linkMatch ? (linkMatch[1] || linkMatch[2]) : null;
    
    // Extract published/updated date
    const pubDateMatch = entryXml.match(/<published[^>]*>(.*?)<\/published>/s) || 
                        entryXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/s) ||
                        entryXml.match(/<updated[^>]*>(.*?)<\/updated>/s);
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
    
    // Extract ID
    const idMatch = entryXml.match(/<id[^>]*>(.*?)<\/id>/s);
    const entryId = idMatch ? idMatch[1].trim() : null;
    
    // Extract content (can be in <content>, <summary>, or <description>)
    const contentMatch = entryXml.match(/<content[^>]*>(.*?)<\/content>/s) ||
                        entryXml.match(/<summary[^>]*>(.*?)<\/summary>/s) ||
                        entryXml.match(/<description[^>]*>(.*?)<\/description>/s);
    let content = contentMatch ? contentMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim() : '';
    
    // Extract media/images from content
    const imageMatches = [...content.matchAll(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/g)];
    const images: string[] = [];
    let alt = '';
    
    for (const imgMatch of imageMatches) {
      images.push(imgMatch[1]);
      alt = imgMatch[2] || alt;
    }
    
    // Generate unique ID
    const postId = entryId || link || `${title}_${pubDate}`;
    const id = `pixelfed:${postId}`;
    
    // Create timeline entry
    const entry: PixelfedEntry = {
      id,
      type: 'pixelfed',
      timestamp: new Date(pubDate).toISOString(),
      title,
      summary: title.length > 150 ? title.substring(0, 147) + '...' : title,
      url: link || PIXELFED_URL,
      content_html: content || `<p>${title}</p>`,
      media: images.length > 0 ? {
        type: 'image',
        images,
        alt
      } : undefined
    };
    
    entries.push(entry);
  }
  
  return entries;
}

/**
 * Fetch posts from Pixelfed RSS/Atom feed
 */
async function fetchPosts(): Promise<PixelfedEntry[]> {
  const feedUrl = `${PIXELFED_URL}.atom`;
  console.log(`Fetching from: ${feedUrl}`);
  
  const response = await fetch(feedUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Pixelfed feed: ${response.status} ${response.statusText}`);
  }
  
  const xml = await response.text();
  const entries = parseFeed(xml);
  
  console.log(`✓ Parsed ${entries.length} entries from feed`);
  
  return entries;
}

/**
 * Load existing posts from JSON file
 */
function loadExistingPosts(): PixelfedEntry[] {
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
  console.log('📷 Fetching Pixelfed posts...');
  
  try {
    // Fetch new posts from feed
    const newPosts = await fetchPosts();
    
    // Load existing posts
    const existingPosts = loadExistingPosts();
    const existingIds = new Set(existingPosts.map(p => p.id));
    
    // Filter out posts we already have
    const uniqueNewPosts = newPosts.filter(post => !existingIds.has(post.id));
    
    console.log(`✓ Found ${uniqueNewPosts.length} new posts (${existingPosts.length} existing)`);
    
    // Merge with existing posts (new posts first)
    const allPosts = [...uniqueNewPosts, ...existingPosts];
    
    // Sort by timestamp (newest first)
    allPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Write to file
    mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify(allPosts, null, 2));
    console.log(`✅ Wrote ${allPosts.length} total posts to ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('❌ Error fetching Pixelfed posts:', error);
    process.exit(1);
  }
}

main();

