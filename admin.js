// Admin dashboard logic

let aTeam = [];
let worldTeam = [];
let preferences = [];
let existingMatches = [];

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    populateExistingBigDropdown();
    updateStatistics();
    displayAllPreferences();
    displayRemainingWorldTeam();
    displayUncontested();
    displayConflicts();
    displayExistingMatches();
    setupEventListeners();
});

// Load all JSON data
async function loadData() {
    try {
        const [aTeamData, worldTeamData] = await Promise.all([
            fetch('data/a-team.json').then(r => r.json()),
            fetch('data/world-team.json').then(r => r.json())
        ]);

        aTeam = aTeamData;
        worldTeam = worldTeamData;

        // Load preferences from Google Sheets
        try {
            const prefsResponse = await fetch(`${GOOGLE_SCRIPT_URL}?action=getPreferences`);
            const prefsData = await prefsResponse.json();
            preferences = prefsData.submissions || [];
        } catch (error) {
            console.error('Error loading preferences from Google Sheets:', error);
            // Fallback to localStorage
            const storedPrefs = localStorage.getItem('preferences');
            if (storedPrefs) {
                const data = JSON.parse(storedPrefs);
                preferences = data.submissions || [];
            }
        }

        // Load existing matches from Google Sheets
        try {
            const matchesResponse = await fetch(`${GOOGLE_SCRIPT_URL}?action=getExistingMatches`);
            const matchesData = await matchesResponse.json();
            existingMatches = matchesData.matches || [];
        } catch (error) {
            console.error('Error loading matches from Google Sheets:', error);
            // Fallback to localStorage
            const storedMatches = localStorage.getItem('existingMatches');
            if (storedMatches) {
                const data = JSON.parse(storedMatches);
                existingMatches = data.matches || [];
            }
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('addMatchBtn').addEventListener('click', addExistingMatch);
    document.getElementById('randomMatchBtn').addEventListener('click', randomMatchPicker);

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Update button states
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Update content visibility
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const activeTab = document.getElementById(`${tabName}Tab`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

// Update statistics
function updateStatistics() {
    const uniqueSubmitters = new Set(preferences.map(p => p.bigName)).size;
    const remaining = worldTeam.length - uniqueSubmitters;

    document.getElementById('totalSubmissions').textContent = uniqueSubmitters;
    document.getElementById('remainingLittles').textContent = remaining;
    document.getElementById('existingMatches').textContent = existingMatches.length;
}

// Display all preferences
function displayAllPreferences() {
    const container = document.getElementById('preferencesList');

    let html = '';

    // Display existing matches first
    if (existingMatches.length > 0) {
        html += '<div class="matches-section" style="margin-bottom: 30px;">';
        html += '<h2 style="color: #28a745; margin-bottom: 15px;">Locked Matches</h2>';

        // Group matches by Big
        const matchesByBig = {};
        existingMatches.forEach(match => {
            if (!matchesByBig[match.bigName]) {
                matchesByBig[match.bigName] = [];
            }
            matchesByBig[match.bigName].push(match.littleName);
        });

        html += '<div class="preferences-list">';
        Object.entries(matchesByBig).sort((a, b) => a[0].localeCompare(b[0])).forEach(([bigName, littles]) => {
            html += `
                <div class="preference-card" style="border-left-color: #28a745; background: #f0f9f4;">
                    <h3>${bigName} <span style="color: #28a745; font-size: 0.8em;">(Matched)</span></h3>
                    <ul class="choices-list" style="list-style: none; padding-left: 0;">
                        ${littles.map(littleName => `
                            <li style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                                <strong>Matched with:</strong> ${littleName}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        });
        html += '</div>';
        html += '</div>';
    }

    // Display preferences
    if (preferences.length === 0) {
        html += '<p class="empty-state">No preferences submitted yet.</p>';
        container.innerHTML = html;
        return;
    }

    html += '<h2 style="color: #667eea; margin-bottom: 15px;">Preference Submissions</h2>';

    // Sort by timestamp (most recent first)
    const sortedPrefs = [...preferences].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    html += '<div class="preferences-list">';

    sortedPrefs.forEach(pref => {
        // Check if this Big already has a match
        const hasMatch = existingMatches.some(match => match.bigName === pref.bigName);

        html += `
            <div class="preference-card ${hasMatch ? 'has-match' : ''}">
                <h3>${pref.bigName} ${hasMatch ? '<span style="color: #28a745; font-size: 0.8em;">(Already Matched)</span>' : ''}</h3>
                <p class="timestamp">Submitted: ${new Date(pref.timestamp).toLocaleString()}</p>
                <ol class="choices-list">
                    ${pref.choices.map(choice => `
                        <li>
                            <strong>${choice.rank}${getOrdinalSuffix(choice.rank)} Choice:</strong> ${choice.littleName}
                            ${isAlreadyClaimed(choice.littleName) ? '<span class="claimed-badge">Already Claimed</span>' : ''}
                        </li>
                    `).join('')}
                </ol>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Display remaining World Team members who haven't submitted
function displayRemainingWorldTeam() {
    const container = document.getElementById('remainingList');

    // Get list of World Team members who have already submitted
    const submitted = new Set(preferences.map(p => p.bigName));

    // Filter to only show those who haven't submitted
    const remaining = worldTeam.filter(member => !submitted.has(member.name));

    if (remaining.length === 0) {
        container.innerHTML = '<p class="empty-state">All World Team members have submitted their preferences!</p>';
        return;
    }

    let html = '<div class="remaining-list">';
    html += `<p class="remaining-count">${remaining.length} World Team member(s) have not submitted yet</p>`;
    html += '<ul class="remaining-members">';

    remaining.forEach(member => {
        html += `<li>${member.name}</li>`;
    });

    html += '</ul></div>';
    container.innerHTML = html;
}

// Display uncontested pairings (Littles with only one request)
function displayUncontested() {
    const container = document.getElementById('uncontestedList');

    // Count how many times each Little was requested
    const littleCounts = {};

    preferences.forEach(pref => {
        pref.choices.forEach(choice => {
            if (!littleCounts[choice.littleName]) {
                littleCounts[choice.littleName] = {
                    requests: []
                };
            }
            littleCounts[choice.littleName].requests.push({
                bigName: pref.bigName,
                rank: choice.rank
            });
        });
    });

    // Filter to only show Littles with exactly one request, not already claimed, and Big doesn't have a match
    const uncontested = Object.entries(littleCounts)
        .filter(([name, data]) => {
            const littleNotClaimed = !isAlreadyClaimed(name);
            const bigNotMatched = !existingMatches.some(match => match.bigName === data.requests[0].bigName);
            return data.requests.length === 1 && littleNotClaimed && bigNotMatched;
        })
        .sort((a, b) => a[0].localeCompare(b[0]));

    if (uncontested.length === 0) {
        container.innerHTML = '<p class="empty-state">No uncontested pairings. Either all Littles have multiple requests, are already claimed, or the requesting Bigs already have matches.</p>';
        return;
    }

    let html = '<div class="uncontested-list">';
    html += `<p class="uncontested-count">${uncontested.length} uncontested pairing(s) ready to lock in</p>`;

    uncontested.forEach(([littleName, data]) => {
        const request = data.requests[0];
        html += `
            <div class="uncontested-card" data-little-name="${littleName}" data-big-name="${request.bigName}">
                <div class="pairing-info">
                    <div class="pairing-big">
                        <strong>Big:</strong> ${request.bigName}
                    </div>
                    <div class="pairing-arrow">→</div>
                    <div class="pairing-little">
                        <strong>Little:</strong> ${littleName}
                    </div>
                    <div class="pairing-rank">(${request.rank}${getOrdinalSuffix(request.rank)} choice)</div>
                </div>
                <button class="btn-lock" onclick="lockSinglePairing('${littleName.replace(/'/g, "\\'")}', '${request.bigName.replace(/'/g, "\\'")}')">
                    Lock In
                </button>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Lock a single uncontested pairing
async function lockSinglePairing(littleName, bigName) {
    // Check if Big already has a match
    const bigAlreadyMatched = existingMatches.some(match => match.bigName === bigName);
    if (bigAlreadyMatched) {
        alert(`${bigName} already has a match and cannot be locked in with another Little.`);
        return;
    }

    // Check if Little is already claimed
    if (isAlreadyClaimed(littleName)) {
        alert(`${littleName} is already claimed and cannot be matched again.`);
        return;
    }

    if (!confirm(`Lock in this pairing?\n${bigName} → ${littleName}`)) {
        return;
    }

    const newMatch = {
        littleName: littleName,
        bigName: bigName
    };

    try {
        // Save to Google Sheets first
        console.log('Locking pairing, sending to Google Sheets:', newMatch);
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'addExistingMatch',
                ...newMatch
            })
        });

        console.log('Successfully saved to Google Sheets, reloading data...');

        // Reload data from Google Sheets to get the latest state
        await reloadMatchesFromSheets();

        console.log('Data reloaded from Google Sheets');

        // Refresh all displays
        updateStatistics();
        displayRemainingWorldTeam();
        displayUncontested();
        displayConflicts();
        displayAllPreferences();
        displayExistingMatches();

        alert(`Match locked in successfully!\n${bigName} → ${littleName}`);
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        alert('Error saving match to Google Sheets. Please try again.');
    }
}

// Reload existing matches from Google Sheets
async function reloadMatchesFromSheets() {
    try {
        const matchesResponse = await fetch(`${GOOGLE_SCRIPT_URL}?action=getExistingMatches`);
        const matchesData = await matchesResponse.json();
        existingMatches = matchesData.matches || [];
        console.log('Reloaded matches:', existingMatches);
    } catch (error) {
        console.error('Error reloading matches from Google Sheets:', error);
        // Fallback to localStorage
        const storedMatches = localStorage.getItem('existingMatches');
        if (storedMatches) {
            const data = JSON.parse(storedMatches);
            existingMatches = data.matches || [];
        }
    }
}

// Random match picker with smart selection
function randomMatchPicker() {
    // Get World Team members who haven't submitted yet
    const submitted = new Set(preferences.map(p => p.bigName));
    const remainingBigs = worldTeam.filter(member => !submitted.has(member.name));

    if (remainingBigs.length === 0) {
        alert('All World Team members have already submitted their preferences!');
        return;
    }

    // Count how many Bigs each Little already has
    const littleMatchCounts = {};
    aTeam.forEach(member => {
        littleMatchCounts[member.name] = 0;
    });

    existingMatches.forEach(match => {
        if (littleMatchCounts.hasOwnProperty(match.littleName)) {
            littleMatchCounts[match.littleName]++;
        }
    });

    // Priority 1: Littles with 0 matches
    let availableLittles = aTeam.filter(member => littleMatchCounts[member.name] === 0);

    // Priority 2: If everyone has at least 1 match, select Littles with only 1 match (not yet 2)
    if (availableLittles.length === 0) {
        availableLittles = aTeam.filter(member => littleMatchCounts[member.name] < 2);
    }

    if (availableLittles.length === 0) {
        alert('All A Team members already have 2 Bigs assigned!');
        return;
    }

    // Randomly select a Big and a Little
    const randomBig = remainingBigs[Math.floor(Math.random() * remainingBigs.length)];
    const randomLittle = availableLittles[Math.floor(Math.random() * availableLittles.length)];

    // Show confirmation
    if (confirm(`Random Match:\n\nBig: ${randomBig.name}\nLittle: ${randomLittle.name}\n\nLock in this pairing?`)) {
        const newMatch = {
            littleName: randomLittle.name,
            bigName: randomBig.name
        };

        existingMatches.push(newMatch);

        // Save to Google Sheets
        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'addExistingMatch',
                ...newMatch
            })
        }).catch(error => {
            console.error('Error saving to Google Sheets:', error);
            localStorage.setItem('existingMatches', JSON.stringify({ matches: existingMatches }));
        });

        // Refresh all displays
        updateStatistics();
        displayRemainingWorldTeam();
        displayUncontested();
        displayConflicts();
        displayAllPreferences();
        displayExistingMatches();

        alert(`Match created!\n${randomBig.name} → ${randomLittle.name}`);
    }
}

