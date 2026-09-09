const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  keyFile: './files/google-service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({
  version: 'v4',
  auth
});

async function saveRating(data) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Ratings!A:I',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        new Date().toISOString(),
        data.customer_name || '',
        data.rep_name || '',
        data.rating_manner || '',
        data.rating_commitment || '',
        data.rating_speed || '',
        data.rating_quality || '',
        data.notes || '',
        data.flow_token || ''
      ]]
    }
  });

  console.log('Rating saved to Google Sheets');
}

module.exports = {
  saveRating
};