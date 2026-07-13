import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'
import { getS3Client, BUCKET, KEY_PREFIX_WITH_SLASH } from '../../server/s3Client.js'

const LEGACY_KEY = `${KEY_PREFIX_WITH_SLASH || ''}guest-list.json`
const HOUSEHOLDS_PREFIX = `${KEY_PREFIX_WITH_SLASH || ''}guest-list/households/`
const INDEX_KEY = `${KEY_PREFIX_WITH_SLASH || ''}guest-list/index.json`
const HISTORY_PREFIX = `${KEY_PREFIX_WITH_SLASH || ''}guest-list/history/`
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

const bad = (statusCode, message, extra = {}) => ({
  statusCode,
  headers,
  body: JSON.stringify({ error: message, ...extra }),
})

const householdKeyForId = (id) => `${HOUSEHOLDS_PREFIX}${encodeURIComponent(String(id))}.json`
const householdIdFromKey = (key) => {
  if (typeof key !== 'string') return null
  if (!key.startsWith(HOUSEHOLDS_PREFIX) || !key.endsWith('.json')) return null
  const encoded = key.slice(HOUSEHOLDS_PREFIX.length, -'.json'.length)
  try {
    return decodeURIComponent(encoded)
  } catch {
    return encoded
  }
}

const getJsonObject = async (key) => {
  try {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    )
    const text = await streamToString(response.Body)
    return JSON.parse(text || 'null')
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode || 500
    if (status === 404) return null
    throw error
  }
}

// Same as getJsonObject, but also returns the object's S3 LastModified so
// callers can backfill a "when was this last touched" timestamp for records
// saved before that field existed on the record itself.
const getJsonObjectWithMeta = async (key) => {
  try {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    )
    const text = await streamToString(response.Body)
    return { value: JSON.parse(text || 'null'), lastModified: response.LastModified || null }
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode || 500
    if (status === 404) return { value: null, lastModified: null }
    throw error
  }
}

// Mirrors GuestListManager.jsx's hasResponded() so legacy households (saved
// before rsvpRespondedAt existed) can still be placed correctly in the RSVP
// recency sort.
const hasRespondedServer = (household) => {
  if (household?.rsvpLocked) return true
  const guests = Array.isArray(household?.guests) ? household.guests : []
  return guests.some((guest) => {
    const status = String(guest?.rsvpStatus || '').trim()
    return status && !['Awaiting response', 'Not offered', 'Tentative', ''].includes(status)
  })
}

// Newest-first history snapshots for a single household id. Used by the
// recovery UI so an accidental edit/deletion can be reviewed and restored.
const MAX_HISTORY_ENTRIES = 100
const listHistorySnapshots = async (id) => {
  const prefix = `${HISTORY_PREFIX}${encodeURIComponent(String(id))}/`
  const objects = []
  let continuationToken = undefined

  while (true) {
    const response = await getS3Client().send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    )
    const contents = Array.isArray(response.Contents) ? response.Contents : []
    contents.forEach((entry) => {
      const key = entry?.Key
      if (typeof key === 'string' && key.endsWith('.json')) {
        objects.push({ key, lastModified: entry.LastModified || null })
      }
    })
    if (!response.IsTruncated) break
    continuationToken = response.NextContinuationToken
  }

  // Newest first; fall back to the timestamp embedded in the key when S3 omits LastModified.
  objects.sort((a, b) => {
    const aTime = a.lastModified ? new Date(a.lastModified).getTime() : 0
    const bTime = b.lastModified ? new Date(b.lastModified).getTime() : 0
    if (aTime !== bTime) return bTime - aTime
    return b.key.localeCompare(a.key)
  })

  const limited = objects.slice(0, MAX_HISTORY_ENTRIES)
  const entries = await mapLimit(limited, 10, async ({ key }) => {
    try {
      const snapshot = await getJsonObject(key)
      if (!snapshot || typeof snapshot !== 'object') return null
      return {
        key,
        recordedAt: snapshot.recordedAt || null,
        action: snapshot.action || null,
        household: snapshot.household ?? null,
      }
    } catch (error) {
      console.error('guest-list history read error', { key, error })
      return null
    }
  })

  return entries.filter(Boolean)
}

