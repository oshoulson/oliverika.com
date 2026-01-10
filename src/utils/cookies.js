export const readCookie = (name) => {
  if (typeof document === 'undefined') return null
  const encodedName = encodeURIComponent(name)
  const parts = String(document.cookie || '').split('; ')
  for (const part of parts) {
    if (!part) continue
    const index = part.indexOf('=')
    const rawKey = index === -1 ? part : part.slice(0, index)
    if (rawKey === encodedName) {
      return index === -1 ? '' : part.slice(index + 1)
    }
  }
  return null
}

export const writeCookie = (name, value, options = {}) => {
  if (typeof document === 'undefined') return
  const {
    maxAgeSeconds = 60 * 60 * 24 * 365,
    path = '/',
    sameSite = 'Lax',
    secure = typeof location !== 'undefined' ? location.protocol === 'https:' : false,
  } = options

  const encodedName = encodeURIComponent(name)
  const encodedValue = value == null ? '' : String(value)
  let cookie = `${encodedName}=${encodedValue}`
  if (typeof maxAgeSeconds === 'number') cookie += `; Max-Age=${Math.floor(maxAgeSeconds)}`
  if (path) cookie += `; Path=${path}`
  if (sameSite) cookie += `; SameSite=${sameSite}`
  if (secure) cookie += '; Secure'
  document.cookie = cookie
}

export const deleteCookie = (name, options = {}) => {
  writeCookie(name, '', { ...options, maxAgeSeconds: 0 })
}

export const readJsonCookie = (name) => {
  const raw = readCookie(name)
  if (!raw) return null
  try {
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    return null
  }
}

export const writeJsonCookie = (name, value, options = {}) => {
  if (value == null) {
    deleteCookie(name, options)
    return
  }
  const encoded = encodeURIComponent(JSON.stringify(value))
  writeCookie(name, encoded, options)
}
