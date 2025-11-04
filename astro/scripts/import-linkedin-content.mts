#!/usr/bin/env node
// @ts-nocheck
/* eslint-disable */
/**
 * Unified script to import LinkedIn content (articles and publications) into markdown format
 * 
 * Usage: node --experimental-strip-types scripts/import-linkedin-content.mts
 * 
 * This script:
 * - Extracts articles from LI/Articles/Articles/*.html
 * - Extracts publications from LI/Publications.csv
 * - Extracts recommendations given from LI/Recommendations_Given.csv
 * - Extracts recommendations received from LI/Recommendations_Received.csv
 * - Extracts posts from LI/Shares.csv
 * - Converts all to markdown files in markdown/ directory
 * - Skips files that already exist
 * - Handles both root LI/ and archive zip structure LI/Complete_LinkedInDataExport_* directories
 */

import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

const BASE_DIR = path.resolve(process.cwd(), '..');
const MARKDOWN_DIR = path.resolve(BASE_DIR, 'markdown');

// Try to find LinkedIn data directory
async function findLinkedInDir(): Promise<string> {
  const baseLiDir = path.resolve(BASE_DIR, 'LI');
  
  // Try root LI/ first
  try {
    await fs.access(baseLiDir);
    return baseLiDir;
  } catch {
    // Continue to check archive
  }
  
  // Try to find any Complete_LinkedInDataExport_* directory
  try {
    const entries = await fs.readdir(baseLiDir);
    for (const entry of entries) {
      if (entry.startsWith('Complete_LinkedInDataExport_')) {
        const archivePath = path.join(baseLiDir, entry);
        const stat = await fs.stat(archivePath);
        if (stat.isDirectory()) {
          return archivePath;
        }
      }
    }
  } catch {
    // Continue
  }
  
  // Default to LI/ if nothing found (will error later)
  return baseLiDir;
}

// HTML to Markdown converter setup
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
});

turndownService.addRule('preserveImages', {
  filter: 'img',
  replacement: function (content, node: any) {
    const alt = node.getAttribute('alt') || '';
    const src = node.getAttribute('src') || '';
    const title = node.getAttribute('title') || '';
    if (title) {
      return `![${alt}](${src} "${title}")`;
    }
    return `![${alt}](${src})`;
  }
});

// Utility functions
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})\s/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return null;
}

