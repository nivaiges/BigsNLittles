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
    displayConflicts();
    displayExistingMatches();
    setupEventListeners();
});

// Load all JSON data
async function loadData() {
    try {
        const [aTeamData, worldTeamData, matchesData] = await Promise.all([
            fetch('data/a-team.json').then(r => r.json()),
            fetch('data/world-team.json').then(r => r.json()),
            fetch('data/existing-matches.json').then(r => r.json())
        ]);

        aTeam = aTeamData;
        worldTeam = worldTeamData;
        existingMatches = matchesData.matches || [];

        // Load preferences from localStorage
        const storedPrefs = localStorage.getItem('preferences');
        if (storedPrefs) {
            const data = JSON.parse(storedPrefs);
            preferences = data.submissions || [];
        }

        // Load existing matches from localStorage
        const storedMatches = localStorage.getItem('existingMatches');
        if (storedMatches) {
            const data = JSON.parse(storedMatches);
            existingMatches = data.matches || [];
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
    const uniqueSubmitters = new Set(preferences.map(p => p.littleId)).size;
    const remaining = aTeam.length - uniqueSubmitters;

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
                <h3>${pref.littleName}</h3>
                <p class="timestamp">Submitted: ${new Date(pref.timestamp).toLocaleString()}</p>
                <ol class="choices-list">
                    ${pref.choices.map(choice => `
                        <li>
                            <strong>${choice.rank}${getOrdinalSuffix(choice.rank)} Choice:</strong> ${choice.bigName}
                            ${isAlreadyClaimed(choice.bigId) ? '<span class="claimed-badge">Already Claimed</span>' : ''}
                        </li>
                    `).join('')}
                </ol>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Display conflicts (popular Bigs)
function displayConflicts() {
    const container = document.getElementById('conflictsList');

    // Count how many times each Big was requested
    const bigCounts = {};

    preferences.forEach(pref => {
        pref.choices.forEach(choice => {
            if (!bigCounts[choice.bigId]) {
                bigCounts[choice.bigId] = {
                    name: choice.bigName,
                    requests: []
                };
            }
            bigCounts[choice.bigId].requests.push({
                littleName: pref.littleName,
                rank: choice.rank
            });
        });
    });

    // Filter to only show Bigs with multiple requests
    const conflicts = Object.entries(bigCounts)
        .filter(([id, data]) => data.requests.length > 1)
        .sort((a, b) => b[1].requests.length - a[1].requests.length);

    if (conflicts.length === 0) {
        container.innerHTML = '<p class="empty-state">No conflicts yet. Each Big has at most one request.</p>';
        return;
    }

    let html = '<div class="conflicts-list">';

    conflicts.forEach(([bigId, data]) => {
        const isClaimed = isAlreadyClaimed(parseInt(bigId));
        html += `
            <div class="conflict-card ${isClaimed ? 'claimed' : ''}">
                <h3>${data.name} ${isClaimed ? '(Already Claimed)' : ''}</h3>
                <p class="conflict-count">${data.requests.length} people want this Big</p>
                <ul class="requesters-list">
                    ${data.requests
                        .sort((a, b) => a.rank - b.rank)
                        .map(req => `
                            <li>${req.littleName} - ${req.rank}${getOrdinalSuffix(req.rank)} choice</li>
                        `).join('')}
                </ul>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Populate existing Big dropdown
function populateExistingBigDropdown() {
    const select = document.getElementById('existingBig');

    worldTeam.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        select.appendChild(option);
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
function addExistingMatch() {
    const bigId = parseInt(document.getElementById('existingBig').value);
    const littleName = document.getElementById('existingLittle').value.trim();

    if (!bigId || !littleName) {
        alert('Please select a Big and enter a Little name.');
        return;
    }

    const bigName = worldTeam.find(m => m.id === bigId)?.name;

    existingMatches.push({
        bigId,
        bigName,
        littleName
    });

    // Save to localStorage
    localStorage.setItem('existingMatches', JSON.stringify({ matches: existingMatches }));

    // Reset form
    document.getElementById('existingBig').value = '';
    document.getElementById('existingLittle').value = '';

    // Refresh displays
    updateStatistics();
    displayExistingMatches();
    displayAllPreferences();
    displayConflicts();
}

// Remove existing match
function removeMatch(index) {
    if (confirm('Remove this existing match?')) {
        existingMatches.splice(index, 1);
        localStorage.setItem('existingMatches', JSON.stringify({ matches: existingMatches }));

        updateStatistics();
        displayExistingMatches();
        displayAllPreferences();
        displayConflicts();
    }
}

// Check if a Big is already claimed
function isAlreadyClaimed(bigId) {
    return existingMatches.some(match => match.bigId === bigId);
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

    let csv = 'Little Name,1st Choice,2nd Choice,3rd Choice,4th Choice,5th Choice,Submission Time\n';

    preferences.forEach(pref => {
        const choices = pref.choices.map(c => c.bigName);
        while (choices.length < 5) choices.push('');

        const row = [
            pref.littleName,
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
