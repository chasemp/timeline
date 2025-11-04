#!/usr/bin/env node
// @ts-nocheck
/* eslint-disable */
import fs from 'fs/promises';
import path from 'path';

const PUBLICATIONS_CSV = path.resolve(process.cwd(), '../LI/Publications.csv');
const MARKDOWN_DIR = path.resolve(process.cwd(), '../markdown');

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
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

function parseDate(dateStr: string): string {
  // Parse dates like "Nov 18, 2020" or "May 18, 2021" or "Jul 28, 2025"
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function extractTags(title: string, publisher: string, description: string): string[] {
  const tags: string[] = ['Publications'];
  const lowerTitle = title.toLowerCase();
  const lowerPublisher = publisher.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  // Add publisher-specific tags
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

async function convertPublications() {
  try {
    const csvContent = await fs.readFile(PUBLICATIONS_CSV, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Skip header
    const dataLines = lines.slice(1);
    
    console.log(`Found ${dataLines.length} publication(s) to convert...\n`);
    
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      const [name, publishedOn, description, publisher, url] = parseCSVLine(line);
      
      if (!name || !publishedOn) {
        console.warn(`⚠️  Skipping invalid line: ${line.substring(0, 50)}...`);
        continue;
      }
      
      const date = parseDate(publishedOn);
      const slug = slugify(name);
      const filename = `${date}-${slug}.md`;
      const outputPath = path.join(MARKDOWN_DIR, filename);
      
      // Check if file already exists
      try {
        await fs.access(outputPath);
        console.log(`⏭️  Skipping ${filename} (already exists)`);
        continue;
      } catch {
        // File doesn't exist, proceed
      }
      
      const tags = extractTags(name, publisher, description);
      
      // Create markdown content
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
      
      // Add description as content
      if (description && description.trim()) {
        // Clean up description - remove URLs that might be at the start
        let cleanDesc = description.trim();
        // Remove leading URLs if present
        cleanDesc = cleanDesc.replace(/^https?:\/\/[^\s]+\s+/i, '');
        
        content += `\n\n${cleanDesc}`;
        
        // Add link to publication if URL is provided
        if (url && url.trim() && url !== 'null') {
          content += `\n\n[Read the publication →](${url})`;
        }
      }
      
      await fs.writeFile(outputPath, content, 'utf8');
      console.log(`✅ Converted: ${filename}`);
    }
    
    console.log(`\n✨ Conversion complete!`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(`❌ File not found: ${PUBLICATIONS_CSV}`);
    } else {
      console.error('❌ Error:', error);
    }
    process.exit(1);
  }
}

convertPublications();

