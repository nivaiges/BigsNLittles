// Main application logic for preference submission

let aTeam = [];
let worldTeam = [];
let preferences = [];
let existingMatches = [];

// Load data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    populateDropdowns();
    setupEventListeners();
});

// Load all JSON data
async function loadData() {
    try {
        const [aTeamData, worldTeamData, preferencesData, matchesData] = await Promise.all([
            fetch('data/a-team.json').then(r => r.json()),
            fetch('data/world-team.json').then(r => r.json()),
            fetch('data/preferences.json').then(r => r.json()),
            fetch('data/existing-matches.json').then(r => r.json())
        ]);

        aTeam = aTeamData;
        worldTeam = worldTeamData;
        preferences = preferencesData.submissions || [];
        existingMatches = matchesData.matches || [];
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Please make sure all data files are present.');
    }
}

// Populate dropdowns with team members
function populateDropdowns() {
    const bigSelect = document.getElementById('bigName');
    const littleSelects = document.querySelectorAll('.little-choice');

    // Populate World Team (Bigs) dropdown
    worldTeam.forEach(member => {
        const option = document.createElement('option');
        option.value = member.name;
        option.textContent = member.name;
        bigSelect.appendChild(option);
    });

    // Populate A Team (Littles) dropdowns
    littleSelects.forEach(select => {
        aTeam.forEach(member => {
            const option = document.createElement('option');
            option.value = member.name;
            option.textContent = member.name;
            select.appendChild(option);
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    const form = document.getElementById('preferenceForm');
    const adminBtn = document.getElementById('viewAdminBtn');

    form.addEventListener('submit', handleSubmit);
    adminBtn.addEventListener('click', () => {
        window.location.href = 'admin.html';
    });

    // Prevent selecting the same Little multiple times
    const littleSelects = document.querySelectorAll('.little-choice');
    littleSelects.forEach((select, index) => {
        select.addEventListener('change', () => {
            handleNoPreference(index);
            validateUniqueChoices();
        });
    });

    // Secret admin access via triple-click on ampersand
    const ampersand = document.getElementById('ampersand');
    if (ampersand) {
        let clickCount = 0;
        let clickTimer = null;

        ampersand.addEventListener('click', () => {
            clickCount++;

            if (clickCount === 1) {
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                }, 500); // Reset after 500ms
            }

            if (clickCount === 3) {
                clearTimeout(clickTimer);
                clickCount = 0;
                adminBtn.classList.remove('hidden');
                // Optional: add a subtle indication that admin mode is unlocked
                ampersand.style.color = '#667eea';
            }
        });
    }
}

// Handle "No Preference" cascading
function handleNoPreference(changedIndex) {
    const littleSelects = document.querySelectorAll('.little-choice');
    const changedSelect = littleSelects[changedIndex];

    // If "No Preference" was selected, set all subsequent choices to "No Preference"
    if (changedSelect.value === 'NO_PREFERENCE') {
        for (let i = changedIndex + 1; i < littleSelects.length; i++) {
            littleSelects[i].value = 'NO_PREFERENCE';
            littleSelects[i].disabled = true;
        }
    } else {
        // If a real choice was selected, enable the next choice (but not all)
        if (changedIndex + 1 < littleSelects.length) {
            littleSelects[changedIndex + 1].disabled = false;
        }
        // Re-enable all subsequent selects if previous ones aren't "No Preference"
        let shouldEnable = true;
        for (let i = 0; i < littleSelects.length; i++) {
            if (i <= changedIndex) continue;
            if (shouldEnable && littleSelects[i - 1].value !== 'NO_PREFERENCE') {
                littleSelects[i].disabled = false;
            }
            if (littleSelects[i].value === 'NO_PREFERENCE' && i > changedIndex) {
                shouldEnable = false;
            }
        }
    }
}

// Validate that each Little is only selected once
function validateUniqueChoices() {
    const littleSelects = document.querySelectorAll('.little-choice');
    const selectedValues = Array.from(littleSelects)
        .map(select => select.value)
        .filter(value => value !== '' && value !== 'NO_PREFERENCE');

    const duplicates = selectedValues.filter((value, index) =>
        selectedValues.indexOf(value) !== index
    );

    if (duplicates.length > 0) {
        alert('You cannot select the same person multiple times. Please choose different people for each preference.');
        return false;
    }
    return true;
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();

    if (!validateUniqueChoices()) {
        return;
    }

    const bigName = document.getElementById('bigName').value;

    const choices = [];
    for (let i = 1; i <= 5; i++) {
        const littleName = document.getElementById(`choice${i}`).value;
        if (littleName && littleName !== 'NO_PREFERENCE') {
            choices.push({
                rank: i,
                littleName: littleName
            });
        }
    }

    const submission = {
        bigName,
        choices,
        timestamp: new Date().toISOString()
    };

    // Check if this person already submitted
    const existingIndex = preferences.findIndex(p => p.bigName === bigName);
    if (existingIndex !== -1) {
        if (!confirm('You have already submitted preferences. Do you want to update them?')) {
            return;
        }
        preferences[existingIndex] = submission;
    } else {
        preferences.push(submission);
    }

    // Save preferences (in a real app, this would go to a server)
    await savePreferences();

    // Show success message
    showSuccessMessage();
}

// Save preferences to Google Sheets
async function savePreferences() {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Required for Google Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'submitPreference',
                ...preferences[preferences.length - 1] // Send the most recent submission
            })
        });

        console.log('Preferences saved to Google Sheets');
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        // Fallback to localStorage
        localStorage.setItem('preferences', JSON.stringify({ submissions: preferences }));
        alert('Note: Data saved locally. Make sure to configure Google Sheets in config.js for centralized storage.');
    }
}

// Show success message
function showSuccessMessage() {
    const form = document.getElementById('preferenceForm');
    const successMsg = document.getElementById('successMessage');

    form.style.display = 'none';
    successMsg.classList.remove('hidden');

    setTimeout(() => {
        form.reset();
        form.style.display = 'block';
        successMsg.classList.add('hidden');
    }, 3000);
}
