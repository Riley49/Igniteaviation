const SHEET_NAME = 'Inventory';

const COL = {
  BAG: 1,
  PART: 2,
  DESCRIPTION: 3,
  ORIGINAL_QTY: 4,
  CURRENT_QTY: 5,
  LINK: 6,
  LOCATION: 7,
  STATUS: 8,
  NOTES: 9,
  PHOTO_URL: 10,
  UPDATED_AT: 11,
  UPDATED_BY: 12,
};

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'search').trim();

    if (action === 'ping') {
      return jsonOutput({ ok: true, message: 'pong' });
    }

    if (action === 'summary') {
      return jsonOutput(getSummary());
    }

    if (action === 'search') {
      const mode = String((e.parameter.mode || 'keyword')).trim();
      const q = String((e.parameter.q || '')).trim();
      const limit = Number(e.parameter.limit || 300);
      return jsonOutput(searchInventory(mode, q, limit));
    }

    return jsonOutput({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonOutput({ ok: false, error: 'GET failed', detail: String(err) });
  }
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    const body = JSON.parse(raw || '{}');
    const action = String(body.action || '').trim();

    if (action === 'login') {
      return jsonOutput(loginAdmin(body.password));
    }

    if (action === 'updatePart') {
      return jsonOutput(updatePart(body));
    }

    if (action === 'ping') {
      return jsonOutput({ ok: true, message: 'pong' });
    }

    return jsonOutput({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonOutput({ ok: false, error: 'Invalid POST body', detail: String(err) });
  }
}

function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet not found: ' + SHEET_NAME);
  }
  return sheet;
}

function getDataRows() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];
  return values.slice(1);
}

function normalizeStatus(originalQty, currentQty) {
  const original = Number(originalQty || 0);
  const current = Number(currentQty || 0);

  if (current <= 0) return 'Missing';
  if (current < original) return 'Partial';
  return 'In Stock';
}

function getSummary() {
  const rows = getDataRows();
  let totalOriginalQty = 0;
  let totalCurrentQty = 0;
  const bagSet = new Set();

  rows.forEach(function(r) {
    totalOriginalQty += Number(r[COL.ORIGINAL_QTY - 1] || 0);
    totalCurrentQty += Number(r[COL.CURRENT_QTY - 1] || 0);

    const bag = String(r[COL.BAG - 1] || '').trim();
    if (bag) bagSet.add(bag);
  });

  return {
    ok: true,
    totalOriginalQty: totalOriginalQty,
    totalCurrentQty: totalCurrentQty,
    totalMissingQty: Math.max(totalOriginalQty - totalCurrentQty, 0),
    totalBags: bagSet.size,
  };
}

function searchInventory(mode, q, limit) {
  const rows = getDataRows();
  const needle = String(q || '').trim().toLowerCase();
  const safeLimit = Math.max(1, Math.min(Number(limit || 300), 1000));

  if (!needle) {
    return { ok: true, matchCount: 0, returned: 0, matches: [] };
  }

  const filtered = rows.filter(function(r) {
    const part = String(r[COL.PART - 1] || '');
    const desc = String(r[COL.DESCRIPTION - 1] || '');

    if (mode === 'part') {
      return part.toLowerCase() === needle;
    }

    return (
      part.toLowerCase().includes(needle) ||
      desc.toLowerCase().includes(needle)
    );
  });

  const matches = filtered.slice(0, safeLimit).map(function(r) {
    const originalQty = Number(r[COL.ORIGINAL_QTY - 1] || 0);
    const currentQty = Number(r[COL.CURRENT_QTY - 1] || 0);
    const storedStatus = String(r[COL.STATUS - 1] || '').trim();
    const status = storedStatus || normalizeStatus(originalQty, currentQty);

    return {
      bag: r[COL.BAG - 1],
      part: r[COL.PART - 1],
      description: r[COL.DESCRIPTION - 1],
      originalQty: originalQty,
      currentQty: currentQty,
      link: r[COL.LINK - 1],
      location: r[COL.LOCATION - 1],
      status: status,
      notes: r[COL.NOTES - 1],
      photoUrl: r[COL.PHOTO_URL - 1],
      updatedAt: r[COL.UPDATED_AT - 1],
      updatedBy: r[COL.UPDATED_BY - 1],
    };
  });

  return {
    ok: true,
    matchCount: filtered.length,
    returned: matches.length,
    matches: matches,
  };
}

function loginAdmin(password) {
  const stored = String(
    PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || ''
  ).trim();

  const entered = String(password || '').trim();

  if (!stored) {
    return { ok: false, error: 'ADMIN_PASSWORD is not set in Script Properties' };
  }

  if (entered !== stored) {
    return { ok: false, error: 'Invalid password' };
  }

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('admin_token_' + token, '1', 60 * 60 * 6);

  return { ok: true, token: token };
}

function verifyToken(token) {
  const key = 'admin_token_' + String(token || '').trim();
  return !!CacheService.getScriptCache().get(key);
}

function updatePart(body) {
  if (!verifyToken(body.token)) {
    return { ok: false, error: 'Unauthorized' };
  }

  const part = String(body.part || '').trim();
  if (!part) {
    return { ok: false, error: 'Part number is required' };
  }

  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowPart = String(row[COL.PART - 1] || '').trim();

    if (rowPart !== part) continue;

    const originalQty = Number(row[COL.ORIGINAL_QTY - 1] || 0);
    const currentQty = Number(body.currentQty || 0);
    const status = normalizeStatus(originalQty, currentQty);
    const sheetRow = i + 1;

    if (String(body.bag || '').trim()) {
      sheet.getRange(sheetRow, COL.BAG).setValue(String(body.bag).trim());
    }

    sheet.getRange(sheetRow, COL.CURRENT_QTY).setValue(currentQty);
    sheet.getRange(sheetRow, COL.LOCATION).setValue(String(body.location || '').trim());
    sheet.getRange(sheetRow, COL.STATUS).setValue(status);
    sheet.getRange(sheetRow, COL.NOTES).setValue(String(body.notes || '').trim());
    sheet.getRange(sheetRow, COL.PHOTO_URL).setValue(String(body.photoUrl || '').trim());
    sheet.getRange(sheetRow, COL.UPDATED_AT).setValue(new Date());
    sheet.getRange(sheetRow, COL.UPDATED_BY).setValue(String(body.updatedBy || '').trim());

    return { ok: true, status: status };
  }

  return { ok: false, error: 'Part not found' };
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}