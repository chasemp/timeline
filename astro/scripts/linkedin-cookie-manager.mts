#!/usr/bin/env node

import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome.js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

class LinkedInCookieManager {
  private driver: WebDriver | null = null;
  private profileDir: string;

  constructor() {
    this.profileDir = join(process.cwd(), '.chrome-profile-linkedin');
  }

  /**
   * Setup Chrome driver with persistent profile
   */
  private async setupDriver(): Promise<WebDriver> {
    console.log('🔧 Setting up Chrome driver...');
    
    const options = new chrome.Options();
    options.addArguments(`--user-data-dir=${this.profileDir}`);
    options.addArguments('--disable-web-security');
    options.addArguments('--disable-features=VizDisplayCompositor');
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.addArguments('--no-first-run');
    options.addArguments('--no-default-browser-check');
    options.addArguments('--window-size=1920,1080');

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    return this.driver;
  }

  /**
   * Export cookies from current LinkedIn session
   */
  async exportCookies(): Promise<void> {
    try {
      await this.setupDriver();
      
      console.log('🌐 Navigating to LinkedIn...');
      await this.driver!.get('https://www.linkedin.com/feed/');
      
      // Wait for page to load
      await this.driver!.wait(until.elementLocated(By.css('.feed-shared-update-v2')), 10000);
      
      console.log('🍪 Extracting cookies...');
      const cookies = await this.driver!.manage().getCookies();
      
      // Filter LinkedIn-related cookies
      const linkedinCookies = cookies.filter(cookie => 
        cookie.domain.includes('linkedin.com') || 
        cookie.domain.includes('linkedin')
      );
      
      console.log(`📊 Found ${linkedinCookies.length} LinkedIn cookies`);
      
      // Convert to our format
      const cookieData: CookieData[] = linkedinCookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expiry,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite
      }));
      
      // Save to file
      const cookieFile = join(process.cwd(), 'astro', 'data', 'sources', 'linkedin-cookies.json');
      writeFileSync(cookieFile, JSON.stringify(cookieData, null, 2), 'utf-8');
      
      console.log(`💾 Saved cookies to: ${cookieFile}`);
      console.log('🔑 Key cookies found:');
      linkedinCookies.forEach(cookie => {
        console.log(`   - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
      });
      
    } catch (error) {
      console.error('❌ Cookie export failed:', error);
    } finally {
      if (this.driver) {
        await this.driver.quit();
      }
    }
  }

  /**
   * Import cookies to Chrome profile
   */
  async importCookies(): Promise<void> {
    const cookieFile = join(process.cwd(), 'astro', 'data', 'sources', 'linkedin-cookies.json');
    
    if (!existsSync(cookieFile)) {
      console.log('❌ No cookie file found!');
      console.log('💡 Run "npm run linkedin:cookies -- --export" first');
      return;
    }

    try {
      await this.setupDriver();
      
      console.log('📥 Loading cookies from file...');
      const cookieData: CookieData[] = JSON.parse(readFileSync(cookieFile, 'utf-8'));
      
      console.log('🌐 Navigating to LinkedIn...');
      await this.driver!.get('https://www.linkedin.com/');
      
      console.log('🍪 Importing cookies...');
      for (const cookie of cookieData) {
        try {
          await this.driver!.manage().addCookie({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expiry: cookie.expires,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite as any
          });
        } catch (error) {
          console.warn(`⚠️ Could not import cookie ${cookie.name}:`, error);
        }
      }
      
      console.log('🔄 Refreshing page to apply cookies...');
      await this.driver!.navigate().refresh();
      
      // Wait for feed to load
      try {
        await this.driver!.wait(until.elementLocated(By.css('.feed-shared-update-v2')), 10000);
        console.log('✅ Successfully imported cookies and logged in!');
      } catch (error) {
        console.log('⚠️ Cookies imported but may need re-authentication');
      }
      
    } catch (error) {
      console.error('❌ Cookie import failed:', error);
    } finally {
      if (this.driver) {
        console.log('⏳ Keeping browser open for 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        await this.driver.quit();
      }
    }
  }

  /**
   * Test cookie persistence
   */
  async testPersistence(): Promise<void> {
    try {
      await this.setupDriver();
      
      console.log('🌐 Opening LinkedIn for manual login...');
      console.log('⏳ Please log into LinkedIn in the browser window');
      console.log('⏳ Browser will stay open for 5 minutes...');
      console.log('⏳ Take your time - don\'t rush the authentication!');
      
      await this.driver!.get('https://www.linkedin.com/feed/');
      
      // Wait 5 minutes for manual login
      console.log('⏳ Waiting 5 minutes for you to complete login...');
      console.log('⏳ You can close the browser manually when done, or wait for timeout');
      
      // Wait longer and don't quit automatically
      await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes
      
      console.log('⏰ 5 minutes elapsed - checking if login was successful...');
      
      // Test if we're logged in
      try {
        await this.driver!.wait(until.elementLocated(By.css('.feed-shared-update-v2')), 10000);
        console.log('✅ Successfully accessed LinkedIn feed!');
        console.log('🎉 Session persistence is working');
        console.log('💾 Your login session has been saved to the Chrome profile');
      } catch (error) {
        console.log('❌ Could not access LinkedIn feed');
        console.log('💡 The browser may have closed or login was not completed');
      }
      
    } catch (error) {
      console.error('❌ Persistence test failed:', error);
      console.log('💡 This might be normal if you closed the browser manually');
    } finally {
      if (this.driver) {
        try {
          console.log('⏳ Keeping browser open for 30 more seconds...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          await this.driver.quit();
        } catch (error) {
          console.log('💡 Browser was already closed');
        }
      }
    }
  }
}

// Main execution
async function main() {
  const manager = new LinkedInCookieManager();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--export')) {
    await manager.exportCookies();
  } else if (args.includes('--import')) {
    await manager.importCookies();
  } else if (args.includes('--test')) {
    await manager.testPersistence();
  } else {
    console.log('🔧 LinkedIn Cookie Manager');
    console.log('');
    console.log('Usage:');
    console.log('  npm run linkedin:cookies -- --export  # Export cookies from current session');
    console.log('  npm run linkedin:cookies -- --import  # Import cookies to Chrome profile');
    console.log('  npm run linkedin:cookies -- --test     # Test session persistence');
    console.log('');
    console.log('Steps:');
    console.log('1. Log into LinkedIn manually in Chrome');
    console.log('2. Run --export to save cookies');
    console.log('3. Run --test to verify persistence');
    console.log('4. Use persistent profile for automated fetching');
  }
}

main().catch(console.error);

export default LinkedInCookieManager;
