# Bigs & Littles Matcher

A simple web application for matching World Team (Bigs) with A Team (Littles) based on ranked preferences.

## Features

- **Preference Submission Form**: A Team members can submit their top 5 World Team preferences
- **Ranked Choice**: Prevents conflicts by allowing members to rank their choices
- **Admin Dashboard**: View all submissions, detect conflicts, and manage existing matches
- **CSV Export**: Download all preference data for analysis
- **Existing Matches**: Track World Team members who are already claimed

## How to Use

### For A Team Members (Littles)

1. Open `index.html` in your web browser
2. Select your name from the dropdown
3. Rank your top 5 World Team members in order of preference
4. Click "Submit Preferences"

### For Admins

1. Click "Admin View" or open `admin.html`
2. View all submissions in the "All Preferences" tab
3. Check the "Conflicts" tab to see which Bigs have multiple requests
4. Use the "Existing Matches" tab to mark World Team members who are already claimed
5. Export data to CSV for further analysis

## Deployment

### GitHub Pages (Free!)

1. Push this repository to GitHub
2. Go to your repository Settings
3. Navigate to Pages section
4. Select "main" branch as source
5. Your site will be live at `https://yourusername.github.io/BigsNLittles/`

### Local Use

Simply open `index.html` in any modern web browser. All data is stored in the browser's localStorage.

## Technical Details

- **Pure HTML/CSS/JavaScript** - No server required
- **Client-side storage** - Uses localStorage for data persistence
- **Responsive design** - Works on mobile and desktop
- **No dependencies** - No frameworks or libraries needed

## Team Structure

- **World Team**: 51 members (Bigs)
- **A Team**: 35 members (Littles)
- Multiple Littles can have the same Big

## Files

- `index.html` - Main preference submission form
- `admin.html` - Admin dashboard
- `app.js` - Form logic
- `admin.js` - Admin functionality
- `styles.css` - All styling
- `data/` - Team rosters and data storage

## Notes

- Data persists in browser localStorage
- Submissions can be updated by resubmitting
- Already-claimed Bigs are highlighted in the admin view
- Conflicts are automatically detected and displayed

## License

Free to use and modify for your color guard teams!
