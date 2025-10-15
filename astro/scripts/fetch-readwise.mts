#!/usr/bin/env node
/**
 * Fetch saved articles and highlights from Readwise
 * Uses the Readwise v2 API to fetch books/articles with highlights
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

interface ReadwiseBook {
  id: number;
  title: string;
  author: string;
  category: string;
  source: string;
  num_highlights: number;
  last_highlight_at: string | null;
  updated: string;
  cover_image_url: string;
  highlights_url: string;
  source_url: string | null;
  tags: Array<{ id: number; name: string }>;
  document_note: string;
}

interface ReadwiseHighlight {
  id: number;
  text: string;
  note: string;
  location: number;
  location_type: string;
  highlighted_at: string;
  url: string | null;
  color: string;
  updated: string;
  book_id: number;
  tags: Array<{ id: number; name: string }>;
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
    num_highlights: number;
    readwise_url: string;
    cover_image?: string;
  };
}

/**
 * Fetch all books/articles from Readwise with pagination
 * Fetches ALL categories to ensure we don't miss tagged items
 */
async function fetchBooks(): Promise<ReadwiseBook[]> {
  console.log('📚 Fetching all saved items from Readwise...');
  const books: ReadwiseBook[] = [];
  let nextUrl: string | null = 'https://readwise.io/api/v2/books/?page_size=1000';
  
  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        'Authorization': `Token ${READWISE_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch books: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    books.push(...data.results);
    nextUrl = data.next;
    
    console.log(`  Fetched ${books.length} items so far...`);
    
    // Rate limiting: 20 requests per minute for LIST endpoints
    if (nextUrl) {
      await new Promise(resolve => setTimeout(resolve, 3100)); // ~3 seconds between requests
    }
  }
  
  return books;
}

/**
 * Fetch highlights for a specific book
 */
async function fetchHighlightsForBook(bookId: number): Promise<ReadwiseHighlight[]> {
  const response = await fetch(`https://readwise.io/api/v2/highlights/?book_id=${bookId}&page_size=1000`, {
    headers: {
      'Authorization': `Token ${READWISE_TOKEN}`
    }
  });
  
  if (!response.ok) {
    console.warn(`Failed to fetch highlights for book ${bookId}: ${response.status}`);
    return [];
  }
  
  const data = await response.json();
  return data.results || [];
}

/**
 * Convert Readwise book to timeline entry
 */
function convertToTimelineEntry(book: ReadwiseBook, highlights: ReadwiseHighlight[]): TimelineEntry {
  // Build content from highlights
  const highlightHtml = highlights
    .map(h => {
      const note = h.note ? `<p class="note">${h.note}</p>` : '';
      return `<blockquote>${h.text}</blockquote>${note}`;
    })
    .join('\n');
  
  const tagNames = book.tags.map(t => t.name);
  
  return {
    id: `readwise:${book.id}`,
    type: 'saved',
    timestamp: book.last_highlight_at || book.updated,
    title: book.title,
    summary: highlights.length > 0 ? highlights[0].text.substring(0, 200) + (highlights[0].text.length > 200 ? '...' : '') : undefined,
    url: book.source_url,
    canonical_url: book.source_url || book.highlights_url,
    author: book.author || undefined,
    tags: tagNames,
    content_html: highlightHtml,
    metadata: {
      num_highlights: book.num_highlights,
      readwise_url: book.highlights_url,
      cover_image: book.cover_image_url
    }
  };
}

/**
 * Filter books by tag if READWISE_TAG_FILTER is set
 */
function filterByTag(books: ReadwiseBook[]): ReadwiseBook[] {
  if (!READWISE_TAG_FILTER) {
    return books;
  }
  
  // Debug: Show some sample tags
  const sampleWithTags = books.filter(b => b.tags && b.tags.length > 0).slice(0, 5);
  console.log(`  Sample tags from first items:`, sampleWithTags.map(b => ({
    title: b.title.substring(0, 50),
    tags: b.tags.map(t => t.name)
  })));
  
  const filtered = books.filter(book => {
    if (!book.tags || !Array.isArray(book.tags)) {
      return false;
    }
    return book.tags.some(tag => tag.name.toLowerCase() === READWISE_TAG_FILTER.toLowerCase());
  });
  
  console.log(`✓ Filtered to ${filtered.length} items with tag "${READWISE_TAG_FILTER}"`);
  
  if (filtered.length > 0) {
    console.log(`  Found items:`, filtered.map(b => b.title.substring(0, 60)));
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
  console.log('📖 Fetching Readwise saved articles...');
  
  if (READWISE_TAG_FILTER) {
    console.log(`   Filtering by tag: "${READWISE_TAG_FILTER}"`);
  }
  
  try {
    // Fetch all books
    const books = await fetchBooks();
    console.log(`✓ Fetched ${books.length} total articles`);
    
    // Filter by tag if specified
    const filteredBooks = filterByTag(books);
    
    // Load existing entries to determine what's new
    const existing = loadExistingEntries();
    const existingIds = new Set(existing.map(e => e.id));
    
    // Process books
    const entries: TimelineEntry[] = [];
    let newCount = 0;
    
    for (const book of filteredBooks) {
      const bookId = `readwise:${book.id}`;
      
      // Skip if we already have this one and it hasn't been updated
      const existingEntry = existing.find(e => e.id === bookId);
      if (existingEntry && existingEntry.timestamp === (book.last_highlight_at || book.updated)) {
        entries.push(existingEntry);
        continue;
      }
      
      // Fetch highlights for this book
      console.log(`  Fetching highlights for: ${book.title}`);
      const highlights = await fetchHighlightsForBook(book.id);
      
      // Convert to timeline entry
      const entry = convertToTimelineEntry(book, highlights);
      entries.push(entry);
      
      if (!existingIds.has(bookId)) {
        newCount++;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3100));
    }
    
    // Sort by timestamp (newest first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Write to file
    mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2));
    
    console.log(`✅ Wrote ${entries.length} total articles to ${OUTPUT_FILE}`);
    console.log(`   (${newCount} new, ${entries.length - newCount} existing)`);
    
  } catch (error) {
    console.error('❌ Error fetching Readwise articles:', error);
    process.exit(1);
  }
}

main();
