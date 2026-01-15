// Google Apps Script to handle backend for Bigs & Littles Matcher
// Deploy this as a Web App from Google Apps Script

// Handle GET requests (fetch data)
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const action = e.parameter.action;

  if (action === 'getPreferences') {
    return getPreferences(sheet);
  } else if (action === 'getExistingMatches') {
    return getExistingMatches(sheet);
  }

  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handle POST requests (submit data)
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action === 'submitPreference') {
    return submitPreference(sheet, data);
  } else if (action === 'addExistingMatch') {
    return addExistingMatch(sheet, data);
  } else if (action === 'removeExistingMatch') {
    return removeExistingMatch(sheet, data);
  }

  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Get all preferences
function getPreferences(sheet) {
  const prefsSheet = sheet.getSheetByName('Preferences');
  const data = prefsSheet.getDataRange().getValues();

  // Skip header row
  const preferences = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows

    const choices = [];
    for (let j = 0; j < 5; j++) {
      const choiceIdCol = 3 + (j * 2);
      const choiceNameCol = 4 + (j * 2);
      if (row[choiceIdCol]) {
        choices.push({
          rank: j + 1,
          littleId: row[choiceIdCol],
          littleName: row[choiceNameCol]
        });
      }
    }

    preferences.push({
      timestamp: row[0],
      bigId: row[1],
      bigName: row[2],
      choices: choices
    });
  }

  return ContentService.createTextOutput(JSON.stringify({ submissions: preferences }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Get existing matches
function getExistingMatches(sheet) {
  const matchesSheet = sheet.getSheetByName('ExistingMatches');
  const data = matchesSheet.getDataRange().getValues();

  const matches = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    matches.push({
      littleId: row[0],
      littleName: row[1],
      bigName: row[2]
    });
  }

  return ContentService.createTextOutput(JSON.stringify({ matches: matches }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Submit a preference
function submitPreference(sheet, data) {
  const prefsSheet = sheet.getSheetByName('Preferences');

  // Check if this Big already submitted
  const existingData = prefsSheet.getDataRange().getValues();
  let rowToUpdate = -1;

  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][1] === data.bigId) {
      rowToUpdate = i + 1; // +1 because sheets are 1-indexed
      break;
    }
  }

  // Prepare row data
  const rowData = [
    new Date(data.timestamp),
    data.bigId,
    data.bigName
  ];

  // Add choices (up to 5)
  for (let i = 0; i < 5; i++) {
    if (data.choices[i]) {
      rowData.push(data.choices[i].littleId);
      rowData.push(data.choices[i].littleName);
    } else {
      rowData.push('');
      rowData.push('');
    }
  }

  if (rowToUpdate > 0) {
    // Update existing row
    prefsSheet.getRange(rowToUpdate, 1, 1, rowData.length).setValues([rowData]);
  } else {
    // Append new row
    prefsSheet.appendRow(rowData);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Add existing match
function addExistingMatch(sheet, data) {
  const matchesSheet = sheet.getSheetByName('ExistingMatches');

  matchesSheet.appendRow([
    data.littleId,
    data.littleName,
    data.bigName
  ]);

  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Remove existing match
function removeExistingMatch(sheet, data) {
  const matchesSheet = sheet.getSheetByName('ExistingMatches');
  const existingData = matchesSheet.getDataRange().getValues();

  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][0] === data.littleId && existingData[i][2] === data.bigName) {
      matchesSheet.deleteRow(i + 1);
      break;
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
