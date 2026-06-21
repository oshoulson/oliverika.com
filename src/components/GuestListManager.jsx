import { useEffect, useMemo, useRef, useState } from 'react'
import { readJsonCookie, writeCookie, deleteCookie } from '../utils/cookies.js'
/* eslint-disable react-refresh/only-export-components */

const AUTH_STORAGE_KEY = 'oliverikaGuestListAuth'
export const DATA_STORAGE_KEY = 'oliverikaGuestListData'
const VIEW_PREFS_KEY = 'oliverikaGuestListViewPrefs'
const PASSWORD = import.meta.env.VITE_GUEST_LIST_PASSWORD || 'macbeth'
const FUNCTIONS_BASE = '/.netlify/functions'

export const normalizeSlug = (value) => {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const withoutDiacritics = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return withoutDiacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+/g, '')
    .replace(/_+/g, '_')
}

export const slugify = (text) => {
  const cleaned = normalizeSlug(text).replace(/_+$/g, '')
  return cleaned || `invite_${Math.random().toString(16).slice(2)}`
}

const createId = (prefix) => {
  const idSource = globalThis.crypto?.randomUUID?.() || Math.random().toString(16).slice(2)
  return `${prefix}-${idSource}`
}

const seedHouseholds = [
  {
    id: createId('household'),
    envelopeName: 'The Shoulson Family',
    slug: slugify('The Shoulson Family'),
    invitedBy: 'Groom',
    address: {
      line1: '42 Garden Terrace',
      city: 'Brookline',
      state: 'MA',
      postalCode: '02446',
      country: 'USA',
    },
    email: 'parents@example.com',
    phone: '(617) 555-1198',
    saveTheDateSent: true,
    invitationSent: false,
    tischInvited: true,
    plusOneAllowed: false,
    plusOneAccepted: false,
    rsvpStatus: 'Awaiting response',
    table: 'Parents',
    dietaryRestrictions: 'None',
    notes: 'Prefer seating close to dance floor.',
    rsvpLocked: false,
    guests: [
      {
        id: createId('guest'),
        name: 'Oliver Shoulson',
        role: 'Groom',
        type: 'primary',
        rsvpStatus: 'Accepted',
        tischRsvp: 'Attending',
        dietary: 'None',
      },
      {
        id: createId('guest'),
        name: 'Erika L.',
        role: 'Bride',
        type: 'primary',
        rsvpStatus: 'Accepted',
        tischRsvp: 'Attending',
        dietary: 'Vegetarian',
      },
    ],
  },
  {
    id: createId('household'),
    envelopeName: 'Alex & Jordan Rivera',
    slug: slugify('Alex & Jordan Rivera'),
    invitedBy: 'Both',
    address: {
      line1: '18 Beacon Street Apt 4C',
      city: 'Boston',
      state: 'MA',
      postalCode: '02108',
      country: 'USA',
    },
    email: 'riveras@example.com',
    phone: '(617) 555-2222',
    saveTheDateSent: true,
    invitationSent: true,
    tischInvited: false,
    plusOneAllowed: true,
    plusOneAccepted: false,
    rsvpStatus: 'Awaiting response',
    table: 'TBD',
    dietaryRestrictions: 'None',
    notes: 'Tight travel schedule; follow up after July 1.',
    rsvpLocked: false,
    guests: [
      {
        id: createId('guest'),
        name: 'Alex Rivera',
        role: 'College friend',
        type: 'primary',
        rsvpStatus: 'Awaiting response',
        tischRsvp: 'Not invited',
        dietary: 'None',
      },
      {
        id: createId('guest'),
        name: 'Jordan Rivera',
        role: 'Partner',
        type: 'primary',
        rsvpStatus: 'Awaiting response',
        tischRsvp: 'Not invited',
        dietary: 'Gluten free',
      },
      {
        id: createId('guest'),
        name: 'Plus One (TBD)',
        role: 'Optional guest',
        type: 'plus-one',
        rsvpStatus: 'Not offered',
        tischRsvp: 'Not invited',
        dietary: 'None',
      },
    ],
  },
  {
    id: createId('household'),
    envelopeName: 'Riley Morgan & Family',
    slug: slugify('Riley Morgan & Family'),
    invitedBy: 'Bride',
    address: {
      line1: '510 Cedar Lane',
      city: 'Hartford',
      state: 'CT',
      postalCode: '06103',
      country: 'USA',
    },
    email: 'riley.m@example.com',
    phone: '(860) 555-8765',
    saveTheDateSent: false,
    invitationSent: false,
    tischInvited: false,
    plusOneAllowed: false,
    plusOneAccepted: false,
    rsvpStatus: 'Awaiting response',
    table: 'Kids table?',
    dietaryRestrictions: 'Kosher style',
    notes: 'Driving in day-of; add parking pass.',
    rsvpLocked: false,
    guests: [
      {
        id: createId('guest'),
        name: 'Riley Morgan',
        role: 'Cousin',
        type: 'primary',
        rsvpStatus: 'Awaiting response',
        tischRsvp: 'Not invited',
        dietary: 'Kosher style',
      },
      {
        id: createId('guest'),
        name: 'Taylor Morgan',
        role: 'Spouse',
        type: 'primary',
        rsvpStatus: 'Awaiting response',
        tischRsvp: 'Not invited',
        dietary: 'None',
      },
      {
        id: createId('guest'),
        name: 'Jamie Morgan',
        role: 'Child',
        type: 'child',
        rsvpStatus: 'Awaiting response',
        tischRsvp: 'Not invited',
        dietary: 'Peanut allergy',
      },
    ],
  },
]

const rsvpOptions = ['Awaiting response', 'Both events', 'Ceremony only', 'Reception only', 'Not attending']
const dietaryOptions = ['None', 'Vegetarian', 'Vegan', 'Gluten Free', 'Dairy Free', 'Peanut Allergy', 'Other']
const invitedByOptions = ['Bride', 'Groom', 'Both']
const tischRsvpOptions = ['Awaiting response', 'Attending', 'Not attending', 'Not invited']
const eventStatusFilterOptions = [
  { value: 'all', label: 'All' },
  { value: 'yes', label: 'Attending' },
  { value: 'no', label: 'Not attending' },
  { value: 'awaiting', label: 'Awaiting' },
]
const checkboxClass =
  'h-4 w-4 rounded border border-sage/50 bg-white text-sage-dark checked:bg-sage checked:border-sage focus:ring-2 focus:ring-sage/30 focus:ring-offset-1 transition'
const selectClass =
  'w-full rounded-lg border border-sage/30 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/30'
const inputClass =
  'w-full rounded-lg border border-sage/20 bg-white/90 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/30'
const mobileFieldLabelClass =
  'flex flex-col gap-0.5 text-[0.7rem] font-semibold uppercase tracking-normal text-sage-dark/70'
const mobileCheckboxLabelClass = 'flex items-center gap-2 text-sm font-medium text-charcoal/80'

const ceremonyStateFor = (status) =>
  status === 'Awaiting response' ? 'awaiting' : ['Both events', 'Ceremony only'].includes(status) ? 'yes' : 'no'
