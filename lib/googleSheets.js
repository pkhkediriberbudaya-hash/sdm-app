import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !key) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY belum diatur di environment variables.'
    );
  }
  return new google.auth.JWT(email, null, key, [
    'https://www.googleapis.com/auth/spreadsheets',
  ]);
}

function getClient() {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID belum diatur di environment variables.');
  }
  return google.sheets({ version: 'v4', auth: getAuth() });
}

function colLetter(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function readSheet(sheetName) {
  const sheets = getClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A1:ZZ20000`,
  });
  const rows = res.data.values || [];
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => (h || '').toString().trim());
  const records = rows.slice(1).map((row, idx) => {
    const record = { _row: idx + 2 };
    headers.forEach((h, i) => {
      record[h] = row[i] ?? '';
    });
    return record;
  });
  return { headers, records };
}

export async function appendRow(sheetName, headers, rowObject) {
  const sheets = getClient();
  const values = [headers.map((h) => rowObject[h] ?? '')];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

export async function updateRow(sheetName, rowNumber, headers, rowObject) {
  const sheets = getClient();
  const values = [headers.map((h) => rowObject[h] ?? '')];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A${rowNumber}:${colLetter(headers.length)}${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function deleteRow(sheetName, rowNumber) {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find((s) => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet '${sheetName}' tidak ditemukan.`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
}

export async function ensureSheetExists(sheetName) {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets.some((s) => s.properties.title === sheetName);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
  }
}

export async function clearSheetRange(sheetName) {
  const sheets = getClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A1:ZZ200000`,
  });
}

export async function writeSheetBulk(sheetName, headers, records) {
  const sheets = getClient();
  const values = [headers, ...records.map((r) => headers.map((h) => r[h] ?? ''))];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function listSheetNames() {
  const sheets = getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  return meta.data.sheets.map((s) => s.properties.title);
}
