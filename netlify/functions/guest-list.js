import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getS3Client, BUCKET, KEY_PREFIX_WITH_SLASH } from '../../server/s3Client.js'

const KEY = `${KEY_PREFIX_WITH_SLASH || ''}guest-list.json`
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

const streamToString = async (stream) => {
  const chunks = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf-8')
}

const ok = (body) => ({
  statusCode: 200,
  headers,
  body: JSON.stringify(body),
})

const bad = (statusCode, message) => ({
  statusCode,
  headers,
  body: JSON.stringify({ error: message }),
})

const handleGet = async () => {
  if (!BUCKET) {
    return bad(500, 'Missing S3 bucket configuration')
  }
  try {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: KEY,
      }),
    )
    const text = await streamToString(response.Body)
    const parsed = JSON.parse(text || '{}')
    const households = Array.isArray(parsed.households) ? parsed.households : []
    return ok({ households, updatedAt: parsed.updatedAt || null })
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404) {
      return ok({ households: [], updatedAt: null })
    }
    console.error('guest-list get error', error)
    return bad(500, 'Unable to load guest list')
  }
}

const handlePost = async (event) => {
  if (!BUCKET) {
    return bad(500, 'Missing S3 bucket configuration')
  }
  let payload = null
  try {
    payload = JSON.parse(event.body || '{}')
  } catch (error) {
    return bad(400, 'Invalid JSON')
  }

  if (!Array.isArray(payload.households)) {
    return bad(400, 'households must be an array')
  }

  const body = JSON.stringify({ households: payload.households, updatedAt: new Date().toISOString() })

  try {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: KEY,
        Body: body,
        ContentType: 'application/json',
      }),
    )
    return ok({ saved: true })
  } catch (error) {
    console.error('guest-list save error', error)
    return bad(500, 'Unable to save guest list')
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...headers,
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    }
  }

  if (event.httpMethod === 'GET') {
    return handleGet()
  }

  if (event.httpMethod === 'POST') {
    return handlePost(event)
  }

  return bad(405, 'Method not allowed')
}
