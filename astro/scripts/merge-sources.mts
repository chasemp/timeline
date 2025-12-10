#!/usr/bin/env node
// @ts-nocheck
/* eslint-disable */
import fs from 'fs/promises';
import path from 'path';

const IN_DIR = path.resolve(process.cwd(), 'data/sources');
const OUT_FILE = path.resolve(process.cwd(), 'src/data/timeline.json');

function stableId(entry: any) {
  if (entry.id) return entry.id;
  const base = `${entry.type||'item'}:${entry.url||entry.title||Math.random().toString(36).slice(2)}`;
  return base;
}

function canonical(entry: any) {
  return entry.canonical_url || entry.url || entry.id;
}

function detectType(entry: any) {
  const baseType = entry.type || 'item';
  const rawSiteName = entry.metadata?.site_name;
  const rawUrl = entry.url || entry.canonical_url || entry.id || '';
  const siteName = typeof rawSiteName === 'string' ? rawSiteName.toLowerCase() : '';
  const url = typeof rawUrl === 'string' ? rawUrl.toLowerCase() : '';
  const title = (entry.title || '').toLowerCase();
  const tags = (entry.tags || []).map((t: string) => t.toLowerCase());
  const source = entry.source || '';

  // Check for primers first (items with "primer" tag should be type "primer")
  // Primers get their own standalone pages like blog posts
  if (baseType === 'saved' && tags.includes('primer')) {
    return 'primer';
  }

  // LinkedIn content from Readwise (saved articles) should stay as 'saved' (Read category)
  // These are OTHER people's posts that you read, not your own posts
  // Your own LinkedIn posts would come from a different source (e.g., markdown files)
  if (baseType === 'saved') {
    const isLinkedIn = siteName.includes('linkedin') || url.includes('linkedin.com') || url.includes('lnkd.in');
    if (isLinkedIn) {
      // All LinkedIn content from Readwise stays as 'saved' (Read category)
      // This includes posts, articles, recommendations, etc. that you saved/read
      return 'saved';
    }
  }

  // If entry is already type 'blog' and from markdown (your own content), keep it as blog
  // This handles your own LinkedIn posts that you've manually added to markdown files
  if (baseType === 'blog' && source === 'markdown') {
    return 'blog';
  }

  return baseType;
}

function normalize(entry: any) {
  const normalizedType = detectType(entry);
  const rawSiteName = entry.metadata?.site_name || '';
  const rawUrl = entry.url || entry.canonical_url || entry.id || '';
  const siteName = typeof rawSiteName === 'string' ? rawSiteName.toLowerCase() : '';
  const url = typeof rawUrl === 'string' ? rawUrl.toLowerCase() : '';
  const isLinkedIn = siteName.includes('linkedin') || url.includes('linkedin.com') || url.includes('lnkd.in');
  
  // Ensure LinkedIn content always has #linkedin tag
  let tags = Array.isArray(entry.tags) ? [...entry.tags] : [];
  if (isLinkedIn && !tags.some((t: string) => t.toLowerCase().includes('linkedin'))) {
    tags.push('LinkedIn');
  }
  
  return {
    id: stableId(entry),
    type: normalizedType,
    source: entry.source || null,
    timestamp: entry.timestamp || entry.date || new Date().toISOString(),
    title: entry.title || '',
    summary: entry.summary || '',
    url: entry.url || null,
    canonical_url: canonical(entry),
    author: entry.author || null,
    tags: tags,
    media: entry.media || [],
    content_html: entry.content_html || null,
    content_text: entry.content_text || null,
    embed_uri: entry.embed_uri || null,
    embed_cid: entry.embed_cid || null,
    metadata: entry.metadata || null,
  };
}

async function readSourceFiles() {
  try {
    const files = await fs.readdir(IN_DIR);
    const jsonFiles = files.filter((f: string) => f.endsWith('.json'));
    const contents = await Promise.all(jsonFiles.map((f: string) => fs.readFile(path.join(IN_DIR, f), 'utf8')));
    return contents.flatMap((c: string) => {
      try { return JSON.parse(c); } catch { return []; }
    });
  } catch (err: any) {
    if (err?.code === 'ENOENT') return [];
    throw err;
  }
}

function merge(entries: any[]) {
  const map = new Map<string, any>();
  for (const raw of entries) {
    const e = normalize(raw);
    const key = e.canonical_url || e.id;
    if (!map.has(key)) {
      map.set(key, e);
    } else {
      const prev = map.get(key);
      map.set(key, { ...prev, ...e });
    }
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

const entries = await readSourceFiles();
const merged = merge(entries);
await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
await fs.writeFile(OUT_FILE, JSON.stringify(merged, null, 2));
console.log(`Merged ${entries.length} -> ${merged.length} timeline items.`);

