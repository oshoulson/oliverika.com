import { google } from 'googleapis'
import { randomUUID } from 'node:crypto'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getS3Client, BUCKET, KEY_PREFIX_WITH_SLASH } from '../../server/s3Client.js'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const SHEET_ID = process.env.GOOGLE_SHEETS_ID
const SHEET_RANGE = process.env.GOOGLE_SHEETS_RANGE || 'RSVPs!A:H'
const SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT
const SERVICE_ACCOUNT_B64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64
const EMAIL_COLUMN_INDEX = 2
const MAX_DOODLE_BYTES = Number(process.env.RSVP_DOODLE_MAX_BYTES || 100000)

const normalizePrefix = (value) => value?.trim().replace(/^\/+|\/+$/g, '') || ''
const doodlePrefixFromEnv = normalizePrefix(process.env.WEDDING_S3_DOODLE_PREFIX)
const DOODLE_PREFIX = doodlePrefixFromEnv || normalizePrefix(`${KEY_PREFIX_WITH_SLASH || ''}doodles`)
const DOODLE_PREFIX_WITH_SLASH = DOODLE_PREFIX ? `${DOODLE_PREFIX}/` : ''

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

let credentials
let authClient
let sheetsClient

const getAuthClient = async () => {
  if (!credentials) {
    credentials = parseServiceAccount()
  }
  if (!authClient) {
    authClient = new google.auth.JWT({
      email: credentials.clientEmail,
      key: credentials.privateKey,
      scopes: SCOPES,
    })
    await authClient.authorize()
  }
  return authClient
}

const getSheetsClient = async () => {
  if (!SHEET_ID) {
    throw new Error('Missing GOOGLE_SHEETS_ID environment variable')
  }

  if (!sheetsClient) {
    sheetsClient = google.sheets({ version: 'v4', auth: await getAuthClient() })
  }

  return sheetsClient
}

const columnToIndex = (letters = 'A') => {
  return letters
    .trim()
    .toUpperCase()
    .split('')
    .reduce((result, char) => result * 26 + (char.charCodeAt(0) - 64), 0)
}

const indexToColumn = (index) => {
  if (index <= 0) return 'A'
  let value = index
  let result = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    value = Math.floor((value - 1) / 26)
  }
  return result
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
    startIndex: columnToIndex(startColumn),
    endIndex: columnToIndex(endColumn),
  }
}

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '')
const slugify = (value) => {
  const base = sanitize(value).toLowerCase()
  if (!base) return ''
  return base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32)
}

const parseDoodleBuffer = (dataUrl) => {
  if (!dataUrl) return null
  const trimmed = dataUrl.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^data:image\/png;base64,(.+)$/i)
  if (!match) {
    throw new BadRequestError('Invalid doodle data')
  }
  const buffer = Buffer.from(match[1], 'base64')
  if (buffer.length === 0) {
    throw new BadRequestError('Doodle data is empty')
  }
  if (buffer.length > MAX_DOODLE_BYTES) {
    throw new BadRequestError('Doodle is too large')
  }
  return buffer
}

const buildDoodleFilename = (submission) => {
  const timestampPart = (submission.submittedAt || new Date().toISOString()).replace(/[:.]/g, '-')
  const slug = slugify(submission.fullName) || slugify(submission.email) || 'guest'
  return `${timestampPart}-${randomUUID()}-${slug}.png`
}

const maybeStoreDoodleImage = async (submission) => {
  if (!submission.doodleDataUrl) {
    return ''
  }
  if (!BUCKET) {
    throw new Error('Missing WEDDING_S3_BUCKET for doodle uploads')
  }
  const buffer = parseDoodleBuffer(submission.doodleDataUrl)
  if (!buffer) {
    return ''
  }
  const key = buildDoodleFilename(submission)
  const objectKey = `${DOODLE_PREFIX_WITH_SLASH}${key}`
  const metadataName = submission.fullName?.slice(0, 100) || 'unknown'
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
    Body: buffer,
    ContentType: 'image/png',
    Metadata: {
      'artist-name': metadataName,
      email: submission.email || 'unknown',
      type: 'rsvp-doodle',
    },
  })
  await getS3Client().send(command)
  return objectKey
}

const normalizeSubmission = (payload) => {
  const fullName = sanitize(payload.fullName)
  const email = sanitize(payload.email)
  const attendance = payload.attendance === 'no' ? 'no' : 'yes'
  const bringingGuest = attendance === 'yes' && payload.bringingGuest === 'yes' ? 'yes' : 'no'
  const guestName = sanitize(payload.guestName)
  const notes = sanitize(payload.notes)
  const doodleDataUrl = typeof payload.doodleDataUrl === 'string' ? payload.doodleDataUrl.trim() : ''

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
    doodleDataUrl,
  }
}

const buildRowValues = (submission) => [
  submission.submittedAt || new Date().toISOString(),
  submission.fullName,
  submission.email,
  submission.attendance === 'yes' ? 'Attending' : 'Declined',
  submission.bringingGuest === 'yes' ? 'Yes' : 'No',
  submission.guestName || '',
  submission.notes || '',
  submission.doodleKey || '',
]

const upsertSubmission = async (submission) => {
  const sheets = await getSheetsClient()
  const values = [buildRowValues(submission)]
  const { sheetName, startColumn, startIndex, endIndex } = parseRangeColumns(SHEET_RANGE)
  const columnCount = values[0]?.length || 0
  const requiredEndIndex = startIndex + columnCount - 1
  const effectiveEndIndex = Math.max(endIndex, requiredEndIndex)
  const effectiveEndColumn = indexToColumn(effectiveEndIndex)
  const effectiveRange = `${sheetName}!${startColumn}:${effectiveEndColumn}`

  let existingRowNumber = null
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: effectiveRange,
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
      range: `${sheetName}!${startColumn}${existingRowNumber}:${effectiveEndColumn}${existingRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    })
    return 'updated'
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: effectiveRange,
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
    submission.submittedAt = new Date().toISOString()
    submission.doodleKey = await maybeStoreDoodleImage(submission)
    delete submission.doodleDataUrl
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
