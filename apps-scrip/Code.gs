const INVENTORY_SHEET_NAME = 'Inventory';
const BAGS_SHEET_NAME = 'Bags';
const TOOLS_SHEET_NAME = 'Tools';

const INVENTORY_COL = {
  BAG: 1,
  PART: 2,
  DESCRIPTION: 3,
  SHIPPED_QTY: 4,
  LINK: 5,
};

const BAGS_COL = {
  BAG: 1,
  SECTION: 2,
  STATUS: 3,
  LOCATION: 4,
  NOTES: 5,
  PHOTO_URL: 6,
  UPDATED_AT: 7,
  UPDATED_BY: 8,
};

const TOOLS_COL = {
  NAME: 1,
  CATEGORY: 2,
  LOCATION: 3,
  STATUS: 4,
  NOTES: 5,
  PHOTO_URL: 6,
  UPDATED_AT: 7,
  UPDATED_BY: 8,
};

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'search').trim();

    if (action === 'ping') return jsonOutput({ ok: true, message: 'pong' });
    if (action === 'summary') return jsonOutput(getSummary());

    if (action === 'search') {
      const mode = String((e.parameter.mode || 'keyword')).trim();
      const q = String((e.parameter.q || '')).trim();
      const limit = Number(e.parameter.limit || 300);

      if (!q) {
        return jsonOutput({ ok: false, error: 'Missing q. Example: ?action=search&mode=keyword&q=washer' });
      }

      return jsonOutput(searchInventory(mode, q, limit));
    }

    if (action === 'bags') return jsonOutput(getAllBags());
    if (action === 'tools') return jsonOutput(getAllTools());

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

    if (action === 'login') return jsonOutput(loginAdmin(body.password));
    if (action === 'updateBag') return jsonOutput(updateBag(body));
    if (action === 'addBag') return jsonOutput(addBag(body));
    if (action === 'updateTool') return jsonOutput(updateTool(body));
    if (action === 'addTool') return jsonOutput(addTool(body));
    if (action === 'ping') return jsonOutput({ ok: true, message: 'pong' });

    return jsonOutput({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonOutput({ ok: false, error: 'Invalid POST body', detail: String(err) });
  }
}

function getInventorySheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INVENTORY_SHEET_NAME);
  if (!sheet) throw new Error('Sheet not found: ' + INVENTORY_SHEET_NAME);
  return sheet;
}

function getBagsSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BAGS_SHEET_NAME);
  if (!sheet) throw new Error('Sheet not found: ' + BAGS_SHEET_NAME);
  return sheet;
}

function getToolsSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TOOLS_SHEET_NAME);
  if (!sheet) throw new Error('Sheet not found: ' + TOOLS_SHEET_NAME);
  return sheet;
}

function getInventoryRows() {
  const values = getInventorySheet().getDataRange().getValues();
  if (!values || values.length < 2) return [];
  return values.slice(1);
}

function getBagRows() {
  const values = getBagsSheet().getDataRange().getValues();
  if (!values || values.length < 2) return [];
  return values.slice(1);
}

function getToolRows() {
  const values = getToolsSheet().getDataRange().getValues();
  if (!values || values.length < 2) return [];
  return values.slice(1);
}

function getBagMap() {
  const rows = getBagRows();
  const map = {};

  rows.forEach(function(r) {
    const bag = String(r[BAGS_COL.BAG - 1] || '').trim();
    if (!bag) return;

    map[bag] = {
      bag: bag,
      section: r[BAGS_COL.SECTION - 1],
      status: r[BAGS_COL.STATUS - 1],
      location: r[BAGS_COL.LOCATION - 1],
      notes: r[BAGS_COL.NOTES - 1],
      photoUrl: r[BAGS_COL.PHOTO_URL - 1],
      updatedAt: r[BAGS_COL.UPDATED_AT - 1],
      updatedBy: r[BAGS_COL.UPDATED_BY - 1]
    };
  });

  return map;
}

function getSummary() {
  const inventoryRows = getInventoryRows();
  const bagRows = getBagRows();

  let inStockBags = 0;
  let partialBags = 0;
  let missingBags = 0;

  bagRows.forEach(function(r) {
    const status = String(r[BAGS_COL.STATUS - 1] || '').trim().toLowerCase();
    if (status === 'in stock') inStockBags++;
    else if (status === 'partial') partialBags++;
    else if (status === 'missing' || status === 'empty') missingBags++;
  });

  return {
    ok: true,
    totalParts: inventoryRows.length,
    totalBags: bagRows.length,
    inStockBags: inStockBags,
    partialBags: partialBags,
    missingBags: missingBags
  };
}

