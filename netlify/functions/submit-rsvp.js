import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const SHEET_ID = process.env.GOOGLE_SHEETS_ID
const SHEET_RANGE = process.env.GOOGLE_SHEETS_RANGE || 'RSVPs!A:G'
const SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT
const SERVICE_ACCOUNT_B64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64
const EMAIL_COLUMN_INDEX = 2

class BadRequestError extends Error {
  constructor(message) {
    super(message)
    this.statusCode = 400
  }
}

const parseServiceAccount = () => {
  if (!SERVICE_ACCOUNT && !SERVICE_ACCOUNT_B64) {
    throw new Error('Missing Google service account credentials')
  }

  const jsonString = SERVICE_ACCOUNT || Buffer.from(SERVICE_ACCOUNT_B64, 'base64').toString('utf-8')
  const parsed = JSON.parse(jsonString)
  return {
    clientEmail: parsed.client_email,
    privateKey: (parsed.private_key || '').replace(/\\n/g, '\n'),
  }
}

let sheetsClient
let credentials

const getSheetsClient = async () => {
  if (!SHEET_ID) {
    throw new Error('Missing GOOGLE_SHEETS_ID environment variable')
  }

  if (!sheetsClient) {
    if (!credentials) {
      credentials = parseServiceAccount()
    }
    const auth = new google.auth.JWT({
      email: credentials.clientEmail,
      key: credentials.privateKey,
      scopes: SCOPES,
    })
    await auth.authorize()
    sheetsClient = google.sheets({ version: 'v4', auth })
  }

  return sheetsClient
}

const parseRangeColumns = (rangeValue) => {
  const [sheetName = 'RSVPs', columns = 'A:G'] = rangeValue.split('!')
  const [startPart = 'A', endPart] = columns.split(':')
  const colPattern = /([A-Z]+)/i

  const extractColumn = (part, fallback) => {
    const match = part?.match(colPattern)
    return (match ? match[1] : fallback || 'A').toUpperCase()
  }

  const startColumn = extractColumn(startPart, 'A')
  const endColumn = extractColumn(endPart || startPart, startColumn)

  return {
    sheetName,
    startColumn,
    endColumn,
  }
}

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '')

const normalizeSubmission = (payload) => {
  const fullName = sanitize(payload.fullName)
  const email = sanitize(payload.email)
  const attendance = payload.attendance === 'no' ? 'no' : 'yes'
  const bringingGuest = attendance === 'yes' && payload.bringingGuest === 'yes' ? 'yes' : 'no'
  const guestName = sanitize(payload.guestName)
  const notes = sanitize(payload.notes)

  if (!fullName) {
    throw new BadRequestError('Full name is required')
  }
  if (!email) {
    throw new BadRequestError('Email is required')
  }
  if (bringingGuest === 'yes' && !guestName) {
    throw new BadRequestError('Guest name is required when bringing a plus one')
  }

  return {
    fullName,
    email,
    attendance,
    bringingGuest,
    guestName: bringingGuest === 'yes' ? guestName : '',
    notes,
  }
}

const buildRowValues = (submission) => [
  new Date().toISOString(),
  submission.fullName,
  submission.email,
  submission.attendance === 'yes' ? 'Attending' : 'Declined',
  submission.bringingGuest === 'yes' ? 'Yes' : 'No',
  submission.guestName || '',
  submission.notes || '',
]

const upsertSubmission = async (submission) => {
  const sheets = await getSheetsClient()
  const values = [buildRowValues(submission)]
  const { sheetName, startColumn, endColumn } = parseRangeColumns(SHEET_RANGE)
  const readRange = `${sheetName}!${startColumn}:${endColumn}`

  let existingRowNumber = null
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: readRange,
      majorDimension: 'ROWS',
    })
    const rows = response.data.values || []
    const submittedEmail = submission.email.toLowerCase()

    for (let index = 1; index < rows.length; index += 1) {
      const email = (rows[index]?.[EMAIL_COLUMN_INDEX] || '').trim().toLowerCase()
      if (email && email === submittedEmail) {
        existingRowNumber = index + 1
        break
      }
    }
  } catch (error) {
    console.warn('Unable to read sheet for deduping; falling back to append', error)
  }

  if (existingRowNumber) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheetName}!${startColumn}${existingRowNumber}:${endColumn}${existingRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    })
    return 'updated'
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: SHEET_RANGE,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  })
  return 'created'
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  try {
    const payload = JSON.parse(event.body || '{}')
    const submission = normalizeSubmission(payload)
    const action = await upsertSubmission(submission)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, action }),
    }
  } catch (error) {
    console.error('submit-rsvp error', error)
    const statusCode = error.statusCode || 500
    const message = statusCode === 500 ? 'Unable to save your RSVP right now. Please try again later.' : error.message
    return {
      statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message }),
    }
  }
}