const listHouseholdObjects = async () => {
  const keys = []
  let continuationToken = undefined
  let newestLastModified = null

  while (true) {
    const response = await getS3Client().send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: HOUSEHOLDS_PREFIX,
        ContinuationToken: continuationToken,
      }),
    )

    const contents = Array.isArray(response.Contents) ? response.Contents : []
    contents.forEach((entry) => {
      const key = entry?.Key
      if (typeof key === 'string' && key.endsWith('.json')) {
        keys.push(key)
        if (entry.LastModified && (!newestLastModified || entry.LastModified > newestLastModified)) {
          newestLastModified = entry.LastModified
        }
      }
    })

    if (!response.IsTruncated) break
    continuationToken = response.NextContinuationToken
  }

  return { keys, newestLastModified }
}

const mapLimit = async (items, limit, mapper) => {
  const results = new Array(items.length)
  let cursor = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(items[index], index)
    }
  })

  await Promise.all(workers)
  return results
}

// Append-only backup. Every save and every delete writes an immutable,
// timestamped snapshot under guest-list/history/<id>/ that is never overwritten
// or removed, so data can be recovered after an accidental edit or deletion.
// Best-effort: a history failure is logged but never fails the primary save.
const writeHistorySnapshot = async (client, { id, action, household }) => {
  if (!id) return
  const recordedAt = new Date().toISOString()
  const safeStamp = recordedAt.replace(/[:.]/g, '-')
  const key = `${HISTORY_PREFIX}${encodeURIComponent(String(id))}/${safeStamp}-${randomUUID()}.json`
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: JSON.stringify({ id: String(id), action, recordedAt, household: household ?? null }),
        ContentType: 'application/json',
      }),
    )
  } catch (error) {
    console.error('guest-list history write error', { id, action, error })
  }
}

const handleGetHistory = async (id) => {
  if (!BUCKET) {
    return bad(500, 'Missing S3 bucket configuration')
  }
  if (!id || !String(id).trim()) {
    return bad(400, 'Missing household id')
  }
  try {
    const history = await listHistorySnapshots(String(id).trim())
    return ok({ id: String(id).trim(), history })
  } catch (error) {
    console.error('guest-list history list error', error)
    const status = error?.$metadata?.httpStatusCode || 500
    return bad(status === 403 ? 403 : 500, 'Unable to load household history', {
      detail: error?.message || null,
      code: error?.name || null,
    })
  }
}

