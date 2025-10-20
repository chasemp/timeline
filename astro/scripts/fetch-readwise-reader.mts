#!/usr/bin/env node
/**
 * Fetch saved documents from Readwise Reader (not classic Readwise)
 * Uses the Reader v3 API to fetch documents with highlights
 * Optionally filters by tag
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const READWISE_TOKEN = process.env.READWISE_TOKEN;
const READWISE_TAG_FILTER = process.env.READWISE_TAG_FILTER || ''; // Optional: filter by tag
const READWISE_FULL_FETCH = process.env.READWISE_FULL_FETCH === 'true'; // Set to 'true' to fetch all history
const OUTPUT_FILE = join(__dirname, '../data/sources/readwise.json');

// Tags that determine if an article should be included in the timeline
const INCLUDE_TAGS = ['classic', 'pub'];
// Tags that should not be displayed on the timeline
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
 * Convert Reader document to timeline entry
 */
function convertToTimelineEntry(doc: ReaderDocument): TimelineEntry {
  // Extract tag names from the tags object
  const tagNames = Object.keys(doc.tags || {});
  
  // Filter out hidden tags
  const visibleTags = tagNames.filter(tag => !HIDDEN_TAGS.includes(tag));
  
  // Calculate reading time
  const readingTime = doc.word_count ? `${Math.ceil(doc.word_count / 200)} min read` : undefined;
  
  return {
    id: `readwise:${doc.id}`,
    type: 'saved',
    timestamp: doc.saved_at || doc.created_at,
    title: doc.title,
    summary: doc.summary || undefined,
    url: doc.source_url,
    canonical_url: doc.source_url || doc.url,
    author: doc.author || undefined,
    tags: visibleTags,
    content_html: doc.notes ? `<div class="notes">${doc.notes.replace(/\n/g, '<br>')}</div>` : undefined,
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
 */
function getLatestTimestamp(entries: TimelineEntry[]): string | undefined {
  if (entries.length === 0) {
    return undefined;
  }
  
  // Find the most recent timestamp
  const latest = entries.reduce((max, entry) => {
    const entryTime = new Date(entry.timestamp).getTime();
    return entryTime > max ? entryTime : max;
  }, 0);
  
  if (latest === 0) {
    return undefined;
  }
  
  // Return ISO string
  return new Date(latest).toISOString();
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
    
    // Convert fetched documents to timeline entries
    let newCount = 0;
    let updatedCount = 0;
    
    for (const doc of filteredDocs) {
      const entry = convertToTimelineEntry(doc);
      
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

