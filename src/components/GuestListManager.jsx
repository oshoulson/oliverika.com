import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

const AUTH_STORAGE_KEY = 'oliverikaGuestListAuth'
export const DATA_STORAGE_KEY = 'oliverikaGuestListData'
const PASSWORD = import.meta.env.VITE_GUEST_LIST_PASSWORD || 'macbeth'
const FUNCTIONS_BASE = '/.netlify/functions'

export const slugify = (text) => {
  const cleaned = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
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
        dietary: 'None',
      },
      {
        id: createId('guest'),
        name: 'Erika L.',
        role: 'Bride',
        type: 'primary',
        rsvpStatus: 'Accepted',
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
        dietary: 'None',
      },
      {
        id: createId('guest'),
        name: 'Jordan Rivera',
        role: 'Partner',
        type: 'primary',
        rsvpStatus: 'Awaiting response',
        dietary: 'Gluten free',
      },
      {
        id: createId('guest'),
        name: 'Plus One (TBD)',
        role: 'Optional guest',
        type: 'plus-one',
        rsvpStatus: 'Not offered',
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
        dietary: 'Kosher style',
      },
      {
        id: createId('guest'),
        name: 'Taylor Morgan',
        role: 'Spouse',
        type: 'primary',
        rsvpStatus: 'Awaiting response',
        dietary: 'None',
      },
      {
        id: createId('guest'),
        name: 'Jamie Morgan',
        role: 'Child',
        type: 'child',
        rsvpStatus: 'Awaiting response',
        dietary: 'Peanut allergy',
      },
    ],
  },
]

const rsvpOptions = ['Awaiting response', 'Accepted', 'Declined', 'Tentative', 'Not offered']
const dietaryOptions = ['None', 'Vegetarian', 'Vegan', 'Gluten free', 'Kosher style', 'Halal', 'Peanut allergy', 'Other']
const invitedByOptions = ['Bride', 'Groom', 'Both']
const checkboxClass =
  'h-4 w-4 rounded border border-sage/50 bg-white text-sage-dark checked:bg-sage checked:border-sage focus:ring-2 focus:ring-sage/30 focus:ring-offset-1 transition'
const selectClass =
  'w-full rounded-lg border border-sage/30 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/30'
const inputClass =
  'w-full rounded-lg border border-sage/20 bg-white/90 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/30'

const blankHousehold = () => ({
  id: createId('household'),
  envelopeName: 'New household',
  slug: slugify('New household'),
  invitedBy: 'Both',
  address: { line1: '', city: '', state: '', postalCode: '', country: '' },
  email: '',
  phone: '',
  saveTheDateSent: false,
  invitationSent: false,
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
      dietary: 'None',
    },
  ],
})

