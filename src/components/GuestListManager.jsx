import { useEffect, useId, useMemo, useRef, useState } from 'react'
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
// The per-guest RSVP only governs the ceremony + reception. The Tisch is a
// separate event tracked in `tischRsvp`, so 'Both events' is displayed as
// 'Ceremony + Reception' to avoid implying it covers the Tisch too. The stored
// value stays 'Both events' so existing data and normalization are unaffected.
const rsvpStatusLabels = {
  'Both events': 'Ceremony + Reception',
}
const rsvpStatusLabel = (status) => rsvpStatusLabels[status] || status
const dietaryOptions = ['None', 'Vegetarian', 'Vegan', 'Gluten Free', 'Dairy Free', 'Peanut Allergy', 'Other']
const invitedByOptions = ['Bride', 'Groom', 'Both']
const tischRsvpOptions = ['Awaiting response', 'Attending', 'Not attending', 'Not invited']
const eventStatusFilterOptions = [
  { value: 'all', label: 'All' },
  { value: 'yes', label: 'Attending' },
  { value: 'no', label: 'Not attending' },
  { value: 'awaiting', label: 'Awaiting' },
]
const sortOptions = [
  { value: 'nameAsc', label: 'Household (A–Z)' },
  { value: 'nameDesc', label: 'Household (Z–A)' },
  { value: 'recent', label: 'RSVP: most recent first' },
  { value: 'oldest', label: 'RSVP: least recent first' },
  { value: 'tableAsc', label: 'Table (A–Z)' },
  { value: 'tableDesc', label: 'Table (Z–A)' },
]
const defaultSortBy = 'nameAsc'
const compareHouseholdNames = (a, b) =>
  String(a.envelopeName || '').toLowerCase().localeCompare(String(b.envelopeName || '').toLowerCase())
// Households that haven't RSVP'd yet have no rsvpRespondedAt timestamp; they're
// pushed to the end of either RSVP-date sort (name-ordered) rather than being
// treated as "oldest" or "most recent".
const compareByRespondedAt = (a, b, mostRecentFirst) => {
  const aTime = a.rsvpRespondedAt ? new Date(a.rsvpRespondedAt).getTime() : null
  const bTime = b.rsvpRespondedAt ? new Date(b.rsvpRespondedAt).getTime() : null
  if (aTime === null && bTime === null) return compareHouseholdNames(a, b)
  if (aTime === null) return 1
  if (bTime === null) return -1
  if (aTime === bTime) return compareHouseholdNames(a, b)
  return mostRecentFirst ? bTime - aTime : aTime - bTime
}
// Natural, case-insensitive ordering for table names so "Table 2" sorts
// before "Table 10".
export const compareTableNames = (a, b) =>
  String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' })

const cleanTableName = (value) => String(value ?? '').trim()

// Unique, non-empty tables a household's guests sit at, in guest order. A
// household spanning more than one is "split".
export const householdTables = (household) => {
  const names = []
  ;(household?.guests || []).forEach((guest) => {
    const name = cleanTableName(guest?.table)
    if (name && !names.includes(name)) names.push(name)
  })
  return names
}

// The single table every member sits at, or '' once the household is split
// across tables or anyone in it is unassigned.
const sharedTable = (guests) => {
  const names = (guests || []).map((guest) => cleanTableName(guest?.table))
  if (names.length === 0) return ''
  const first = names[0]
  return first && names.every((name) => name === first) ? first : ''
}

// Table is a per-guest attribute (guest.table). Legacy data stored a single
// household.table that applied to every member; copy it onto each guest that
// has no table of its own, which reproduces the old seating exactly. Anything
// saved by this code always writes guest.table as a string, so the migration
// never re-fires. household.table is kept as a derived value — the table every
// guest shares, or '' once the household is split — so older readers of the
// data keep working and never see a table no guest actually sits at.
export const applyTableModel = (household) => {
  const legacyTable = cleanTableName(household?.table)
  const guests = (household?.guests || []).map((guest) => ({
    ...guest,
    table: typeof guest?.table === 'string' ? guest.table : legacyTable,
  }))
  return { ...household, guests, table: sharedTable(guests) }
}

// Re-derive household.table after a guest-level edit (no legacy migration).
const withDerivedTable = (household) => ({ ...household, table: sharedTable(household.guests) })

// Households sort by their earliest table (natural order); households with
// nobody seated go last in both directions, name-ordered, like the RSVP sorts.
const compareByTable = (a, b, ascending) => {
  const aKey = householdTables(a).sort(compareTableNames)[0] || ''
  const bKey = householdTables(b).sort(compareTableNames)[0] || ''
  if (!aKey && !bKey) return compareHouseholdNames(a, b)
  if (!aKey) return 1
  if (!bKey) return -1
  const result = compareTableNames(aKey, bKey)
  if (result === 0) return compareHouseholdNames(a, b)
  return ascending ? result : -result
}

const sortComparators = {
  nameAsc: compareHouseholdNames,
  nameDesc: (a, b) => compareHouseholdNames(b, a),
  recent: (a, b) => compareByRespondedAt(a, b, true),
  oldest: (a, b) => compareByRespondedAt(a, b, false),
  tableAsc: (a, b) => compareByTable(a, b, true),
  tableDesc: (a, b) => compareByTable(a, b, false),
}
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

// A household can be "responded" overall yet still have individual members who
// haven't replied. This flags exactly those — on the board, but at least one
// named guest is still "Awaiting response" — so partial replies don't hide.
const hasAwaitingMembers = (household) =>
  hasResponded(household) &&
  (household?.guests || []).some((guest) => normalizeRsvpStatus(guest.rsvpStatus) === 'Awaiting response')

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
  // Each guest's allotted-but-unnamed +1 is still an invited seat (it's
  // counted this way in the top-line stats), so fold open slots into the
  // fraction too — otherwise these badges under-count relative to the totals.
  // Slot state mirrors the top-line rule: accepted → attending; once the
  // household has otherwise responded, an un-accepted +1 is a resolved "not
  // attending"; while the household is still silent it stays awaiting.
  const plusOneCountsHere =
    eventKey === 'tischRsvp' ? Boolean(household?.tischInvited) : true
  if (plusOneCountsHere) {
    openPlusOneSlots(household).forEach((host) => {
      total += 1
      if (host.plusOneAccepted) yes += 1
      else if (hasResponded(household)) no += 1
      else awaiting += 1
    })
  }
  if (total === 0) {
    return { label: 'n/a', className: 'bg-charcoal/5 text-charcoal/40' }
  }
  const label = `${yes}/${total}`
  if (yes === total) return { label, className: 'bg-sage text-white' }
  if (yes === 0 && no > 0 && awaiting === 0) return { label, className: 'bg-rose-100 text-rose-700' }
  return { label, className: 'bg-amber-100 text-amber-800' }
}