function levenshtein(a, b) {
  a = String(a || '').toLowerCase();
  b = String(b || '').toLowerCase();
  const matrix = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function similarity(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

function searchInventory(mode, q, limit) {
  const rows = getInventoryRows();
  const bagMap = getBagMap();
  const needle = String(q || '').trim().toLowerCase();
  const safeLimit = Math.max(1, Math.min(Number(limit || 300), 1000));

  const filtered = rows.filter(function(r) {
    const bag = String(r[INVENTORY_COL.BAG - 1] || '').trim().toLowerCase();
    const part = String(r[INVENTORY_COL.PART - 1] || '').trim().toLowerCase();
    const desc = String(r[INVENTORY_COL.DESCRIPTION - 1] || '').trim().toLowerCase();

    if (mode === 'part') {
      return part === needle;
    }

    if (mode === 'bag') {
      return bag === needle;
    }

    return (
      bag.includes(needle) ||
      part.includes(needle) ||
      desc.includes(needle)
    );
  }).slice(0, safeLimit);

  const matches = filtered.map(function(r) {
    const bag = String(r[INVENTORY_COL.BAG - 1] || '').trim();
    const bagInfo = bagMap[bag] || {};

    return {
      bag: bag,
      part: r[INVENTORY_COL.PART - 1],
      description: r[INVENTORY_COL.DESCRIPTION - 1],
      shippedQty: r[INVENTORY_COL.SHIPPED_QTY - 1],
      link: r[INVENTORY_COL.LINK - 1],
      status: bagInfo.status || '',
      location: bagInfo.location || '',
      photoUrl: bagInfo.photoUrl || '',
      section: bagInfo.section || '',
      updatedAt: bagInfo.updatedAt || '',
      updatedBy: bagInfo.updatedBy || ''
    };
  });

  return {
    ok: true,
    matchCount: matches.length,
    returned: matches.length,
    matches: matches
  };
}

function getAllBags() {
  const rows = getBagRows();
  return {
    ok: true,
    bags: rows.map(function(r) {
      return {
        bag: r[BAGS_COL.BAG - 1],
        section: r[BAGS_COL.SECTION - 1],
        status: r[BAGS_COL.STATUS - 1],
        location: r[BAGS_COL.LOCATION - 1],
        notes: r[BAGS_COL.NOTES - 1],
        photoUrl: r[BAGS_COL.PHOTO_URL - 1],
        updatedAt: r[BAGS_COL.UPDATED_AT - 1],
        updatedBy: r[BAGS_COL.UPDATED_BY - 1]
      };
    })
  };
}

function getAllTools() {
  const rows = getToolRows();
  return {
    ok: true,
    tools: rows.map(function(r) {
      return {
        name: r[TOOLS_COL.NAME - 1],
        category: r[TOOLS_COL.CATEGORY - 1],
        location: r[TOOLS_COL.LOCATION - 1],
        status: r[TOOLS_COL.STATUS - 1],
        notes: r[TOOLS_COL.NOTES - 1],
        photoUrl: r[TOOLS_COL.PHOTO_URL - 1],
        updatedAt: r[TOOLS_COL.UPDATED_AT - 1],
        updatedBy: r[TOOLS_COL.UPDATED_BY - 1]
      };
    })
  };
}

function loginAdmin(password) {
  const stored = String(
    PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || ''
  ).trim();

  const entered = String(password || '').trim();

  if (!stored) return { ok: false, error: 'ADMIN_PASSWORD is not set in Script Properties' };
  if (entered !== stored) return { ok: false, error: 'Invalid password' };

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('admin_token_' + token, '1', 60 * 60 * 6);

  return { ok: true, token: token };
}

function verifyToken(token) {
  const key = 'admin_token_' + String(token || '').trim();
  return !!CacheService.getScriptCache().get(key);
}

function updateBag(body) {
  if (!verifyToken(body.token)) return { ok: false, error: 'Unauthorized' };

  const bag = String(body.bag || '').trim();
  if (!bag) return { ok: false, error: 'Bag is required' };

  const section = String(body.section || '').trim();
  const status = String(body.status || '').trim();
  const location = String(body.location || '').trim();
  const notes = String(body.notes || '').trim();
  const photoUrl = String(body.photoUrl || '').trim();
  const updatedBy = String(body.updatedBy || '').trim();

  const sheet = getBagsSheet();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const rowBag = String(values[i][BAGS_COL.BAG - 1] || '').trim();
    if (rowBag !== bag) continue;

    const sheetRow = i + 1;
    if (section) sheet.getRange(sheetRow, BAGS_COL.SECTION).setValue(section);
    sheet.getRange(sheetRow, BAGS_COL.STATUS).setValue(status);
    sheet.getRange(sheetRow, BAGS_COL.LOCATION).setValue(location);
    sheet.getRange(sheetRow, BAGS_COL.NOTES).setValue(notes);
    sheet.getRange(sheetRow, BAGS_COL.PHOTO_URL).setValue(photoUrl);
    sheet.getRange(sheetRow, BAGS_COL.UPDATED_AT).setValue(new Date());
    sheet.getRange(sheetRow, BAGS_COL.UPDATED_BY).setValue(updatedBy);

    return { ok: true, created: false };
  }

  sheet.appendRow([bag, section, status, location, notes, photoUrl, new Date(), updatedBy]);
  return { ok: true, created: true };
}

function addBag(body) {
  if (!verifyToken(body.token)) return { ok: false, error: 'Unauthorized' };

  const bag = String(body.bag || '').trim();
  if (!bag) return { ok: false, error: 'Bag is required' };

  const section = String(body.section || '').trim();
  const status = String(body.status || '').trim();
  const location = String(body.location || '').trim();
  const notes = String(body.notes || '').trim();
  const photoUrl = String(body.photoUrl || '').trim();
  const updatedBy = String(body.updatedBy || '').trim();

  const sheet = getBagsSheet();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const rowBag = String(values[i][BAGS_COL.BAG - 1] || '').trim();
    if (rowBag === bag) return { ok: false, error: 'Bag already exists' };
  }

  sheet.appendRow([bag, section, status, location, notes, photoUrl, new Date(), updatedBy]);
  return { ok: true, created: true };
}

