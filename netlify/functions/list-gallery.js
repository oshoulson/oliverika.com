import { ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getS3Client, BUCKET, KEY_PREFIX_WITH_SLASH } from '../../server/s3Client.js'

const normalizePrefix = (value = '') => value.trim().replace(/^\/+|\/+$/g, '')
const doodlePrefixValue = normalizePrefix(process.env.WEDDING_S3_DOODLE_PREFIX || (KEY_PREFIX_WITH_SLASH ? `${KEY_PREFIX_WITH_SLASH}doodles` : 'doodles'))
const DOODLE_PREFIX = normalizePrefix(doodlePrefixValue)
const DOODLE_PREFIX_WITH_SLASH = DOODLE_PREFIX ? `${DOODLE_PREFIX}/` : ''
const GUEST_LIST_PREFIX = normalizePrefix(KEY_PREFIX_WITH_SLASH ? `${KEY_PREFIX_WITH_SLASH}guest-list` : 'guest-list')
const GUEST_LIST_PREFIX_WITH_SLASH = GUEST_LIST_PREFIX ? `${GUEST_LIST_PREFIX}/` : ''

const isImageKey = (key) => /\.(png|jpe?g|gif|webp|avif|heic)$/i.test(key)

const CACHE_MAX = 60
// Newest photos shown in the gallery; each one costs a signed URL per request.
const GALLERY_MAX = 300

export async function handler(event) {
  if (event.httpMethod && event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  try {
    const client = getS3Client()
    // Page through the whole prefix: keys list oldest-first, so a single
    // capped page would never show uploads past the first MaxKeys objects.
    const Contents = []
    let ContinuationToken
    do {
      const page = await client.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: KEY_PREFIX_WITH_SLASH || undefined,
          ContinuationToken,
        }),
      )
      Contents.push(...(page.Contents || []))
      ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (ContinuationToken)

    const filtered = Contents.filter((item) => {
      if (!item.Key || item.Key.endsWith('/')) return false
      if (DOODLE_PREFIX_WITH_SLASH && item.Key.startsWith(DOODLE_PREFIX_WITH_SLASH)) return false
      if (GUEST_LIST_PREFIX_WITH_SLASH && item.Key.startsWith(GUEST_LIST_PREFIX_WITH_SLASH)) return false
      if (!isImageKey(item.Key)) return false
      return true
    })
      .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
      .slice(0, GALLERY_MAX)

    const items = await Promise.all(
      filtered.map(async (item) => {
        const getObjectCommand = new GetObjectCommand({ Bucket: BUCKET, Key: item.Key })
        const signedUrl = await getSignedUrl(client, getObjectCommand, { expiresIn: 60 * 10 })
        return {
          key: item.Key,
          lastModified: item.LastModified,
          size: item.Size,
          url: signedUrl,
        }
      })
    )

    return {
      statusCode: 200,
      headers: {
        'Cache-Control': `public, max-age=${CACHE_MAX}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    }
  } catch (error) {
    console.error('list-gallery error', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to list gallery' }) }
  }
}
