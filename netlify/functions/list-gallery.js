import { ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getS3Client, BUCKET, KEY_PREFIX } from '../../server/s3Client.js'

const CACHE_MAX = 60

export async function handler(event) {
  if (event.httpMethod && event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  try {
    const client = getS3Client()
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: KEY_PREFIX,
      MaxKeys: 50,
    })

    const { Contents = [] } = await client.send(command)
    const filtered = Contents.filter((item) => item.Key && !item.Key.endsWith('/')).sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))

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
      },
      body: JSON.stringify({ items }),
    }
  } catch (error) {
    console.error('list-gallery error', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Unable to list gallery' }) }
  }
}
