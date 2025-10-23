import { writeFileSync, existsSync, readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TimelineEntry {
  id: string;
  type: 'wikipedia';
  timestamp: string;
  title: string;
  summary: string;
  url: string;
  content_html: string;
  metadata?: {
    page: string;
    diff?: number;
    oldid?: number;
    size_delta?: number;
    comment?: string;
  };
}

const WIKIPEDIA_USERNAME = 'Chasemp';
const OUTPUT_FILE = `${__dirname}/../data/sources/wikipedia.json`;

/**
 * Fetch Wikipedia contributions using the MediaWiki API
 */
async function fetchWikipediaContributions(username: string, limit: number = 500): Promise<any[]> {
  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=usercontribs&ucuser=${encodeURIComponent(username)}&uclimit=${limit}&ucprop=ids|title|timestamp|comment|size|sizediff&format=json&origin=*`;
  
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Wikipedia API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.query?.usercontribs || [];
}

/**
 * Convert Wikipedia contribution to timeline entry
 */
function convertToTimelineEntry(contrib: any): TimelineEntry {
  const pageTitle = contrib.title;
  const timestamp = contrib.timestamp;
  const comment = contrib.comment || 'No edit summary';
  const sizeDelta = contrib.sizediff || 0;
  const diffUrl = `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(pageTitle)}&diff=${contrib.revid}&oldid=${contrib.parentid}`;
  
  // Determine action type
  let action = 'edited';
  if (sizeDelta > 1000) {
    action = 'created or expanded';
  } else if (sizeDelta < -100) {
    action = 'trimmed';
  } else if (comment.toLowerCase().includes('created page')) {
    action = 'created';
  }
  
  // Create title
  const title = `${action} "${pageTitle}"`;
  
  // Create summary
  let summary = comment;
  if (sizeDelta !== 0) {
    const deltaStr = sizeDelta > 0 ? `+${sizeDelta}` : `${sizeDelta}`;
    summary = `${comment} (${deltaStr} bytes)`;
  }
  
  // Create content HTML
  const contentHtml = `
    <p><strong>Edit to:</strong> <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}" target="_blank" rel="noopener">${pageTitle}</a></p>
    ${comment ? `<p><strong>Summary:</strong> ${comment}</p>` : ''}
    ${sizeDelta !== 0 ? `<p><strong>Size change:</strong> <span style="color: ${sizeDelta > 0 ? '#7cb342' : '#e53935'};">${sizeDelta > 0 ? '+' : ''}${sizeDelta} bytes</span></p>` : ''}
    <p><a href="${diffUrl}" target="_blank" rel="noopener" style="color: var(--accent);">View diff →</a></p>
  `;
  
  return {
    id: `wikipedia:${contrib.revid}`,
    type: 'wikipedia',
    timestamp: timestamp,
    title: title,
    summary: summary.substring(0, 200),
    url: diffUrl,
    content_html: contentHtml,
    metadata: {
      page: pageTitle,
      diff: contrib.revid,
      oldid: contrib.parentid,
      size_delta: sizeDelta,
      comment: comment
    }
  };
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
    console.warn('Failed to load existing Wikipedia contributions, starting fresh:', err);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  console.log('📚 Fetching Wikipedia contributions...');
  
  try {
    // Load existing entries
    const existingEntries = loadExistingEntries();
    const existingIds = new Set(existingEntries.map(e => e.id));
    
    // Determine the most recent contribution timestamp
    let latestTimestamp: Date | null = null;
    if (existingEntries.length > 0) {
      latestTimestamp = new Date(
        Math.max(...existingEntries.map(e => new Date(e.timestamp).getTime()))
      );
      console.log(`✓ Latest existing contribution: ${latestTimestamp.toISOString()}`);
    }
    
    // Fetch contributions
    console.log(`Fetching contributions for user: ${WIKIPEDIA_USERNAME}...`);
    const contributions = await fetchWikipediaContributions(WIKIPEDIA_USERNAME);
    
    // Convert to timeline entries and filter new ones
    const newEntries: TimelineEntry[] = [];
    for (const contrib of contributions) {
      const entry = convertToTimelineEntry(contrib);
      
      if (!existingIds.has(entry.id)) {
        // Check if it's newer than our latest timestamp
        if (!latestTimestamp || new Date(entry.timestamp) > latestTimestamp) {
          newEntries.push(entry);
        }
      }
    }
    
    console.log(`✓ Fetched ${newEntries.length} new contributions`);
    
    // Merge with existing entries
    const allEntries = [...newEntries, ...existingEntries];
    
    // Sort by timestamp (newest first)
    allEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Write to file
    writeFileSync(OUTPUT_FILE, JSON.stringify(allEntries, null, 2), 'utf-8');
    console.log(`✅ Wrote ${allEntries.length} total contributions to ${OUTPUT_FILE}`);
    console.log(`   (${newEntries.length} new, ${existingEntries.length} existing)`);
    
  } catch (error: any) {
    console.error('❌ Error fetching Wikipedia contributions:', error.message);
    process.exit(1);
  }
}

main();

