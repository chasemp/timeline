#!/usr/bin/env node

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface LinkedInPost {
  id: string;
  type: 'linkedin';
  source: 'linkedin-api';
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

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: {
    displayImage: string;
  };
}

interface LinkedInActivity {
  id: string;
  created: {
    time: number;
  };
  lastModified: {
    time: number;
  };
  author: string;
  commentary?: string;
  content?: {
    media?: {
      id: string;
      title?: string;
      description?: string;
      thumbnails?: Array<{
        url: string;
        width: number;
        height: number;
      }>;
    }[];
  };
  distribution: {
    feedDistribution: string;
  };
  visibility: string;
  reshareContext?: {
    parent: string;
  };
}

class LinkedInAPIFetcher {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    // Load from environment variables
    this.clientId = process.env.LINKEDIN_CLIENT_ID || '';
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
    this.redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/callback';
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️ LinkedIn API credentials not found in environment variables');
      console.warn('💡 Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET');
    }
  }

  /**
   * Step 1: Generate OAuth authorization URL
   * User needs to visit this URL to authorize the app
   */
  generateAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'r_liteprofile,r_emailaddress,w_member_social',
      state: 'random_state_string'
    });
    
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Step 2: Exchange authorization code for access token
   */
  async exchangeCodeForToken(authCode: string): Promise<LinkedInTokenResponse> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Step 3: Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<LinkedInTokenResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Load stored tokens from file
   */
  private loadTokens(): void {
    const tokenFile = join(process.cwd(), 'astro', 'data', 'sources', 'linkedin-tokens.json');
    
    if (existsSync(tokenFile)) {
      try {
        const tokenData = JSON.parse(readFileSync(tokenFile, 'utf-8'));
        this.accessToken = tokenData.access_token;
        this.refreshToken = tokenData.refresh_token;
        this.tokenExpiry = tokenData.expires_at || 0;
        
        console.log('✅ Loaded stored LinkedIn tokens');
      } catch (error) {
        console.warn('⚠️ Could not load stored tokens:', error);
      }
    }
  }

  /**
   * Save tokens to file
   */
  private saveTokens(tokenData: LinkedInTokenResponse): void {
    const tokenFile = join(process.cwd(), 'astro', 'data', 'sources', 'linkedin-tokens.json');
    
    const tokensToSave = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in * 1000),
      token_type: tokenData.token_type,
      saved_at: new Date().toISOString()
    };
    
    writeFileSync(tokenFile, JSON.stringify(tokensToSave, null, 2), 'utf-8');
    console.log('💾 Saved LinkedIn tokens');
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    this.loadTokens();
    
    // Check if token is expired or missing
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      console.log('🔄 Access token expired or missing, attempting refresh...');
      
      try {
        const newTokens = await this.refreshAccessToken();
        this.accessToken = newTokens.access_token;
        this.refreshToken = newTokens.refresh_token || this.refreshToken;
        this.tokenExpiry = Date.now() + (newTokens.expires_in * 1000);
        
        this.saveTokens(newTokens);
        console.log('✅ Successfully refreshed access token');
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        throw new Error('Please re-authorize the LinkedIn app. Visit: ' + this.generateAuthUrl());
      }
    }
  }

  /**
   * Get current user's profile
   */
  async getProfile(): Promise<LinkedInProfile> {
    await this.ensureValidToken();
    
    const response = await fetch('https://api.linkedin.com/v2/people/~', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Profile fetch failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get user's recent activity/posts
   * Note: LinkedIn API has limited access to personal posts
   */
  async getRecentActivity(): Promise<LinkedInActivity[]> {
    await this.ensureValidToken();
    
    // LinkedIn API doesn't provide direct access to personal posts
    // This is a limitation of their API - they focus on company pages
    console.log('⚠️ LinkedIn API has limited access to personal posts');
    console.log('💡 Consider using LinkedIn data export feature instead');
    
    // For now, return empty array
    // In a real implementation, you might:
    // 1. Use LinkedIn's data export (GDPR)
    // 2. Scrape with proper authorization
    // 3. Use LinkedIn's partner API (if available)
    
    return [];
  }

  /**
   * Convert LinkedIn activity to our timeline format
   */
  private convertToTimelinePost(activity: LinkedInActivity, profile: LinkedInProfile): LinkedInPost {
    const timestamp = new Date(activity.created.time).toISOString();
    const content = activity.commentary || activity.content?.media?.[0]?.description || '';
    
    return {
      id: `linkedin-api:${activity.id}`,
      type: 'linkedin',
      source: 'linkedin-api',
      timestamp,
      title: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      summary: content,
      url: `https://www.linkedin.com/feed/update/${activity.id}`,
      author: `${profile.firstName} ${profile.lastName}`,
      tags: ['linkedin', 'social', 'api'],
      media: activity.content?.media ? {
        type: 'image',
        images: activity.content.media.map(m => m.thumbnails?.[0]?.url || '').filter(Boolean),
        alt: activity.content.media.map(m => m.title || '')
      } : undefined,
      content_html: null,
      content_text: content,
      embed_uri: null,
      embed_cid: null,
      metadata: {
        site_name: 'LinkedIn',
        engagement: {
          likes: 0, // Not available in API
          comments: 0, // Not available in API
          shares: 0 // Not available in API
        }
      }
    };
  }

  /**
   * Main fetch method
   */
  async fetch(): Promise<void> {
    console.log('🔗 Starting LinkedIn API fetch...');
    
    if (!this.clientId || !this.clientSecret) {
      console.log('⚠️ LinkedIn API credentials not configured');
      console.log('💡 Set up LinkedIn app at: https://www.linkedin.com/developers/');
      console.log('💡 Add credentials to .env file');
      return;
    }

    try {
      // Get profile
      console.log('👤 Fetching LinkedIn profile...');
      const profile = await this.getProfile();
      console.log(`✅ Profile: ${profile.firstName} ${profile.lastName}`);

      // Get activity (limited by API)
      console.log('📝 Fetching recent activity...');
      const activities = await this.getRecentActivity();
      console.log(`📊 Found ${activities.length} activities`);

      // Convert to timeline format
      const posts: LinkedInPost[] = activities.map(activity => 
        this.convertToTimelinePost(activity, profile)
      );

      // Save data
      const outputFile = join(process.cwd(), 'astro', 'data', 'sources', 'linkedin.json');
      writeFileSync(outputFile, JSON.stringify(posts, null, 2), 'utf-8');
      console.log(`✅ Saved ${posts.length} LinkedIn posts to ${outputFile}`);

    } catch (error) {
      console.error('❌ LinkedIn API fetch failed:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const fetcher = new LinkedInAPIFetcher();
  await fetcher.fetch();
  console.log('✅ LinkedIn API fetch complete!');
}

// Run the main function
main().catch(console.error);

export default LinkedInAPIFetcher;
