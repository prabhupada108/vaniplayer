// ============================================================
// GOOGLE APPS SCRIPT — Vani Player Cloud Sync
// ============================================================
// HOW TO SET UP:
//
// 1. Go to https://sheets.google.com and create a new blank spreadsheet
// 2. Copy the Sheet ID from the URL:
//    https://docs.google.com/spreadsheets/d/  <<THIS_PART>>  /edit
// 3. Paste the Sheet ID below (replace YOUR_SHEET_ID_HERE)
// 4. In the spreadsheet, go to Extensions > Apps Script
// 5. Delete any existing code and paste this ENTIRE file
// 6. Click Deploy > New deployment
// 7. Select type: "Web app"
// 8. Set "Execute as": Me
// 9. Set "Who has access": Anyone
// 10. Click Deploy, authorize when prompted
// 11. Copy the Web App URL
// 12. Paste the URL into src/cloudSync.js (SYNC_URL constant)
// ============================================================

const SHEET_ID = '1J80jN7_fE-5RhC856cVQ4-LfsYk56eKRSCsalspBtzI'

function getSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID)
  var sheet = ss.getSheetByName('Sessions')
  if (!sheet) {
    sheet = ss.insertSheet('Sessions')
    sheet.appendRow([
      'userId', 'tab', 'trackTitle', 'trackTheme',
      'trackLink', 'time', 'lastPlayed', 'completedTracks'
    ])
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold')
  }
  return sheet
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

function doGet(e) {
  var lock = LockService.getScriptLock()
  lock.tryLock(10000)

  try {
    var action = e.parameter.action
    var sheet = getSheet()

    if (action === 'load') {
      var userId = e.parameter.userId
      if (!userId) return jsonResponse({ success: false, error: 'Missing userId' })

      var data = sheet.getDataRange().getValues()
      var headers = data[0]

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(userId)) {
          var row = {}
          headers.forEach(function (h, j) { row[h] = data[i][j] })
          // Parse completedTracks JSON string back to array
          if (row.completedTracks) {
            try { row.completedTracks = JSON.parse(row.completedTracks) }
            catch (err) { row.completedTracks = [] }
          } else {
            row.completedTracks = []
          }
          return jsonResponse({ success: true, data: row })
        }
      }
      return jsonResponse({ success: true, data: null })
    }

    if (action === 'users') {
      var data = sheet.getDataRange().getValues()
      var users = []
      for (var i = 1; i < data.length; i++) {
        var u = String(data[i][0]).trim()
        if (u) users.push(u)
      }
      return jsonResponse({ success: true, users: users })
    }

    if (action === 'save') {
      var payload = JSON.parse(decodeURIComponent(e.parameter.data))
      return saveToSheet(sheet, payload)
    }

    return jsonResponse({ success: false, error: 'Unknown action' })
  } finally {
    lock.releaseLock()
  }
}

function saveToSheet(sheet, payload) {
  var userId = payload.userId
  if (!userId) return jsonResponse({ success: false, error: 'Missing userId' })

  var data = sheet.getDataRange().getValues()
  var rowIndex = -1
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      rowIndex = i + 1 // Sheets are 1-indexed
      break
    }
  }

  var completedStr = JSON.stringify(payload.completedTracks || [])
  var now = new Date().toISOString()
  var row = [
    userId,
    payload.tab || '',
    payload.trackTitle || '',
    payload.trackTheme || '',
    payload.trackLink || '',
    payload.time || 0,
    now,
    completedStr
  ]

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row])
  } else {
    sheet.appendRow(row)
  }

  return jsonResponse({ success: true })
}

function doPost(e) {
  var lock = LockService.getScriptLock()
  lock.tryLock(10000)

  try {
    var sheet = getSheet()
    var payload = JSON.parse(e.postData.contents)
    return saveToSheet(sheet, payload)
  } finally {
    lock.releaseLock()
  }
}
