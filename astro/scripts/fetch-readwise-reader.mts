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
const OUTPUT_FILE = join(__dirname, '../data/sources/readwise.json');

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
 * Fetch all documents from Reader with pagination
 */
async function fetchDocuments(): Promise<ReaderDocument[]> {
  console.log('📚 Fetching documents from Readwise Reader...');
  const documents: ReaderDocument[] = [];
  let pageCursor = '';
  let hasMore = true;
  
  while (hasMore) {
    // Fetch from all locations (archive, new, later) - remove location filter
    const url = `https://readwise.io/api/v3/list/?pageCursor=${pageCursor}`;
    
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
    tags: tagNames,
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
 */
function filterByTag(documents: ReaderDocument[]): ReaderDocument[] {
  if (!READWISE_TAG_FILTER) {
    return documents;
  }
  
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
  console.log('📖 Fetching Readwise Reader documents...');
  
  if (READWISE_TAG_FILTER) {
    console.log(`   Filtering by tag: "${READWISE_TAG_FILTER}"`);
  }
  
  try {
    // Fetch all documents
    const documents = await fetchDocuments();
    console.log(`✓ Fetched ${documents.length} total documents`);
    
    // Filter by tag if specified
    const filteredDocs = filterByTag(documents);
    
    // Load existing entries to determine what's new
    const existing = loadExistingEntries();
    const existingIds = new Set(existing.map(e => e.id));
    
    // Convert to timeline entries
    const entries: TimelineEntry[] = [];
    let newCount = 0;
    
    for (const doc of filteredDocs) {
      const entry = convertToTimelineEntry(doc);
      entries.push(entry);
      
      if (!existingIds.has(entry.id)) {
        newCount++;
      }
    }
    
    // Sort by timestamp (newest first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Write to file
    mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2));
    
    console.log(`✅ Wrote ${entries.length} total documents to ${OUTPUT_FILE}`);
    console.log(`   (${newCount} new, ${entries.length - newCount} existing)`);
    
  } catch (error) {
    console.error('❌ Error fetching Readwise Reader documents:', error);
    process.exit(1);
  }
}

main();