const ensureDerivedFields = (household) => ({
  ...household,
  slug: household.slug || slugify(household.envelopeName || 'household'),
  plusOneAccepted: Boolean(household.plusOneAccepted),
  rsvpLocked: Boolean(household.rsvpLocked),
  guests: (household.guests || []).map((guest) => ({
    ...guest,
    rsvpStatus: guest.rsvpStatus || 'Awaiting response',
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
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState('')
  const [households, setHouseholds] = useState(initialHouseholds)
  const [expandedHouseholds, setExpandedHouseholds] = useState(() => new Set(initialHouseholds.map((household) => household.id)))
  const [openMenuId, setOpenMenuId] = useState(null)
  const [remoteStatus, setRemoteStatus] = useState('idle')
  const [remoteError, setRemoteError] = useState('')
  const saveTimer = useRef(null)
  const isSavingRef = useRef(false)

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
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(households))
    } catch (error) {
      console.warn('Unable to persist guest list', error)
    }
  }, [households])

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
          setExpandedHouseholds(new Set(mapped.map((household) => household.id)))
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

  const persistGuestList = async () => {
    if (isSavingRef.current) return
    isSavingRef.current = true
    setRemoteStatus((status) => (status === 'loading' ? 'loading' : 'saving'))
    setRemoteError('')
    try {
      const response = await fetch(`${FUNCTIONS_BASE}/guest-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ households }),
      })
      if (!response.ok) {
        throw new Error('Save failed')
      }
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

  const stats = useMemo(() => {
    const invitations = households.length
    let guestCount = 0
    let maxInvited = 0
    let acceptedGuests = 0
    let awaitingInvites = 0

    households.forEach((household) => {
      guestCount += household.guests.length

      const hasPlusOneGuest = household.guests.some((guest) => guest.type === 'plus-one')
      const plusOneSlot = household.plusOneAllowed && !hasPlusOneGuest ? 1 : 0
      maxInvited += household.guests.length + plusOneSlot

      const allAwaiting = household.invitationSent && household.guests.every((guest) => guest.rsvpStatus === 'Awaiting response')
      if (allAwaiting) {
        awaitingInvites += 1
      }

      household.guests.forEach((guest) => {
        if (guest.rsvpStatus === 'Accepted') {
          acceptedGuests += 1
        }
      })

      if (household.plusOneAllowed && household.plusOneAccepted) {
        acceptedGuests += 1
      }
    })

    return { invitations, guestCount, maxInvited, acceptedGuests, awaitingInvites }
  }, [households])


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

  const updateHousehold = (id, updates) => {
    setHouseholds((prev) => prev.map((household) => (household.id === id ? { ...household, ...updates } : household)))
    queuePersist()
  }

  const updateAddressField = (id, field, value) => {
    setHouseholds((prev) =>
      prev.map((household) =>
        household.id === id ? { ...household, address: { ...household.address, [field]: value } } : household,
      ),
    )
    queuePersist()
  }

  const updateGuest = (householdId, guestId, updates) => {
    setHouseholds((prev) =>
      prev.map((household) =>
        household.id === householdId
          ? { ...household, guests: household.guests.map((guest) => (guest.id === guestId ? { ...guest, ...updates } : guest)) }
          : household,
      ),
    )
    queuePersist()
  }

  const addGuest = (householdId, type = 'primary') => {
    const newGuest = {
      id: createId('guest'),
      name: type === 'plus-one' ? 'Plus One (TBD)' : 'New guest',
      role: type === 'child' ? 'Child' : '',
      type,
      rsvpStatus: type === 'plus-one' ? 'Not offered' : 'Awaiting response',
      dietary: 'None',
    }
    setHouseholds((prev) =>
      prev.map((household) =>
        household.id === householdId ? { ...household, guests: [...household.guests, newGuest] } : household,
      ),
    )
    setOpenMenuId(null)
    queuePersist()
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
    queuePersist()
  }

  const removeGuest = (householdId, guestId) => {
    setHouseholds((prev) =>
      prev.map((household) => {
        if (household.id !== householdId) return household
        const remaining = household.guests.filter((guest) => guest.id !== guestId)
        return { ...household, guests: remaining.length > 0 ? remaining : household.guests }
      }),
    )
    queuePersist()
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

  const exportCsv = () => {
    const headers = [
      'Household',
      'Invited By',
      'Invitation Sent',
      'Save The Date Sent',
      'Plus One Allowed',
      'Plus One Accepted',
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
      'Guest Name',
      'Guest Role',
      'Guest RSVP',
      'Guest Dietary',
    ]

    const rows = []
    households.forEach((household) => {
      const base = [
        household.envelopeName,
        household.invitedBy,
        household.invitationSent ? 'Yes' : 'No',
        household.saveTheDateSent ? 'Yes' : 'No',
        household.plusOneAllowed ? 'Yes' : 'No',
        household.plusOneAccepted ? 'Yes' : 'No',
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
      ]

      if (household.guests.length === 0) {
        rows.push([...base, '', '', ''])
      } else {
        household.guests.forEach((guest) => {
          rows.push([...base, guest.name, guest.role || '', guest.rsvpStatus, guest.dietary])
        })
      }
    })

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
    link.download = 'guest-list.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const addHousehold = () => {
    const nextHousehold = blankHousehold()
    setHouseholds((prev) => [...prev, nextHousehold])
    setExpandedHouseholds((prev) => {
      const next = new Set(prev)
      next.add(nextHousehold.id)
      return next
    })
    setOpenMenuId(null)
    queuePersist()
  }

  if (!isAuthorized) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 text-charcoal">
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-sage-dark">Guest list</p>
          <h1 className="mt-1 font-serif text-4xl text-sage-dark">Wedding guest manager</h1>
          <p className="mt-2 max-w-2xl text-sm text-charcoal/75">
            Track invitations at the household level, then expand each invite to edit guests underneath. Data lives in your browser for
            now; wire up Sheets or Airtable later to share edits.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addHousehold}
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
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Max invited', value: stats.maxInvited, sub: 'Guests incl. allowed +1s' },
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
              onClick={exportCsv}
              className="rounded-full bg-sage px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-dark"
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1900px] divide-y divide-sage/20 text-sm">
            <thead className="bg-sage/10 text-left text-sage-dark">
              <tr className="text-sm font-semibold">
                <th className="px-3 py-3 w-[260px] min-w-[240px]">Name</th>
                <th className="px-3 py-3 w-[150px]">Invited by</th>
                <th className="px-3 py-3 w-[150px]">Invite sent</th>
                <th className="px-3 py-3 w-[160px]">Save the date</th>
                <th className="px-3 py-3 w-[160px]">+1 allowed</th>
                <th className="px-3 py-3 w-[170px]">+1 accepted</th>
                <th className="px-3 py-3 w-[190px]">RSVP</th>
                <th className="px-3 py-3 w-[190px]">Dietary</th>
                <th className="px-3 py-3 w-[150px]">Table</th>
                <th className="px-3 py-3 w-[260px]">Email</th>
                <th className="px-3 py-3 w-[170px]">Phone</th>
                <th className="px-3 py-3 w-[420px]">Address</th>
                <th className="sticky right-0 px-3 py-3 w-[110px] text-right bg-white shadow-[inset_1px_0_0_rgba(0,0,0,0.04)] z-20">
                  Menu
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sage/20">
              {households.map((household) => {
                const isExpanded = expandedHouseholds.has(household.id)
                const locked = household.rsvpLocked
                return (
                  <Fragment key={household.id}>
                    <tr className="relative z-10 bg-white shadow-lg shadow-sage/25">
                      <td className="px-3 py-3 w-[260px]">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleHouseholdExpanded(household.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-sage/40 bg-white text-sage-dark shadow-sm transition hover:border-sage"
                            aria-label={isExpanded ? 'Collapse household' : 'Expand household'}
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={household.envelopeName}
                              onChange={(event) => updateHousehold(household.id, { envelopeName: event.target.value })}
                              className={inputClass}
                              placeholder="Household name"
                            />
                            {locked && (
                              <p className="mt-1 text-xs font-semibold text-sage-dark/70">RSVP locked</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 w-[150px]">
                        <select
                          value={household.invitedBy}
                          onChange={(event) => updateHousehold(household.id, { invitedBy: event.target.value })}
                          className={selectClass}
                        >
                          {invitedByOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 w-[150px]">
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
                      <td className="px-3 py-3 w-[160px]">
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
                      <td className="px-3 py-3 w-[160px]">
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
                      <td className="px-3 py-3 w-[170px]">
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
                      <td className="px-3 py-3 w-[190px]">
                        <select
                          value={household.rsvpStatus}
                          onChange={(event) => updateHousehold(household.id, { rsvpStatus: event.target.value })}
                          className={selectClass}
                          disabled={locked}
                        >
                          {rsvpOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 w-[190px]">
                        <select
                          value={household.dietaryRestrictions}
                          onChange={(event) => updateHousehold(household.id, { dietaryRestrictions: event.target.value })}
                          className={selectClass}
                        >
                          {dietaryOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 w-[150px]">
                        <input
                          type="text"
                          value={household.table}
                          onChange={(event) => updateHousehold(household.id, { table: event.target.value })}
                          className={inputClass}
                          placeholder="Table"
                        />
                      </td>
                      <td className="px-3 py-3 w-[260px]">
                        <input
                          type="email"
                          value={household.email}
                          onChange={(event) => updateHousehold(household.id, { email: event.target.value })}
                          className={inputClass}
                          placeholder="contact@email.com"
                        />
                      </td>
                      <td className="px-3 py-3 w-[170px]">
                        <input
                          type="tel"
                          value={household.phone}
                          onChange={(event) => updateHousehold(household.id, { phone: event.target.value })}
                          className={inputClass}
                          placeholder="(555) 123-4567"
                        />
                      </td>
                      <td className="px-3 py-3 w-[420px]">
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={household.address.line1}
                            onChange={(event) => updateAddressField(household.id, 'line1', event.target.value)}
                            className={inputClass}
                            placeholder="Street + unit"
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={household.address.city}
                              onChange={(event) => updateAddressField(household.id, 'city', event.target.value)}
                              className={inputClass}
                              placeholder="City"
                            />
                            <input
                              type="text"
                              value={household.address.state}
                              onChange={(event) => updateAddressField(household.id, 'state', event.target.value)}
                              className={inputClass}
                              placeholder="State"
                            />
                            <input
                              type="text"
                              value={household.address.postalCode}
                              onChange={(event) => updateAddressField(household.id, 'postalCode', event.target.value)}
                              className={inputClass}
                              placeholder="Zip"
                            />
                          </div>
                          <input
                            type="text"
                            value={household.address.country}
                            onChange={(event) => updateAddressField(household.id, 'country', event.target.value)}
                            className={inputClass}
                            placeholder="Country"
                          />
                        </div>
                      </td>
                      <td className="sticky right-0 px-3 py-3 w-[110px] text-right backdrop-blur bg-white shadow-[inset_1px_0_0_rgba(0,0,0,0.04)] z-10">
                        <div className="relative inline-block text-left">
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
                            <div className="absolute right-0 z-10 mt-2 w-44 rounded-xl border border-sage/30 bg-white p-2 text-left shadow-lg">
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
                        <tr key={`${household.id}-${guest.id}`} className="bg-sage/10">
                          <td className="px-3 py-3 pl-10 w-[260px]">
                            <input
                              type="text"
                              value={guest.name}
                              onChange={(event) => updateGuest(household.id, guest.id, { name: event.target.value })}
                              className={inputClass}
                              placeholder="Guest name"
                            />
                          </td>
                          <td className="px-3 py-3 w-[150px] text-sm text-charcoal/60">—</td>
                          <td className="px-3 py-3 w-[150px] text-sm text-charcoal/60">—</td>
                          <td className="px-3 py-3 w-[160px] text-sm text-charcoal/60">—</td>
                          <td className="px-3 py-3 w-[160px] text-sm text-charcoal/60">—</td>
                          <td className="px-3 py-3 w-[170px] text-sm text-charcoal/60">—</td>
                          <td className="px-3 py-3 w-[190px]">
                            <select
                              value={guest.rsvpStatus}
                              onChange={(event) => updateGuest(household.id, guest.id, { rsvpStatus: event.target.value })}
                              className={selectClass}
                              disabled={locked}
                            >
                              {rsvpOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3 w-[190px]">
                            <select
                              value={guest.dietary}
                              onChange={(event) => updateGuest(household.id, guest.id, { dietary: event.target.value })}
                              className={selectClass}
                              disabled={locked}
                            >
                              {dietaryOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3 w-[150px] text-sm text-charcoal/60">—</td>
                          <td className="px-3 py-3 w-[260px] text-sm text-charcoal/60">—</td>
                          <td className="px-3 py-3 w-[170px] text-sm text-charcoal/60">—</td>
                          <td className="px-3 py-3 w-[420px] text-sm text-charcoal/60">—</td>
                          <td className="sticky right-0 px-3 py-3 w-[110px] text-right backdrop-blur bg-sage/10 shadow-[inset_1px_0_0_rgba(0,0,0,0.04)] z-20">
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
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