const handleGet = async (event) => {
  const historyId = event?.queryStringParameters?.history
  if (historyId) {
    return handleGetHistory(historyId)
  }
  if (!BUCKET) {
    return bad(500, 'Missing S3 bucket configuration')
  }
  try {
    const index = await getJsonObject(INDEX_KEY)
    const householdIds = Array.isArray(index?.householdIds) ? index.householdIds.filter((id) => typeof id === 'string' && id.trim()) : null
    if (householdIds && householdIds.length > 0) {
      const entries = await mapLimit(householdIds, 10, async (id) => {
        try {
          const { value, lastModified } = await getJsonObjectWithMeta(householdKeyForId(id))
          if (value && typeof value === 'object' && !value.rsvpRespondedAt && lastModified && hasRespondedServer(value)) {
            value.rsvpRespondedAt = lastModified.toISOString()
          }
          return value
        } catch (error) {
          console.error('guest-list household get error', { id, error })
          return null
        }
      })
      const households = entries.filter((entry) => entry && typeof entry === 'object')
      return ok({ households, updatedAt: index?.updatedAt || null })
    }

    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: LEGACY_KEY,
      }),
    )
    const text = await streamToString(response.Body)
    const parsed = JSON.parse(text || '{}')
    const households = Array.isArray(parsed.households) ? parsed.households : []
    return ok({ households, updatedAt: parsed.updatedAt || null })
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode || 500
    if (status === 404) {
      return ok({ households: [], updatedAt: null })
    }
    console.error('guest-list get error', error)
    return bad(status === 403 ? 403 : 500, 'Unable to load guest list', {
      detail: error?.message || null,
      code: error?.name || null,
    })
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
    console.error('guest-list payload parse error', error)
    return bad(400, 'Invalid JSON')
  }

  const upserts = Array.isArray(payload.upserts) ? payload.upserts : null
  const deletes = Array.isArray(payload.deletes) ? payload.deletes : null
  const legacyHouseholds = Array.isArray(payload.households) ? payload.households : null

  if (!upserts && !deletes && !legacyHouseholds) {
    return bad(400, 'Expected { upserts, deletes } or { households }')
  }

  try {
    const client = getS3Client()

    if (legacyHouseholds) {
      const deduped = legacyHouseholds.filter((entry) => entry && typeof entry === 'object' && entry.id)
      await mapLimit(deduped, 8, async (household) => {
        await client.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: householdKeyForId(household.id),
            Body: JSON.stringify(household),
            ContentType: 'application/json',
          }),
        )
        await writeHistorySnapshot(client, { id: household.id, action: 'upsert', household })
      })
      const indexBody = JSON.stringify({ householdIds: deduped.map((household) => String(household.id)), updatedAt: new Date().toISOString() })
      await client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: INDEX_KEY,
          Body: indexBody,
          ContentType: 'application/json',
        }),
      )
      return ok({ saved: true, upserted: deduped.length, deleted: 0, migrated: true })
    }

    const deleteIds = deletes ? deletes.filter((id) => typeof id === 'string' && id.trim()) : []
    const upsertHouseholds = upserts ? upserts.filter((entry) => entry && typeof entry === 'object' && entry.id) : []

    let index = await getJsonObject(INDEX_KEY)
    let householdIds = Array.isArray(index?.householdIds) ? index.householdIds.filter((id) => typeof id === 'string' && id.trim()) : null

    if (!householdIds) {
      const legacy = await getJsonObject(LEGACY_KEY)
      const legacyList = Array.isArray(legacy?.households) ? legacy.households.filter((entry) => entry && typeof entry === 'object' && entry.id) : null
      if (legacyList && legacyList.length > 0) {
        await mapLimit(legacyList, 8, async (household) => {
          await client.send(
            new PutObjectCommand({
              Bucket: BUCKET,
              Key: householdKeyForId(household.id),
              Body: JSON.stringify(household),
              ContentType: 'application/json',
            }),
          )
        })
        householdIds = legacyList.map((household) => String(household.id))
      } else {
        const { keys } = await listHouseholdObjects()
        householdIds = keys.map(householdIdFromKey).filter(Boolean)
      }
    }

    const householdIdSet = new Set(householdIds || [])

    await mapLimit(upsertHouseholds, 8, async (household) => {
      await client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: householdKeyForId(household.id),
          Body: JSON.stringify(household),
          ContentType: 'application/json',
        }),
      )
      await writeHistorySnapshot(client, { id: household.id, action: 'upsert', household })
    })

    upsertHouseholds.forEach((household) => householdIdSet.add(String(household.id)))

    await mapLimit(deleteIds, 8, async (id) => {
      // Capture the last known state before removing it, so deletions are recoverable.
      let lastState = null
      try {
        lastState = await getJsonObject(householdKeyForId(id))
      } catch (error) {
        console.error('guest-list pre-delete read error', { id, error })
      }
      await writeHistorySnapshot(client, { id, action: 'delete', household: lastState })
      await client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: householdKeyForId(id),
        }),
      )
    })
    deleteIds.forEach((id) => householdIdSet.delete(String(id)))

    const updatedAt = new Date().toISOString()
    const indexBody = JSON.stringify({ householdIds: [...householdIdSet], updatedAt })
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: INDEX_KEY,
        Body: indexBody,
        ContentType: 'application/json',
      }),
    )

    return ok({ saved: true, upserted: upsertHouseholds.length, deleted: deleteIds.length, updatedAt })
  } catch (error) {
    console.error('guest-list save error', error)
    const status = error?.$metadata?.httpStatusCode || 500
    return bad(status === 403 ? 403 : 500, 'Unable to save guest list', {
      detail: error?.message || null,
      code: error?.name || null,
    })
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
    return handleGet(event)
  }

  if (event.httpMethod === 'POST') {
    return handlePost(event)
  }

  return bad(405, 'Method not allowed')
}
