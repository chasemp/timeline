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
 * - Converts both to markdown files in markdown/ directory
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
  
  const match = dateStr.match(/(\w+)\s+(\d+),\s+(\d+)/);
  if (match) {
    const month = months[match[1]] || '01';
    const day = match[2].padStart(2, '0');
    const year = match[3];
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

