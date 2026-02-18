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
// 9. Set "Who has access": Anyone (or Anyone with Google account)
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

// Returns JSONP if callback param exists, otherwise plain JSON
function respond(data, callback) {
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT)
  }
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

function doGet(e) {
  var lock = LockService.getScriptLock()
  lock.tryLock(10000)

  try {
    var action = e.parameter.action
    var callback = e.parameter.callback
    var sheet = getSheet()

    if (action === 'load') {
      var userId = e.parameter.userId
      if (!userId) return respond({ success: false, error: 'Missing userId' }, callback)

      var data = sheet.getDataRange().getValues()
      var headers = data[0]

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(userId)) {
          var row = {}
          headers.forEach(function (h, j) { row[h] = data[i][j] })
          if (row.completedTracks) {
            try { row.completedTracks = JSON.parse(row.completedTracks) }
            catch (err) { row.completedTracks = [] }
          } else {
            row.completedTracks = []
          }
          return respond({ success: true, data: row }, callback)
        }
      }
      return respond({ success: true, data: null }, callback)
    }

    if (action === 'users') {
      var data = sheet.getDataRange().getValues()
      var users = []
      for (var i = 1; i < data.length; i++) {
        var u = String(data[i][0]).trim()
        if (u) users.push(u)
      }
      return respond({ success: true, users: users }, callback)
    }

    if (action === 'save') {
      // Read fields directly from URL params (avoids long encoded JSON)
      var payload = {
        userId: e.parameter.userId,
        tab: e.parameter.tab || '',
        trackTitle: e.parameter.trackTitle || '',
        trackTheme: e.parameter.trackTheme || '',
        trackLink: e.parameter.trackLink || '',
        time: Number(e.parameter.time) || 0,
        completedTracks: []
      }
      if (e.parameter.completedTracks) {
        try { payload.completedTracks = JSON.parse(e.parameter.completedTracks) }
        catch (err) { payload.completedTracks = [] }
      }
      return saveToSheet(sheet, payload)
    }

    return respond({ success: false, error: 'Unknown action' }, callback)
  } finally {
    lock.releaseLock()
  }
}

function saveToSheet(sheet, payload) {
  var userId = payload.userId
  if (!userId) return respond({ success: false, error: 'Missing userId' })

  var data = sheet.getDataRange().getValues()
  var rowIndex = -1
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      rowIndex = i + 1
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

  return respond({ success: true })
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
