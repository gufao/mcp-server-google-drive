#!/usr/bin/env node

/**
 * Google OAuth 2.0 Refresh Token Generator
 * This script helps you generate a refresh token for Google Drive API access
 */

import { google } from 'googleapis';
import readline from 'readline';

console.log('='.repeat(70));
console.log('Google Drive OAuth 2.0 Refresh Token Generator');
console.log('='.repeat(70));
console.log();

// Get credentials from command line arguments or prompt
const args = process.argv.slice(2);
let CLIENT_ID = args[0];
let CLIENT_SECRET = args[1];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log('Usage: node get-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>');
  console.log();
  console.log('Example:');
  console.log('  node get-refresh-token.mjs "123456.apps.googleusercontent.com" "your-secret"');
  console.log();
  console.log('You will get these credentials from Google Cloud Console.');
  console.log('See the instructions above for how to create them.');
  console.log();
  process.exit(1);
}

const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

try {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent screen to get refresh token
  });

  console.log('Step 1: Open this URL in your browser:');
  console.log();
  console.log(url);
  console.log();
  console.log('Step 2: Sign in with your Google account');
  console.log('Step 3: Grant the requested permissions');
  console.log('Step 4: Copy the authorization code from the browser');
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the authorization code here: ', async (code) => {
    rl.close();

    try {
      const { tokens } = await oauth2Client.getToken(code);

      console.log();
      console.log('='.repeat(70));
      console.log('SUCCESS! Here are your credentials:');
      console.log('='.repeat(70));
      console.log();
      console.log('CLIENT_ID:', CLIENT_ID);
      console.log('CLIENT_SECRET:', CLIENT_SECRET);
      console.log('REFRESH_TOKEN:', tokens.refresh_token);
      console.log();
      console.log('='.repeat(70));
      console.log('Next Steps:');
      console.log('='.repeat(70));
      console.log();
      console.log('Run these commands to store the credentials:');
      console.log();
      console.log(`docker mcp secret set GOOGLE_CLIENT_ID="${CLIENT_ID}"`);
      console.log(`docker mcp secret set GOOGLE_CLIENT_SECRET="${CLIENT_SECRET}"`);
      console.log(`docker mcp secret set GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);
      console.log();
    } catch (error) {
      console.error();
      console.error('❌ Error getting tokens:', error.message);
      console.error();
      console.error('Common issues:');
      console.error('  - Invalid authorization code (codes expire quickly, try again)');
      console.error('  - Wrong CLIENT_ID or CLIENT_SECRET');
      console.error('  - OAuth consent screen not configured properly');
      console.error();
      process.exit(1);
    }
  });
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