function parseDate(dateStr: string): string {
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  // Try "Nov 18, 2020" format first
  const match = dateStr.match(/(\w+)\s+(\d+),\s+(\d+)/);
  if (match) {
    const month = months[match[1]] || '01';
    const day = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  
  // Try "05/15/25, 04:57 PM" format (MM/DD/YY)
  const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateMatch) {
    const month = dateMatch[1].padStart(2, '0');
    const day = dateMatch[2].padStart(2, '0');
    let year = dateMatch[3];
    // Handle 2-digit years (assume 20xx for years < 50, 19xx for >= 50)
    if (year.length === 2) {
      const yearNum = parseInt(year);
      year = yearNum < 50 ? `20${year}` : `19${year}`;
    }
    return `${year}-${month}-${day}`;
  }
  
  return new Date().toISOString().split('T')[0];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function extractTags(title: string, publisher: string, description: string): string[] {
  const tags: string[] = ['Publications'];
  const lowerTitle = title.toLowerCase();
  const lowerPublisher = publisher.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  if (lowerPublisher.includes('cncf') || lowerTitle.includes('cncf')) {
    tags.push('CNCF', 'Cloud Native', 'Security');
  }
  if (lowerPublisher.includes('oreilly') || lowerTitle.includes('oreilly') || lowerTitle.includes('97 things')) {
    tags.push('O\'Reilly', 'Security');
  }
  if (lowerPublisher.includes('owasp') || lowerTitle.includes('owasp') || lowerTitle.includes('aivss')) {
    tags.push('OWASP', 'AI', 'Security');
  }
  
  return tags;
}

// Convert a single LinkedIn article HTML file to markdown
async function convertArticle(htmlFile: string, articlesDir: string): Promise<void> {
  const fullPath = path.join(articlesDir, htmlFile);
  const html = await fs.readFile(fullPath, 'utf8');
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Extract title
  const h1 = document.querySelector('h1');
  let title = h1?.textContent?.trim() || document.querySelector('title')?.textContent?.trim() || 'Untitled';
  const titleLink = h1?.querySelector('a');
  if (titleLink) {
    title = titleLink.textContent?.trim() || title;
  }
  
  // Extract date
  const createdPara = document.querySelector('p.created');
  let dateStr: string | null = null;
  
  if (createdPara) {
    const dateText = createdPara.textContent || '';
    const dateMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }
  }
  
  if (!dateStr) {
    dateStr = extractDateFromFilename(htmlFile);
  }
  
  if (!dateStr) {
    console.warn(`⚠️  No date found for ${htmlFile}, using current date`);
    dateStr = new Date().toISOString().split('T')[0];
  }
  
  // Extract content
  const publishedPara = document.querySelector('p.published');
  let contentDiv: Element | null = null;
  
  if (publishedPara && publishedPara.nextElementSibling) {
    contentDiv = publishedPara.nextElementSibling as Element;
  } else {
    const divs = document.querySelectorAll('body > div');
    if (divs.length > 0) {
      contentDiv = divs[divs.length - 1];
    }
  }
  
  if (!contentDiv) {
    console.warn(`⚠️  No content found for ${htmlFile}`);
    return;
  }
  
  const htmlContent = contentDiv.innerHTML;
  let markdownContent = turndownService.turndown(htmlContent);
  markdownContent = markdownContent.replace(/\n{3,}/g, '\n\n').trim();
  
  const slug = slugify(title);
  const filename = `${dateStr}-${slug}.md`;
  const outputPath = path.join(MARKDOWN_DIR, filename);
  
  // Check if file already exists
  try {
    await fs.access(outputPath);
    console.log(`⏭️  Skipping article: ${filename} (already exists)`);
    return;
  } catch {
    // File doesn't exist, proceed
  }
  
  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
categories:
  - Blog
tags:
  - LinkedIn
date: ${dateStr}T00:00:00.000Z
---`;
  
  const fullContent = `${frontmatter}\n\n${markdownContent}\n`;
  
  await fs.writeFile(outputPath, fullContent, 'utf8');
  console.log(`✅ Converted article: ${filename}`);
}

// Convert recommendations given from CSV
async function convertRecommendationsGiven(recommendationsCsv: string): Promise<void> {
  const csvContent = await fs.readFile(recommendationsCsv, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const dataLines = lines.slice(1); // Skip header
  
  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    const [firstName, lastName, company, jobTitle, text, creationDate, status] = parseCSVLine(line);
    
    if (!firstName || !lastName || !text || !creationDate) {
      console.warn(`⚠️  Skipping invalid recommendation line: ${line.substring(0, 50)}...`);
      continue;
    }
    
    const personName = `${firstName} ${lastName}`.trim();
    const date = parseDate(creationDate);
    const slug = slugify(`recommendation-for-${firstName}-${lastName}`);
    const filename = `${date}-${slug}.md`;
    const outputPath = path.join(MARKDOWN_DIR, filename);
    
    // Check if file already exists
    try {
      await fs.access(outputPath);
      console.log(`⏭️  Skipping recommendation given: ${filename} (already exists)`);
      continue;
    } catch {
      // File doesn't exist, proceed
    }
    
    const title = `Recommendation for ${personName}`;
    const jobInfo = jobTitle ? `${jobTitle}${company ? ` at ${company}` : ''}` : company || '';
    
    let content = `---
title: "${title.replace(/"/g, '\\"')}"
categories:
  - Blog
tags:
  - Recommendations
  - LinkedIn
