#!/usr/bin/env node
/**
 * Fetch saved documents from Readwise Reader (not classic Readwise)
 * Uses the Reader v3 API to fetch documents with highlights
 * Optionally filters by tag
 */

import { config } from 'dotenv';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const READWISE_TOKEN = process.env.READWISE_TOKEN;
const READWISE_TAG_FILTER = process.env.READWISE_TAG_FILTER || ''; // Optional: filter by tag
const READWISE_FULL_FETCH = process.env.READWISE_FULL_FETCH === 'true'; // Set to 'true' to fetch all history
const OUTPUT_FILE = join(__dirname, '../data/sources/readwise.json');

// ⚠️ INTENTIONAL TAG FILTERING - DO NOT REMOVE ⚠️
// Only articles tagged with 'classic' or 'pub' in Readwise Reader will appear on the timeline.
// This is by design to curate which saved articles are publicly visible.
// 
// INCLUDE_TAGS: Articles MUST have one of these tags to be fetched and added to timeline
const INCLUDE_TAGS = ['classic', 'pub'];
// HIDDEN_TAGS: These tags are used for filtering but won't be displayed as hashtags on timeline cards
// (e.g., 'pub' is used to mark articles for publishing but doesn't need to be shown)
const HIDDEN_TAGS = ['pub'];

if (!READWISE_TOKEN) {
  console.log('READWISE_TOKEN is not set. Skipping.');
  process.exit(0);
}

interface ReaderDocument {
  id: string;
  url: string;
  title: string;
  author: string;
  source: string;
  category: string;
  location: string;
  tags: Record<string, { name: string; type: string; created: number }>;
  site_name: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  published_date: number | null;
  summary: string;
  image_url: string | null;
  source_url: string;
  notes: string;
  reading_progress: number;
  saved_at: string;
  content?: string; // Full content when available
}

interface TimelineEntry {
  id: string;
  type: 'saved';
  timestamp: string;
  title: string;
  summary?: string;
  url: string | null;
  canonical_url?: string;
  author?: string;
  tags: string[];
  content_html?: string;
  metadata?: {
    word_count?: number;
    reading_time?: string;
    site_name?: string;
    cover_image?: string;
    reading_progress?: number;
    last_fetched?: string; // ISO timestamp of when this entry was last fetched/updated
  };
}

/**
 * Fetch documents from Reader with pagination
 * @param updatedAfter Optional ISO date string to only fetch documents updated after this date
 */