const receptionStateFor = (status) =>
  status === 'Awaiting response' ? 'awaiting' : ['Both events', 'Reception only'].includes(status) ? 'yes' : 'no'
const tischStateFor = (tischRsvp, invited) => {
  if (!invited || tischRsvp === 'Not invited') return 'na'
  if (tischRsvp === 'Attending') return 'yes'
  if (tischRsvp === 'Not attending') return 'no'
  return 'awaiting'
}
// A household counts as "responded" once its RSVP is locked in from the form,
// or any guest has a decided (non-awaiting) response.
const hasResponded = (household) =>
  Boolean(household?.rsvpLocked) ||
  (household?.guests || []).some((guest) => normalizeRsvpStatus(guest.rsvpStatus) !== 'Awaiting response')

// Per-guest, per-event state used by the summary list badges.
const guestEventState = (household, guest, eventKey) => {
  if (eventKey === 'tischRsvp') {
    return tischStateFor(guest.tischRsvp, household?.tischInvited)
  }
  const status = normalizeRsvpStatus(guest.rsvpStatus)
  if (eventKey === 'ceremonyRsvp') return ceremonyStateFor(status)
  return receptionStateFor(status)
}

// Aggregate badge for a household + event: "attending/total", color by mix.
const eventSummaryBadge = (household, eventKey) => {
  const guests = household?.guests || []
  if (eventKey === 'tischRsvp' && !household?.tischInvited) {
    return { label: 'n/a', className: 'bg-charcoal/5 text-charcoal/40' }
  }
  let yes = 0
  let no = 0
  let awaiting = 0
  let total = 0
  guests.forEach((guest) => {
    const state = guestEventState(household, guest, eventKey)
    if (state === 'na') return
    total += 1
    if (state === 'yes') yes += 1
    else if (state === 'no') no += 1
    else awaiting += 1
  })
  if (total === 0) {
    return { label: 'n/a', className: 'bg-charcoal/5 text-charcoal/40' }
  }
  const label = `${yes}/${total}`
  if (yes === total) return { label, className: 'bg-sage text-white' }
  if (yes === 0 && no > 0 && awaiting === 0) return { label, className: 'bg-rose-100 text-rose-700' }
  return { label, className: 'bg-amber-100 text-amber-800' }
}

const animationStyles = `
@keyframes guestRowFadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes householdPulse {
  0% { box-shadow: 0 8px 18px -8px rgba(71, 85, 60, 0.18); }
  100% { box-shadow: 0 12px 28px -10px rgba(71, 85, 60, 0.28); }
}
`

const createDefaultFilters = () => ({
  envelopeName: '',
  customSlug: '',
  invitedBy: 'all',
  invitationSent: 'any',
  saveTheDateSent: 'any',
  plusOneAllowed: 'any',
  plusOneAccepted: 'any',
  tischInvited: 'any',
  rsvpStatus: 'all',
  responseReceived: 'any',
  ceremonyStatus: 'all',
  receptionStatus: 'all',
  tischStatus: 'all',
  dietaryRestrictions: '',
  table: '',
  email: '',
  phone: '',
  address: '',
})

const sanitizeViewPrefs = (prefs) => {
  if (!prefs || typeof prefs !== 'object') return null

  const defaultFilters = createDefaultFilters()
  const rawFilters = prefs.filters && typeof prefs.filters === 'object' ? prefs.filters : {}
  const filters = Object.fromEntries(
    Object.entries(defaultFilters).map(([key, defaultValue]) => {
      const incoming = rawFilters[key]
      return [key, typeof defaultValue === 'string' ? String(incoming ?? defaultValue) : defaultValue]
    }),
  )

  const eventStatusValues = ['all', 'yes', 'no', 'awaiting']
  if (!['all', ...invitedByOptions].includes(filters.invitedBy)) filters.invitedBy = 'all'
  if (!['any', 'yes', 'no'].includes(filters.invitationSent)) filters.invitationSent = 'any'
  if (!['any', 'yes', 'no'].includes(filters.saveTheDateSent)) filters.saveTheDateSent = 'any'
  if (!['any', 'yes', 'no'].includes(filters.plusOneAllowed)) filters.plusOneAllowed = 'any'
  if (!['any', 'yes', 'no'].includes(filters.plusOneAccepted)) filters.plusOneAccepted = 'any'
  if (!['any', 'yes', 'no'].includes(filters.tischInvited)) filters.tischInvited = 'any'
  if (!['all', ...rsvpOptions].includes(filters.rsvpStatus)) filters.rsvpStatus = 'all'
  if (!['any', 'received', 'not'].includes(filters.responseReceived)) filters.responseReceived = 'any'
  if (!eventStatusValues.includes(filters.ceremonyStatus)) filters.ceremonyStatus = 'all'
  if (!eventStatusValues.includes(filters.receptionStatus)) filters.receptionStatus = 'all'
  if (!eventStatusValues.includes(filters.tischStatus)) filters.tischStatus = 'all'

  return {
    filters,
    showSeatingView: typeof prefs.showSeatingView === 'boolean' ? prefs.showSeatingView : null,
  }
}

const loadViewPrefs = () => {
  if (typeof window === 'undefined') return null
  const fromCookie = sanitizeViewPrefs(readJsonCookie(VIEW_PREFS_KEY))
  if (fromCookie) return fromCookie
  try {
    const stored = JSON.parse(window.localStorage.getItem(VIEW_PREFS_KEY) || 'null')
    return sanitizeViewPrefs(stored)
  } catch {
    return null
  }
}

const persistViewPrefs = (prefs) => {
  if (typeof window === 'undefined') return
  const payload = { v: 1, ...prefs }
  const maxCookieLength = 3800

  let cookieWritten = false
  try {
    const encoded = encodeURIComponent(JSON.stringify(payload))
    if (encoded.length <= maxCookieLength) {
      writeCookie(VIEW_PREFS_KEY, encoded, { maxAgeSeconds: 60 * 60 * 24 * 365 })
      cookieWritten = true
    }
  } catch {
    cookieWritten = false
  }
  if (!cookieWritten) {
    deleteCookie(VIEW_PREFS_KEY)
  }

  try {
    window.localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }
}

const toYesNo = (value) => (value ? 'Yes' : 'No')
const formatAddress = (address = {}) => {
  const parts = [address.line1, address.city, address.state, address.postalCode, address.country].filter(Boolean)
  return parts.join(', ') || 'No address yet'
}

const blankHousehold = () => ({
  id: createId('household'),
  envelopeName: 'New household',
  customSlug: '',
  slug: slugify('New household'),
  invitedBy: 'Both',
  address: { line1: '', city: '', state: '', postalCode: '', country: '' },
  email: '',
  phone: '',
  saveTheDateSent: false,
  invitationSent: false,
  tischInvited: false,
  plusOneAllowed: false,
  plusOneAccepted: false,
  rsvpStatus: 'Awaiting response',
  table: '',
  dietaryRestrictions: 'None',
  notes: '',
  rsvpLocked: false,
  guests: [
    {
      id: createId('guest'),
    name: 'Primary guest',
    role: '',
    type: 'primary',
    rsvpStatus: 'Awaiting response',
    tischRsvp: 'Not invited',
    dietary: 'None',
  },
  ],
})