// The three real events, in order. Per-event fractions (attending / total) are
// the source of truth for attendance everywhere in the manager.
const SUMMARY_EVENTS = [
  { key: 'ceremonyRsvp', label: 'Ceremony' },
  { key: 'receptionRsvp', label: 'Reception' },
  { key: 'tischRsvp', label: 'Tisch' },
]

// Compact row of Ceremony / Reception / Tisch fraction badges for a household
// (or a history snapshot's household). Tisch shows "n/a" when the household was
// not Tisch-invited, which is exactly what distinguishes backup snapshots.
const EventFractionRow = ({ household, className = '' }) => (
  <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
    {SUMMARY_EVENTS.map(({ key, label }) => {
      const badge = eventSummaryBadge(household, key)
      return (
        <span key={key} className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-sage-dark/70">
          {label}
          <span className={`rounded-full px-2 py-0.5 ${badge.className}`}>{badge.label}</span>
        </span>
      )
    })}
  </div>
)

// Text input for a table name with a dropdown of the tables that already
// exist, narrowed as you type, so a guest can be seated at an existing table
// without recalling its exact spelling. Picking a suggestion writes that
// table's exact name; typing something that matches nothing creates a table.
const TableCombobox = ({ label, value, onChange, options, placeholder, className = inputClass }) => {
  const inputId = useId()
  const listId = `${inputId}-list`
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  // Whether the user has typed since focusing. Untouched, the list offers
  // every other table to browse; once typing starts it narrows to matches
  // (prefix matches first).
  const [typed, setTyped] = useState(false)
  const current = String(value ?? '')
  const trimmed = current.trim()
  // The field writes through on every keystroke, so the name being typed is
  // itself already "a table" (this guest sits there). Only tables where
  // someone other than this field's subject sits count as existing ones.
  const others = useMemo(() => options.filter((option) => option.count - (option.own || 0) > 0), [options])
  const query = typed ? trimmed.toLowerCase() : ''
  const matches = useMemo(() => {
    const filtered = query ? others.filter((option) => option.name.toLowerCase().includes(query)) : others
    const starts = filtered.filter((option) => option.name.toLowerCase().startsWith(query))
    const rest = filtered.filter((option) => !option.name.toLowerCase().startsWith(query))
    return [...starts, ...rest].slice(0, 12)
  }, [others, query])
  const isNew =
    typed && Boolean(trimmed) && !others.some((option) => option.name.toLowerCase() === trimmed.toLowerCase())
  const showList = open && (matches.length > 0 || isNew)

  const select = (name) => {
    onChange(name)
    setOpen(false)
    setTyped(false)
    setHighlight(-1)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (matches.length === 0) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      if (!open) {
        setOpen(true)
        setHighlight(step === 1 ? 0 : matches.length - 1)
        return
      }
      setHighlight((index) => (index + step + matches.length) % matches.length)
      return
    }
    if (event.key === 'Enter') {
      if (open && highlight >= 0 && matches[highlight]) {
        event.preventDefault()
        select(matches[highlight].name)
      } else if (open) {
        setOpen(false)
      }
      return
    }
    if (event.key === 'Escape') {
      if (open) {
        event.stopPropagation()
        setOpen(false)
      }
      return
    }
    if (event.key === 'Tab') setOpen(false)
  }

  const field = (
    <div className="relative">
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={current}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setTyped(true)
          setHighlight(-1)
        }}
        onFocus={() => {
          setOpen(true)
          setTyped(false)
        }}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className={className}
        placeholder={placeholder}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-sage/30 bg-white p-1 text-left shadow-lg"
        >
          {matches.map((option, index) => {
            const active = index === highlight
            const selected = option.name === trimmed
            return (
              <li
                key={option.name}
                role="option"
                aria-selected={selected}
                // Keep focus in the input so blur doesn't close the list before the click lands.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => select(option.name)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-sm normal-case tracking-normal ${
                  active ? 'bg-sage/10 text-sage-dark' : 'text-charcoal/80'
                }`}
              >
                <span className="truncate font-medium">{option.name}</span>
                <span className="shrink-0 text-xs font-normal text-charcoal/50">
                  {selected ? 'current · ' : ''}
                  {option.count} seat{option.count === 1 ? '' : 's'}
                </span>
              </li>
            )
          })}
          {isNew && (
            <li className="px-3 py-1.5 text-xs font-normal normal-case tracking-normal text-charcoal/50">
              New table: &ldquo;{trimmed}&rdquo;
            </li>
          )}
        </ul>
      )}
    </div>
  )

  if (!label) return field
  // A div (not a <label>) wraps the list so clicking a suggestion doesn't
  // re-trigger the input via label activation and pop the list back open.
  return (
    <div className={mobileFieldLabelClass}>
      <label htmlFor={inputId}>{label}</label>
      {field}
    </div>
  )
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
  if (!['any', 'received', 'not', 'awaiting-members'].includes(filters.responseReceived)) filters.responseReceived = 'any'
  if (!eventStatusValues.includes(filters.ceremonyStatus)) filters.ceremonyStatus = 'all'
  if (!eventStatusValues.includes(filters.receptionStatus)) filters.receptionStatus = 'all'
  if (!eventStatusValues.includes(filters.tischStatus)) filters.tischStatus = 'all'

  return {
    filters,
    showSeatingView: typeof prefs.showSeatingView === 'boolean' ? prefs.showSeatingView : null,
    sortBy: sortOptions.some((option) => option.value === prefs.sortBy) ? prefs.sortBy : defaultSortBy,
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

const formatHistoryTimestamp = (value) => {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  try {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return date.toISOString()
  }
}

// Compact per-guest summary for a history snapshot, so the recovery list shows
// what each version would restore (main RSVP + Tisch response) at a glance.
const summarizeSnapshotGuests = (household) => {
  const guests = Array.isArray(household?.guests) ? household.guests : []
  return guests.map((guest) => {
    const rsvp = rsvpStatusLabel(normalizeRsvpStatus(guest?.rsvpStatus))
    const tisch = normalizeTischRsvp(guest?.tischRsvp, household?.tischInvited)
    const parts = [rsvp]
    if (household?.tischInvited && tisch !== 'Not invited') {
      parts.push(`Tisch: ${tisch}`)
    }
    return {
      id: guest?.id || guest?.name || Math.random().toString(16).slice(2),
      name: guest?.name || 'Guest',
      detail: parts.join(' · '),
    }
  })
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
  rsvpRespondedAt: null,
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

// Per-guest +1 model. Each named (non-plus-one) guest can be allotted a +1
// (guest.plusOneAllowed) and accept it (guest.plusOneAccepted). A named +1
// card (type 'plus-one') fills a specific guest's allotment via plusOneOf.
// Legacy data stored one household-level +1 (household.plusOneAllowed /
// plusOneAccepted); migrate it onto the primary guest — this preserves every
// total, because the household's single slot becomes the primary guest's
// single slot with identical accepted/declined/awaiting bucketing. The
// household-level fields are kept in sync as derived values ("any guest…")
// so older readers of the data keep working.
export const applyPlusOneModel = (household) => {
  const guests = Array.isArray(household.guests) ? household.guests.map((guest) => ({ ...guest })) : []
  const hosts = guests.filter((guest) => guest.type !== 'plus-one')
  const cards = guests.filter((guest) => guest.type === 'plus-one')

  // Legacy records have no per-guest plusOneAllowed booleans; anything saved
  // by this code always does, which makes the migration idempotent.
  const migrated = hosts.some((guest) => typeof guest.plusOneAllowed === 'boolean')
  if (!migrated) {
    const primary = hosts.find((guest) => guest.type === 'primary') || hosts[0] || null
    if (primary && (household.plusOneAllowed || cards.length > 0)) {
      primary.plusOneAllowed = true
      primary.plusOneAccepted = Boolean(household.plusOneAccepted)
    }
  }

  hosts.forEach((guest) => {
    guest.plusOneAllowed = Boolean(guest.plusOneAllowed)
    guest.plusOneAccepted = guest.plusOneAllowed ? Boolean(guest.plusOneAccepted) : false
  })

  // Link +1 cards to hosts: keep valid one-to-one links, then hand stray
  // cards to allotted hosts without one, then to any remaining host. A named
  // +1 implies its host's allotment.
  const hostIds = new Set(hosts.map((guest) => guest.id))
  const claimed = new Set()
  cards.forEach((card) => {
    if (card.plusOneOf && hostIds.has(card.plusOneOf) && !claimed.has(card.plusOneOf)) {
      claimed.add(card.plusOneOf)
    } else {
      card.plusOneOf = null
    }
  })
  cards.forEach((card) => {
    if (card.plusOneOf) return
    const host =
      hosts.find((guest) => guest.plusOneAllowed && !claimed.has(guest.id)) ||
      hosts.find((guest) => !claimed.has(guest.id)) ||
      null
    if (host) {
      card.plusOneOf = host.id
      host.plusOneAllowed = true
      claimed.add(host.id)
    }
  })

  return {
    ...household,
    guests,
    plusOneAllowed: hosts.some((guest) => guest.plusOneAllowed),
    plusOneAccepted: hosts.some(
      (guest) => guest.plusOneAllowed && guest.plusOneAccepted && !claimed.has(guest.id),
    ),
  }
}

// Host guests whose allotted +1 slot is still open (no named +1 card fills
// it). Every counting site derives +1 seats from this list.
export const openPlusOneSlots = (household) => {
  const guests = household?.guests || []
  const filled = new Set(
    guests
      .filter((guest) => guest.type === 'plus-one' && guest.plusOneOf)
      .map((guest) => guest.plusOneOf),
  )
  return guests.filter(
    (guest) => guest.type !== 'plus-one' && guest.plusOneAllowed && !filled.has(guest.id),
  )
}

const ensureDerivedFields = (household) => {
  const normalized = {
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
    rsvpLocked: Boolean(household.rsvpLocked),
    guests: (household.guests || []).map((guest) => ({
      ...guest,
      rsvpStatus: normalizeRsvpStatus(guest.rsvpStatus),
      tischRsvp: normalizeTischRsvp(guest.tischRsvp, household.tischInvited),
      dietary: guest.dietary || 'None',
    })),
  }
  return applyTableModel(applyPlusOneModel(normalized))
}

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
  const [sortBy, setSortBy] = useState(initialViewPrefs?.sortBy || defaultSortBy)
  const [selectedHouseholdId, setSelectedHouseholdId] = useState(null)
  // Session-only override for the rsvpLocked guard on the selected household.
  // Never persisted: the stored rsvpLocked flag stays true, so the household
  // still counts as responded and re-locks whenever the editor is reopened.
  const [responsesUnlocked, setResponsesUnlocked] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyState, setHistoryState] = useState({ status: 'idle', error: '', entries: [], householdId: null })
  // Seating view: which table name is being edited inline, and the draft text.
  const [tableRename, setTableRename] = useState(null)
  const renameSettledRef = useRef(false)
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
      persistViewPrefs({ filters, showSeatingView, sortBy })
    }, 200)

    return () => {
      if (viewPrefsTimer.current) {
        clearTimeout(viewPrefsTimer.current)
      }
    }
  }, [filters, showSeatingView, sortBy])

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
    let declinedGuests = 0
    let awaitingGuests = 0
    let awaitingInvites = 0
    const possibleBreakdown = { Bride: 0, Groom: 0, Both: 0, Other: 0 }

    households.forEach((household) => {
      guestCount += household.guests.length

      const openSlots = openPlusOneSlots(household)
      const householdMax = household.guests.length + openSlots.length
      maxInvited += householdMax

      const inviterKey = invitedByOptions.includes(household.invitedBy) ? household.invitedBy : 'Other'

      const allAwaiting = household.invitationSent && household.guests.every((guest) => guest.rsvpStatus === 'Awaiting response')
      if (allAwaiting) {
        awaitingInvites += 1
      }

      // Sort every invited seat into exactly one RSVP bucket — each named guest,
      // plus any allowed-but-unfilled +1 slot. This guarantees
      // acceptedGuests + declinedGuests + awaitingGuests === maxInvited.
      let householdDeclined = 0
      household.guests.forEach((guest) => {
        if (['Both events', 'Ceremony only', 'Reception only'].includes(guest.rsvpStatus)) {
          acceptedGuests += 1
        } else if (guest.rsvpStatus === 'Not attending') {
          declinedGuests += 1
          householdDeclined += 1
        } else {
          awaitingGuests += 1
        }
      })

      // Allowed-but-unfilled +1 slots (one per allotted guest): accepted → a
      // coming guest. Once the household has otherwise responded, an
      // un-accepted +1 is treated as not coming (declined) so it ticks Max
      // possible down instead of lingering in Awaiting; while the household is
      // still silent the +1 stays awaiting.
      openSlots.forEach((host) => {
        if (host.plusOneAccepted) {
          acceptedGuests += 1
        } else if (hasResponded(household)) {
          declinedGuests += 1
          householdDeclined += 1
        } else {
          awaitingGuests += 1
        }
      })

      // "Max possible" is the invite ceiling minus anyone who has declined, so it
      // ticks down as No RSVPs arrive (maxPossible === acceptedGuests + awaitingGuests).
      // Track the per-inviter split the same way so the breakdown chips sum to it.
      possibleBreakdown[inviterKey] = (possibleBreakdown[inviterKey] || 0) + (householdMax - householdDeclined)
    })

    const maxPossible = maxInvited - declinedGuests

    return {
      invitations,
      guestCount,
      maxInvited,
      maxPossible,
      acceptedGuests,
      declinedGuests,
      awaitingGuests,
      awaitingInvites,
      possibleBreakdown,
    }
  }, [households])

  const selectedHousehold = useMemo(
    () => households.find((household) => household.id === selectedHouseholdId) || null,
    [selectedHouseholdId, households],
  )

  useEffect(() => {
    setResponsesUnlocked(false)
  }, [selectedHouseholdId])

  const responsesLocked = Boolean(selectedHousehold?.rsvpLocked) && !responsesUnlocked

  // Households whose named +1 seat may be skewing the attendance counts: a
  // plus-one guest card fills its host guest's +1 slot, so while that card is
  // still "Awaiting response" after the household has otherwise responded (or
  // its host has "+1 accepted" checked), the promised seat isn't counted as
  // attending.
  const plusOneAudit = useMemo(
    () =>
      households.filter((household) =>
        household.guests.some((card) => {
          if (card.type !== 'plus-one') return false
          if (normalizeRsvpStatus(card.rsvpStatus) !== 'Awaiting response') return false
          const host = household.guests.find((guest) => guest.id === card.plusOneOf)
          return Boolean(host?.plusOneAccepted) || hasResponded(household)
        }),
      ),
    [households],
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
          next.guests = (next.guests || []).map((guest) => {
            if (!invited) {
              // Turning the Tisch invite off would otherwise overwrite each guest's
              // response with 'Not invited'. Stash the prior response first so a later
              // re-enable can restore it instead of silently resetting to awaiting.
              const hadResponse = ['Attending', 'Not attending', 'Awaiting response'].includes(guest.tischRsvp)
              return {
                ...guest,
                tischRsvpPrev: hadResponse ? guest.tischRsvp : guest.tischRsvpPrev,
                tischRsvp: 'Not invited',
              }
            }
            // Re-enabling: restore the stashed response when we have one.
            const restored =
              guest.tischRsvpPrev && ['Attending', 'Not attending', 'Awaiting response'].includes(guest.tischRsvpPrev)
                ? guest.tischRsvpPrev
                : normalizeTischRsvp(guest.tischRsvp, true)
            const { tischRsvpPrev: _stashed, ...rest } = guest
            return { ...rest, tischRsvp: restored }
          })
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
        return withDerivedTable({ ...household, guests })
      }),
    )
    markHouseholdUpsert(householdId)
  }

  // Household-wide assignment: seats every member at one table. Per-guest
  // overrides live on each guest card.
  const assignHouseholdTable = (householdId, tableName) => {
    setHouseholds((prev) =>
      prev.map((household) => {
        if (household.id !== householdId) return household
        const guests = household.guests.map((guest) => ({ ...guest, table: tableName }))
        return withDerivedTable({ ...household, guests })
      }),
    )
    markHouseholdUpsert(householdId)
  }

  // Rename a table everywhere it is used: every guest currently at `fromName`,
  // in any household, moves to `toName` (merging if that table already
  // exists). Returns the number of seats moved.
  const renameTable = (fromName, toName) => {
    const from = cleanTableName(fromName)
    const to = cleanTableName(toName)
    if (!from || !to || from === to) return 0
    const touched = []
    let moved = 0
    const next = households.map((household) => {
      let changed = false
      const guests = household.guests.map((guest) => {
        if (cleanTableName(guest.table) !== from) return guest
        changed = true
        moved += 1
        return { ...guest, table: to }
      })
      if (!changed) return household
      touched.push(household.id)
      return withDerivedTable({ ...household, guests })
    })
    if (touched.length === 0) return 0
    setHouseholds(next)
    touched.forEach((id) => markHouseholdUpsert(id))
    return moved
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
          // New members join the household's table when everyone shares one;
          // in a split household they start unassigned.
          table: sharedTable(household.guests),
        }
        if (type !== 'plus-one') {
          newGuest.plusOneAllowed = false
          newGuest.plusOneAccepted = false
          return withDerivedTable({ ...household, guests: [...household.guests, newGuest] })
        }
        // A named +1 fills a specific guest's allotment: prefer the first
        // guest with an open +1 slot, else the first guest without a named +1
        // yet (implying their allotment).
        const filled = new Set(
          household.guests
            .filter((guest) => guest.type === 'plus-one' && guest.plusOneOf)
            .map((guest) => guest.plusOneOf),
        )
        const hosts = household.guests.filter((guest) => guest.type !== 'plus-one')
        const host =
          hosts.find((guest) => guest.plusOneAllowed && !filled.has(guest.id)) ||
          hosts.find((guest) => !filled.has(guest.id)) ||
          null
        newGuest.plusOneOf = host?.id || null
        // A named +1 sits with the guest who brought them.
        if (host) newGuest.table = cleanTableName(host.table)
        const guests = household.guests.map((guest) =>
          host && guest.id === host.id ? { ...guest, plusOneAllowed: true } : guest,
        )
        return withDerivedTable({ ...household, guests: [...guests, newGuest] })
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
        return withDerivedTable({ ...household, guests: remaining.length > 0 ? remaining : household.guests })
      }),
    )
    markHouseholdUpsert(householdId)
  }

  // Reset the recovery panel whenever a different household is opened.
  useEffect(() => {
    setHistoryOpen(false)
    setHistoryState({ status: 'idle', error: '', entries: [], householdId: null })
  }, [selectedHouseholdId])

  const loadHistory = async (householdId) => {
    if (!householdId) return
    setHistoryOpen(true)
    setHistoryState({ status: 'loading', error: '', entries: [], householdId })
    try {
      const response = await fetch(`${FUNCTIONS_BASE}/guest-list?history=${encodeURIComponent(householdId)}`)
      if (!response.ok) {
        throw new Error('Unable to load history')
      }
      const data = await response.json()
      const entries = Array.isArray(data.history) ? data.history : []
      setHistoryState({ status: 'ready', error: '', entries, householdId })
    } catch (error) {
      console.error('load history error', error)
      setHistoryState({
        status: 'error',
        error: 'Unable to load backup history from the server.',
        entries: [],
        householdId,
      })
    }
  }

  const restoreSnapshot = (householdId, snapshotHousehold) => {
    if (!householdId || !snapshotHousehold || typeof snapshotHousehold !== 'object') return
    const restored = ensureDerivedFields({ ...snapshotHousehold, id: householdId })
    setHouseholds((prev) => prev.map((household) => (household.id === householdId ? restored : household)))
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
        if (filters.responseReceived === 'awaiting-members' && !hasAwaitingMembers(household)) return false
      }

      if (filters.invitedBy !== 'all' && household.invitedBy !== filters.invitedBy) return false

      if (!eventFilterMatches(household, 'ceremonyRsvp', filters.ceremonyStatus)) return false
      if (!eventFilterMatches(household, 'receptionRsvp', filters.receptionStatus)) return false
      if (!eventFilterMatches(household, 'tischRsvp', filters.tischStatus)) return false

      return true
    })

    const comparator = sortComparators[sortBy] || sortComparators[defaultSortBy]
    return [...filtered].sort(comparator)
  }, [filters, households, sortBy])

  // Seats grouped by each guest's own table. Unassigned seats are kept apart
  // from the named tables so a table can never collide with that bucket.
  const seating = useMemo(() => {
    const tableMap = new Map()
    const unassigned = []
    const place = (tableName, seat) => {
      const name = cleanTableName(tableName)
      if (!name) {
        unassigned.push({ ...seat, table: '' })
        return
      }
      const list = tableMap.get(name) || []
      list.push({ ...seat, table: name })
      tableMap.set(name, list)
    }
    households.forEach((household) => {
      const householdName = household.envelopeName || ''
      ;(household.guests || []).forEach((guest) => {
        place(guest.table, {
          id: guest.id,
          guestId: guest.id,
          householdId: household.id,
          name: guest.name || 'Guest',
          household: householdName,
          isPlusOne: guest.type === 'plus-one',
        })
      })
      // An accepted but still unnamed +1 sits with the guest who brought them.
      openPlusOneSlots(household).forEach((host) => {
        if (!host.plusOneAccepted) return
        place(host.table, {
          id: `${host.id}-plus-one`,
          guestId: host.id,
          householdId: household.id,
          name: `${host.name || 'Guest'}'s +1`,
          household: householdName,
          isPlusOne: true,
        })
      })
    })
    const tables = Array.from(tableMap.entries())
      .map(([name, guests]) => ({ name, guests }))
      .sort((a, b) => compareTableNames(a.name, b.name))
    return { tables, unassigned }
  }, [households])
  const seatingTables = seating.tables
  const unassignedCount = seating.unassigned.length
  // Suggestions for a table field: every table with its seat count, plus how
  // many of those seats belong to the field's own subject (one guest and their
  // +1 slot, or a whole household). The combobox uses `own` to tell a table
  // other people sit at from the name currently being typed into this field.
  const tableOptionsFor = (isOwnSeat) =>
    seatingTables.map((entry) => ({
      name: entry.name,
      count: entry.guests.length,
      own: entry.guests.filter(isOwnSeat).length,
    }))

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
      'Plus Ones Allowed',
      'Plus Ones Accepted',
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
      const openSlots = openPlusOneSlots(household)
      const allottedCount = household.guests.filter(
        (guest) => guest.type !== 'plus-one' && guest.plusOneAllowed,
      ).length
      const guestCount = household.guests.length + openSlots.length
      return [
        household.envelopeName,
        household.invitedBy,
        toYesNo(household.invitationSent),
        toYesNo(household.saveTheDateSent),
        allottedCount,
        openSlots.filter((host) => host.plusOneAccepted).length,
        toYesNo(household.tischInvited),
        household.rsvpStatus,
        household.dietaryRestrictions,
        householdTables(household).join(' / '),
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
            '',
            '',
            toYesNo(household.tischInvited),
            normalizeTischRsvp('', household.tischInvited),
            '',
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
        guest.type === 'plus-one' ? '' : toYesNo(guest.plusOneAllowed),
        guest.type === 'plus-one' ? '' : toYesNo(guest.plusOneAccepted),
        toYesNo(household.tischInvited),
        normalizeTischRsvp(guest.tischRsvp, household.tischInvited),
        cleanTableName(guest.table),
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

  const startTableRename = (name) => {
    renameSettledRef.current = false
    setTableRename({ name, draft: name })
  }

  const cancelTableRename = () => {
    renameSettledRef.current = true
    setTableRename(null)
  }

  // Enter/Save and the input's blur can both fire for one edit (the blur
  // arrives as the input unmounts), so settle each edit exactly once.
  const commitTableRename = () => {
    if (renameSettledRef.current) return
    const pending = tableRename
    if (!pending) return
    renameSettledRef.current = true
    setTableRename(null)
    const from = cleanTableName(pending.name)
    const to = cleanTableName(pending.draft)
    if (!to || to === from) return
    const existing = seatingTables.find((entry) => entry.name === to)
    if (existing) {
      const proceed = window.confirm(
        `A table named “${to}” already exists (${existing.guests.length} seat${existing.guests.length === 1 ? '' : 's'}). ` +
          `Merge “${from}” into it? Everyone at “${from}” will move to “${to}”.`,
      )
      if (!proceed) return
    }
    renameTable(from, to)
  }

  const closeSeatingView = () => {
    setTableRename(null)
    setShowSeatingView(false)
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

    const unassignedList =
      seating.unassigned.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-900/80">
            Unassigned · {seating.unassigned.length}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {seating.unassigned.map((seat) => (
              <span
                key={seat.id}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200"
                title={seat.household ? `${seat.name} · ${seat.household}` : seat.name}
              >
                {seat.name}
                {seat.household && <span className="font-normal text-amber-900/60"> · {seat.household}</span>}
              </span>
            ))}
          </div>
        </div>
      ) : null

    if (seatingTables.length === 0) {
      return (
        <>
          <div className="mt-4 rounded-2xl border border-sage/30 bg-white/80 p-6 text-center text-sm text-charcoal/70">
            No assigned tables yet. Give guests a table from the household editor to see them here.
          </div>
          {unassignedList}
        </>
      )
    }

    const getSeatPosition = (index, total) => {
      const angle = (index / total) * 2 * Math.PI - Math.PI / 2
      // 36% keeps the widest seat label (7rem, centred on the seat) inside
      // the card's padding at the grid's minimum column width.
      const radiusPercent = 36
      return {
        left: `${50 + Math.cos(angle) * radiusPercent}%`,
        top: `${50 + Math.sin(angle) * radiusPercent}%`,
      }
    }

    return (
      <>
        {/*
          Equal-width grid columns (no per-card offsets or flex growth) so the
          cards snap to clean rows and columns. Each card clips its own
          content and the seat labels are capped narrow enough to stay inside
          the circle's box, so neighbouring cards can no longer overlap.
        */}
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))] gap-6">
          {seatingTables.map((entry) => {
            const guests = entry.guests || []
            const count = guests.length
            const seatTotal = count || 1
            const householdCount = new Set(guests.map((guest) => guest.household)).size
            const isRenaming = tableRename?.name === entry.name
            const draftClean = isRenaming ? cleanTableName(tableRename.draft) : ''
            const mergeTarget =
              isRenaming && draftClean && draftClean !== entry.name
                ? seatingTables.find((candidate) => candidate.name === draftClean) || null
                : null
            return (
              <div
                key={entry.name}
                className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-sage/30 bg-white/85 p-4 shadow-frame"
              >
                {isRenaming ? (
                  <div className="min-w-0">
                    <label className={mobileFieldLabelClass}>
                      Rename table
                      <input
                        type="text"
                        autoFocus
                        value={tableRename.draft}
                        onChange={(event) =>
                          setTableRename((current) => (current ? { ...current, draft: event.target.value } : current))
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            commitTableRename()
                          } else if (event.key === 'Escape') {
                            event.preventDefault()
                            cancelTableRename()
                          }
                        }}
                        onBlur={commitTableRename}
                        className={`${inputClass} font-semibold`}
                        aria-label={`Rename table ${entry.name}`}
                      />
                    </label>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={commitTableRename}
                        className="rounded-full bg-sage px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={cancelTableRename}
                        className="rounded-full border border-sage/40 px-3 py-1 text-xs font-semibold text-sage-dark transition hover:border-sage"
                      >
                        Cancel
                      </button>
                      <span className="text-[0.7rem] text-charcoal/50">Applies to every guest at this table.</span>
                    </div>
                    {mergeTarget && (
                      <p className="mt-2 text-[0.7rem] font-semibold text-amber-800">
                        &ldquo;{mergeTarget.name}&rdquo; already exists — saving merges the two tables ({count + mergeTarget.guests.length} seats).
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => startTableRename(entry.name)}
                        className="block max-w-full truncate text-left text-xs uppercase tracking-[0.35em] text-sage-dark/70 transition hover:text-sage-dark"
                        title="Click to rename this table"
                      >
                        {entry.name}
                      </button>
                      <p className="mt-0.5 text-[0.7rem] text-charcoal/50">
                        {count} seat{count === 1 ? '' : 's'}
                        {householdCount > 1 ? ` · ${householdCount} households` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startTableRename(entry.name)}
                      className="shrink-0 rounded-full border border-sage/40 px-2.5 py-1 text-[0.7rem] font-semibold text-sage-dark transition hover:border-sage"
                      aria-label={`Rename table ${entry.name}`}
                    >
                      Rename
                    </button>
                  </div>
                )}
                <div className="relative mx-auto mt-4 aspect-square w-full max-w-[20rem]">
                  <div className="absolute inset-0 rounded-full border-2 border-sage/40 bg-sage/5" />
                  <div className="absolute inset-[18%] rounded-full border border-sage/20 bg-white/80 shadow-inner" />
                  <div className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sage text-white shadow-lg">
                    <span className="text-xl font-semibold">{count}</span>
                  </div>
                  {guests.map((guest, seatIndex) => {
                    const pos = getSeatPosition(seatIndex, seatTotal)
                    const badgeText = guest.isPlusOne ? '+1' : initialsForName(guest.name)
                    const tooltip = guest.household ? `${guest.name} · ${guest.household}` : guest.name
                    return (
                      <div
                        key={`${guest.id}-${seatIndex}`}
                        className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                        style={pos}
                        title={tooltip}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-sage to-sage-dark text-xs font-semibold text-white shadow-lg shadow-sage/30">
                          {badgeText}
                        </div>
                        <span className="mt-1 max-w-[7rem] truncate rounded-full bg-white/90 px-2 py-1 text-[0.7rem] font-semibold text-sage-dark shadow-sm ring-1 ring-sage/20">
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
        {unassignedList}
      </>
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

      {/*
        Top row is the live guest picture. "Max possible" is the invite ceiling
        minus declines, so it ticks down as No RSVPs arrive and equals
        Accepted + Awaiting; the static invited total stays on the card for
        reference. The bottom row tracks households, a different unit — kept
        apart so the two aren't conflated. Every card names its unit.
      */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-sage/30 bg-white/80 p-4 shadow-frame">
          <p className="text-sm font-semibold text-sage-dark/80">Max possible</p>
          <p className="mt-1 font-serif text-4xl text-sage-dark">{stats.maxPossible}</p>
          <p className="text-sm text-charcoal/70">Guests who could attend · of {stats.maxInvited} invited</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-sage-dark/80">
            <span className="rounded-full bg-sage/15 px-2 py-1">Groom: {stats.possibleBreakdown.Groom || 0}</span>
            <span className="rounded-full bg-sage/15 px-2 py-1">Bride: {stats.possibleBreakdown.Bride || 0}</span>
            <span className="rounded-full bg-sage/15 px-2 py-1">Both: {stats.possibleBreakdown.Both || 0}</span>
          </div>
        </div>
        {[
          { label: 'Accepted', value: stats.acceptedGuests, sub: 'Guests · coming' },
          { label: 'Awaiting', value: stats.awaitingGuests, sub: 'Guests · no reply yet' },
          { label: 'Declined', value: stats.declinedGuests, sub: 'Guests · not coming' },
          { label: 'Invitations', value: stats.invitations, sub: 'Households · incl. singletons' },
          { label: 'No reply', value: stats.awaitingInvites, sub: 'Households · invite sent, no RSVP' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-sage/30 bg-white/80 p-4 shadow-frame">
            <p className="text-sm font-semibold text-sage-dark/80">{item.label}</p>
            <p className="mt-1 font-serif text-4xl text-sage-dark">{item.value}</p>
            <p className="text-sm text-charcoal/70">{item.sub}</p>
          </div>
        ))}
      </div>

      {plusOneAudit.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-frame">
          <p className="text-sm font-semibold text-amber-900">Possible +1 undercounts</p>
          <p className="mt-1 text-xs text-amber-800/90">
            These households have a named +1 guest card that is still awaiting a response even though the household has
            responded or has &ldquo;+1 accepted&rdquo; checked. Until that card&apos;s RSVP is set, the +1 seat is not
            counted as attending. Tap a household to review it.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {plusOneAudit.map((household) => (
              <button
                key={household.id}
                type="button"
                onClick={() => setSelectedHouseholdId(household.id)}
                className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition hover:border-amber-500"
              >
                {household.envelopeName || 'Untitled household'}
              </button>
            ))}
          </div>
        </div>
      )}

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
                <option value="awaiting-members">Partial replies</option>
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
          <div className="flex flex-wrap items-end gap-2 lg:justify-end">
            <label className={mobileFieldLabelClass}>
              Sort by
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className={selectClass}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
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
            const guestCount = household.guests.length + openPlusOneSlots(household).length
            const responded = hasResponded(household)
            const awaitingMembers = hasAwaitingMembers(household)
            const responseBadge = !responded
              ? { label: 'Awaiting', className: 'bg-amber-100 text-amber-800' }
              : awaitingMembers
                ? { label: 'Partial', className: 'bg-amber-200 text-amber-900' }
                : { label: 'Received', className: 'bg-sage text-white' }
            const ceremony = eventSummaryBadge(household, 'ceremonyRsvp')
            const reception = eventSummaryBadge(household, 'receptionRsvp')
            const tisch = eventSummaryBadge(household, 'tischRsvp')
            const tables = householdTables(household)
            const tableLabel = tables.join(' / ')
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
                  <div className="flex min-w-0 items-center gap-2 md:justify-end">
                    <span className="md:hidden text-[0.7rem] font-semibold uppercase text-sage-dark/60">Table</span>
                    {tables.length > 1 && (
                      <span
                        className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-800"
                        title="Members of this household sit at different tables"
                      >
                        Split
                      </span>
                    )}
                    <span className="truncate text-sm text-charcoal/80" title={tableLabel || undefined}>
                      {tableLabel || '—'}
                    </span>
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
                <section className="space-y-2 rounded-xl border border-sage/20 bg-sage/5 px-3 py-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-normal text-sage-dark/70">Attendance</p>
                  <EventFractionRow household={selectedHousehold} />
                  <p className="text-[0.7rem] text-charcoal/50">Attending / total per event. Tisch shows n/a unless the household is Tisch invited.</p>
                </section>

                {selectedHousehold.rsvpLocked && (
                  <section
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-3 ${
                      responsesUnlocked ? 'border-amber-300 bg-amber-50' : 'border-sage/20 bg-sage/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${responsesUnlocked ? 'text-amber-900' : 'text-sage-dark'}`}>
                        {responsesUnlocked ? 'Response editing unlocked' : 'Responses locked'}
                      </p>
                      <p className={`text-xs ${responsesUnlocked ? 'text-amber-800/80' : 'text-charcoal/60'}`}>
                        {responsesUnlocked
                          ? 'Changes overwrite what this household submitted. Fields re-lock when you close this panel.'
                          : 'This household submitted their RSVP, so response fields are read-only to prevent accidental edits.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResponsesUnlocked((current) => !current)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        responsesUnlocked
                          ? 'border border-amber-400 text-amber-900 hover:border-amber-500'
                          : 'border border-sage/40 text-sage-dark hover:border-sage'
                      }`}
                    >
                      {responsesUnlocked ? 'Re-lock responses' : 'Unlock editing'}
                    </button>
                  </section>
                )}

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
                    {(() => {
                      const tables = householdTables(selectedHousehold)
                      const mixed = tables.length > 0 && !selectedHousehold.table
                      return (
                        <TableCombobox
                          label="Table (whole household)"
                          value={selectedHousehold.table}
                          onChange={(name) => assignHouseholdTable(selectedHousehold.id, name)}
                          options={tableOptionsFor((seat) => seat.householdId === selectedHousehold.id)}
                          placeholder={mixed ? 'Mixed — set per guest below' : 'Table name or number'}
                        />
                      )
                    })()}
                  </div>
                  <p className="text-[0.7rem] text-charcoal/50">
                    Seats everyone in the household together. To split the household across tables, use the Table field
                    on each guest card below.
                  </p>
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
                        checked={selectedHousehold.tischInvited}
                        onChange={() => updateHousehold(selectedHousehold.id, { tischInvited: !selectedHousehold.tischInvited })}
                        className={checkboxClass}
                      />
                      Tisch invited
                    </label>
                  </div>
                  <p className="text-[0.7rem] text-charcoal/50">
                    +1s are now per guest — use the &ldquo;+1 allowed&rdquo; / &ldquo;+1 accepted&rdquo; checkboxes on
                    each guest card below.
                  </p>
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
                          {guest.type === 'plus-one' && (
                            <span
                              className="mt-2.5 shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-800"
                              title="This card fills its host guest's +1 allotment — it IS that guest's +1 seat."
                            >
                              {(() => {
                                const host = selectedHousehold.guests.find((entry) => entry.id === guest.plusOneOf)
                                const first = (host?.name || '').trim().split(/\s+/)[0]
                                return first ? `+1 · ${first}` : '+1 seat'
                              })()}
                            </span>
                          )}
                          {guest.type === 'child' && (
                            <span className="mt-2.5 shrink-0 rounded-full bg-sage/15 px-2 py-0.5 text-[0.65rem] font-semibold text-sage-dark/80">
                              Child
                            </span>
                          )}
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
                            RSVP (ceremony + reception)
                            <select
                              value={guest.rsvpStatus}
                              onChange={(event) => updateGuest(selectedHousehold.id, guest.id, { rsvpStatus: event.target.value })}
                              className={selectClass}
                              disabled={responsesLocked}
                            >
                              {rsvpOptions.map((option) => (
                                <option key={option} value={option}>
                                  {rsvpStatusLabel(option)}
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
                          <TableCombobox
                            label="Table"
                            value={guest.table || ''}
                            onChange={(name) => updateGuest(selectedHousehold.id, guest.id, { table: name })}
                            options={tableOptionsFor((seat) => seat.guestId === guest.id)}
                            placeholder="Unassigned"
                          />
                          {selectedHousehold.tischInvited && (
                            <label className={mobileFieldLabelClass}>
                              Tisch RSVP
                              <select
                                value={guest.tischRsvp}
                                onChange={(event) => updateGuest(selectedHousehold.id, guest.id, { tischRsvp: event.target.value })}
                                className={selectClass}
                                disabled={responsesLocked}
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
                        {guest.type !== 'plus-one' &&
                          (() => {
                            const namedPlusOne = selectedHousehold.guests.find(
                              (entry) => entry.type === 'plus-one' && entry.plusOneOf === guest.id,
                            )
                            return (
                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                                <label
                                  className={mobileCheckboxLabelClass}
                                  title={namedPlusOne ? 'Remove the named +1 card to change this' : undefined}
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(guest.plusOneAllowed)}
                                    onChange={() =>
                                      updateGuest(selectedHousehold.id, guest.id, {
                                        plusOneAllowed: !guest.plusOneAllowed,
                                        plusOneAccepted: guest.plusOneAllowed ? false : Boolean(guest.plusOneAccepted),
                                      })
                                    }
                                    className={checkboxClass}
                                    disabled={Boolean(namedPlusOne)}
                                  />
                                  +1 allowed
                                </label>
                                {guest.plusOneAllowed &&
                                  (namedPlusOne ? (
                                    <span className="text-xs text-charcoal/60">
                                      +1: {namedPlusOne.name || 'Unnamed'}
                                    </span>
                                  ) : (
                                    <label className={mobileCheckboxLabelClass}>
                                      <input
                                        type="checkbox"
                                        checked={Boolean(guest.plusOneAccepted)}
                                        onChange={() =>
                                          updateGuest(selectedHousehold.id, guest.id, {
                                            plusOneAccepted: !guest.plusOneAccepted,
                                          })
                                        }
                                        className={checkboxClass}
                                        disabled={responsesLocked}
                                      />
                                      +1 accepted
                                    </label>
                                  ))}
                              </div>
                            )
                          })()}
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

                <section className="space-y-3 border-t border-sage/20 pt-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-sage-dark">Backup history</p>
                      <p className="text-xs text-charcoal/60">
                        Restore an earlier RSVP if an edit was made by mistake.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        historyOpen && historyState.householdId === selectedHousehold.id
                          ? setHistoryOpen(false)
                          : loadHistory(selectedHousehold.id)
                      }
                      className="shrink-0 rounded-full border border-sage/40 px-3 py-1.5 text-xs font-semibold text-sage-dark transition hover:border-sage"
                    >
                      {historyOpen && historyState.householdId === selectedHousehold.id ? 'Hide history' : 'View history'}
                    </button>
                  </div>

                  {historyOpen && historyState.householdId === selectedHousehold.id && (
                    <div className="space-y-2">
                      {historyState.status === 'loading' && (
                        <p className="text-xs text-charcoal/60">Loading backups…</p>
                      )}
                      {historyState.status === 'error' && (
                        <p className="text-xs font-semibold text-rose-700">{historyState.error}</p>
                      )}
                      {historyState.status === 'ready' && historyState.entries.length === 0 && (
                        <p className="text-xs text-charcoal/60">No backups found for this household yet.</p>
                      )}
                      {historyState.status === 'ready' &&
                        historyState.entries.map((entry) => {
                          const guestSummary = summarizeSnapshotGuests(entry.household)
                          const isDelete = entry.action === 'delete'
                          return (
                            <div
                              key={entry.key}
                              className="rounded-xl border border-sage/20 bg-sage/5 p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-sage-dark">
                                    {formatHistoryTimestamp(entry.recordedAt)}
                                  </p>
                                  <span
                                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                                      isDelete ? 'bg-rose-100 text-rose-700' : 'bg-sage/15 text-sage-dark/80'
                                    }`}
                                  >
                                    {isDelete ? 'Before deletion' : 'Saved edit'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => restoreSnapshot(selectedHousehold.id, entry.household)}
                                  disabled={!entry.household}
                                  className="shrink-0 rounded-full bg-sage px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Restore
                                </button>
                              </div>
                              {entry.household && <EventFractionRow household={entry.household} className="mt-2" />}
                              {guestSummary.length > 0 ? (
                                <ul className="mt-2 space-y-1">
                                  {guestSummary.map((guest) => (
                                    <li key={guest.id} className="text-xs text-charcoal/70">
                                      <span className="font-semibold text-charcoal/80">{guest.name}</span>
                                      {guest.detail ? ` — ${guest.detail}` : ''}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-2 text-xs text-charcoal/50">No guest details in this backup.</p>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  )}
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
            onClick={closeSeatingView}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            aria-label="Close seating view"
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto px-4 pb-12 pt-14">
            <div className="w-full max-w-6xl rounded-2xl border border-sage/30 bg-white/95 p-6 shadow-2xl shadow-sage/30">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sage/20 pb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-sage-dark/70">Seating view</p>
                  <p className="text-sm text-charcoal/70">
                    Each guest has their own table, so a household can be split. Click a table name to rename it for
                    everyone seated there.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {unassignedCount > 0 && (
                    <span
                      className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm"
                      title={seating.unassigned.map((seat) => seat.name).join(', ')}
                    >
                      Unassigned: {unassignedCount}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={closeSeatingView}
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
