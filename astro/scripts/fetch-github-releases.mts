#!/usr/bin/env node

/**
 * Fetches tagged releases from GitHub repos for a user
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GITHUB_USERNAME = 'chasemp';
const OUTPUT_FILE = join(__dirname, '../data/sources/github-releases.json');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface Release {
  id: string;
  type: 'release';
  title: string;
  summary: string;
  url: string;
  timestamp: string;
  repo: string;
  tag: string;
}

async function fetchWithAuth(url: string) {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  
  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('RATE_LIMIT');
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchUserRepos(): Promise<any[]> {
  console.log(`🔍 Fetching repositories for ${GITHUB_USERNAME}...`);
  const repos = await fetchWithAuth(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`);
  return repos.filter((repo: any) => !repo.fork && !repo.private);
}

async function fetchReleases(repo: string): Promise<any[]> {
  try {
    const releases = await fetchWithAuth(`https://api.github.com/repos/${GITHUB_USERNAME}/${repo}/releases?per_page=10`);
    return releases;
  } catch (error) {
    // Repo might not have releases, that's ok
    return [];
  }
}

async function fetchTags(repo: string): Promise<any[]> {
  try {
    const tags = await fetchWithAuth(`https://api.github.com/repos/${GITHUB_USERNAME}/${repo}/tags?per_page=10`);
    return tags;
  } catch (error) {
    return [];
  }
}

function loadExisting(): Release[] {
  if (!existsSync(OUTPUT_FILE)) {
    return [];
  }
  try {
    const content = readFileSync(OUTPUT_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function main() {
  console.log('🏷️  Fetching GitHub releases and tags...');
  
  if (!GITHUB_TOKEN) {
    console.warn('⚠️  GITHUB_TOKEN not set. API rate limits will be restrictive.');
    console.warn('   Set GITHUB_TOKEN to increase rate limits.');
  }

  const existing = loadExisting();
  const existingIds = new Set(existing.map(r => r.id));
  
  const repos = await fetchUserRepos();
  console.log(`✓ Found ${repos.length} repos`);
  
  const allReleases: Release[] = [];
  let newCount = 0;

  for (const repo of repos) {
    const repoName = repo.name;
    
    // Fetch releases
    const releases = await fetchReleases(repoName);
    
    for (const release of releases) {
      const id = `release:${repoName}:${release.tag_name}`;
      
      if (!existingIds.has(id)) {
        newCount++;
      }
      
      allReleases.push({
        id,
        type: 'release',
        title: `${repoName} ${release.tag_name}`,
        summary: release.name || release.body?.split('\n')[0] || `Tagged release ${release.tag_name}`,
        url: release.html_url,
        timestamp: release.published_at || release.created_at,
        repo: repoName,
        tag: release.tag_name,
      });
    }
    
    // Small delay to be nice to API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Merge with existing, dedupe by id, and sort by timestamp
  const allEntries = [...existing, ...allReleases];
  const uniqueMap = new Map<string, Release>();
  
  for (const entry of allEntries) {
    if (!uniqueMap.has(entry.id)) {
      uniqueMap.set(entry.id, entry);
    }
  }
  
  const final = Array.from(uniqueMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  writeFileSync(OUTPUT_FILE, JSON.stringify(final, null, 2));
  
  console.log(`✅ Wrote ${final.length} total releases to ${OUTPUT_FILE}`);
  console.log(`   (${newCount} new, ${final.length - newCount} existing)`);
}

main().catch((err) => {
  if (err.message === 'RATE_LIMIT') {
    console.warn('⚠️  GitHub API rate limit exceeded. Using existing data.');
    console.warn('   Set GITHUB_TOKEN environment variable to increase limits.');
    process.exit(0); // Exit successfully with existing data
  }
  console.error('❌ Error fetching GitHub releases:', err.message);
  process.exit(1);
});