const normalizeRsvpStatus = (status) => {
  const value = (status || '').trim()
  if (['Both events', 'Ceremony only', 'Reception only', 'Not attending', 'Awaiting response'].includes(value)) {
    return value
  }
  if (value === 'Accepted') return 'Both events'
  if (value === 'Declined') return 'Not attending'
  if (value === 'Tentative' || value === 'Not offered') return 'Awaiting response'
  return 'Awaiting response'
}

const normalizeTischRsvp = (status, invited) => {
  const invitedFlag = Boolean(invited)
  if (!invitedFlag) return 'Not invited'
  const value = (status || '').trim()
  if (['Attending', 'Not attending', 'Awaiting response'].includes(value)) {
    return value
  }
  return 'Awaiting response'
}

const ensureDerivedFields = (household) => ({
  ...household,
  customSlug: (() => {
    const derived = slugify(household.envelopeName || 'household')
    const incomingRaw = String(household.customSlug ?? '').trim()
    const incomingKey = normalizeSlug(incomingRaw)
    if (incomingKey) return incomingRaw
    const legacy = normalizeSlug(household.slug)
    return legacy && legacy !== derived ? legacy : ''
  })(),
  slug: (() => {
    const derived = slugify(household.envelopeName || 'household')
    const custom = normalizeSlug(household.customSlug)
    if (custom) return custom
    const legacy = normalizeSlug(household.slug)
    return legacy && legacy !== derived ? legacy : derived
  })(),
  tischInvited: Boolean(household.tischInvited),
  plusOneAccepted: Boolean(household.plusOneAccepted),
  rsvpLocked: Boolean(household.rsvpLocked),
  guests: (household.guests || []).map((guest) => ({
    ...guest,
    rsvpStatus: normalizeRsvpStatus(guest.rsvpStatus),
    tischRsvp: normalizeTischRsvp(guest.tischRsvp, household.tischInvited),
    dietary: guest.dietary || 'None',
  })),
})

export const loadInitialHouseholds = () => {
  if (typeof window === 'undefined') return seedHouseholds.map(ensureDerivedFields)
  try {
    const stored = window.localStorage.getItem(DATA_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(ensureDerivedFields)
      }
    }
  } catch (error) {
    console.warn('Unable to read guest list from storage', error)
  }
  return seedHouseholds.map(ensureDerivedFields)
}