function updateTool(body) {
  if (!verifyToken(body.token)) return { ok: false, error: 'Unauthorized' };

  const name = String(body.name || '').trim();
  if (!name) return { ok: false, error: 'Tool name is required' };

  const category = String(body.category || '').trim();
  const location = String(body.location || '').trim();
  const status = String(body.status || '').trim();
  const notes = String(body.notes || '').trim();
  const photoUrl = String(body.photoUrl || '').trim();
  const updatedBy = String(body.updatedBy || '').trim();

  const sheet = getToolsSheet();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const rowName = String(values[i][TOOLS_COL.NAME - 1] || '').trim();
    if (rowName !== name) continue;

    const sheetRow = i + 1;
    if (category) sheet.getRange(sheetRow, TOOLS_COL.CATEGORY).setValue(category);
    sheet.getRange(sheetRow, TOOLS_COL.LOCATION).setValue(location);
    sheet.getRange(sheetRow, TOOLS_COL.STATUS).setValue(status);
    sheet.getRange(sheetRow, TOOLS_COL.NOTES).setValue(notes);
    sheet.getRange(sheetRow, TOOLS_COL.PHOTO_URL).setValue(photoUrl);
    sheet.getRange(sheetRow, TOOLS_COL.UPDATED_AT).setValue(new Date());
    sheet.getRange(sheetRow, TOOLS_COL.UPDATED_BY).setValue(updatedBy);

    return { ok: true, created: false };
  }

  sheet.appendRow([name, category, location, status, notes, photoUrl, new Date(), updatedBy]);
  return { ok: true, created: true };
}

function addTool(body) {
  if (!verifyToken(body.token)) return { ok: false, error: 'Unauthorized' };

  const name = String(body.name || '').trim();
  if (!name) return { ok: false, error: 'Tool name is required' };

  const category = String(body.category || '').trim();
  const location = String(body.location || '').trim();
  const status = String(body.status || '').trim();
  const notes = String(body.notes || '').trim();
  const photoUrl = String(body.photoUrl || '').trim();
  const updatedBy = String(body.updatedBy || '').trim();

  const sheet = getToolsSheet();
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const rowName = String(values[i][TOOLS_COL.NAME - 1] || '').trim();
    if (rowName === name) return { ok: false, error: 'Tool already exists' };
  }

  sheet.appendRow([name, category, location, status, notes, photoUrl, new Date(), updatedBy]);
  return { ok: true, created: true };
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
