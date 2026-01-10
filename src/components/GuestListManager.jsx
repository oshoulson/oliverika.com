import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { readJsonCookie, writeCookie, deleteCookie } from '../utils/cookies.js'
/* eslint-disable react-refresh/only-export-components */

const AUTH_STORAGE_KEY = 'oliverikaGuestListAuth'
export const DATA_STORAGE_KEY = 'oliverikaGuestListData'
const HIDDEN_COLUMNS_KEY = 'oliverikaGuestHiddenColumns'
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
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
}

export const slugify = (text) => {
  const cleaned = normalizeSlug(text)
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
const toggleableColumnLabels = {
  customSlug: 'Custom URL',
  invitedBy: 'Invited by',
  invitationSent: 'Invite sent',
  saveTheDateSent: 'Save the date',
  plusOneAllowed: '+1 allowed',
  plusOneAccepted: '+1 accepted',
  tischInvited: 'Tisch invited',
  rsvpStatus: 'RSVP',
  dietaryRestrictions: 'Dietary',
  table: 'Table',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
}
const tableColumnKeys = Object.keys(toggleableColumnLabels)
const sortableColumnKeys = ['envelopeName', ...tableColumnKeys]
const checkboxClass =
  'h-4 w-4 rounded border border-sage/50 bg-white text-sage-dark checked:bg-sage checked:border-sage focus:ring-2 focus:ring-sage/30 focus:ring-offset-1 transition'
const selectClass =
  'w-full rounded-lg border border-sage/30 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/30'
const inputClass =
  'w-full rounded-lg border border-sage/20 bg-white/90 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/30'
const filterInputClass =
  'w-full rounded-lg border border-sage/25 bg-white px-2 py-1 text-xs shadow-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/30'
const tableInputClass = `${inputClass} h-9 py-1 text-xs`
const tableSelectClass = `${selectClass} h-9 py-1 text-xs`
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
  dietaryRestrictions: '',
  table: '',
  email: '',
  phone: '',
  address: '',
})