export default function GuestListManager() {
  const initialHouseholds = useMemo(loadInitialHouseholds, [])
  const initialViewPrefs = useMemo(loadViewPrefs, [])
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState('')
  const [households, setHouseholds] = useState(initialHouseholds)
  const householdsRef = useRef(initialHouseholds)
  const [remoteStatus, setRemoteStatus] = useState('idle')
  const [remoteError, setRemoteError] = useState('')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [showSeatingView, setShowSeatingView] = useState(Boolean(initialViewPrefs?.showSeatingView))
  const [filters, setFilters] = useState(() => ({ ...createDefaultFilters(), ...(initialViewPrefs?.filters || {}) }))
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(null)
  const saveTimer = useRef(null)
  const viewPrefsTimer = useRef(null)
  const isSavingRef = useRef(false)
  const dirtyUpsertsRef = useRef(new Set())
  const dirtyDeletesRef = useRef(new Set())
  const exportMenuRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const authed = window.localStorage.getItem(AUTH_STORAGE_KEY)
      if (authed === 'true') {
        setIsAuthorized(true)
      }
    } catch (error) {
      console.warn('Unable to read guest list auth flag', error)
    }
  }, [])

  useEffect(() => {
    householdsRef.current = households
  }, [households])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(households))
    } catch (error) {
      console.warn('Unable to persist guest list', error)
    }
  }, [households])

  useEffect(() => {
    if (typeof window === 'undefined') return () => {}
    if (viewPrefsTimer.current) {
      clearTimeout(viewPrefsTimer.current)
    }

    viewPrefsTimer.current = setTimeout(() => {
      persistViewPrefs({ filters, showSeatingView })
    }, 200)

    return () => {
      if (viewPrefsTimer.current) {
        clearTimeout(viewPrefsTimer.current)
      }
    }
  }, [filters, showSeatingView])

  useEffect(() => {
    let cancelled = false
    const loadRemote = async () => {
      setRemoteStatus('loading')
      setRemoteError('')
      try {
        const response = await fetch(`${FUNCTIONS_BASE}/guest-list`)
        if (!response.ok) {
          throw new Error('Unable to load guest list')
        }
        const data = await response.json()
        if (!Array.isArray(data.households)) {
          throw new Error('Guest list response invalid')
        }
        const mapped = data.households.map(ensureDerivedFields)
        if (!cancelled) {
          setHouseholds(mapped)
          try {
            window.localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(mapped))
          } catch (error) {
            console.warn('Unable to cache guest list', error)
          }
          setRemoteStatus('ready')
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setRemoteStatus('error')
          setRemoteError(error.message || 'Unable to load guest list')
        }
      }
    }
    loadRemote()
    return () => {
      cancelled = true
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return () => {}
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const persistGuestList = async () => {
    if (isSavingRef.current) return
    const upsertIds = [...dirtyUpsertsRef.current]
    const deleteIds = [...dirtyDeletesRef.current]
    if (upsertIds.length === 0 && deleteIds.length === 0) return

    const latestHouseholds = householdsRef.current
    const upserts = latestHouseholds.filter((household) => upsertIds.includes(household.id))
    isSavingRef.current = true
    setRemoteStatus((status) => (status === 'loading' ? 'loading' : 'saving'))
    setRemoteError('')
    try {
      const response = await fetch(`${FUNCTIONS_BASE}/guest-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upserts, deletes: deleteIds }),
      })
      if (!response.ok) {
        throw new Error('Save failed')
      }
      upsertIds.forEach((id) => dirtyUpsertsRef.current.delete(id))
      deleteIds.forEach((id) => dirtyDeletesRef.current.delete(id))
      setRemoteStatus('saved')
    } catch (error) {
      console.error('save guest list error', error)
      setRemoteStatus('error')
      setRemoteError('Unable to save to server. Changes are still local.')
    } finally {
      isSavingRef.current = false
    }
  }

  const queuePersist = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
    }
    saveTimer.current = setTimeout(persistGuestList, 600)
  }

  const markHouseholdUpsert = (householdId) => {
    dirtyDeletesRef.current.delete(householdId)
    dirtyUpsertsRef.current.add(householdId)
    queuePersist()
  }

  const markHouseholdDelete = (householdId) => {
    dirtyUpsertsRef.current.delete(householdId)
    dirtyDeletesRef.current.add(householdId)
    queuePersist()
  }

  const stats = useMemo(() => {
    const invitations = households.length
    let guestCount = 0
    let maxInvited = 0
    let acceptedGuests = 0
    let awaitingInvites = 0
    const maxBreakdown = { Bride: 0, Groom: 0, Both: 0, Other: 0 }

    households.forEach((household) => {
      guestCount += household.guests.length

      const hasPlusOneGuest = household.guests.some((guest) => guest.type === 'plus-one')
      const plusOneSlot = household.plusOneAllowed && !hasPlusOneGuest ? 1 : 0
      const householdMax = household.guests.length + plusOneSlot
      maxInvited += householdMax

      const inviterKey = invitedByOptions.includes(household.invitedBy) ? household.invitedBy : 'Other'
      maxBreakdown[inviterKey] = (maxBreakdown[inviterKey] || 0) + householdMax

      const allAwaiting = household.invitationSent && household.guests.every((guest) => guest.rsvpStatus === 'Awaiting response')
      if (allAwaiting) {
        awaitingInvites += 1
      }

      household.guests.forEach((guest) => {
        if (['Both events', 'Ceremony only', 'Reception only'].includes(guest.rsvpStatus)) {
          acceptedGuests += 1
        }
      })

      if (household.plusOneAllowed && household.plusOneAccepted) {
        acceptedGuests += 1
      }
    })

    return { invitations, guestCount, maxInvited, acceptedGuests, awaitingInvites, maxBreakdown }
  }, [households])

  const selectedHousehold = useMemo(
    () => households.find((household) => household.id === selectedHouseholdId) || null,
    [selectedHouseholdId, households],
  )


  const handleAuth = (event) => {
    event.preventDefault()
    if (passwordInput.trim() !== PASSWORD) {
      setAuthError('Incorrect password. Double-check and try again.')
      return
    }
    setIsAuthorized(true)
    setAuthError('')
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(AUTH_STORAGE_KEY, 'true')
      } catch (error) {
        console.warn('Unable to persist guest list auth flag', error)
      }
    }
  }

  const handleLock = () => {
    setIsAuthorized(false)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY)
      } catch (error) {
        console.warn('Unable to clear guest list auth flag', error)
      }
    }
  }

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const resetFilters = () => {
    setFilters(createDefaultFilters())
  }

  const updateHousehold = (id, updates) => {
    setHouseholds((prev) =>
      prev.map((household) => {
        if (household.id !== id) return household
        const next = { ...household, ...updates }
        if (typeof updates.customSlug === 'string') {
          const normalizedCustom = normalizeSlug(updates.customSlug)
          next.customSlug = updates.customSlug
          next.slug = normalizedCustom || slugify(next.envelopeName || 'household')
        }
        if (typeof updates.envelopeName === 'string') {
          const hasCustom = Boolean(normalizeSlug(next.customSlug))
          if (!hasCustom) {
            const derivedOld = slugify(household.envelopeName || '')
            const normalizedOld = normalizeSlug(household.slug)
            const wasDerived = !normalizedOld || normalizedOld === derivedOld || normalizedOld.startsWith('new_household')
            if (wasDerived) {
              next.slug = slugify(updates.envelopeName)
            }
          }
        }
        if (typeof updates.tischInvited !== 'undefined') {
          const invited = Boolean(updates.tischInvited)
          next.tischInvited = invited
          next.guests = (next.guests || []).map((guest) => ({
            ...guest,
            tischRsvp: normalizeTischRsvp(guest.tischRsvp, invited),
          }))
        }
        return next
      }),
    )
    markHouseholdUpsert(id)
  }

  const updateAddressField = (id, field, value) => {
    setHouseholds((prev) =>
      prev.map((household) =>
        household.id === id ? { ...household, address: { ...household.address, [field]: value } } : household,
      ),
    )
    markHouseholdUpsert(id)
  }

  const updateGuest = (householdId, guestId, updates) => {
    setHouseholds((prev) =>
      prev.map((household) => {
        if (household.id !== householdId) return household
        const invited = Boolean(household.tischInvited)
        const guests = household.guests.map((guest) => {
          if (guest.id !== guestId) return guest
          const nextGuest = { ...guest, ...updates }
          if (typeof updates.tischRsvp !== 'undefined') {
            nextGuest.tischRsvp = normalizeTischRsvp(updates.tischRsvp, invited)
          } else {
            nextGuest.tischRsvp = normalizeTischRsvp(nextGuest.tischRsvp, invited)
          }
          return nextGuest
        })
        return { ...household, guests }
      }),
    )
    markHouseholdUpsert(householdId)
  }

  const addGuest = (householdId, type = 'primary') => {
    setHouseholds((prev) =>
      prev.map((household) => {
        if (household.id !== householdId) return household
        const invited = Boolean(household.tischInvited)
        const newGuest = {
          id: createId('guest'),
          name: type === 'plus-one' ? 'Plus One (TBD)' : 'New guest',
          role: type === 'child' ? 'Child' : '',
          type,
          rsvpStatus: type === 'plus-one' ? 'Not offered' : 'Awaiting response',
          tischRsvp: invited ? 'Awaiting response' : 'Not invited',
          dietary: 'None',
        }
        return { ...household, guests: [...household.guests, newGuest] }
      }),
    )
    markHouseholdUpsert(householdId)
  }

  const removeHousehold = (householdId) => {
    setHouseholds((prev) => prev.filter((household) => household.id !== householdId))
    setSelectedHouseholdId((current) => (current === householdId ? null : current))
    markHouseholdDelete(householdId)
  }

  const removeGuest = (householdId, guestId) => {
    setHouseholds((prev) =>
      prev.map((household) => {
        if (household.id !== householdId) return household
        const remaining = household.guests.filter((guest) => guest.id !== guestId)
        return { ...household, guests: remaining.length > 0 ? remaining : household.guests }
      }),
    )
    markHouseholdUpsert(householdId)
  }

  const visibleHouseholds = useMemo(() => {
    const textIncludes = (value, query) => String(value || '').toLowerCase().includes(String(query || '').toLowerCase())
    const eventFilterMatches = (household, eventKey, filterValue) => {
      if (filterValue === 'all') return true
      return (household.guests || []).some((guest) => guestEventState(household, guest, eventKey) === filterValue)
    }
    const filtered = households.filter((household) => {
      if (filters.envelopeName && !textIncludes(household.envelopeName, filters.envelopeName)) return false

      if (filters.responseReceived !== 'any') {
        const responded = hasResponded(household)
        if (filters.responseReceived === 'received' && !responded) return false
        if (filters.responseReceived === 'not' && responded) return false
      }

      if (filters.invitedBy !== 'all' && household.invitedBy !== filters.invitedBy) return false

      if (!eventFilterMatches(household, 'ceremonyRsvp', filters.ceremonyStatus)) return false
      if (!eventFilterMatches(household, 'receptionRsvp', filters.receptionStatus)) return false
      if (!eventFilterMatches(household, 'tischRsvp', filters.tischStatus)) return false

      return true
    })

    return [...filtered].sort((a, b) =>
      String(a.envelopeName || '').toLowerCase().localeCompare(String(b.envelopeName || '').toLowerCase()),
    )
  }, [filters, households])

  const seatingTables = useMemo(() => {
    const tableMap = new Map()
    households.forEach((household) => {
      const householdTable = (household.table || '').trim()
      const defaultTable = householdTable || 'Unassigned'
      const guests = household.guests || []
      ;(household.guests || []).forEach((guest) => {
        const tableName = (guest.table || defaultTable || '').trim() || 'Unassigned'
        const list = tableMap.get(tableName) || []
        list.push({
          id: guest.id,
          name: guest.name || 'Guest',
          household: household.envelopeName || '',
          table: tableName,
          isPlusOne: guest.type === 'plus-one',
        })
        tableMap.set(tableName, list)
      })
      const hasPlusOneGuest = guests.some((guest) => guest.type === 'plus-one')
      if (household.plusOneAllowed && household.plusOneAccepted && !hasPlusOneGuest) {
        const plusOneTable = defaultTable || 'Unassigned'
        const list = tableMap.get(plusOneTable) || []
        list.push({
          id: `${household.id}-plus-one`,
          name: 'Plus One',
          household: household.envelopeName || '',
          table: plusOneTable,
          isPlusOne: true,
        })
        tableMap.set(plusOneTable, list)
      }
    })
    const entries = Array.from(tableMap.entries()).map(([table, guests]) => ({ table, guests }))
    entries.sort((a, b) => {
      if (a.table === 'Unassigned') return 1
      if (b.table === 'Unassigned') return -1
      return a.table.localeCompare(b.table)
    })
    return entries
  }, [households])
  const unassignedCount = useMemo(() => {
    const unassigned = seatingTables.find((entry) => entry.table === 'Unassigned')
    return unassigned?.guests?.length || 0
  }, [seatingTables])

  const downloadCsv = (headers, rows, filename) => {
    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const value = cell ?? ''
            const escaped = String(value).replace(/"/g, '""')
            return `"${escaped}"`
          })
          .join(','),
      )
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportHouseholdCsv = () => {
    const headers = [
      'Household',
      'Invited By',
      'Invitation Sent',
      'Save The Date Sent',
      'Plus One Allowed',
      'Plus One Accepted',
      'Tisch Invited',
      'Household RSVP',
      'Household Dietary',
      'Table',
      'Email',
      'Phone',
      'Address',
      'City',
      'State',
      'Postal Code',
      'Country',
      'Guest Count (incl. +1 slot)',
      'Notes',
    ]

    const rows = households.map((household) => {
      const hasPlusOneGuest = household.guests.some((guest) => guest.type === 'plus-one')
      const plusOneSlot = household.plusOneAllowed && !hasPlusOneGuest ? 1 : 0
      const guestCount = household.guests.length + plusOneSlot
      return [
        household.envelopeName,
        household.invitedBy,
        toYesNo(household.invitationSent),
        toYesNo(household.saveTheDateSent),
        toYesNo(household.plusOneAllowed),
        toYesNo(household.plusOneAccepted),
        toYesNo(household.tischInvited),
        household.rsvpStatus,
        household.dietaryRestrictions,
        household.table,
        household.email,
        household.phone,
        household.address.line1,
        household.address.city,
        household.address.state,
        household.address.postalCode,
        household.address.country,
        guestCount,
        household.notes || '',
      ]
    })

    downloadCsv(headers, rows, 'guest-list-households.csv')
  }

  const exportGuestCsv = () => {
    const headers = [
      'Household',
      'Guest Name',
      'Guest Role',
      'Guest Type',
      'Guest RSVP',
      'Guest Dietary',
      'Invited By',
      'Invitation Sent',
      'Save The Date Sent',
      'Plus One Allowed',
      'Plus One Accepted',
      'Tisch Invited',
      'Tisch RSVP',
      'Table',
      'Email',
      'Phone',
      'Address',
      'City',
      'State',
      'Postal Code',
      'Country',
      'Notes',
    ]

    const rows = households.flatMap((household) => {
      if (!household.guests || household.guests.length === 0) {
        return [
          [
            household.envelopeName,
            '',
            '',
            '',
            '',
            '',
            household.invitedBy,
            toYesNo(household.invitationSent),
            toYesNo(household.saveTheDateSent),
            toYesNo(household.plusOneAllowed),
            toYesNo(household.plusOneAccepted),
            toYesNo(household.tischInvited),
            normalizeTischRsvp('', household.tischInvited),
            household.table,
            household.email,
            household.phone,
            household.address.line1,
            household.address.city,
            household.address.state,
            household.address.postalCode,
            household.address.country,
            household.notes || '',
          ],
        ]
      }

      return household.guests.map((guest) => [
        household.envelopeName,
        guest.name,
        guest.role || '',
        guest.type || '',
        guest.rsvpStatus,
        guest.dietary,
        household.invitedBy,
        toYesNo(household.invitationSent),
        toYesNo(household.saveTheDateSent),
        toYesNo(household.plusOneAllowed),
        toYesNo(household.plusOneAccepted),
        toYesNo(household.tischInvited),
        normalizeTischRsvp(guest.tischRsvp, household.tischInvited),
        household.table,
        household.email,
        household.phone,
        household.address.line1,
        household.address.city,
        household.address.state,
        household.address.postalCode,
        household.address.country,
        household.notes || '',
      ])
    })

    downloadCsv(headers, rows, 'guest-list-guests.csv')
  }

  const insertHousehold = (nextHousehold) => {
    setHouseholds((prev) => [...prev, nextHousehold])
    markHouseholdUpsert(nextHousehold.id)
  }

  const handleAddInvite = () => {
    const nextHousehold = ensureDerivedFields(blankHousehold())
    insertHousehold(nextHousehold)
    setSelectedHouseholdId(nextHousehold.id)
  }

  const renderSeatingTables = () => {
    const initialsForName = (name) => {
      const parts = (name || '').trim().split(/\s+/).filter(Boolean)
      if (parts.length >= 2) {
        return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
      }
      const single = parts[0] || ''
      return single.slice(0, 2).toUpperCase() || '??'
    }

    const assignedTables = seatingTables.filter((entry) => entry.table !== 'Unassigned')

    if (assignedTables.length === 0) {
      return (
        <div className="rounded-2xl border border-sage/30 bg-white/80 p-6 text-center text-sm text-charcoal/70">
          No assigned tables yet. Add table names to households to see them here.
          {unassignedCount > 0 && (
            <p className="mt-2 text-xs font-semibold text-sage-dark">Unassigned guests: {unassignedCount}</p>
          )}
        </div>
      )
    }

    const getSeatPosition = (index, total) => {
      const angle = (index / total) * 2 * Math.PI - Math.PI / 2
      const radiusPercent = 38
      return {
        left: `${50 + Math.cos(angle) * radiusPercent}%`,
        top: `${50 + Math.sin(angle) * radiusPercent}%`,
      }
    }

    return (
      <div className="mt-4 flex flex-wrap gap-6">
        {assignedTables.map((entry, index) => {
          const offsetClass = index % 2 === 1 ? 'md:translate-x-10' : ''
          const guests = entry.guests || []
          const count = guests.length || 1
          return (
            <div
              key={entry.table}
              className={`relative w-full max-w-xs flex-1 rounded-2xl border border-sage/30 bg-white/85 p-4 shadow-frame ${offsetClass}`}
            >
              <p className="text-xs uppercase tracking-[0.35em] text-sage-dark/70">{entry.table}</p>
              <div className="relative mx-auto mt-4 h-72 w-72">
                <div className="absolute inset-0 rounded-full border-2 border-sage/40 bg-sage/5" />
                <div className="absolute inset-[18%] rounded-full border border-sage/20 bg-white/80 shadow-inner" />
                <div className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sage text-white shadow-lg">
                  <span className="text-xl font-semibold">{count}</span>
                </div>
                {guests.map((guest, seatIndex) => {
                  const pos = getSeatPosition(seatIndex, count)
                  const badgeText = guest.isPlusOne ? '+1' : initialsForName(guest.name)
                  return (
                    <div
                      key={`${guest.id}-${seatIndex}`}
                      className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                      style={pos}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-sage to-sage-dark text-xs font-semibold text-white shadow-lg shadow-sage/30">
                        {badgeText}
                      </div>
                      <span className="mt-1 max-w-[120px] truncate rounded-full bg-white/90 px-2 py-1 text-[0.7rem] font-semibold text-sage-dark shadow-sm ring-1 ring-sage/20">
                        {guest.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 text-charcoal">
        <style>{animationStyles}</style>
        <div className="w-full space-y-6 rounded-3xl border border-sage/30 bg-white/80 p-8 shadow-frame backdrop-blur">
          <p className="text-xs uppercase tracking-[0.5em] text-sage-dark/60">Guest list</p>
          <div className="space-y-2">
            <h1 className="font-serif text-4xl text-sage-dark">Private guest manager</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="guest-password" className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">
                Password
              </label>
              <input
                id="guest-password"
                type="password"
                autoComplete="current-password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                className="mt-2 w-full rounded-xl border border-sage/30 bg-white/80 px-4 py-3 text-sm outline-none ring-sage/30 transition focus:border-sage focus:ring-2"
                placeholder="Enter site-only password"
              />
              {authError && <p className="mt-2 text-sm text-rose-800">{authError}</p>}
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-sage px-6 py-3 text-xs uppercase tracking-[0.4em] text-white transition hover:bg-sage-dark"
            >
              Unlock guest list
            </button>
          </form>
      </div>
    </main>
  )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-screen-2xl px-4 py-10 text-charcoal">
      <style>{animationStyles}</style>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-sage-dark">Guest list</p>
          <h1 className="mt-1 font-serif text-4xl text-sage-dark">Wedding guest manager</h1>
        </div>
        <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAddInvite}
              className="rounded-full bg-sage px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-dark"
            >
              Add invite
            </button>
          <button
            type="button"
            onClick={handleLock}
            className="rounded-full border border-sage/40 px-4 py-2 text-sm font-semibold text-sage-dark transition hover:border-sage hover:text-sage-dark"
          >
            Lock
          </button>
          <span className="flex items-center rounded-full border border-sage/30 bg-white/80 px-3 py-2 text-xs font-semibold text-sage-dark/80">
            {remoteStatus === 'loading' && 'Loading…'}
            {remoteStatus === 'saving' && 'Saving…'}
            {remoteStatus === 'saved' && 'Saved'}
          {remoteStatus === 'error' && 'Offline (not saved)'}
          {remoteStatus === 'idle' && 'Local only'}
          {remoteStatus === 'ready' && 'Ready'}
        </span>
        {remoteError && <span className="text-xs font-semibold text-rose-700">{remoteError}</span>}
        <button
          type="button"
          onClick={() => setShowSeatingView(true)}
          className="rounded-full border border-sage/40 px-4 py-2 text-sm font-semibold text-sage-dark transition hover:border-sage hover:text-sage-dark"
        >
          Seating view
        </button>
      </div>
    </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-sage/30 bg-white/80 p-4 shadow-frame">
          <p className="text-sm font-semibold text-sage-dark/80">Max invited</p>
          <p className="mt-1 font-serif text-4xl text-sage-dark">{stats.maxInvited}</p>
          <p className="text-sm text-charcoal/70">Guests incl. allowed +1s</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-sage-dark/80">
            <span className="rounded-full bg-sage/15 px-2 py-1">Groom: {stats.maxBreakdown.Groom || 0}</span>
            <span className="rounded-full bg-sage/15 px-2 py-1">Bride: {stats.maxBreakdown.Bride || 0}</span>
            <span className="rounded-full bg-sage/15 px-2 py-1">Both: {stats.maxBreakdown.Both || 0}</span>
          </div>
        </div>
        {[
          { label: 'Invitations', value: stats.invitations, sub: 'Households / singletons' },
          { label: 'Awaiting', value: stats.awaitingInvites, sub: 'Invites sent with no RSVP' },
          { label: 'Accepted', value: stats.acceptedGuests, sub: 'Guests marked Accepted' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-sage/30 bg-white/80 p-4 shadow-frame">
            <p className="text-sm font-semibold text-sage-dark/80">{item.label}</p>
            <p className="mt-1 font-serif text-4xl text-sage-dark">{item.value}</p>
            <p className="text-sm text-charcoal/70">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-sage/30 bg-white/85 shadow-frame">
        <div className="flex flex-col gap-3 border-b border-sage/20 px-4 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className={mobileFieldLabelClass}>
              Search
              <input
                type="text"
                value={filters.envelopeName}
                onChange={(event) => handleFilterChange('envelopeName', event.target.value)}
                className={inputClass}
                placeholder="Search household"
              />
            </label>
            <label className={mobileFieldLabelClass}>
              Response
              <select
                value={filters.responseReceived}
                onChange={(event) => handleFilterChange('responseReceived', event.target.value)}
                className={selectClass}
              >
                <option value="any">All households</option>
                <option value="received">Received</option>
                <option value="not">Not received</option>
              </select>
            </label>
            <label className={mobileFieldLabelClass}>
              Invited by
              <select
                value={filters.invitedBy}
                onChange={(event) => handleFilterChange('invitedBy', event.target.value)}
                className={selectClass}
              >
                <option value="all">All</option>
                {invitedByOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className={mobileFieldLabelClass}>
              Ceremony
              <select
                value={filters.ceremonyStatus}
                onChange={(event) => handleFilterChange('ceremonyStatus', event.target.value)}
                className={selectClass}
              >
                {eventStatusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={mobileFieldLabelClass}>
              Reception
              <select
                value={filters.receptionStatus}
                onChange={(event) => handleFilterChange('receptionStatus', event.target.value)}
                className={selectClass}
              >
                {eventStatusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={mobileFieldLabelClass}>
              Tisch
              <select
                value={filters.tischStatus}
                onChange={(event) => handleFilterChange('tischStatus', event.target.value)}
                className={selectClass}
              >
                {eventStatusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-sage/40 px-3 py-2 text-sm font-semibold text-sage-dark transition hover:border-sage hover:text-sage-dark"
            >
              Clear filters
            </button>
            <div className="relative z-30" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setExportMenuOpen((open) => !open)}
                className="rounded-full bg-sage px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-dark"
              >
                Export
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 z-40 mt-2 w-48 rounded-xl border border-sage/30 bg-white p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false)
                      exportHouseholdCsv()
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-sage-dark hover:bg-sage/10"
                  >
                    Export households
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false)
                      exportGuestCsv()
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-sage-dark hover:bg-sage/10"
                  >
                    Export all guests
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hidden border-b border-sage/20 bg-sage/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sage-dark/80 md:grid md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_minmax(0,1fr)] md:gap-3">
          <span>Household</span>
          <span className="text-center">Response</span>
          <span className="text-center">Ceremony</span>
          <span className="text-center">Reception</span>
          <span className="text-center">Tisch</span>
          <span className="text-right">Table</span>
        </div>

        <div className="divide-y divide-sage/15">
          {visibleHouseholds.map((household) => {
            const hasPlusOneGuest = household.guests.some((guest) => guest.type === 'plus-one')
            const guestCount = household.guests.length + (household.plusOneAllowed && !hasPlusOneGuest ? 1 : 0)
            const responded = hasResponded(household)
            const responseBadge = responded
              ? { label: 'Received', className: 'bg-sage text-white' }
              : { label: 'Awaiting', className: 'bg-amber-100 text-amber-800' }
            const ceremony = eventSummaryBadge(household, 'ceremonyRsvp')
            const reception = eventSummaryBadge(household, 'receptionRsvp')
            const tisch = eventSummaryBadge(household, 'tischRsvp')
            const isActive = selectedHouseholdId === household.id
            return (
              <button
                key={household.id}
                type="button"
                onClick={() => setSelectedHouseholdId(household.id)}
                className={`block w-full px-4 py-3 text-left transition hover:bg-sage/5 ${isActive ? 'bg-sage/10' : ''}`}
              >
                <div className="flex flex-col gap-2 md:grid md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_minmax(0,1fr)] md:items-center md:gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-sage-dark">{household.envelopeName || 'Untitled household'}</span>
                      {household.rsvpLocked && (
                        <span className="shrink-0 rounded-full bg-sage/10 px-2 py-0.5 text-[0.65rem] font-semibold text-sage-dark/70">
                          RSVP locked
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-charcoal/60">
                      {guestCount} guest{guestCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 md:justify-center">
                    <span className="md:hidden text-[0.7rem] font-semibold uppercase text-sage-dark/60">Response</span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${responseBadge.className}`}>
                      {responseBadge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 md:justify-center">
                    <span className="md:hidden text-[0.7rem] font-semibold uppercase text-sage-dark/60">Ceremony</span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${ceremony.className}`}>
                      {ceremony.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 md:justify-center">
                    <span className="md:hidden text-[0.7rem] font-semibold uppercase text-sage-dark/60">Reception</span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${reception.className}`}>
                      {reception.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 md:justify-center">
                    <span className="md:hidden text-[0.7rem] font-semibold uppercase text-sage-dark/60">Tisch</span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${tisch.className}`}>
                      {tisch.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <span className="md:hidden text-[0.7rem] font-semibold uppercase text-sage-dark/60">Table</span>
                    <span className="truncate text-sm text-charcoal/80">{household.table || '—'}</span>
                  </div>
                </div>
              </button>
            )
          })}
          {visibleHouseholds.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-charcoal/70">No households match the current filters.</p>
          )}
        </div>
      </div>
      {selectedHousehold && (
        <>
          <button
            type="button"
            onClick={() => setSelectedHouseholdId(null)}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
            aria-label="Close household editor"
          />
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="flex h-full w-full flex-col bg-white shadow-2xl shadow-sage/30 md:max-w-xl md:border-l md:border-sage/30">
              <div className="flex items-start justify-between gap-3 border-b border-sage/20 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.3em] text-sage-dark/60">Household</p>
                  <p className="truncate text-lg font-semibold text-sage-dark">
                    {selectedHousehold.envelopeName || 'Untitled household'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => removeHousehold(selectedHousehold.id)}
                    className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-800"
                  >
                    Remove household
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedHouseholdId(null)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-sage/40 text-lg font-semibold text-sage-dark transition hover:border-sage"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                <section className="space-y-3">
                  <p className="text-sm font-semibold text-sage-dark">Household details</p>
                  <label className={mobileFieldLabelClass}>
                    Household name
                    <input
                      type="text"
                      value={selectedHousehold.envelopeName}
                      onChange={(event) => updateHousehold(selectedHousehold.id, { envelopeName: event.target.value })}
                      className={inputClass}
                      placeholder="Household or envelope name"
                    />
                  </label>
                  <label className={mobileFieldLabelClass}>
                    Custom URL
                    <input
                      type="text"
                      value={selectedHousehold.customSlug || ''}
                      onChange={(event) => updateHousehold(selectedHousehold.id, { customSlug: event.target.value })}
                      className={inputClass}
                      placeholder="Optional"
                    />
                    <span className="text-[0.7rem] font-semibold normal-case tracking-normal text-sage-dark/60">
                      /{selectedHousehold.slug}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={mobileFieldLabelClass}>
                      Invited by
                      <select
                        value={selectedHousehold.invitedBy}
                        onChange={(event) => updateHousehold(selectedHousehold.id, { invitedBy: event.target.value })}
                        className={selectClass}
                      >
                        {invitedByOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={mobileFieldLabelClass}>
                      Table
                      <input
                        type="text"
                        value={selectedHousehold.table}
                        onChange={(event) => updateHousehold(selectedHousehold.id, { table: event.target.value })}
                        className={inputClass}
                        placeholder="Table name or number"
                      />
                    </label>
                  </div>
                  <label className={mobileFieldLabelClass}>
                    Household dietary
                    <select
                      value={selectedHousehold.dietaryRestrictions}
                      onChange={(event) => updateHousehold(selectedHousehold.id, { dietaryRestrictions: event.target.value })}
                      className={selectClass}
                    >
                      {dietaryOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={mobileFieldLabelClass}>
                      Email
                      <input
                        type="email"
                        value={selectedHousehold.email}
                        onChange={(event) => updateHousehold(selectedHousehold.id, { email: event.target.value })}
                        className={inputClass}
                        placeholder="contact@email.com"
                      />
                    </label>
                    <label className={mobileFieldLabelClass}>
                      Phone
                      <input
                        type="tel"
                        value={selectedHousehold.phone}
                        onChange={(event) => updateHousehold(selectedHousehold.id, { phone: event.target.value })}
                        className={inputClass}
                        placeholder="(555) 123-4567"
                      />
                    </label>
                  </div>
                </section>

                <section className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-sage-dark">Address</p>
                    <p className="text-xs text-charcoal/60">{formatAddress(selectedHousehold.address)}</p>
                  </div>
                  <label className={mobileFieldLabelClass}>
                    Street + unit
                    <input
                      type="text"
                      value={selectedHousehold.address.line1}
                      onChange={(event) => updateAddressField(selectedHousehold.id, 'line1', event.target.value)}
                      className={inputClass}
                      placeholder="123 Street Ave Apt 4"
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={selectedHousehold.address.city}
                      onChange={(event) => updateAddressField(selectedHousehold.id, 'city', event.target.value)}
                      className={inputClass}
                      placeholder="City"
                    />
                    <input
                      type="text"
                      value={selectedHousehold.address.state}
                      onChange={(event) => updateAddressField(selectedHousehold.id, 'state', event.target.value)}
                      className={inputClass}
                      placeholder="State"
                    />
                    <input
                      type="text"
                      value={selectedHousehold.address.postalCode}
                      onChange={(event) => updateAddressField(selectedHousehold.id, 'postalCode', event.target.value)}
                      className={inputClass}
                      placeholder="Zip"
                    />
                  </div>
                  <input
                    type="text"
                    value={selectedHousehold.address.country}
                    onChange={(event) => updateAddressField(selectedHousehold.id, 'country', event.target.value)}
                    className={inputClass}
                    placeholder="Country"
                  />
                </section>

                <section className="space-y-2">
                  <p className="text-sm font-semibold text-sage-dark">Status</p>
                  <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                    <label className={mobileCheckboxLabelClass}>
                      <input
                        type="checkbox"
                        checked={selectedHousehold.invitationSent}
                        onChange={() => updateHousehold(selectedHousehold.id, { invitationSent: !selectedHousehold.invitationSent })}
                        className={checkboxClass}
                      />
                      Invite sent
                    </label>
                    <label className={mobileCheckboxLabelClass}>
                      <input
                        type="checkbox"
                        checked={selectedHousehold.saveTheDateSent}
                        onChange={() => updateHousehold(selectedHousehold.id, { saveTheDateSent: !selectedHousehold.saveTheDateSent })}
                        className={checkboxClass}
                      />
                      Save the date
                    </label>
                    <label className={mobileCheckboxLabelClass}>
                      <input
                        type="checkbox"
                        checked={selectedHousehold.plusOneAllowed}
                        onChange={() =>
                          updateHousehold(selectedHousehold.id, {
                            plusOneAllowed: !selectedHousehold.plusOneAllowed,
                            plusOneAccepted: selectedHousehold.plusOneAllowed ? false : selectedHousehold.plusOneAccepted,
                          })
                        }
                        className={checkboxClass}
                      />
                      +1 allowed
                    </label>
                    <label className={mobileCheckboxLabelClass}>
                      <input
                        type="checkbox"
                        checked={selectedHousehold.plusOneAccepted}
                        onChange={() =>
                          updateHousehold(selectedHousehold.id, {
                            plusOneAccepted: selectedHousehold.plusOneAllowed ? !selectedHousehold.plusOneAccepted : false,
                          })
                        }
                        className={checkboxClass}
                        disabled={!selectedHousehold.plusOneAllowed || selectedHousehold.rsvpLocked}
                      />
                      +1 accepted
                    </label>
                    <label className={mobileCheckboxLabelClass}>
                      <input
                        type="checkbox"
                        checked={selectedHousehold.tischInvited}
                        onChange={() => updateHousehold(selectedHousehold.id, { tischInvited: !selectedHousehold.tischInvited })}
                        className={checkboxClass}
                      />
                      Tisch invited
                    </label>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-sage-dark">Guests</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addGuest(selectedHousehold.id, 'primary')}
                        className="rounded-full bg-sage px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark"
                      >
                        Add guest
                      </button>
                      <button
                        type="button"
                        onClick={() => addGuest(selectedHousehold.id, 'plus-one')}
                        className="rounded-full border border-sage/40 px-3 py-1.5 text-xs font-semibold text-sage-dark transition hover:border-sage"
                      >
                        + Plus one
                      </button>
                      <button
                        type="button"
                        onClick={() => addGuest(selectedHousehold.id, 'child')}
                        className="rounded-full border border-sage/40 px-3 py-1.5 text-xs font-semibold text-sage-dark transition hover:border-sage"
                      >
                        + Child
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selectedHousehold.guests.map((guest) => (
                      <div key={guest.id} className="rounded-xl border border-sage/20 bg-sage/5 p-3">
                        <div className="flex items-start gap-2">
                          <input
                            type="text"
                            value={guest.name}
                            onChange={(event) => updateGuest(selectedHousehold.id, guest.id, { name: event.target.value })}
                            className={`${inputClass} font-semibold`}
                            placeholder="Guest name"
                          />
                          <button
                            type="button"
                            onClick={() => removeGuest(selectedHousehold.id, guest.id)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-white text-lg font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-800"
                            aria-label="Remove guest"
                          >
                            −
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className={mobileFieldLabelClass}>
                            RSVP
                            <select
                              value={guest.rsvpStatus}
                              onChange={(event) => updateGuest(selectedHousehold.id, guest.id, { rsvpStatus: event.target.value })}
                              className={selectClass}
                              disabled={selectedHousehold.rsvpLocked}
                            >
                              {rsvpOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className={mobileFieldLabelClass}>
                            Dietary
                            <select
                              value={guest.dietary}
                              onChange={(event) => updateGuest(selectedHousehold.id, guest.id, { dietary: event.target.value })}
                              className={selectClass}
                            >
                              {dietaryOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          {selectedHousehold.tischInvited && (
                            <label className={`${mobileFieldLabelClass} sm:col-span-2`}>
                              Tisch RSVP
                              <select
                                value={guest.tischRsvp}
                                onChange={(event) => updateGuest(selectedHousehold.id, guest.id, { tischRsvp: event.target.value })}
                                className={selectClass}
                                disabled={selectedHousehold.rsvpLocked}
                              >
                                {tischRsvpOptions
                                  .filter((option) => option !== 'Not invited')
                                  .map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                              </select>
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <label className={mobileFieldLabelClass}>
                    Notes
                    <textarea
                      rows={3}
                      value={selectedHousehold.notes || ''}
                      onChange={(event) => updateHousehold(selectedHousehold.id, { notes: event.target.value })}
                      className={inputClass}
                      placeholder="Any notes for this household"
                    />
                  </label>
                </section>
              </div>
            </div>
          </div>
        </>
      )}
      {showSeatingView && (
        <>
          <button
            type="button"
            onClick={() => setShowSeatingView(false)}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            aria-label="Close seating view"
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto px-4 pb-12 pt-14">
            <div className="w-full max-w-6xl rounded-2xl border border-sage/30 bg-white/95 p-6 shadow-2xl shadow-sage/30">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sage/20 pb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-sage-dark/70">Seating view</p>
                  <p className="text-sm text-charcoal/70">
                    Circles are grouped by guest table. Guests inherit their household table unless a guest-level table is set.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {unassignedCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm">
                      Unassigned: {unassignedCount}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowSeatingView(false)}
                    className="rounded-full border border-sage/40 px-4 py-2 text-sm font-semibold text-sage-dark transition hover:border-sage hover:text-sage-dark"
                  >
                    Close
                  </button>
                </div>
              </div>
              {renderSeatingTables()}
            </div>
          </div>
        </>
      )}
    </main>
  )
}
