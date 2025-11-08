import { S3Client } from '@aws-sdk/client-s3'

const requiredEnv = ['WEDDING_AWS_ACCESS_KEY_ID', 'WEDDING_AWS_SECRET_ACCESS_KEY', 'WEDDING_AWS_REGION', 'WEDDING_S3_BUCKET', 'WEDDING_S3_PREFIX']

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[s3Client] Missing environment variable: ${key}`)
  }
})

export const BUCKET = process.env.WEDDING_S3_BUCKET
export const KEY_PREFIX = process.env.WEDDING_S3_PREFIX?.replace(/^\/+|\/+$|\s+/g, '')

let client

export function getS3Client() {
  if (!client) {
    client = new S3Client({
      region: process.env.WEDDING_AWS_REGION,
      credentials: {
        accessKeyId: process.env.WEDDING_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.WEDDING_AWS_SECRET_ACCESS_KEY,
      },
    })
  }
  return client
}
