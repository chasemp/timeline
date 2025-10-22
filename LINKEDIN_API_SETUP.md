# LinkedIn API Setup Guide

This guide walks you through setting up LinkedIn API access for automated activity fetching.

## Step 1: Create LinkedIn App

1. **Visit LinkedIn Developers**: https://www.linkedin.com/developers/
2. **Create New App**:
   - App name: `Timeline Activity Fetcher`
   - LinkedIn Page: Select your personal page
   - App logo: Upload a simple logo
   - Legal agreement: Accept terms

3. **Get Credentials**:
   - Copy `Client ID` and `Client Secret`
   - Note the `Redirect URL` (default: `http://localhost:3000/callback`)

## Step 2: Configure OAuth Scopes

In your LinkedIn app settings, request these scopes:
- `r_liteprofile` - Read basic profile info
- `r_emailaddress` - Read email address
- `w_member_social` - Write social actions (if needed)

## Step 3: Set Up Environment Variables

Add to your `.env` file:
```bash
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3000/callback
```

## Step 4: Authorize Your App

1. **Run the authorization helper**:
   ```bash
   cd astro
   npm run fetch:linkedin-api
   ```

2. **Visit the generated URL** (will be printed in console)

3. **Complete LinkedIn authorization**

4. **Copy the authorization code** from the callback URL

5. **Exchange code for tokens** (script will handle this)

## Step 5: GitHub Actions Setup

### Add Secrets to Repository

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `LINKEDIN_CLIENT_ID`: Your LinkedIn app client ID
- `LINKEDIN_CLIENT_SECRET`: Your LinkedIn app client secret
- `LINKEDIN_ACCESS_TOKEN`: Your access token (from Step 4)
- `LINKEDIN_REFRESH_TOKEN`: Your refresh token (from Step 4)

### Update GitHub Actions Workflow

The workflow will automatically:
- Use stored tokens from secrets
- Refresh tokens when they expire
- Fetch your LinkedIn activity
- Commit changes to repository

## Step 6: Test Locally

```bash
# Test API connection
cd astro
npm run fetch:linkedin-api

# Test full data generation
npm run generate
```

## Important Notes

### LinkedIn API Limitations

⚠️ **LinkedIn API has limited access to personal posts**:
- Cannot fetch your own feed posts directly
- Focuses on company pages and public content
- Personal activity is restricted for privacy

### Alternative Approaches

If LinkedIn API doesn't meet your needs:

1. **LinkedIn Data Export** (GDPR):
   - Request your data from LinkedIn
   - Download as JSON/CSV
   - Process with custom scripts

2. **RSS Feeds** (if available):
   - Some LinkedIn profiles have RSS
   - Use RSS parsing libraries

3. **Hybrid Approach**:
   - Use API for profile info
   - Use Selenium for activity (with proper authorization)
   - Store session cookies as GitHub secrets

### Token Management

- **Access tokens**: Expire in 60 days
- **Refresh tokens**: Can be used to get new access tokens
- **Automatic refresh**: Script handles token renewal
- **GitHub secrets**: Store tokens securely

## Troubleshooting

### Common Issues

1. **"Invalid client"**: Check client ID/secret
2. **"Invalid redirect URI"**: Ensure redirect URI matches exactly
3. **"Insufficient permissions"**: Check OAuth scopes
4. **"Token expired"**: Refresh token automatically

### Getting Help

- LinkedIn API Documentation: https://docs.microsoft.com/en-us/linkedin/
- LinkedIn Developer Support: https://www.linkedin.com/help/linkedin
- GitHub Issues: Create issue in this repository

## Security Best Practices

- ✅ Store credentials in GitHub secrets
- ✅ Use environment variables locally
- ✅ Never commit tokens to repository
- ✅ Rotate tokens regularly
- ✅ Monitor API usage limits
- ✅ Use HTTPS for all requests

