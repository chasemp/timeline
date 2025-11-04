#!/usr/bin/env node
// @ts-nocheck
/* eslint-disable */
import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

const LINKEDIN_ARTICLES_DIR = path.resolve(process.cwd(), '../LI/Articles/Articles');
const MARKDOWN_DIR = path.resolve(process.cwd(), '../markdown');

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
});

// Custom rules for better conversion
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function extractDateFromFilename(filename: string): string | null {
  // Try to extract date from filename like "2022-10-13 16:05:42.0-title.html"
  const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})\s/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return null;
}

async function convertLinkedInArticle(htmlFile: string): Promise<void> {
  const fullPath = path.join(LINKEDIN_ARTICLES_DIR, htmlFile);
  const html = await fs.readFile(fullPath, 'utf8');
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Extract title from <h1> or <title>
  const h1 = document.querySelector('h1');
  let title = h1?.textContent?.trim() || document.querySelector('title')?.textContent?.trim() || 'Untitled';
  
  // Remove any anchor tags from title
  const titleLink = h1?.querySelector('a');
  if (titleLink) {
    title = titleLink.textContent?.trim() || title;
  }
  
  // Extract date from .created paragraph
  const createdPara = document.querySelector('p.created');
  let dateStr: string | null = null;
  
  if (createdPara) {
    const dateText = createdPara.textContent || '';
    // Match "Created on 2022-10-13 16:05" or similar
    const dateMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }
  }
  
  // Fallback to filename date if not found in HTML
  if (!dateStr) {
    dateStr = extractDateFromFilename(htmlFile);
  }
  
  // If still no date, use a default or current date
  if (!dateStr) {
    console.warn(`⚠️  No date found for ${htmlFile}, using current date`);
    dateStr = new Date().toISOString().split('T')[0];
  }
  
  // Extract content from <div> after .published
  const publishedPara = document.querySelector('p.published');
  let contentDiv: Element | null = null;
  
  if (publishedPara && publishedPara.nextElementSibling) {
    contentDiv = publishedPara.nextElementSibling as Element;
  } else {
    // Fallback: find the last div in body
    const divs = document.querySelectorAll('body > div');
    if (divs.length > 0) {
      contentDiv = divs[divs.length - 1];
    }
  }
  
  if (!contentDiv) {
    console.warn(`⚠️  No content found for ${htmlFile}`);
    return;
  }
  
  // Convert HTML content to markdown
  const htmlContent = contentDiv.innerHTML;
  let markdownContent = turndownService.turndown(htmlContent);
  
  // Clean up markdown
  markdownContent = markdownContent
    .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
    .trim();
  
  // Create slug from title
  const slug = slugify(title);
  const filename = `${dateStr}-${slug}.md`;
  const outputPath = path.join(MARKDOWN_DIR, filename);
  
  // Check if file already exists
  try {
    await fs.access(outputPath);
    console.log(`⏭️  Skipping ${filename} (already exists)`);
    return;
  } catch {
    // File doesn't exist, proceed
  }
  
  // Create frontmatter
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
  console.log(`✅ Converted: ${filename}`);
}

async function main() {
  try {
    const files = await fs.readdir(LINKEDIN_ARTICLES_DIR);
    const htmlFiles = files.filter(f => f.endsWith('.html'));
    
    console.log(`Found ${htmlFiles.length} LinkedIn article(s) to convert...\n`);
    
    for (const file of htmlFiles) {
      await convertLinkedInArticle(file);
    }
    
    console.log(`\n✨ Conversion complete!`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(`❌ Directory not found: ${LINKEDIN_ARTICLES_DIR}`);
    } else {
      console.error('❌ Error:', error);
    }
    process.exit(1);
  }
}

main();