date: ${date}T00:00:00.000Z
---
`;
    
    if (jobInfo) {
      content += `\n**${jobInfo}**\n\n`;
    }
    
    content += `${text}\n`;
    
    await fs.writeFile(outputPath, content, 'utf8');
    console.log(`✅ Converted recommendation given: ${filename}`);
  }
}

// Clean up LinkedIn CSV escaped quotes and newlines
function cleanLinkedInText(text: string): string {
  if (!text) return '';
  // Remove escaped quotes ("" becomes ")
  let cleaned = text.replace(/""/g, '"');
  // Remove leading/trailing quotes
  cleaned = cleaned.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  // Remove standalone quote marks on their own lines (from CSV formatting)
  cleaned = cleaned.replace(/^"\s*$/gm, '');
  // Remove quote marks that are just wrapping a single line
  cleaned = cleaned.replace(/^"([^"]+)"$/gm, '$1');
  // Remove trailing quote at end of text
  cleaned = cleaned.replace(/"\s*$/, '');
  // Normalize whitespace and line breaks
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  // Clean up any remaining quote artifacts
  cleaned = cleaned.replace(/\n"\s*\n/g, '\n\n');
  return cleaned.trim();
}

// Extract title from post content (first sentence or first 100 chars)
function extractPostTitle(content: string): string {
  if (!content) return 'LinkedIn Post';
  // Try to get first sentence (up to 100 chars or first period/question/exclamation)
  const firstSentence = content.match(/^.{1,100}[.!?]/);
  if (firstSentence) {
    return firstSentence[0].trim();
  }
  // Fallback to first 100 chars
  return content.substring(0, 100).trim() + (content.length > 100 ? '...' : '');
}

// Convert LinkedIn posts from Shares.csv
async function convertPosts(sharesCsv: string): Promise<void> {
  const csvContent = await fs.readFile(sharesCsv, 'utf8');
  const lines = csvContent.split('\n');
  
  // Parse CSV - handling multi-line entries
  const entries: any[] = [];
  let currentEntry: string[] = [];
  let inQuotes = false;
  let currentLine = '';
  
  // Start from line 2 (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    currentLine += (currentLine ? '\n' : '') + line;
    
    // Count quotes to determine if we're still in a quoted field
    const quoteCount = (currentLine.match(/"/g) || []).length;
    inQuotes = quoteCount % 2 !== 0;
    
    // If we're not in quotes and line ends, process the entry
    if (!inQuotes && currentLine.trim()) {
      const fields = parseCSVLine(currentLine);
      if (fields.length >= 3) {
        entries.push({
          date: fields[0],
          shareLink: fields[1],
          shareCommentary: fields[2],
          sharedUrl: fields[3] || '',
          mediaUrl: fields[4] || '',
          visibility: fields[5] || ''
        });
      }
      currentLine = '';
    }
  }
  
  // Process remaining if any
  if (currentLine.trim()) {
    const fields = parseCSVLine(currentLine);
    if (fields.length >= 3) {
      entries.push({
        date: fields[0],
        shareLink: fields[1],
        shareCommentary: fields[2],
        sharedUrl: fields[3] || '',
        mediaUrl: fields[4] || '',
        visibility: fields[5] || ''
      });
    }
  }
  
  for (const entry of entries) {
    if (!entry.date || !entry.shareCommentary) {
      continue;
    }
    
    // Parse date (format: "2025-01-30 16:12:03")
    const dateMatch = entry.date.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!dateMatch) continue;
    
    const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    
    // Clean up the commentary text
    let content = cleanLinkedInText(entry.shareCommentary);
    
    // Skip reposts (posts with SharedUrl but no meaningful original commentary)
    // If there's a SharedUrl but content is very short or just a link, it's a repost
    if (entry.sharedUrl && entry.sharedUrl.trim() && entry.sharedUrl !== 'null') {
      // If content is very short (less than 50 chars) or just contains a link, skip it
      if (!content || content.length < 50 || content.toLowerCase().includes('http') && content.length < 100) {
        continue; // This is just a repost, skip it
      }
    }
    
    if (!content || content.length < 10) {
      continue; // Skip very short posts
    }
    
    const title = extractPostTitle(content);
    const slug = slugify(title.substring(0, 50)); // Limit slug length
    const filename = `${date}-linkedin-post-${slug}.md`;
    const outputPath = path.join(MARKDOWN_DIR, filename);
    
    // Check if file already exists
    try {
      await fs.access(outputPath);
      console.log(`⏭️  Skipping post: ${filename} (already exists)`);
      continue;
    } catch {
      // File doesn't exist, proceed
    }
    
    let markdownContent = `---
