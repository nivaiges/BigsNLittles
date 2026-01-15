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
    const littleSelect = document.getElementById('littleName');
    const bigSelects = document.querySelectorAll('.big-choice');

    // Populate A Team (Littles) dropdown
    aTeam.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.name;
        littleSelect.appendChild(option);
    });

    // Populate World Team (Bigs) dropdowns
    bigSelects.forEach(select => {
        worldTeam.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
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

    // Prevent selecting the same Big multiple times
    const bigSelects = document.querySelectorAll('.big-choice');
    bigSelects.forEach(select => {
        select.addEventListener('change', validateUniqueChoices);
    });
}

// Validate that each Big is only selected once
function validateUniqueChoices() {
    const bigSelects = document.querySelectorAll('.big-choice');
    const selectedValues = Array.from(bigSelects)
        .map(select => select.value)
        .filter(value => value !== '');

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

    const littleId = parseInt(document.getElementById('littleName').value);
    const littleName = aTeam.find(m => m.id === littleId)?.name;

    const choices = [];
    for (let i = 1; i <= 5; i++) {
        const choiceId = parseInt(document.getElementById(`choice${i}`).value);
        const choiceName = worldTeam.find(m => m.id === choiceId)?.name;
        if (choiceId && choiceName) {
            choices.push({
                rank: i,
                bigId: choiceId,
                bigName: choiceName
            });
        }
    }

    const submission = {
        littleId,
        littleName,
        choices,
        timestamp: new Date().toISOString()
    };

    // Check if this person already submitted
    const existingIndex = preferences.findIndex(p => p.littleId === littleId);
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

// Save preferences to localStorage (simulating server storage)
async function savePreferences() {
    const data = {
        submissions: preferences
    };
    localStorage.setItem('preferences', JSON.stringify(data));
    console.log('Preferences saved:', data);
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
