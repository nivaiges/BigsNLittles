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

    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('addMatchBtn').addEventListener('click', addExistingMatch);
    document.getElementById('lockAllUncontestedBtn').addEventListener('click', lockAllUncontested);

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
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content visibility
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
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

    if (preferences.length === 0) {
        container.innerHTML = '<p class="empty-state">No preferences submitted yet.</p>';
        return;
    }

    // Sort by timestamp (most recent first)
    const sortedPrefs = [...preferences].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    let html = '<div class="preferences-list">';

    sortedPrefs.forEach(pref => {
        html += `
            <div class="preference-card">
                <h3>${pref.bigName}</h3>
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

    // Filter to only show Littles with exactly one request and not already claimed
    const uncontested = Object.entries(littleCounts)
        .filter(([name, data]) => data.requests.length === 1 && !isAlreadyClaimed(name))
        .sort((a, b) => a[0].localeCompare(b[0]));

    if (uncontested.length === 0) {
        container.innerHTML = '<p class="empty-state">No uncontested pairings. Either all Littles have multiple requests or are already claimed.</p>';
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
    if (confirm(`Lock in this pairing?\n${bigName} → ${littleName}`)) {
        const newMatch = {
            littleName: littleName,
            bigName: bigName
        };

        existingMatches.push(newMatch);

        // Save to Google Sheets
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addExistingMatch',
                    ...newMatch
                })
            });
        } catch (error) {
            console.error('Error saving to Google Sheets:', error);
            localStorage.setItem('existingMatches', JSON.stringify({ matches: existingMatches }));
        }

        // Refresh all displays
        updateStatistics();
        displayUncontested();
        displayConflicts();
        displayAllPreferences();
        displayExistingMatches();
    }
}

// Lock all uncontested pairings at once
async function lockAllUncontested() {
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

    // Get all uncontested pairings
    const uncontested = Object.entries(littleCounts)
        .filter(([name, data]) => data.requests.length === 1 && !isAlreadyClaimed(name));

    if (uncontested.length === 0) {
        alert('No uncontested pairings to lock in.');
        return;
    }

    if (confirm(`Lock in all ${uncontested.length} uncontested pairing(s)?`)) {
        const newMatches = [];
        uncontested.forEach(([littleName, data]) => {
            const request = data.requests[0];
            const newMatch = {
                littleName: littleName,
                bigName: request.bigName
            };
            existingMatches.push(newMatch);
            newMatches.push(newMatch);
        });

        // Save to Google Sheets
        try {
            for (const match of newMatches) {
                await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'addExistingMatch',
                        ...match
                    })
                });
            }
        } catch (error) {
            console.error('Error saving to Google Sheets:', error);
            localStorage.setItem('existingMatches', JSON.stringify({ matches: existingMatches }));
        }

        // Refresh all displays
        updateStatistics();
        displayUncontested();
        displayConflicts();
        displayAllPreferences();
        displayExistingMatches();

        alert(`Successfully locked in ${uncontested.length} pairing(s)!`);
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

    existingMatches.push(newMatch);

    // Save to Google Sheets
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'addExistingMatch',
                ...newMatch
            })
        });
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        localStorage.setItem('existingMatches', JSON.stringify({ matches: existingMatches }));
    }

    // Reset form
    littleSelect.value = '';
    bigSelect.value = '';

    // Refresh displays
    updateStatistics();
    displayExistingMatches();
    displayAllPreferences();
    displayConflicts();
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
