import { randomUUID } from 'node:crypto'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getS3Client, BUCKET, KEY_PREFIX_WITH_SLASH } from '../../server/s3Client.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { filename, contentType = 'application/octet-stream', metadata = {} } = body

    if (!filename) {
      return { statusCode: 400, body: JSON.stringify({ error: 'filename is required' }) }
    }

    const safeName = filename.replace(/\s+/g, '-').toLowerCase()
    const key = `${KEY_PREFIX_WITH_SLASH}${new Date().toISOString()}-${randomUUID()}-${safeName}`

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      Metadata: {
        uploader: metadata.uploader || 'anonymous',
        email: metadata.email || 'unknown',
      },
    })

    const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 60 * 5 })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadUrl,
        key,
        expiresIn: 300,
      }),
    }
  } catch (error) {
    console.error('get-upload-url error', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to create upload URL' }) }
  }
}