const sanitizeViewPrefs = (prefs) => {
  if (!prefs || typeof prefs !== 'object') return null
  const sortConfig = prefs.sortConfig && typeof prefs.sortConfig === 'object' ? prefs.sortConfig : {}
  const sortKey = typeof sortConfig.key === 'string' && sortableColumnKeys.includes(sortConfig.key) ? sortConfig.key : 'envelopeName'
  const sortDirection = sortConfig.direction === 'desc' ? 'desc' : 'asc'

  const defaultFilters = createDefaultFilters()
  const rawFilters = prefs.filters && typeof prefs.filters === 'object' ? prefs.filters : {}
  const filters = Object.fromEntries(
    Object.entries(defaultFilters).map(([key, defaultValue]) => {
      const incoming = rawFilters[key]
      return [key, typeof defaultValue === 'string' ? String(incoming ?? defaultValue) : defaultValue]
    }),
  )

  if (!['all', ...invitedByOptions].includes(filters.invitedBy)) filters.invitedBy = 'all'
  if (!['any', 'yes', 'no'].includes(filters.invitationSent)) filters.invitationSent = 'any'
  if (!['any', 'yes', 'no'].includes(filters.saveTheDateSent)) filters.saveTheDateSent = 'any'
  if (!['any', 'yes', 'no'].includes(filters.plusOneAllowed)) filters.plusOneAllowed = 'any'
  if (!['any', 'yes', 'no'].includes(filters.plusOneAccepted)) filters.plusOneAccepted = 'any'
  if (!['any', 'yes', 'no'].includes(filters.tischInvited)) filters.tischInvited = 'any'
  if (!['all', ...rsvpOptions].includes(filters.rsvpStatus)) filters.rsvpStatus = 'all'

  const expandedRaw = prefs.expanded && typeof prefs.expanded === 'object' ? prefs.expanded : null
  const expandedMode = expandedRaw?.mode === 'none' ? 'none' : expandedRaw?.mode === 'all' ? 'all' : null
  const expandedIds = Array.isArray(expandedRaw?.ids) ? expandedRaw.ids.filter((id) => typeof id === 'string') : []

  return {
    filters,
    sortConfig: { key: sortKey, direction: sortDirection },
    expanded: expandedMode ? { mode: expandedMode, ids: expandedIds.slice(0, 250) } : null,
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

const createExpandedPref = (households, expandedSet) => {
  const expandedIds = []
  const collapsedIds = []
  for (const household of households || []) {
    const id = household?.id
    if (!id) continue
    if (expandedSet?.has?.(id)) {
      expandedIds.push(id)
    } else {
      collapsedIds.push(id)
    }
  }

  if (expandedIds.length <= collapsedIds.length) {
    return { mode: 'none', ids: expandedIds }
  }
  return { mode: 'all', ids: collapsedIds }
}

const applyExpandedPref = (households, expandedPref) => {
  const allIds = (households || []).map((household) => household.id)
  const allSet = new Set(allIds)

  if (!expandedPref || !expandedPref.mode) {
    return new Set(allIds)
  }

  const ids = Array.isArray(expandedPref.ids) ? expandedPref.ids : []
  if (expandedPref.mode === 'none') {
    const next = new Set()
    ids.forEach((id) => {
      if (allSet.has(id)) next.add(id)
    })
    return next
  }

  const next = new Set(allIds)
  ids.forEach((id) => next.delete(id))
  return next
}

const persistViewPrefs = (prefs) => {
  if (typeof window === 'undefined') return
  const payload = { v: 1, ...prefs }
  const maxCookieLength = 3800

  const attemptCookieWrite = (candidate) => {
    try {
      const encoded = encodeURIComponent(JSON.stringify(candidate))
      if (encoded.length > maxCookieLength) return false
      writeCookie(VIEW_PREFS_KEY, encoded, { maxAgeSeconds: 60 * 60 * 24 * 365 })
      return true
    } catch {
      return false
    }
  }

  const cookieWritten = attemptCookieWrite(payload) || attemptCookieWrite({ ...payload, expanded: payload.expanded ? { ...payload.expanded, ids: [] } : null })
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

const loadHiddenColumns = () => {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = JSON.parse(window.localStorage.getItem(HIDDEN_COLUMNS_KEY) || '[]')
    if (Array.isArray(stored)) {
      return new Set(stored.filter((key) => tableColumnKeys.includes(key)))
    }
  } catch (error) {
    console.warn('Unable to read hidden columns', error)
  }
  return new Set()
}

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
  const [expandedHouseholds, setExpandedHouseholds] = useState(() => applyExpandedPref(initialHouseholds, initialViewPrefs?.expanded))
  const expandedHouseholdsRef = useRef(expandedHouseholds)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [remoteStatus, setRemoteStatus] = useState('idle')
  const [remoteError, setRemoteError] = useState('')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false)
  const [showSeatingView, setShowSeatingView] = useState(Boolean(initialViewPrefs?.showSeatingView))
  const [hiddenColumns, setHiddenColumns] = useState(loadHiddenColumns)
  const [sortConfig, setSortConfig] = useState(initialViewPrefs?.sortConfig || { key: 'envelopeName', direction: 'asc' })
  const [filters, setFilters] = useState(() => ({ ...createDefaultFilters(), ...(initialViewPrefs?.filters || {}) }))
  const [showFloatingAdd, setShowFloatingAdd] = useState(false)
  const [draftHousehold, setDraftHousehold] = useState(null)
  const [addressModalId, setAddressModalId] = useState(null)
  const saveTimer = useRef(null)
  const viewPrefsTimer = useRef(null)
  const isSavingRef = useRef(false)
  const dirtyUpsertsRef = useRef(new Set())
  const dirtyDeletesRef = useRef(new Set())
  const exportMenuRef = useRef(null)
  const columnsMenuRef = useRef(null)

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
    expandedHouseholdsRef.current = expandedHouseholds
  }, [expandedHouseholds])

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
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(HIDDEN_COLUMNS_KEY, JSON.stringify([...hiddenColumns]))
    } catch (error) {
      console.warn('Unable to persist hidden columns', error)
    }
  }, [hiddenColumns])

  useEffect(() => {
    if (typeof window === 'undefined') return () => {}
    if (viewPrefsTimer.current) {
      clearTimeout(viewPrefsTimer.current)
    }

    viewPrefsTimer.current = setTimeout(() => {
      const expandedPref = createExpandedPref(householdsRef.current, expandedHouseholdsRef.current)
      persistViewPrefs({ filters, sortConfig, expanded: expandedPref, showSeatingView })
    }, 200)

    return () => {
      if (viewPrefsTimer.current) {
        clearTimeout(viewPrefsTimer.current)
      }
    }
  }, [filters, sortConfig, expandedHouseholds, showSeatingView])

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
          setExpandedHouseholds(() => {
            const expandedPref = createExpandedPref(householdsRef.current, expandedHouseholdsRef.current)
            return applyExpandedPref(mapped, expandedPref)
          })
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
    if (typeof window === 'undefined') return () => {}
    const handleScroll = () => {
      setShowFloatingAdd(window.scrollY > 280)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return () => {}
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false)
      }
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(event.target)) {
        setColumnsMenuOpen(false)
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

  const addressModalHousehold = useMemo(
    () => households.find((household) => household.id === addressModalId) || null,
    [addressModalId, households],
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

  const toggleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const resetFilters = () => {
    setFilters(createDefaultFilters())
  }

  const isColumnVisible = (key) => !hiddenColumns.has(key)
  const visibleColumnCount = tableColumnKeys.filter((key) => isColumnVisible(key)).length + 2

  const renderSortIcon = (columnKey) => {
    const active = sortConfig.key === columnKey
    const directionClass = active && sortConfig.direction === 'asc' ? '-rotate-180' : ''
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`h-3 w-3 transition ${directionClass} ${active ? 'text-sage-dark' : 'text-sage-dark/40 group-hover:text-sage-dark/70'}`}
      >
        <path d="M5 8l5 5 5-5H5z" />
      </svg>
    )
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
    setOpenMenuId(null)
    markHouseholdUpsert(householdId)
  }

  const removeHousehold = (householdId) => {
    setHouseholds((prev) => prev.filter((household) => household.id !== householdId))
    setExpandedHouseholds((prev) => {
      const next = new Set(prev)
      next.delete(householdId)
      return next
    })
    if (openMenuId === householdId) {
      setOpenMenuId(null)
    }
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

  const toggleHouseholdExpanded = (householdId) => {
    setExpandedHouseholds((prev) => {
      const next = new Set(prev)
      if (next.has(householdId)) {
        next.delete(householdId)
      } else {
        next.add(householdId)
      }
      return next
    })
  }

  const expandAllHouseholds = () => {
    setExpandedHouseholds(new Set(households.map((household) => household.id)))
  }

  const collapseAllHouseholds = () => {
    setExpandedHouseholds(new Set())
  }

  const visibleHouseholds = useMemo(() => {
    const textIncludes = (value, query) => String(value || '').toLowerCase().includes(String(query || '').toLowerCase())
    const boolMatches = (value, filterValue) =>
      filterValue === 'any' ? true : filterValue === 'yes' ? Boolean(value) : !value
    const filtered = households.filter((household) => {
      if (filters.envelopeName && !textIncludes(household.envelopeName, filters.envelopeName)) return false
      if (filters.customSlug && !textIncludes(household.customSlug || household.slug, filters.customSlug)) return false
      if (filters.invitedBy !== 'all' && household.invitedBy !== filters.invitedBy) return false
      if (!boolMatches(household.invitationSent, filters.invitationSent)) return false
      if (!boolMatches(household.saveTheDateSent, filters.saveTheDateSent)) return false
      if (!boolMatches(household.plusOneAllowed, filters.plusOneAllowed)) return false
      if (!boolMatches(household.plusOneAccepted, filters.plusOneAccepted)) return false
      if (!boolMatches(household.tischInvited, filters.tischInvited)) return false
      if (filters.rsvpStatus !== 'all' && household.rsvpStatus !== filters.rsvpStatus) return false
      if (filters.dietaryRestrictions && !textIncludes(household.dietaryRestrictions, filters.dietaryRestrictions)) return false
      if (filters.table && !textIncludes(household.table, filters.table)) return false
      if (filters.email && !textIncludes(household.email, filters.email)) return false
      if (filters.phone && !textIncludes(household.phone, filters.phone)) return false
      const addressText = `${household.address.line1} ${household.address.city} ${household.address.state} ${household.address.postalCode} ${household.address.country}`
      if (filters.address && !textIncludes(addressText, filters.address)) return false
      return true
    })

    const { key, direction } = sortConfig || {}
    if (!key || !direction) return filtered

    const sorted = [...filtered].sort((a, b) => {
      const directionFactor = direction === 'desc' ? -1 : 1
      const valueMap = (household) => {
        switch (key) {
          case 'invitationSent':
          case 'saveTheDateSent':
          case 'plusOneAllowed':
          case 'plusOneAccepted':
          case 'tischInvited':
            return household[key] ? 1 : 0
          case 'address':
            return `${household.address.line1} ${household.address.city} ${household.address.state} ${household.address.postalCode} ${household.address.country}`.trim()
          default:
            return household[key] ?? ''
        }
      }

      const normalizeValue = (val) => (typeof val === 'string' ? val.toLowerCase() : val)

      const valueA = normalizeValue(valueMap(a))
      const valueB = normalizeValue(valueMap(b))
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return (valueA - valueB) * directionFactor
      }
      return String(valueA).localeCompare(String(valueB)) * directionFactor
    })

    return sorted
  }, [filters, households, sortConfig])

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
    setExpandedHouseholds((prev) => {
      const next = new Set(prev)
      next.add(nextHousehold.id)
      return next
    })
    setOpenMenuId(null)
    markHouseholdUpsert(nextHousehold.id)
  }

  const startNewHouseholdDraft = () => {
    const nextHousehold = blankHousehold()
    setOpenMenuId(null)
    setDraftHousehold(nextHousehold)
    setTimeout(() => {
      const panel = document.getElementById('draft-household-panel')
      panel?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 10)
  }

  const updateDraftField = (field, value) => {
    setDraftHousehold((prev) => {
      if (!prev) return prev
      const next = { ...prev, [field]: value }
      if (field === 'tischInvited') {
        next.guests = (next.guests || []).map((guest) => ({
          ...guest,
          tischRsvp: normalizeTischRsvp(guest.tischRsvp, value),
        }))
      }
      return next
    })
  }

  const updateDraftAddressField = (field, value) => {
    setDraftHousehold((prev) => (prev ? { ...prev, address: { ...prev.address, [field]: value } } : prev))
  }

  const updateDraftGuest = (guestId, updates) => {
    setDraftHousehold((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        guests: prev.guests.map((guest) =>
          guest.id === guestId
            ? { ...guest, ...updates, tischRsvp: normalizeTischRsvp(updates.tischRsvp || guest.tischRsvp, prev.tischInvited) }
            : guest,
        ),
      }
    })
  }

  const confirmDraftHousehold = () => {
    if (!draftHousehold) return
    const primaryGuestName = (draftHousehold.guests?.[0]?.name || '').trim()
    const shouldReplacePrimary = !primaryGuestName || primaryGuestName.toLowerCase() === 'primary guest'
    const alignedGuests = (draftHousehold.guests || []).map((guest, index) =>
      index === 0 && shouldReplacePrimary ? { ...guest, name: draftHousehold.envelopeName } : guest,
    )
    const withSlug = ensureDerivedFields({
      ...draftHousehold,
      guests: alignedGuests,
      slug: slugify(draftHousehold.envelopeName || 'New household'),
    })
    insertHousehold(withSlug)
    setDraftHousehold(null)
  }

  const cancelDraftHousehold = () => {
    setDraftHousehold(null)
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
              onClick={startNewHouseholdDraft}
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
        <div className="flex flex-col gap-3 border-b border-sage/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-sage-dark">Guest table</p>
            <p className="text-sm text-charcoal/70">Click a household to expand guests. Awaiting counts only include sent invitations.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={expandAllHouseholds}
              className="rounded-full border border-sage/40 px-3 py-2 text-sm font-semibold text-sage-dark transition hover:border-sage hover:text-sage-dark"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAllHouseholds}
              className="rounded-full border border-sage/40 px-3 py-2 text-sm font-semibold text-sage-dark transition hover:border-sage hover:text-sage-dark"
            >
              Collapse all
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-sage/40 px-3 py-2 text-sm font-semibold text-sage-dark transition hover:border-sage hover:text-sage-dark"
            >
              Clear filters
            </button>
            <div className="relative z-30" ref={columnsMenuRef}>
              <button
                type="button"
                onClick={() => setColumnsMenuOpen((open) => !open)}
                className="rounded-full border border-sage/40 px-4 py-2 text-sm font-semibold text-sage-dark transition hover:border-sage hover:text-sage-dark"
              >
                Columns
              </button>
              {columnsMenuOpen && (
                <div className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-sage/30 bg-white p-3 shadow-lg">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-sage-dark/80">
                    <button
                      type="button"
                      onClick={() => setHiddenColumns(new Set())}
                      className="rounded-full border border-sage/30 px-2 py-1 transition hover:border-sage hover:text-sage-dark"
                    >
                      Show all
                    </button>
                    <button
                      type="button"
                      onClick={() => setHiddenColumns(new Set(tableColumnKeys))}
                      className="rounded-full border border-sage/30 px-2 py-1 transition hover:border-sage hover:text-sage-dark"
                    >
                      Hide all
                    </button>
                  </div>
                  <div className="space-y-1">
                    {tableColumnKeys.map((key) => (
                      <label key={key} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-sage-dark hover:bg-sage/10">
                        <input
                          type="checkbox"
                          checked={isColumnVisible(key)}
                          onChange={(event) =>
                            setHiddenColumns((prev) => {
                              const next = new Set(prev)
                              if (event.target.checked) {
                                next.delete(key)
                              } else {
                                next.add(key)
                              }
                              return next
                            })
                          }
                          className="h-4 w-4 rounded border border-sage/50 text-sage-dark focus:ring-sage"
                        />
                        {toggleableColumnLabels[key]}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
        <div className="overflow-x-auto">
          <table className="min-w-[2270px] divide-y divide-sage/20 text-sm">
            <thead className="bg-sage/10 text-left text-sage-dark">
              <tr className="text-sm font-semibold">
                <th className="sticky left-0 z-40 px-3 py-2 w-[260px] min-w-[240px] bg-white shadow-[2px_0_0_rgba(0,0,0,0.08)]">
                  <button type="button" onClick={() => toggleSort('envelopeName')} className="group flex items-center gap-2">
                    <span>Name</span>
                    {renderSortIcon('envelopeName')}
                  </button>
                </th>
                {isColumnVisible('customSlug') && (
                  <th className="px-3 py-2 w-[220px]">
                    <button type="button" onClick={() => toggleSort('customSlug')} className="group flex items-center gap-2">
                      <span>Custom URL</span>
                      {renderSortIcon('customSlug')}
                    </button>
                  </th>
                )}
                {isColumnVisible('invitedBy') && (
                  <th className="px-3 py-2 w-[150px]">
                    <button type="button" onClick={() => toggleSort('invitedBy')} className="group flex items-center gap-2">
                      <span>Invited by</span>
                      {renderSortIcon('invitedBy')}
                    </button>
                  </th>
                )}
                {isColumnVisible('invitationSent') && (
                  <th className="px-3 py-2 w-[150px]">
                    <button type="button" onClick={() => toggleSort('invitationSent')} className="group flex items-center gap-2">
                      <span>Invite sent</span>
                      {renderSortIcon('invitationSent')}
                    </button>
                  </th>
                )}
                {isColumnVisible('saveTheDateSent') && (
                  <th className="px-3 py-2 w-[160px]">
                    <button type="button" onClick={() => toggleSort('saveTheDateSent')} className="group flex items-center gap-2">
                      <span>Save the date</span>
                      {renderSortIcon('saveTheDateSent')}
                    </button>
                  </th>
                )}
                {isColumnVisible('plusOneAllowed') && (
                  <th className="px-3 py-2 w-[160px]">
                    <button type="button" onClick={() => toggleSort('plusOneAllowed')} className="group flex items-center gap-2">
                      <span>+1 allowed</span>
                      {renderSortIcon('plusOneAllowed')}
                    </button>
                  </th>
                )}
                {isColumnVisible('plusOneAccepted') && (
                  <th className="px-3 py-2 w-[170px]">
                    <button type="button" onClick={() => toggleSort('plusOneAccepted')} className="group flex items-center gap-2">
                      <span>+1 accepted</span>
                      {renderSortIcon('plusOneAccepted')}
                    </button>
                  </th>
                )}
                {isColumnVisible('tischInvited') && (
                  <th className="px-3 py-2 w-[170px]">
                    <button type="button" onClick={() => toggleSort('tischInvited')} className="group flex items-center gap-2">
                      <span>Tisch</span>
                      {renderSortIcon('tischInvited')}
                    </button>
                  </th>
                )}
                {isColumnVisible('rsvpStatus') && (
                  <th className="px-3 py-2 w-[190px]">
                    <button type="button" onClick={() => toggleSort('rsvpStatus')} className="group flex items-center gap-2">
                      <span>RSVP</span>
                      {renderSortIcon('rsvpStatus')}
                    </button>
                  </th>
                )}
                {isColumnVisible('dietaryRestrictions') && (
                  <th className="px-3 py-2 w-[190px]">
                    <button type="button" onClick={() => toggleSort('dietaryRestrictions')} className="group flex items-center gap-2">
                      <span>Dietary</span>
                      {renderSortIcon('dietaryRestrictions')}
                    </button>
                  </th>
                )}
                {isColumnVisible('table') && (
                  <th className="px-3 py-2 w-[150px]">
                    <button type="button" onClick={() => toggleSort('table')} className="group flex items-center gap-2">
                      <span>Table</span>
                      {renderSortIcon('table')}
                    </button>
                  </th>
                )}
                {isColumnVisible('email') && (
                  <th className="px-3 py-2 w-[260px]">
                    <button type="button" onClick={() => toggleSort('email')} className="group flex items-center gap-2">
                      <span>Email</span>
                      {renderSortIcon('email')}
                    </button>
                  </th>
                )}
                {isColumnVisible('phone') && (
                  <th className="px-3 py-2 w-[170px]">
                    <button type="button" onClick={() => toggleSort('phone')} className="group flex items-center gap-2">
                      <span>Phone</span>
                      {renderSortIcon('phone')}
                    </button>
                  </th>
                )}
                {isColumnVisible('address') && (
                  <th className="px-3 py-2 w-[420px]">
                    <button type="button" onClick={() => toggleSort('address')} className="group flex items-center gap-2">
                      <span>Address</span>
                      {renderSortIcon('address')}
                    </button>
                  </th>
                )}
                <th className="sticky right-0 px-3 py-2 w-[110px] text-right bg-white shadow-[inset_1px_0_0_rgba(0,0,0,0.04)] z-20">
                  Menu
                </th>
              </tr>
              <tr className="text-xs text-sage-dark/80">
                <th className="sticky left-0 z-20 px-3 pb-2 w-[260px] min-w-[240px] bg-white shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                  <input
                    type="text"
                    value={filters.envelopeName}
                    onChange={(event) => handleFilterChange('envelopeName', event.target.value)}
                    className={filterInputClass}
                    placeholder="Search household"
                  />
                </th>
                {isColumnVisible('customSlug') && (
                  <th className="px-3 pb-2 w-[220px]">
                    <input
                      type="text"
                      value={filters.customSlug}
                      onChange={(event) => handleFilterChange('customSlug', event.target.value)}
                      className={filterInputClass}
                      placeholder="Slug search"
                    />
                  </th>
                )}
                {isColumnVisible('invitedBy') && (
                  <th className="px-3 pb-2 w-[150px]">
                    <select
                      value={filters.invitedBy}
                      onChange={(event) => handleFilterChange('invitedBy', event.target.value)}
                      className={filterInputClass}
                    >
                      <option value="all">All</option>
                      {invitedByOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </th>
                )}
                {isColumnVisible('invitationSent') && (
                  <th className="px-3 pb-2 w-[150px]">
                    <select
                      value={filters.invitationSent}
                      onChange={(event) => handleFilterChange('invitationSent', event.target.value)}
                      className={filterInputClass}
                    >
                      <option value="any">Any</option>
                      <option value="yes">Sent</option>
                      <option value="no">Not sent</option>
                    </select>
                  </th>
                )}
                {isColumnVisible('saveTheDateSent') && (
                  <th className="px-3 pb-2 w-[160px]">
                    <select
                      value={filters.saveTheDateSent}
                      onChange={(event) => handleFilterChange('saveTheDateSent', event.target.value)}
                      className={filterInputClass}
                    >
                      <option value="any">Any</option>
                      <option value="yes">Sent</option>
                      <option value="no">Not sent</option>
                    </select>
                  </th>
                )}
                {isColumnVisible('plusOneAllowed') && (
                  <th className="px-3 pb-2 w-[160px]">
                    <select
                      value={filters.plusOneAllowed}
                      onChange={(event) => handleFilterChange('plusOneAllowed', event.target.value)}
                      className={filterInputClass}
                    >
                      <option value="any">Any</option>
                      <option value="yes">Allowed</option>
                      <option value="no">Not allowed</option>
                    </select>
                  </th>
                )}
                {isColumnVisible('plusOneAccepted') && (
                  <th className="px-3 pb-2 w-[170px]">
                    <select
                      value={filters.plusOneAccepted}
                      onChange={(event) => handleFilterChange('plusOneAccepted', event.target.value)}
                      className={filterInputClass}
                    >
                      <option value="any">Any</option>
                      <option value="yes">Accepted</option>
                      <option value="no">Not accepted</option>
                    </select>
                  </th>
                )}
                {isColumnVisible('tischInvited') && (
                  <th className="px-3 pb-2 w-[170px]">
                    <select
                      value={filters.tischInvited}
                      onChange={(event) => handleFilterChange('tischInvited', event.target.value)}
                      className={filterInputClass}
                    >
                      <option value="any">Any</option>
                      <option value="yes">Invited</option>
                      <option value="no">Not invited</option>
                    </select>
                  </th>
                )}
                {isColumnVisible('rsvpStatus') && (
                  <th className="px-3 pb-2 w-[190px]">
                    <select
                      value={filters.rsvpStatus}
                      onChange={(event) => handleFilterChange('rsvpStatus', event.target.value)}
                      className={filterInputClass}
                    >
                      <option value="all">All</option>
                      {rsvpOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </th>
                )}
                {isColumnVisible('dietaryRestrictions') && (
                  <th className="px-3 pb-2 w-[190px]">
                    <input
                      type="text"
                      value={filters.dietaryRestrictions}
                      onChange={(event) => handleFilterChange('dietaryRestrictions', event.target.value)}
                      className={filterInputClass}
                      placeholder="Filter dietary"
                    />
                  </th>
                )}
                {isColumnVisible('table') && (
                  <th className="px-3 pb-2 w-[150px]">
                    <input
                      type="text"
                      value={filters.table}
                      onChange={(event) => handleFilterChange('table', event.target.value)}
                      className={filterInputClass}
                      placeholder="Table"
                    />
                  </th>
                )}
                {isColumnVisible('email') && (
                  <th className="px-3 pb-2 w-[260px]">
                    <input
                      type="text"
                      value={filters.email}
                      onChange={(event) => handleFilterChange('email', event.target.value)}
                      className={filterInputClass}
                      placeholder="Email"
                    />
                  </th>
                )}
                {isColumnVisible('phone') && (
                  <th className="px-3 pb-2 w-[170px]">
                    <input
                      type="text"
                      value={filters.phone}
                      onChange={(event) => handleFilterChange('phone', event.target.value)}
                      className={filterInputClass}
                      placeholder="Phone"
                    />
                  </th>
                )}
                {isColumnVisible('address') && (
                  <th className="px-3 pb-2 w-[420px]">
                    <input
                      type="text"
                      value={filters.address}
                      onChange={(event) => handleFilterChange('address', event.target.value)}
                      className={filterInputClass}
                      placeholder="Address search"
                    />
                  </th>
                )}
                <th className="sticky right-0 px-3 pb-2 w-[110px] bg-white shadow-[inset_1px_0_0_rgba(0,0,0,0.04)] z-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/20">
              {visibleHouseholds.map((household) => {
                const isExpanded = expandedHouseholds.has(household.id)
                const isMenuOpen = openMenuId === household.id
                const locked = household.rsvpLocked
                const hasPlusOneGuest = household.guests.some((guest) => guest.type === 'plus-one')
                const guestCount = household.guests.length + (household.plusOneAllowed && !hasPlusOneGuest ? 1 : 0)
                return (
                  <Fragment key={household.id}>
                    <tr
                      className={`relative ${isMenuOpen ? 'z-40' : 'z-10'} bg-white shadow-lg shadow-sage/25 transition duration-200 ${
                        isExpanded ? 'ring-1 ring-sage/15' : ''
                      }`}
                      style={isExpanded ? { animation: 'householdPulse 180ms ease-out' } : undefined}
                    >
                      <td
                        className={`sticky left-0 ${isMenuOpen ? 'z-40' : 'z-10'} px-3 py-2 w-[260px] bg-white shadow-[2px_0_0_rgba(0,0,0,0.04)]`}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleHouseholdExpanded(household.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-sage/40 bg-white text-sage-dark shadow-sm transition hover:border-sage"
                            aria-label={isExpanded ? 'Collapse household' : 'Expand household'}
                          >
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 20 20"
                              fill="none"
                              className={`h-4 w-4 transition ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          {!isExpanded && (
                            <span className="whitespace-nowrap rounded-full bg-sage/15 px-2 py-1 text-[0.75rem] font-semibold text-sage-dark">
                              {guestCount} guest{guestCount === 1 ? '' : 's'}
                            </span>
                          )}
                          <div className="flex-1">
                            <input
                              type="text"
                              value={household.envelopeName}
                              onChange={(event) => updateHousehold(household.id, { envelopeName: event.target.value })}
                              className={tableInputClass}
                              placeholder="Household name"
                            />
                            {locked && (
                              <p className="mt-1 text-xs font-semibold text-sage-dark/70">RSVP locked</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {isColumnVisible('customSlug') && (
                        <td className="px-3 py-2 w-[220px]">
                          <input
                            type="text"
                            value={household.customSlug || ''}
                            onChange={(event) => updateHousehold(household.id, { customSlug: event.target.value })}
                            className={tableInputClass}
                            placeholder="Optional"
                          />
                          <p className="mt-1 truncate text-[0.7rem] font-semibold text-sage-dark/60" title={`/${household.slug}`}>
                            /{household.slug}
                          </p>
                        </td>
                      )}
                      {isColumnVisible('invitedBy') && (
                        <td className="px-3 py-2 w-[150px]">
                          <select
                            value={household.invitedBy}
                            onChange={(event) => updateHousehold(household.id, { invitedBy: event.target.value })}
                            className={tableSelectClass}
                          >
                            {invitedByOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      {isColumnVisible('invitationSent') && (
                        <td className="px-3 py-2 w-[150px]">
                          <label className="flex items-center gap-2 text-sm text-charcoal/80">
                            <input
                              type="checkbox"
                              checked={household.invitationSent}
                              onChange={() => updateHousehold(household.id, { invitationSent: !household.invitationSent })}
                              className={checkboxClass}
                            />
                            Sent
                          </label>
                        </td>
                      )}
                      {isColumnVisible('saveTheDateSent') && (
                        <td className="px-3 py-2 w-[160px]">
                          <label className="flex items-center gap-2 text-sm text-charcoal/80">
                            <input
                              type="checkbox"
                              checked={household.saveTheDateSent}
                              onChange={() => updateHousehold(household.id, { saveTheDateSent: !household.saveTheDateSent })}
                              className={checkboxClass}
                            />
                            Sent
                          </label>
                        </td>
                      )}
                      {isColumnVisible('plusOneAllowed') && (
                        <td className="px-3 py-2 w-[160px]">
                          <label className="flex items-center gap-2 text-sm text-charcoal/80">
                            <input
                              type="checkbox"
                              checked={household.plusOneAllowed}
                              onChange={() =>
                                updateHousehold(household.id, {
                                  plusOneAllowed: !household.plusOneAllowed,
                                  plusOneAccepted: household.plusOneAllowed ? false : household.plusOneAccepted,
                                })
                              }
                              className={checkboxClass}
                            />
                            Allowed
                          </label>
                        </td>
                      )}
                      {isColumnVisible('plusOneAccepted') && (
                        <td className="px-3 py-2 w-[170px]">
                          <label className="flex items-center gap-2 text-sm text-charcoal/80">
                            <input
                              type="checkbox"
                              checked={household.plusOneAccepted}
                              onChange={() =>
                                updateHousehold(household.id, {
                                  plusOneAccepted: household.plusOneAllowed ? !household.plusOneAccepted : false,
                                })
                              }
                              className={checkboxClass}
                              disabled={!household.plusOneAllowed || locked}
                            />
                            Accepted
                          </label>
                        </td>
                      )}
                      {isColumnVisible('tischInvited') && (
                        <td className="px-3 py-2 w-[170px]">
                          <label className="flex items-center gap-2 text-sm text-charcoal/80">
                            <input
                              type="checkbox"
                              checked={household.tischInvited}
                              onChange={() => updateHousehold(household.id, { tischInvited: !household.tischInvited })}
                              className={checkboxClass}
                            />
                            Invited
                          </label>
                        </td>
                      )}
                      {isColumnVisible('rsvpStatus') && (
                        <td className="px-3 py-2 w-[190px]">
                          <select
                            value={household.rsvpStatus}
                            onChange={(event) => updateHousehold(household.id, { rsvpStatus: event.target.value })}
                            className={tableSelectClass}
                            disabled={locked}
                          >
                            {rsvpOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      {isColumnVisible('dietaryRestrictions') && (
                        <td className="px-3 py-2 w-[190px]">
                          <select
                            value={household.dietaryRestrictions}
                            onChange={(event) => updateHousehold(household.id, { dietaryRestrictions: event.target.value })}
                            className={tableSelectClass}
                          >
                            {dietaryOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      {isColumnVisible('table') && (
                        <td className="px-3 py-2 w-[150px]">
                          <input
                            type="text"
                            value={household.table}
                            onChange={(event) => updateHousehold(household.id, { table: event.target.value })}
                            className={tableInputClass}
                            placeholder="Table"
                          />
                        </td>
                      )}
                      {isColumnVisible('email') && (
                        <td className="px-3 py-2 w-[260px]">
                          <input
                            type="email"
                            value={household.email}
                            onChange={(event) => updateHousehold(household.id, { email: event.target.value })}
                            className={tableInputClass}
                            placeholder="contact@email.com"
                          />
                        </td>
                      )}
                      {isColumnVisible('phone') && (
                        <td className="px-3 py-2 w-[170px]">
                          <input
                            type="tel"
                            value={household.phone}
                            onChange={(event) => updateHousehold(household.id, { phone: event.target.value })}
                            className={tableInputClass}
                            placeholder="(555) 123-4567"
                          />
                        </td>
                      )}
                      {isColumnVisible('address') && (
                        <td className="px-3 py-2 w-[420px]">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm text-charcoal/80" title={formatAddress(household.address)}>
                              {formatAddress(household.address)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setAddressModalId(household.id)}
                              className="rounded-full border border-sage/40 px-2 py-1 text-xs font-semibold text-sage-dark transition hover:border-sage hover:text-sage-dark"
                            >
                              View / edit
                            </button>
                          </div>
                        </td>
                      )}
                      <td
                        className={`sticky right-0 px-3 py-2 w-[110px] text-right backdrop-blur bg-white shadow-[inset_1px_0_0_rgba(0,0,0,0.04)] ${
                          isMenuOpen ? 'z-40' : 'z-10'
                        }`}
                      >
                        <div className="relative inline-block text-left z-30">
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === household.id ? null : household.id)}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-sage/40 bg-white text-lg font-semibold text-sage-dark shadow-sm transition hover:border-sage"
                            aria-haspopup="menu"
                            aria-expanded={openMenuId === household.id}
                          >
                            ⋯
                          </button>
                          {openMenuId === household.id && (
                            <div className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-sage/30 bg-white p-2 text-left shadow-lg">
                              <button
                                type="button"
                                onClick={() => addGuest(household.id, 'primary')}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-sage-dark hover:bg-sage/10"
                              >
                                Add guest
                              </button>
                              <button
                                type="button"
                                onClick={() => removeHousehold(household.id)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                              >
                                Remove household
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded &&
                      household.guests.map((guest) => (
                        <tr
                          key={`${household.id}-${guest.id}`}
                          className="bg-sage/10"
                          style={{ animation: 'guestRowFadeIn 200ms ease-out' }}
                        >
                          <td className="sticky left-0 z-10 px-3 py-2 pl-10 w-[260px] bg-sage/10 shadow-[2px_0_0_rgba(0,0,0,0.04)]">
                            <input
                              type="text"
                              value={guest.name}
                              onChange={(event) => updateGuest(household.id, guest.id, { name: event.target.value })}
                              className={tableInputClass}
                              placeholder="Guest name"
                            />
                          </td>
                          {isColumnVisible('customSlug') && <td className="px-3 py-2 w-[220px] text-sm text-charcoal/60">—</td>}
                          {isColumnVisible('invitedBy') && <td className="px-3 py-2 w-[150px] text-sm text-charcoal/60">—</td>}
                          {isColumnVisible('invitationSent') && <td className="px-3 py-2 w-[150px] text-sm text-charcoal/60">—</td>}
                          {isColumnVisible('saveTheDateSent') && <td className="px-3 py-2 w-[160px] text-sm text-charcoal/60">—</td>}
                          {isColumnVisible('plusOneAllowed') && <td className="px-3 py-2 w-[160px] text-sm text-charcoal/60">—</td>}
                          {isColumnVisible('plusOneAccepted') && <td className="px-3 py-2 w-[170px] text-sm text-charcoal/60">—</td>}
                          {isColumnVisible('tischInvited') && (
                            <td className="px-3 py-2 w-[170px]">
                              {household.tischInvited ? (
                                <select
                                  value={guest.tischRsvp}
                                  onChange={(event) =>
                                    updateGuest(household.id, guest.id, { tischRsvp: event.target.value })
                                  }
                                  className={tableSelectClass}
                                  disabled={locked}
                                >
                                  {tischRsvpOptions
                                    .filter((option) => option !== 'Not invited')
                                    .map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                </select>
                              ) : (
                                <span className="text-sm text-charcoal/60">Not invited</span>
                              )}
                            </td>
                          )}
                          {isColumnVisible('rsvpStatus') && (
                            <td className="px-3 py-2 w-[190px]">
                              <select
                                value={guest.rsvpStatus}
                                onChange={(event) => updateGuest(household.id, guest.id, { rsvpStatus: event.target.value })}
                                className={tableSelectClass}
                                disabled={locked}
                              >
                                {rsvpOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                          {isColumnVisible('dietaryRestrictions') && (
                            <td className="px-3 py-2 w-[190px]">
                              <select
                                value={guest.dietary}
                                onChange={(event) => updateGuest(household.id, guest.id, { dietary: event.target.value })}
                                className={tableSelectClass}
                                disabled={locked}
                              >
                                {dietaryOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                          {isColumnVisible('table') && <td className="px-3 py-2 w-[150px] text-sm text-charcoal/60">—</td>}
                          {isColumnVisible('email') && <td className="px-3 py-2 w-[260px] text-sm text-charcoal/60">—</td>}
                          {isColumnVisible('phone') && <td className="px-3 py-2 w-[170px] text-sm text-charcoal/60">—</td>}
                          {isColumnVisible('address') && <td className="px-3 py-2 w-[420px] text-sm text-charcoal/60">—</td>}
                          <td className="sticky right-0 px-3 py-2 w-[110px] text-right backdrop-blur bg-sage/10 shadow-[inset_1px_0_0_rgba(0,0,0,0.04)] z-20">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeGuest(household.id, guest.id)}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white text-lg font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-800"
                              >
                                −
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                )
              })}
              {visibleHouseholds.length === 0 && (
                <tr>
                  <td colSpan={visibleColumnCount} className="px-3 py-6 text-center text-sm text-charcoal/70">
                    No households match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
      {addressModalHousehold && (
        <>
          <button
            type="button"
            onClick={() => setAddressModalId(null)}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            aria-label="Close address editor"
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto px-4 pb-10 pt-20">
            <div className="w-full max-w-xl rounded-2xl border border-sage/30 bg-white shadow-2xl shadow-sage/30">
              <div className="flex items-center justify-between border-b border-sage/20 px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-sage-dark">Address for {addressModalHousehold.envelopeName}</p>
                  <p className="text-xs text-charcoal/70">{formatAddress(addressModalHousehold.address)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddressModalId(null)}
                  className="rounded-full border border-sage/40 px-3 py-1 text-xs font-semibold text-sage-dark transition hover:border-sage hover:text-sage-dark"
                >
                  Done
                </button>
              </div>
              <div className="space-y-3 px-5 py-4">
                <label className="block text-xs font-semibold text-sage-dark/80">
                  Street + unit
                  <input
                    type="text"
                    value={addressModalHousehold.address.line1}
                    onChange={(event) => updateAddressField(addressModalHousehold.id, 'line1', event.target.value)}
                    className={`${inputClass} mt-2`}
                    placeholder="123 Street Ave Apt 4"
                  />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={addressModalHousehold.address.city}
                    onChange={(event) => updateAddressField(addressModalHousehold.id, 'city', event.target.value)}
                    className={inputClass}
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={addressModalHousehold.address.state}
                    onChange={(event) => updateAddressField(addressModalHousehold.id, 'state', event.target.value)}
                    className={inputClass}
                    placeholder="State"
                  />
                  <input
                    type="text"
                    value={addressModalHousehold.address.postalCode}
                    onChange={(event) => updateAddressField(addressModalHousehold.id, 'postalCode', event.target.value)}
                    className={inputClass}
                    placeholder="Zip"
                  />
                </div>
                <input
                  type="text"
                  value={addressModalHousehold.address.country}
                  onChange={(event) => updateAddressField(addressModalHousehold.id, 'country', event.target.value)}
                  className={inputClass}
                  placeholder="Country"
                />
              </div>
            </div>
          </div>
        </>
      )}
      {draftHousehold && (
        <>
          <button
            type="button"
            onClick={cancelDraftHousehold}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
            aria-label="Close new invite overlay"
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto px-4 pb-10 pt-14">
            <form
              id="draft-household-panel"
              onSubmit={(event) => {
                event.preventDefault()
                confirmDraftHousehold()
              }}
              className="w-full max-w-6xl rounded-2xl border border-sage/30 bg-white shadow-2xl shadow-sage/30 transition duration-300 ease-out"
            >
              <div className="flex items-center justify-between border-b border-sage/20 px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-sage-dark">New invite (staged)</p>
                  <p className="text-sm text-charcoal/70">Fill details, then add to table. You can add additional household guests once the entry is added.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelDraftHousehold}
                    className="rounded-full border border-sage/40 px-4 py-2 text-sm font-semibold text-sage-dark transition hover:border-sage hover:text-sage-dark"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-sage px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-dark"
                  >
                    Add to table
                  </button>
                </div>
              </div>
              <div className="grid gap-4 px-6 py-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-sage-dark/80">
                    Household name
                    <input
                      type="text"
                      value={draftHousehold.envelopeName}
                      onChange={(event) => updateDraftField('envelopeName', event.target.value)}
                      className={`${inputClass} mt-2`}
                      placeholder="Household or envelope name"
                      required
                    />
                  </label>
                  <label className="block text-xs font-semibold text-sage-dark/80">
                    Custom URL (optional)
                    <input
                      type="text"
                      value={draftHousehold.customSlug || ''}
                      onChange={(event) => updateDraftField('customSlug', event.target.value)}
                      className={`${inputClass} mt-2`}
                      placeholder="Optional"
                    />
                    <p className="mt-1 truncate text-[0.7rem] font-semibold text-sage-dark/60" title={`/${normalizeSlug(draftHousehold.customSlug) || slugify(draftHousehold.envelopeName || 'household')}`}>
                      /{normalizeSlug(draftHousehold.customSlug) || slugify(draftHousehold.envelopeName || 'household')}
                    </p>
                  </label>
                  <label className="block text-xs font-semibold text-sage-dark/80">
                    Invited by
                    <select
                      value={draftHousehold.invitedBy}
                      onChange={(event) => updateDraftField('invitedBy', event.target.value)}
                      className={`${selectClass} mt-2`}
                    >
                      {invitedByOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm text-charcoal/80">
                      <input
                        type="checkbox"
                        checked={draftHousehold.invitationSent}
                        onChange={() => updateDraftField('invitationSent', !draftHousehold.invitationSent)}
                        className={checkboxClass}
                      />
                      Invite sent
                    </label>
                    <label className="flex items-center gap-2 text-sm text-charcoal/80">
                      <input
                        type="checkbox"
                        checked={draftHousehold.saveTheDateSent}
                        onChange={() => updateDraftField('saveTheDateSent', !draftHousehold.saveTheDateSent)}
                        className={checkboxClass}
                      />
                      Save the date
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm text-charcoal/80">
                      <input
                        type="checkbox"
                        checked={draftHousehold.plusOneAllowed}
                        onChange={() =>
                          updateDraftField('plusOneAllowed', !draftHousehold.plusOneAllowed)
                        }
                        className={checkboxClass}
                      />
                      +1 allowed
                    </label>
                    <label className="flex items-center gap-2 text-sm text-charcoal/80">
                      <input
                        type="checkbox"
                        checked={draftHousehold.plusOneAccepted}
                        onChange={() =>
                          updateDraftField('plusOneAccepted', draftHousehold.plusOneAllowed ? !draftHousehold.plusOneAccepted : false)
                        }
                        className={checkboxClass}
                        disabled={!draftHousehold.plusOneAllowed}
                      />
                      +1 accepted
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-charcoal/80">
                    <input
                      type="checkbox"
                      checked={draftHousehold.tischInvited}
                      onChange={() => updateDraftField('tischInvited', !draftHousehold.tischInvited)}
                      className={checkboxClass}
                    />
                    Invite to tisch
                  </label>
                  <label className="block text-xs font-semibold text-sage-dark/80">
                    RSVP
                    <select
                      value={draftHousehold.rsvpStatus}
                      onChange={(event) => updateDraftField('rsvpStatus', event.target.value)}
                      className={`${selectClass} mt-2`}
                    >
                      {rsvpOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-sage-dark/80">
                    Primary guest
                    <input
                      type="text"
                      value={draftHousehold.guests[0]?.name || ''}
                      onChange={(event) =>
                        updateDraftGuest(draftHousehold.guests[0]?.id, { name: event.target.value })
                      }
                      className={`${inputClass} mt-2`}
                      placeholder="Primary guest name"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-sage-dark/80">
                    Notes
                    <textarea
                      rows={3}
                      value={draftHousehold.notes}
                      onChange={(event) => updateDraftField('notes', event.target.value)}
                      className={`${inputClass} mt-2`}
                      placeholder="Any notes for this household"
                    />
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-sage-dark/80">
                    Table
                    <input
                      type="text"
                      value={draftHousehold.table}
                      onChange={(event) => updateDraftField('table', event.target.value)}
                      className={`${inputClass} mt-2`}
                      placeholder="Table name or number"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-sage-dark/80">
                    Email
                    <input
                      type="email"
                      value={draftHousehold.email}
                      onChange={(event) => updateDraftField('email', event.target.value)}
                      className={`${inputClass} mt-2`}
                      placeholder="contact@email.com"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-sage-dark/80">
                    Phone
                    <input
                      type="tel"
                      value={draftHousehold.phone}
                      onChange={(event) => updateDraftField('phone', event.target.value)}
                      className={`${inputClass} mt-2`}
                      placeholder="(555) 123-4567"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-sage-dark/80">
                    Address line
                    <input
                      type="text"
                      value={draftHousehold.address.line1}
                      onChange={(event) => updateDraftAddressField('line1', event.target.value)}
                      className={`${inputClass} mt-2`}
                      placeholder="Street + unit"
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={draftHousehold.address.city}
                      onChange={(event) => updateDraftAddressField('city', event.target.value)}
                      className={inputClass}
                      placeholder="City"
                    />
                    <input
                      type="text"
                      value={draftHousehold.address.state}
                      onChange={(event) => updateDraftAddressField('state', event.target.value)}
                      className={inputClass}
                      placeholder="State"
                    />
                    <input
                      type="text"
                      value={draftHousehold.address.postalCode}
                      onChange={(event) => updateDraftAddressField('postalCode', event.target.value)}
                      className={inputClass}
                      placeholder="Zip"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftHousehold.address.country}
                    onChange={(event) => updateDraftAddressField('country', event.target.value)}
                    className={inputClass}
                    placeholder="Country"
                  />
                </div>
              </div>
            </form>
          </div>
        </>
      )}
      {showFloatingAdd && (
        <button
          type="button"
          onClick={startNewHouseholdDraft}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-sage px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sage/40 transition hover:bg-sage-dark"
          aria-label="Add invite"
        >
          +
          <span className="hidden sm:inline">Add invite</span>
        </button>
      )}
    </main>
  )
}