async function fetchDocuments(updatedAfter?: string): Promise<ReaderDocument[]> {
  if (updatedAfter) {
    console.log(`📚 Fetching documents from Readwise Reader (updated after ${updatedAfter})...`);
  } else {
    console.log('📚 Fetching ALL documents from Readwise Reader...');
  }
  
  const documents: ReaderDocument[] = [];
  let pageCursor = '';
  let hasMore = true;
  
  while (hasMore) {
    // Build URL with optional updatedAfter parameter
    let url = `https://readwise.io/api/v3/list/?pageCursor=${pageCursor}`;
    if (updatedAfter) {
      url += `&updatedAfter=${encodeURIComponent(updatedAfter)}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Token ${READWISE_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    documents.push(...(data.results || []));
    
    console.log(`  Fetched ${documents.length} documents so far...`);
    
    // Check if there's more data
    pageCursor = data.nextPageCursor;
    hasMore = !!pageCursor;
    
    // Rate limiting
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return documents;
}

/**
 * Fetch full content of an article from its source URL
 * This is a simplified implementation that attempts to extract content
 * For production use, you might want to use a more robust content extraction service
 */
async function fetchFullContent(sourceUrl: string): Promise<string | null> {
  try {
    console.log(`  Fetching full content from: ${sourceUrl}`);
    
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Readwise Reader Bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      timeout: 10000, // 10 second timeout
    });
    
    if (!response.ok) {
      console.log(`  Failed to fetch content: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    
    // Simple content extraction - remove scripts, styles, and extract text
    // This is a basic implementation; for production, consider using a library like @mozilla/readability
    const content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Limit content length to avoid extremely long articles
    const maxLength = 50000; // 50k characters
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
    
  } catch (error) {
    console.log(`  Error fetching full content: ${error.message}`);
    return null;
  }
}

/**
 * Convert Reader document to timeline entry
 */
/**
 * Fetch highlights for a specific document
 */
async function fetchHighlights(documentId: string): Promise<string[]> {
  try {
    const response = await fetch(`https://readwise.io/api/v3/highlights?document_id=${documentId}`, {
      headers: {
        'Authorization': `Token ${READWISE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    // Extract highlight text from results
    return data.results?.map((h: any) => h.text).filter(Boolean) || [];
  } catch (error) {
    console.error(`Error fetching highlights for ${documentId}:`, error);
    return [];
  }
}

/**
 * Build content HTML with notes and highlights
 */
async function buildContentHtml(doc: ReaderDocument): Promise<string | undefined> {
  const parts: string[] = [];
  
  // Add notes if present
  if (doc.notes) {
    parts.push(`<div class="notes">${doc.notes.replace(/\n/g, '<br>')}</div>`);
  }
  
  // Fetch and add highlights
  const highlights = await fetchHighlights(doc.id);
  if (highlights.length > 0) {
    const highlightsList = highlights.map(h => `<li>${h}</li>`).join('');
    parts.push(`<div class="highlights"><ul>${highlightsList}</ul></div>`);
  }
  
  return parts.length > 0 ? parts.join('') : undefined;
}

async function convertToTimelineEntry(doc: ReaderDocument): Promise<TimelineEntry> {
  // Extract tag names from the tags object
  const tagNames = Object.keys(doc.tags || {});
  
  // Filter out hidden tags
  const visibleTags = tagNames.filter(tag => !HIDDEN_TAGS.includes(tag));
  
  // Calculate reading time
  const readingTime = doc.word_count ? `${Math.ceil(doc.word_count / 200)} min read` : undefined;
  
  // Check if this document has the "full" tag
  const hasFullTag = tagNames.some(tag => tag.toLowerCase() === 'full');
  
  // Use full content if available and has "full" tag, otherwise use summary
  const contentToUse = hasFullTag && doc.content ? doc.content : (doc.summary || undefined);
  
  return {
    id: `readwise:${doc.id}`,
    type: 'saved',
    timestamp: doc.saved_at || doc.created_at,
    title: doc.title,
    summary: contentToUse,
    url: doc.source_url,
    canonical_url: doc.source_url || doc.url,
    author: doc.author || undefined,
    tags: visibleTags,
    content_html: await buildContentHtml(doc),
    metadata: {
      word_count: doc.word_count || undefined,
      reading_time: readingTime,
      site_name: doc.site_name || undefined,
      cover_image: doc.image_url || undefined,
      reading_progress: doc.reading_progress || undefined
    }
  };
}

/**
 * Filter documents by tag if READWISE_TAG_FILTER is set
 * If not set, filters by INCLUDE_TAGS (classic, pub)
 * 
 * ⚠️ INTENTIONAL BEHAVIOR: Only articles with specific tags appear on the timeline.
 * This is NOT a bug - it's a curation feature to control what's publicly visible.
 * To add an article to the timeline, tag it with 'classic' or 'pub' in Readwise Reader.
 */
function filterByTag(documents: ReaderDocument[]): ReaderDocument[] {
  // Use READWISE_TAG_FILTER if set (for backward compatibility)
  if (READWISE_TAG_FILTER) {
    const filtered = documents.filter(doc => {
      if (!doc.tags) return false;
      return Object.keys(doc.tags).some(tag => 
        tag.toLowerCase() === READWISE_TAG_FILTER.toLowerCase()
      );
    });
    
    console.log(`✓ Filtered to ${filtered.length} documents with tag "${READWISE_TAG_FILTER}"`);
    
    if (filtered.length > 0) {
      console.log(`  Found documents:`, filtered.slice(0, 10).map(d => d.title.substring(0, 60)));
    }
    
    return filtered;
  }
  
  // Otherwise, filter by INCLUDE_TAGS
  const filtered = documents.filter(doc => {
    if (!doc.tags) return false;
    const docTags = Object.keys(doc.tags);
    return docTags.some(tag => 
      INCLUDE_TAGS.some(includeTag => tag.toLowerCase() === includeTag.toLowerCase())
    );
  });
  
  console.log(`✓ Filtered to ${filtered.length} documents with tags: ${INCLUDE_TAGS.join(', ')}`);
  
  if (filtered.length > 0) {
    console.log(`  Found documents:`, filtered.slice(0, 10).map(d => d.title.substring(0, 60)));
  }
  
  return filtered;
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
 * Get the latest timestamp from existing entries
 * Returns ISO string or undefined if no entries exist
 * Caps at 30 days ago maximum to avoid fetching too much history
 * 
 * IMPORTANT: We need to track when we last checked, not when articles were saved.
 * Articles can be tagged with 'classic'/'pub' long after they were saved, so we
 * need to check for updates since our last fetch, not since the last saved_at date.
 */
function getLatestTimestamp(entries: TimelineEntry[]): string | undefined {
  if (entries.length === 0) {
    return undefined;
  }
  
  // Use the timestamp from when we last fetched, which we'll store in metadata
  // For backward compatibility, check if any entry has last_fetched metadata
  const lastFetched = entries.find(e => e.metadata?.last_fetched)?.metadata?.last_fetched;
  
  if (lastFetched) {
    const fetchDate = new Date(lastFetched).toISOString();
    const daysBack = Math.ceil((Date.now() - new Date(lastFetched).getTime()) / (24 * 60 * 60 * 1000));
    console.log(`   Last fetch was ${daysBack} day(s) ago`);
    return fetchDate;
  }
  
  // Fallback: Find the most recent saved_at timestamp from existing entries
  // This ensures we don't miss articles on the first run after this fix
  const latest = entries.reduce((max, entry) => {
    const entryTime = new Date(entry.timestamp).getTime();
    return entryTime > max ? entryTime : max;
  }, 0);
  
  if (latest === 0) {
    return undefined;
  }
  
  // Cap at 30 days ago maximum to avoid fetching too much on first run
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const fetchFromTime = Math.max(latest, thirtyDaysAgo);
  
  // Return ISO string
  const fetchDate = new Date(fetchFromTime).toISOString();
  
  // Log how far back we're fetching
  const daysBack = Math.ceil((Date.now() - fetchFromTime) / (24 * 60 * 60 * 1000));
  console.log(`   Last fetch was ${daysBack} day(s) ago (estimated from last saved article)`);
  
  return fetchDate;
}

/**
 * Main function
 */
async function main() {
  console.log('📖 Fetching Readwise Reader documents...');
  
  if (READWISE_TAG_FILTER) {
    console.log(`   Filtering by tag: "${READWISE_TAG_FILTER}"`);
  } else {
    console.log(`   Filtering by tags: ${INCLUDE_TAGS.join(', ')}`);
  }
  
  try {
    // Load existing entries first
    const existing = loadExistingEntries();
    console.log(`📋 Loaded ${existing.length} existing entries`);
    
    // Determine if we should do delta fetch or full fetch
    let updatedAfter: string | undefined = undefined;
    
    if (!READWISE_FULL_FETCH && existing.length > 0) {
      updatedAfter = getLatestTimestamp(existing);
      if (updatedAfter) {
        console.log(`🔄 Delta fetch mode: fetching documents updated after ${updatedAfter}`);
      }
    } else if (READWISE_FULL_FETCH) {
      console.log(`🔄 Full fetch mode: fetching ALL documents (READWISE_FULL_FETCH=true)`);
    } else {
      console.log(`🔄 Full fetch mode: no existing entries found`);
    }
    
    // Fetch documents (all or delta)
    const documents = await fetchDocuments(updatedAfter);
    console.log(`✓ Fetched ${documents.length} total documents`);
    
    // Filter by tag if specified
    const filteredDocs = filterByTag(documents);
    
    // Create a map of existing entries by ID for easy lookup
    const existingMap = new Map(existing.map(e => [e.id, e]));
    
    // Store the current fetch time - this will be saved with each entry
    const currentFetchTime = new Date().toISOString();
    
    // Convert fetched documents to timeline entries
    let newCount = 0;
    let updatedCount = 0;
    
    for (const doc of filteredDocs) {
      // Check if this document has the "full" tag and fetch full content if needed
      const tagNames = Object.keys(doc.tags || {});
      const hasFullTag = tagNames.some(tag => tag.toLowerCase() === 'full');
      
      if (hasFullTag && !doc.content) {
        console.log(`📄 Fetching full content for: ${doc.title}`);
        const fullContent = await fetchFullContent(doc.source_url);
        if (fullContent) {
          doc.content = fullContent;
          console.log(`  ✓ Fetched ${fullContent.length} characters of content`);
        } else {
          console.log(`  ⚠️ Failed to fetch full content, using summary`);
        }
        
        // Add delay between full content fetches to be respectful to target websites
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
      
      const entry = await convertToTimelineEntry(doc);
      
      // Add last_fetched timestamp to track when we last saw this entry
      if (!entry.metadata) {
        entry.metadata = {};
      }
      entry.metadata.last_fetched = currentFetchTime;
      
      if (existingMap.has(entry.id)) {
        // Update existing entry
        existingMap.set(entry.id, entry);
        updatedCount++;
      } else {
        // Add new entry
        existingMap.set(entry.id, entry);
        newCount++;
      }
    }
    
    // Convert map back to array
    const entries = Array.from(existingMap.values());
    
    // Sort by timestamp (newest first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Write to file
    mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2));
    
    console.log(`✅ Wrote ${entries.length} total documents to ${OUTPUT_FILE}`);
    console.log(`   (${newCount} new, ${updatedCount} updated, ${entries.length - newCount - updatedCount} unchanged)`);
    
  } catch (error) {
    console.error('❌ Error fetching Readwise Reader documents:', error);
    process.exit(1);
  }
}

main();

