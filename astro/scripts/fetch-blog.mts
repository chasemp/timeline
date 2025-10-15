#!/usr/bin/env node
// @ts-nocheck
/* eslint-disable */
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const POSTS_DIR = path.resolve(process.cwd(), '../_posts');
const OUT_DIR = path.resolve(process.cwd(), 'data/sources');

async function readMarkdownFiles(dir: string) {
  let entries: any[] = [];
  try {
    const files = await fs.readdir(dir);
    for (const file of files) {
      if (!file.endsWith('.md') && !file.endsWith('.mdx') && !file.endsWith('.markdown')) continue;
      const full = path.join(dir, file);
      const raw = await fs.readFile(full, 'utf8');
      const parsed = matter(raw);
      const fm: any = parsed.data ?? {};
      const content = parsed.content ?? '';
      const html = marked.parse(content) as string;
      const basename = file.replace(/\.(md|mdx|markdown)$/i, '');
      // Jekyll posts are "YYYY-MM-DD-title.md"; extract date and slug
      const m = basename.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
      const slug = fm.slug || (m ? m[4] : basename);
      const timestamp = fm.date || (m ? `${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z` : fm.published || fm.created || new Date().toISOString());
      const url = fm.permalink || `/${(fm.categories && fm.categories[0]) ? fm.categories[0] + '/' : ''}${slug}/`;
      entries.push({
        id: `blog:${slug}`,
        type: 'blog',
        source: 'markdown',
        timestamp,
        title: fm.title || slug,
        summary: fm.description || '',
        url,
        tags: fm.tags || [],
        content_html: html,
        author: fm.author ? { name: fm.author } : undefined,
      });
    }
  } catch (err: any) {
    if (err?.code === 'ENOENT') return entries;
    throw err;
  }
  return entries;
}

await fs.mkdir(OUT_DIR, { recursive: true });
const posts = await readMarkdownFiles(POSTS_DIR);
await fs.writeFile(path.join(OUT_DIR, 'blog.json'), JSON.stringify(posts, null, 2));
console.log(`Saved ${posts.length} blog entries.`);

