#!/usr/bin/env node

import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome.js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface LinkedInPost {
  id: string;
  type: 'linkedin';
  timestamp: string;
  title: string;
  summary: string;
  url: string;
  author: string | null;
  tags: string[];
  media: {
    type?: string;
    images?: string[];
    alt?: string[];
  };
  content_html: string | null;
  content_text: string | null;
  metadata: {
    site_name: string;
    engagement?: {
      likes: number;
      comments: number;
      shares: number;
    };
  } | null;
}

class LinkedInFetcher {
  private driver: WebDriver | null = null;
  private readonly dataPath: string;
  private readonly existingData: LinkedInPost[] = [];

  constructor() {
    this.dataPath = join(process.cwd(), 'astro', 'data', 'sources', 'linkedin.json');
    this.loadExistingData();
  }

  private loadExistingData() {
    if (existsSync(this.dataPath)) {
      try {
        this.existingData = JSON.parse(readFileSync(this.dataPath, 'utf-8'));
        console.log(`📋 Loaded ${this.existingData.length} existing LinkedIn posts`);
      } catch (error) {
        console.warn('⚠️ Could not load existing LinkedIn data:', error);
      }
    }
  }

  private async setupDriver(): Promise<WebDriver> {
    console.log('🔧 Setting up Chrome driver with persistent profile...');
    
    const options = new chrome.Options();
    // options.addArguments('--headless'); // Commented out for testing
    
    // Use persistent profile directory for session persistence
    const profileDir = join(process.cwd(), '.chrome-profile-linkedin');
    options.addArguments(`--user-data-dir=${profileDir}`);
    
    // Additional options for better session persistence
    options.addArguments('--disable-web-security');
    options.addArguments('--disable-features=VizDisplayCompositor');
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.addArguments('--no-first-run');
    options.addArguments('--no-default-browser-check');
    
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1920,1080');
    
    // Enable passkey support
    options.addArguments('--enable-features=WebAuthentication');
    options.addArguments('--enable-features=WebAuthenticationModern');
    
    // User agent to avoid detection
    options.addArguments('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    return this.driver;
  }

  private async loginWithPasskey(): Promise<boolean> {
    if (!this.driver) throw new Error('Driver not initialized');

    try {
      console.log('🔐 Checking LinkedIn login status...');
      await this.driver.get('https://www.linkedin.com/feed/');

      // Check if already logged in by looking for feed elements
      try {
        await this.driver.wait(until.elementLocated(By.css('.feed-shared-update-v2')), 5000);
        console.log('✅ Already logged in to LinkedIn!');
        return true;
      } catch (error) {
        console.log('⚠️ Not logged in, attempting login...');
        await this.driver.get('https://www.linkedin.com/login');
        await this.driver.wait(until.elementLocated(By.id('username')), 10000);
      }

      // Check if passkey option is available
      const passkeyButton = await this.driver.findElements(By.xpath("//button[contains(text(), 'passkey') or contains(text(), 'Passkey')]"));
      
      if (passkeyButton.length > 0) {
        console.log('🔑 Passkey option found, attempting authentication...');
        await passkeyButton[0].click();
        
        // Wait for passkey authentication to complete
        await this.driver.wait(until.urlContains('linkedin.com/feed'), 30000);
        console.log('✅ Successfully authenticated with passkey');
        return true;
      } else {
        console.log('⚠️ Passkey option not available, falling back to manual login');
        console.log('⏳ Please complete login manually in the browser window...');
        console.log('⏳ Waiting 60 seconds for you to complete authentication...');
        
        // Wait longer for manual login
        try {
          await this.driver.wait(until.urlContains('linkedin.com/feed'), 60000);
          console.log('✅ Successfully logged in manually');
          return true;
        } catch (timeoutError) {
          console.log('⏰ Login timeout - please try again');
          return false;
        }
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
      return false;
    }
  }

  private async navigateToProfile(): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized');

    try {
      console.log('📝 Staying on LinkedIn feed to fetch posts...');
      // We're already on the feed page, so just wait for posts to load
      await this.driver.wait(until.elementLocated(By.css('.feed-shared-update-v2')), 10000);
    } catch (error) {
      console.error('❌ Failed to find posts in feed:', error);
      throw error;
    }
  }

  private async extractPosts(): Promise<LinkedInPost[]> {
    if (!this.driver) throw new Error('Driver not initialized');

    const posts: LinkedInPost[] = [];
    
    try {
      console.log('📝 Extracting posts from feed...');
      
      // Find all post elements in the feed
      const postElements = await this.driver.findElements(By.css('.feed-shared-update-v2'));
      
      console.log(`Found ${postElements.length} posts to process`);

      for (let i = 0; i < postElements.length; i++) {
        try {
          const post = await this.extractPostData(postElements[i], i);
          if (post) {
            posts.push(post);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to extract post ${i}:`, error);
        }
      }

      return posts;
    } catch (error) {
      console.error('❌ Failed to extract posts:', error);
      return posts;
    }
  }

  private async extractPostData(element: any, index: number): Promise<LinkedInPost | null> {
    try {
      // Extract post ID from URL or generate one
      const postLink = await element.findElement(By.css('a[href*="/posts/"]')).catch(() => null);
      const postUrl = postLink ? await postLink.getAttribute('href') : `linkedin-post-${index}`;
      const postId = postUrl.includes('/posts/') ? postUrl.split('/posts/')[1] : `linkedin-${Date.now()}-${index}`;

      // Extract timestamp
      const timeElement = await element.findElement(By.css('time')).catch(() => null);
      const timestamp = timeElement ? await timeElement.getAttribute('datetime') : new Date().toISOString();

      // Extract post content
      const contentElement = await element.findElement(By.css('.feed-shared-text')).catch(() => null);
      const content = contentElement ? await contentElement.getText() : '';

      // Extract images
      const imageElements = await element.findElements(By.css('.feed-shared-image img'));
      const images: string[] = [];
      for (const img of imageElements) {
        const src = await img.getAttribute('src');
        if (src) images.push(src);
      }

      // Extract engagement metrics
      const likesElement = await element.findElement(By.css('[data-test-id="social-actions-bar"] .social-counts-reactions__count')).catch(() => null);
      const commentsElement = await element.findElement(By.css('[data-test-id="social-actions-bar"] .social-counts-comments__count')).catch(() => null);
      
      const likes = likesElement ? parseInt(await likesElement.getText()) || 0 : 0;
      const comments = commentsElement ? parseInt(await commentsElement.getText()) || 0 : 0;

      return {
        id: `linkedin:${postId}`,
        type: 'linkedin',
        timestamp,
        title: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        summary: content,
        url: postUrl.startsWith('http') ? postUrl : `https://www.linkedin.com${postUrl}`,
        author: null, // It's your own post
        tags: ['linkedin', 'social'],
        media: {
          type: images.length > 0 ? 'image' : undefined,
          images: images.length > 0 ? images : undefined,
          alt: images.length > 0 ? images.map(() => '') : undefined
        },
        content_html: null,
        content_text: content,
        metadata: {
          site_name: 'LinkedIn',
          engagement: {
            likes,
            comments,
            shares: 0 // LinkedIn doesn't show share counts publicly
          }
        }
      };
    } catch (error) {
      console.warn(`⚠️ Failed to extract post data for index ${index}:`, error);
      return null;
    }
  }

  private async saveData(posts: LinkedInPost[]): Promise<void> {
    try {
      // Merge with existing data, avoiding duplicates
      const existingIds = new Set(this.existingData.map(p => p.id));
      const newPosts = posts.filter(post => !existingIds.has(post.id));
      
      const allPosts = [...this.existingData, ...newPosts];
      
      // Sort by timestamp (newest first)
      allPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      writeFileSync(this.dataPath, JSON.stringify(allPosts, null, 2));
      
      console.log(`✅ Saved ${allPosts.length} total LinkedIn posts (${newPosts.length} new)`);
    } catch (error) {
      console.error('❌ Failed to save data:', error);
      throw error;
    }
  }

  public async fetch(): Promise<void> {
    try {
      await this.setupDriver();
      
      const loginSuccess = await this.loginWithPasskey();
      if (!loginSuccess) {
        console.log('⚠️ Manual login required - please complete authentication in browser');
        console.log('💡 Consider using LinkedIn API instead for automated access');
        return;
      }

      await this.navigateToProfile();
      const posts = await this.extractPosts();
      await this.saveData(posts);

    } catch (error) {
      console.error('❌ LinkedIn fetch failed:', error);
      throw error;
    } finally {
      if (this.driver) {
        console.log('⏳ Keeping browser open for 10 seconds so you can see the results...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        await this.driver.quit();
      }
    }
  }
}

// Main execution
async function main() {
  console.log('🔗 Starting LinkedIn activity fetch...');
  
  const fetcher = new LinkedInFetcher();
  await fetcher.fetch();
  
  console.log('✅ LinkedIn fetch complete!');
}

// Run the main function
main().catch(console.error);

export default LinkedInFetcher;