// Display conflicts (popular Littles)
function displayConflicts() {
    const container = document.getElementById('conflictsList');

    // Count how many times each Little was requested
    const littleCounts = {};

    preferences.forEach(pref => {
        pref.choices.forEach(choice => {
            if (!littleCounts[choice.littleName]) {
                littleCounts[choice.littleName] = {
                    requests: []
                };
            }
            littleCounts[choice.littleName].requests.push({
                bigName: pref.bigName,
                rank: choice.rank
            });
        });
    });

    // Filter to only show Littles with multiple requests
    const conflicts = Object.entries(littleCounts)
        .filter(([name, data]) => data.requests.length > 1)
        .sort((a, b) => b[1].requests.length - a[1].requests.length);

    if (conflicts.length === 0) {
        container.innerHTML = '<p class="empty-state">No conflicts yet. Each Little has at most one request.</p>';
        return;
    }

    let html = '<div class="conflicts-list">';

    conflicts.forEach(([littleName, data]) => {
        const isClaimed = isAlreadyClaimed(littleName);
        html += `
            <div class="conflict-card ${isClaimed ? 'claimed' : ''}">
                <h3>${littleName} ${isClaimed ? '(Already Claimed)' : ''}</h3>
                <p class="conflict-count">${data.requests.length} Bigs want this Little</p>
                <ul class="requesters-list">
                    ${data.requests
                        .sort((a, b) => a.rank - b.rank)
                        .map(req => `
                            <li>${req.bigName} - ${req.rank}${getOrdinalSuffix(req.rank)} choice</li>
                        `).join('')}
                </ul>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Populate existing match dropdowns
function populateExistingBigDropdown() {
    const littleSelect = document.getElementById('existingLittle');
    const bigSelect = document.getElementById('existingBig');

    // Populate A Team (Littles) dropdown
    aTeam.forEach(member => {
        const option = document.createElement('option');
        option.value = member.name;
        option.textContent = member.name;
        littleSelect.appendChild(option);
    });

    // Populate World Team (Bigs) dropdown
    worldTeam.forEach(member => {
        const option = document.createElement('option');
        option.value = member.name;
        option.textContent = member.name;
        bigSelect.appendChild(option);
    });
}

// Display existing matches
function displayExistingMatches() {
    const container = document.getElementById('existingMatchesList');

    if (existingMatches.length === 0) {
        container.innerHTML = '<p class="empty-state">No existing matches recorded.</p>';
        return;
    }

    let html = '<div class="existing-matches-list"><h3>Current Matches</h3>';

    existingMatches.forEach((match, index) => {
        html += `
            <div class="match-item">
                <span class="match-info">${match.bigName} ↔ ${match.littleName}</span>
                <button class="btn-remove" onclick="removeMatch(${index})">Remove</button>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Add existing match
async function addExistingMatch() {
    const littleSelect = document.getElementById('existingLittle');
    const bigSelect = document.getElementById('existingBig');

    const littleName = littleSelect.value;
    const bigName = bigSelect.value;

    if (!littleName || !bigName) {
        alert('Please select both a Little and a Big.');
        return;
    }

    const newMatch = {
        littleName,
        bigName
    };

    console.log('Adding match:', newMatch);
    existingMatches.push(newMatch);

    // Save to Google Sheets
    try {
        console.log('Sending to Google Sheets:', GOOGLE_SCRIPT_URL);
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'addExistingMatch',
                ...newMatch
            })
        });
        console.log('Successfully sent to Google Sheets');
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        localStorage.setItem('existingMatches', JSON.stringify({ matches: existingMatches }));
    }

    // Reset form
    littleSelect.value = '';
    bigSelect.value = '';

    // Refresh displays
    updateStatistics();
    displayRemainingWorldTeam();
    displayUncontested();
    displayExistingMatches();
    displayAllPreferences();
    displayConflicts();

    alert('Match added successfully!');
}

