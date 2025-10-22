#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

interface LinkedInPost {
  id: string;
  type: 'linkedin';
  source: 'linkedin-export';
  timestamp: string;
  title: string;
  summary: string;
  url: string;
  author: string | null;
  tags: string[];
  media?: {
    type?: string;
    images?: string[];
    alt?: string[];
  };
  content_html: string | null;
  content_text: string | null;
  embed_uri: string | null;
  embed_cid: string | null;
  metadata: {
    site_name: string;
    engagement?: {
      likes: number;
      comments: number;
      shares: number;
    };
  };
}

interface LinkedInExportData {
  // Structure varies based on LinkedIn's export format
  // This is a generic interface - actual structure may differ
  [key: string]: any;
}

class LinkedInExportFetcher {
  private exportDir: string;

  constructor() {
    // Directory where LinkedIn export files are placed
    this.exportDir = join(process.cwd(), 'astro', 'data', 'sources', 'linkedin-export');
  }

  /**
   * Check if LinkedIn export directory exists
   */
  private checkExportExists(): boolean {
    return existsSync(this.exportDir);
  }

  /**
   * List available export files
   */
  private listExportFiles(): string[] {
    if (!this.checkExportExists()) {
      return [];
    }

    try {
      return readdirSync(this.exportDir).filter(file => 
        file.endsWith('.json') || file.endsWith('.csv') || file.endsWith('.zip')
      );
    } catch (error) {
      console.warn('⚠️ Could not read export directory:', error);
      return [];
    }
  }

  /**
   * Parse LinkedIn export JSON file
   */
  private parseExportFile(filePath: string): LinkedInExportData[] {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // LinkedIn export structure varies - this is a generic parser
      // You may need to adjust based on actual export format
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.warn(`⚠️ Could not parse export file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Convert LinkedIn export data to timeline format
   */
  private convertToTimelinePost(exportItem: LinkedInExportData): LinkedInPost | null {
    try {
      // This is a generic converter - adjust based on actual export structure
      const timestamp = exportItem.created_time || exportItem.timestamp || exportItem.date;
      const content = exportItem.content || exportItem.text || exportItem.message || '';
      const postId = exportItem.id || exportItem.post_id || exportItem.urn;
      
      if (!timestamp || !content) {
        return null;
      }

      return {
        id: `linkedin-export:${postId}`,
        type: 'linkedin',
        source: 'linkedin-export',
        timestamp: new Date(timestamp).toISOString(),
        title: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        summary: content,
        url: exportItem.url || `https://www.linkedin.com/feed/update/${postId}`,
        author: exportItem.author || 'You',
        tags: ['linkedin', 'social', 'export'],
        media: exportItem.media ? {
          type: 'image',
          images: Array.isArray(exportItem.media) ? exportItem.media : [exportItem.media],
          alt: Array.isArray(exportItem.media) ? exportItem.media.map(() => '') : ['']
        } : undefined,
        content_html: exportItem.content_html || null,
        content_text: content,
        embed_uri: null,
        embed_cid: null,
        metadata: {
          site_name: 'LinkedIn',
          engagement: {
            likes: exportItem.likes_count || 0,
            comments: exportItem.comments_count || 0,
            shares: exportItem.shares_count || 0
          }
        }
      };
    } catch (error) {
      console.warn('⚠️ Could not convert export item:', error);
      return null;
    }
  }

  /**
   * Process all export files
   */
  private processExportFiles(): LinkedInPost[] {
    const files = this.listExportFiles();
    const posts: LinkedInPost[] = [];

    console.log(`📁 Found ${files.length} export files`);

    for (const file of files) {
      console.log(`📄 Processing: ${file}`);
      const filePath = join(this.exportDir, file);
      const exportData = this.parseExportFile(filePath);
      
      for (const item of exportData) {
        const post = this.convertToTimelinePost(item);
        if (post) {
          posts.push(post);
        }
      }
    }

    return posts;
  }

  /**
   * Main fetch method
   */
  async fetch(): Promise<void> {
    console.log('🔗 Starting LinkedIn export fetch...');

    if (!this.checkExportExists()) {
      console.log('❌ LinkedIn export directory not found!');
      console.log('');
      console.log('To use LinkedIn data export:');
      console.log('1. Visit: https://www.linkedin.com/psettings/data-export');
      console.log('2. Request your data export');
      console.log('3. Download the ZIP file when ready');
      console.log('4. Extract to: astro/data/sources/linkedin-export/');
      console.log('5. Run this script again');
      return;
    }

    try {
      const posts = this.processExportFiles();
      
      if (posts.length === 0) {
        console.log('⚠️ No posts found in export files');
        console.log('💡 Make sure export files are in JSON format');
        return;
      }

      // Sort by timestamp (newest first)
      posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Save data
      const outputFile = join(process.cwd(), 'astro', 'data', 'sources', 'linkedin.json');
      writeFileSync(outputFile, JSON.stringify(posts, null, 2), 'utf-8');
      
      console.log(`✅ Processed ${posts.length} LinkedIn posts`);
      console.log(`💾 Saved to: ${outputFile}`);

    } catch (error) {
      console.error('❌ LinkedIn export fetch failed:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const fetcher = new LinkedInExportFetcher();
  await fetcher.fetch();
  console.log('✅ LinkedIn export fetch complete!');
}

// Run the main function
main().catch(console.error);

export default LinkedInExportFetcher;