title: "${title.replace(/"/g, '\\"').substring(0, 200)}"
categories:
  - Blog
tags:
  - LinkedIn
  - Posts
date: ${date}T00:00:00.000Z
url: "${entry.shareLink.replace(/"/g, '\\"')}"
---`;
    
    markdownContent += `\n\n${content}\n`;
    
    if (entry.sharedUrl && entry.sharedUrl.trim() && entry.sharedUrl !== 'null') {
      markdownContent += `\n\n[View shared link →](${entry.sharedUrl})\n`;
    }
    
    await fs.writeFile(outputPath, markdownContent, 'utf8');
    console.log(`✅ Converted post: ${filename}`);
  }
}

// Convert recommendations received from CSV
async function convertRecommendationsReceived(recommendationsCsv: string): Promise<void> {
  const csvContent = await fs.readFile(recommendationsCsv, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const dataLines = lines.slice(1); // Skip header
  
  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    const [firstName, lastName, company, jobTitle, text, creationDate, status] = parseCSVLine(line);
    
    if (!firstName || !lastName || !text || !creationDate) {
      console.warn(`⚠️  Skipping invalid recommendation line: ${line.substring(0, 50)}...`);
      continue;
    }
    
    // Only process VISIBLE recommendations
    if (status && status.trim() !== 'VISIBLE') {
      continue;
    }
    
    const personName = `${firstName} ${lastName}`.trim();
    const date = parseDate(creationDate);
    const slug = slugify(`recommendation-from-${firstName}-${lastName}`);
    const filename = `${date}-${slug}.md`;
    const outputPath = path.join(MARKDOWN_DIR, filename);
    
    // Check if file already exists
    try {
      await fs.access(outputPath);
      console.log(`⏭️  Skipping recommendation received: ${filename} (already exists)`);
      continue;
    } catch {
      // File doesn't exist, proceed
    }
    
    const title = `Recommendation from ${personName}`;
    const jobInfo = jobTitle ? `${jobTitle}${company ? ` at ${company}` : ''}` : company || '';
    
    let content = `---
title: "${title.replace(/"/g, '\\"')}"
categories:
  - Blog
tags:
  - Recommendations
  - LinkedIn
date: ${date}T00:00:00.000Z
---
`;
    
    if (jobInfo) {
      content += `\n**${jobInfo}**\n\n`;
    }
    
    content += `${text}\n`;
    
    await fs.writeFile(outputPath, content, 'utf8');
    console.log(`✅ Converted recommendation received: ${filename}`);
  }
}

// Convert publications from CSV
async function convertPublications(publicationsCsv: string): Promise<void> {
  const csvContent = await fs.readFile(publicationsCsv, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const dataLines = lines.slice(1); // Skip header
  
  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    const [name, publishedOn, description, publisher, url] = parseCSVLine(line);
    
    if (!name || !publishedOn) {
      console.warn(`⚠️  Skipping invalid publication line: ${line.substring(0, 50)}...`);
      continue;
    }
    
    const date = parseDate(publishedOn);
    const slug = slugify(name);
    const filename = `${date}-${slug}.md`;
    const outputPath = path.join(MARKDOWN_DIR, filename);
    
    // Check if file already exists
    try {
      await fs.access(outputPath);
      console.log(`⏭️  Skipping publication: ${filename} (already exists)`);
      continue;
    } catch {
      // File doesn't exist, proceed
    }
    
    const tags = extractTags(name, publisher, description);
    
    let content = `---
title: "${name.replace(/"/g, '\\"')}"
categories:
  - Blog
