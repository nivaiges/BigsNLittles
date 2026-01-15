# Google Sheets Backend Setup Guide

This guide will help you set up Google Sheets as the backend database for the Bigs & Littles Matcher.

## Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Bigs and Littles Preferences"
4. Create two sheets (tabs at the bottom):
   - **Preferences** - for storing Big submissions
   - **ExistingMatches** - for storing locked pairings

### Preferences Sheet Setup
Add these column headers in row 1:
- A1: `Timestamp`
- B1: `Big ID`
- C1: `Big Name`
- D1: `1st Choice ID`
- E1: `1st Choice Name`
- F1: `2nd Choice ID`
- G1: `2nd Choice Name`
- H1: `3rd Choice ID`
- I1: `3rd Choice Name`
- J1: `4th Choice ID`
- K1: `4th Choice Name`
- L1: `5th Choice ID`
- M1: `5th Choice Name`

### ExistingMatches Sheet Setup
Add these column headers in row 1:
- A1: `Little ID`
- B1: `Little Name`
- C1: `Big Name`

## Step 2: Create Google Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any existing code
3. Paste the code from `google-apps-script.js` (see below)
4. Click **Deploy** → **New deployment**
5. Click the gear icon ⚙️ next to "Select type"
6. Choose **Web app**
7. Configure:
   - **Description**: "Bigs & Littles API"
   - **Execute as**: Me
   - **Who has access**: Anyone
8. Click **Deploy**
9. **Copy the Web App URL** - you'll need this!

## Step 3: Update Your Application

1. Open `config.js` in your project
2. Replace `YOUR_SCRIPT_URL_HERE` with the Web App URL you copied
3. Save the file

## Step 4: Test It!

1. Open `index.html` in your browser
2. Submit a test preference
3. Check your Google Sheet - the data should appear!
4. Open the admin panel and verify you can see the submission

## Troubleshooting

### "Authorization required" error
- Make sure you clicked "Authorize" when deploying the script
- The first time someone submits, you may need to authorize the script

### Data not appearing
- Check the browser console for errors
- Verify the Web App URL is correct in `config.js`
- Make sure the sheet names match exactly: "Preferences" and "ExistingMatches"

### Permission errors
- Make sure "Who has access" is set to "Anyone" in deployment settings
- Re-deploy if needed

## Security Note

This setup allows anyone with the URL to submit data. For added security, you could:
1. Keep the GitHub Pages URL private
2. Add password protection to the admin panel
3. Use Google Sheets API with OAuth (more complex)

## Need Help?

If you run into issues, check:
1. Google Apps Script execution logs: **Executions** tab in Apps Script
2. Browser console for JavaScript errors
3. Make sure the Google Sheet is not view-only
