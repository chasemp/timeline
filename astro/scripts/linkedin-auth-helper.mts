#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * LinkedIn OAuth Authorization Helper
 * 
 * This script helps you complete the OAuth flow for LinkedIn API access.
 * It generates the authorization URL and helps exchange the code for tokens.
 */

class LinkedInAuthHelper {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.LINKEDIN_CLIENT_ID || '';
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
    this.redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/callback';
  }

  /**
   * Generate authorization URL
   */
  generateAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'r_liteprofile,r_emailaddress,w_member_social',
      state: 'timeline_auth_' + Date.now()
    });
    
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(authCode: string): Promise<any> {
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
   * Save tokens to file
   */
  saveTokens(tokenData: any): void {
    const tokenFile = join(process.cwd(), 'astro', 'data', 'sources', 'linkedin-tokens.json');
    
    const tokensToSave = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + (tokenData.expires_in * 1000),
      token_type: tokenData.token_type,
      saved_at: new Date().toISOString()
    };
    
    writeFileSync(tokenFile, JSON.stringify(tokensToSave, null, 2), 'utf-8');
    console.log('💾 Saved LinkedIn tokens to:', tokenFile);
  }

  /**
   * Interactive authorization flow
   */
  async authorize(): Promise<void> {
    if (!this.clientId || !this.clientSecret) {
      console.log('❌ LinkedIn API credentials not found!');
      console.log('');
      console.log('Please set up your LinkedIn app:');
      console.log('1. Visit: https://www.linkedin.com/developers/');
      console.log('2. Create a new app');
      console.log('3. Add these to your .env file:');
      console.log('   LINKEDIN_CLIENT_ID=your_client_id');
      console.log('   LINKEDIN_CLIENT_SECRET=your_client_secret');
      console.log('   LINKEDIN_REDIRECT_URI=http://localhost:3000/callback');
      return;
    }

    console.log('🔗 LinkedIn OAuth Authorization Helper');
    console.log('');
    console.log('Step 1: Visit this URL to authorize the app:');
    console.log('');
    console.log(this.generateAuthUrl());
    console.log('');
    console.log('Step 2: After authorization, LinkedIn will redirect you to:');
    console.log(this.redirectUri + '?code=AUTHORIZATION_CODE&state=...');
    console.log('');
    console.log('Step 3: Copy the "code" parameter from the URL and run:');
    console.log('npm run linkedin:auth -- --code=AUTHORIZATION_CODE');
    console.log('');
    console.log('Step 4: The script will exchange the code for tokens and save them.');
  }

  /**
   * Process authorization code
   */
  async processCode(authCode: string): Promise<void> {
    try {
      console.log('🔄 Exchanging authorization code for tokens...');
      const tokenData = await this.exchangeCodeForToken(authCode);
      
      console.log('✅ Successfully obtained tokens!');
      console.log('📊 Token info:');
      console.log(`   - Access Token: ${tokenData.access_token.substring(0, 20)}...`);
      console.log(`   - Expires in: ${tokenData.expires_in} seconds`);
      console.log(`   - Token Type: ${tokenData.token_type}`);
      
      this.saveTokens(tokenData);
      
      console.log('');
      console.log('🎉 Authorization complete!');
      console.log('💡 You can now run: npm run fetch:linkedin-api');
      
    } catch (error) {
      console.error('❌ Authorization failed:', error);
    }
  }
}

// Main execution
async function main() {
  const helper = new LinkedInAuthHelper();
  
  // Check for --code parameter
  const args = process.argv.slice(2);
  const codeArg = args.find(arg => arg.startsWith('--code='));
  
  if (codeArg) {
    const authCode = codeArg.split('=')[1];
    await helper.processCode(authCode);
  } else {
    await helper.authorize();
  }
}

main().catch(console.error);

export default LinkedInAuthHelper;