tags:
${tags.map(tag => `  - ${tag}`).join('\n')}
date: ${date}T00:00:00.000Z
publisher: "${publisher.replace(/"/g, '\\"')}"
url: "${url.replace(/"/g, '\\"')}"
---`;
    
    if (description && description.trim()) {
      let cleanDesc = description.trim();
      cleanDesc = cleanDesc.replace(/^https?:\/\/[^\s]+\s+/i, '');
      content += `\n\n${cleanDesc}`;
      
      if (url && url.trim() && url !== 'null') {
        content += `\n\n[Read the publication →](${url})`;
      }
    }
    
    await fs.writeFile(outputPath, content, 'utf8');
    console.log(`✅ Converted publication: ${filename}`);
  }
}

// Main function
async function main() {
  console.log('🔍 Finding LinkedIn data directory...\n');
  
  const linkedInDir = await findLinkedInDir();
  console.log(`📁 Using LinkedIn directory: ${linkedInDir}\n`);
  
  // Process articles
  const articlesDir = path.join(linkedInDir, 'Articles', 'Articles');
  try {
    const files = await fs.readdir(articlesDir);
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    
    if (htmlFiles.length > 0) {
      console.log(`📝 Found ${htmlFiles.length} article(s) to process...\n`);
      for (const file of htmlFiles) {
        await convertArticle(file, articlesDir);
      }
    } else {
      console.log('ℹ️  No articles found in Articles/Articles/\n');
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  Articles directory not found, skipping articles\n');
    } else {
      console.error('❌ Error processing articles:', error.message);
    }
  }
  
  // Process publications
  const publicationsCsv = path.join(linkedInDir, 'Publications.csv');
  try {
    await fs.access(publicationsCsv);
    console.log('📚 Processing publications...\n');
    await convertPublications(publicationsCsv);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  Publications.csv not found, skipping publications\n');
    } else {
      console.error('❌ Error processing publications:', error.message);
    }
  }
  
  // Process recommendations given
  const recommendationsGivenCsv = path.join(linkedInDir, 'Recommendations_Given.csv');
  try {
    await fs.access(recommendationsGivenCsv);
    console.log('✍️  Processing recommendations given...\n');
    await convertRecommendationsGiven(recommendationsGivenCsv);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  Recommendations_Given.csv not found, skipping recommendations given\n');
    } else {
      console.error('❌ Error processing recommendations given:', error.message);
    }
  }
  
  // Process recommendations received
  const recommendationsReceivedCsv = path.join(linkedInDir, 'Recommendations_Received.csv');
  try {
    await fs.access(recommendationsReceivedCsv);
    console.log('📖 Processing recommendations received...\n');
    await convertRecommendationsReceived(recommendationsReceivedCsv);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  Recommendations_Received.csv not found, skipping recommendations received\n');
    } else {
      console.error('❌ Error processing recommendations received:', error.message);
    }
  }
  
  // Process posts (Shares.csv) - check both root and archive
  let sharesCsv = path.join(linkedInDir, 'Shares.csv');
  let foundShares = false;
  
  try {
    await fs.access(sharesCsv);
    foundShares = true;
  } catch {
    // Try archive directory
    const archiveShares = path.resolve(BASE_DIR, 'LI', 'Complete_LinkedInDataExport_10-23-2025', 'Shares.csv');
    try {
      await fs.access(archiveShares);
      sharesCsv = archiveShares;
      foundShares = true;
    } catch {
      // Try to find any Complete_LinkedInDataExport_* directory
      try {
        const liDir = path.resolve(BASE_DIR, 'LI');
        const entries = await fs.readdir(liDir);
        for (const entry of entries) {
          if (entry.startsWith('Complete_LinkedInDataExport_')) {
            const archivePath = path.join(liDir, entry, 'Shares.csv');
            try {
              await fs.access(archivePath);
              sharesCsv = archivePath;
              foundShares = true;
              break;
            } catch {
              // Continue
            }
          }
        }
      } catch {
        // Continue
      }
    }
  }
  
  if (foundShares) {
    console.log('📱 Processing LinkedIn posts...\n');
    await convertPosts(sharesCsv);
  } else {
    console.log('ℹ️  Shares.csv not found, skipping posts\n');
  }
  
  console.log('\n✨ Import complete!');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run fetch:blog');
  console.log('  2. Run: npm run merge');
  console.log('  3. Review and commit changes');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