// Remove existing match
async function removeMatch(index) {
    if (confirm('Remove this existing match?')) {
        const matchToRemove = existingMatches[index];
        existingMatches.splice(index, 1);

        // Remove from Google Sheets
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'removeExistingMatch',
                    littleName: matchToRemove.littleName,
                    bigName: matchToRemove.bigName
                })
            });
        } catch (error) {
            console.error('Error removing from Google Sheets:', error);
            localStorage.setItem('existingMatches', JSON.stringify({ matches: existingMatches }));
        }

        updateStatistics();
        displayRemainingWorldTeam();
        displayExistingMatches();
        displayAllPreferences();
        displayConflicts();
    }
}

// Check if a Little is already claimed
function isAlreadyClaimed(littleName) {
    return existingMatches.some(match => match.littleName === littleName);
}

// Get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

// Copy matches to clipboard in readable format
async function copyToClipboard() {
    if (existingMatches.length === 0) {
        alert('No matches to copy yet.');
        return;
    }

    // Group matches by Little
    const matchesByLittle = {};
    existingMatches.forEach(match => {
        if (!matchesByLittle[match.littleName]) {
            matchesByLittle[match.littleName] = [];
        }
        matchesByLittle[match.littleName].push(match.bigName);
    });

    // Sort by Little name
    const sortedLittles = Object.keys(matchesByLittle).sort();

    // Build formatted text
    let text = 'Bigs n Littles 2026:\n';
    sortedLittles.forEach((littleName, index) => {
        const bigs = matchesByLittle[littleName];
        const bigsText = bigs.join(', ');
        text += `${index + 1}. ${bigsText}, ${littleName}\n`;
    });

    // Copy to clipboard
    try {
        await navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            alert('Copied to clipboard!');
        } catch (err) {
            alert('Failed to copy to clipboard. Please try again.');
        }
        document.body.removeChild(textArea);
    }
}

// Export to CSV
function exportToCSV() {
    if (preferences.length === 0) {
        alert('No data to export.');
        return;
    }

    let csv = 'Big Name,1st Choice,2nd Choice,3rd Choice,4th Choice,5th Choice,Submission Time\n';

    preferences.forEach(pref => {
        const choices = pref.choices.map(c => c.littleName);
        while (choices.length < 5) choices.push('');

        const row = [
            pref.bigName,
            ...choices,
            new Date(pref.timestamp).toLocaleString()
        ].map(field => `"${field}"`).join(',');

        csv += row + '\n';
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bigs-littles-preferences-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
