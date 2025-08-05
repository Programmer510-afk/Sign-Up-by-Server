const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ✅ Google credentials ও Sheet ID env থেকে
const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// ✅ Sanitize function
function sanitizeSheetName(email) {
  return email.replace(/[^a-zA-Z0-9]/g, "_");
}

// ✅ Google Sheets Auth
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: "Missing email or password." });

  const sheetName = sanitizeSheetName(email);

  try {
    // ✅ Step 1: Read A1 cell
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
    });

    const storedEmail = result.data.values?.[0]?.[0];
    if (storedEmail !== email) {
      return res.status(403).json({ success: false, error: "Email mismatch in Server." });
    }

    // ✅ Step 2: Update A2 with password
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A2`,
      valueInputOption: "RAW",
      requestBody: { values: [[password]] },
    });

    return res.json({ success: true });

  } catch (err) {
    console.error("❌ Error:", err.message);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
