import { useEffect, useRef, useState } from 'react'
const heroImage = '/STDEdit.jpg'
import DoodleBoard from './components/DoodleBoard.jsx'
import GuestListManager, { DATA_STORAGE_KEY, loadInitialHouseholds, normalizeSlug, slugify } from './components/GuestListManager.jsx'

const TISCH_START_TIME = '2:30 PM'
const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Travel', href: '#travel' },
  { label: 'RSVP', href: '#rsvp' },
  { label: 'Registry', href: '#registry' },
]

const defaultDetails = [
  { label: 'Date', value: 'October 11, 2026' },
  { label: 'Arrival', value: 'Guests at 4:00 PM' },
  { label: 'Venue', value: 'The Garden at Elm Bank' },
  { label: 'City', value: 'Wellesley, Massachusetts' },
  { label: 'RSVP by', value: 'July 31, 2026' },
]

const tischDetails = [
  { label: 'Date', value: 'October 11, 2026' },
  { label: 'Tisch', value: `${TISCH_START_TIME} (songs, toasts, ketubah signing)` },
  { label: 'Ceremony', value: 'Chuppah at 4:30 PM' },
  { label: 'Venue', value: 'The Gardens at Elm Bank' },
  { label: 'City', value: 'Wellesley, Massachusetts' },
  { label: 'RSVP by', value: 'July 31, 2026' },
]

const travelNotes = [
  {
    title: 'Stay Nearby',
    text: 'We reserved a block at the Residence Inn by Marriott Boston Natick ($229/night, full-suite rooms with kitchens, about 15–20 minutes from the venue). Book by September 9 for Friday–Monday, October 9–12.',
    link: 'https://app.marriott.com/reslink?id=1770067768707&key=GRP&app=resvlink',
    linkText: 'Book your room',
  },
  { title: 'Getting There', text: 'The hotel is about a 15–20 minute drive from the venue. We won\'t be providing transportation, but rideshare is easy and there is limited parking available on site. Rideshare drop-off at the Cheney Gate entrance.' },
  { title: 'Dress Code', text: 'Cocktail; Autumn Colors. Please plan for an outdoor ceremony on grass followed by a reception inside the Honeywell Building.' },
]

const dressCodePalette = [
  'rgb(110, 48, 10)',
  'rgb(189 155 170)',
  'rgb(66 28 25)',
  'rgb(183 145 142)',
  'rgb(29 43 30)',
  'rgb(168 189 170)',
  'rgb(199, 152, 79)',
]

const baseAgendaItems = [
  {
    key: 'arrival',
    time: '4:00 PM',
    title: 'Guest Arrival',
    description: 'Stroll the grounds, say hi to family, and find your seat before we head to the chuppah.',
  },
  {
    key: 'ceremony',
    time: '4:30 PM',
    title: 'Ceremony',
    description: 'We will gather under the chuppah outdoors (with an indoor backup if New England weather insists).',
  },
  {
    key: 'reception',
    time: '6:20 PM',
    title: 'Cocktail Hour into Reception',
    description: 'Cocktail hour flows into dinner and dancing inside the Honeywell Building. Event ends at 10:30 PM.',
  },
]

const tischAgendaItem = {
  key: 'tisch',
  time: TISCH_START_TIME,
  title: 'Tisch (pre-ceremony)',
  description: 'A joyful gathering with singing, toasts, and blessings around the table before the formal ceremony.',
}

const fallbackGallery = [
  {
    id: 1,
    src: 'https://images.unsplash.com/photo-1520854223473-3ff40e51b3f5?auto=format&fit=crop&w=900&q=80',
    caption: 'A twirl outside the city steps',
  },
  {
    id: 2,
    src: 'https://images.unsplash.com/photo-1501973801540-537f08ccae7b?auto=format&fit=crop&w=900&q=80',
    caption: 'Toasts under the bistro lights',
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1520854223473-3ff40e51b3f5?auto=format&fit=crop&w=600&q=70&sat=-50',
    caption: 'Happiest in motion',
  },
  {
    id: 4,
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    caption: 'Garden ceremony vibes',
  },
]

const FUNCTIONS_BASE = '/.netlify/functions'
const RSVP_STORAGE_KEY = 'oliverikaRsvpSubmitted'
const dietaryOptions = ['None', 'Vegetarian', 'Vegan', 'Gluten Free', 'Dairy Free', 'Peanut Allergy', 'Other']
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
const getHouseholdSlugKey = (household) =>
  normalizeSlug(household?.customSlug ?? household?.slug) || slugify(household?.envelopeName || household?.name || 'household')
const normalizeHousehold = (household) => ({
  ...household,
  customSlug: typeof household?.customSlug === 'string' ? household.customSlug : '',
  slug: getHouseholdSlugKey(household),
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

function WeddingSite({ householdMatch, onHouseholdUpdate }) {
  const [formStatus, setFormStatus] = useState('idle')
  const [formError, setFormError] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submissionAction, setSubmissionAction] = useState('created')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadStatus, setUploadStatus] = useState('idle')
  const [uploadError, setUploadError] = useState('')
  const [galleryItems, setGalleryItems] = useState(fallbackGallery)
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryError, setGalleryError] = useState('')
  const [hasDoodle, setHasDoodle] = useState(false)
  const [targetResponses, setTargetResponses] = useState([])
  // Per-guest record of which events were *explicitly* answered. The combined
  // rsvpStatus enum can't distinguish "skipping reception" from "reception not
  // decided yet", so we track that separately to drive the Skip button highlight.
  const [eventTouched, setEventTouched] = useState([])
  const [targetTischResponses, setTargetTischResponses] = useState([])
  const [targetDietaries, setTargetDietaries] = useState([])
  const [targetNotes, setTargetNotes] = useState('')
  const [targetPlusOne, setTargetPlusOne] = useState(false)
  const [targetLocked, setTargetLocked] = useState(false)
  const [targetEmail, setTargetEmail] = useState('')
  const hiddenFileInput = useRef(null)
  const doodleBoardRef = useRef(null)
  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupError, setLookupError] = useState('')

  const submissionLocked = hasSubmitted
  const isSlugRsvp = Boolean(householdMatch)
  const isTischInvite = Boolean(householdMatch?.tischInvited)
  const heroDetails = isTischInvite ? tischDetails : defaultDetails
  const agendaItems = isTischInvite ? [tischAgendaItem, ...baseAgendaItems] : baseAgendaItems

  const eventSelectionsFromStatus = (status) => {
    const normalized = normalizeRsvpStatus(status)
    return {
      ceremony: ['Both events', 'Ceremony only'].includes(normalized),
      reception: ['Both events', 'Reception only'].includes(normalized),
    }
  }

  const statusFromSelections = (selections) => {
    if (selections.ceremony && selections.reception) return 'Both events'
    if (selections.ceremony) return 'Ceremony only'
    if (selections.reception) return 'Reception only'
    return 'Not attending'
  }

  const markEventTouched = (index, updates) => {
    setEventTouched((prev) => {
      const next = [...prev]
      next[index] = { ...(next[index] || { ceremony: false, reception: false }), ...updates }
      return next
    })
  }

  const setEventAttendance = (index, eventKey, attending) => {
    setTargetResponses((prev) => {
      const next = [...prev]
      const selections = eventSelectionsFromStatus(next[index] || 'Awaiting response')
      if (attending === null) {
        next[index] = 'Awaiting response'
        return next
      }
      selections[eventKey] = attending
      next[index] = statusFromSelections(selections)
      return next
    })
    if (attending === null) {
      markEventTouched(index, { ceremony: false, reception: false })
    } else {
      markEventTouched(index, { [eventKey]: true })
    }
  }

  const setTischResponse = (index, value) => {
    setTargetTischResponses((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const clearSubmissionFlag = () => {
    try {
      window.localStorage.removeItem(RSVP_STORAGE_KEY)
    } catch (error) {
      console.warn('Unable to clear RSVP submission flag', error)
    }
  }

  const handleClearDoodle = () => {
    if (submissionLocked) return
    doodleBoardRef.current?.clear?.()
  }

  const handleAllowResubmit = () => {
    clearSubmissionFlag()
    setHasSubmitted(false)
    setSubmissionAction('created')
    setFormStatus('idle')
    setFormError('')
  }

  const handleLookup = (event) => {
    event.preventDefault()
    const query = lookupQuery.trim()
    if (!query) return
    setLookupError('')
    const households = loadInitialHouseholds().map(normalizeHousehold)
    const queryKey = normalizeSlug(query)
    if (!queryKey) return
    // Try matching as a slug
    let match = households.find((h) => getHouseholdSlugKey(h) === queryKey)
    // Try matching against individual guest names
    if (!match) {
      match = households.find((h) =>
        (h.guests || []).some((g) => normalizeSlug(g.name) === queryKey),
      )
    }
    // Try matching against envelope name
    if (!match) {
      match = households.find((h) => normalizeSlug(h.envelopeName) === queryKey)
    }
    if (match) {
      const slug = getHouseholdSlugKey(match)
      window.history.pushState({}, '', '/' + encodeURIComponent(slug))
      window.dispatchEvent(new PopStateEvent('popstate'))
    } else {
      setLookupError(
        "We couldn't find a match. Try your full name as it appears on your invitation envelope, or the name of another person in your household.",
      )
    }
  }

  const handleHouseholdSubmit = async (event) => {
    event.preventDefault()
    if (!householdMatch || targetLocked) return
    setFormStatus('submitting')
    setFormError('')

    // Build the updated household from the server-sourced match (not from
    // localStorage, which on a guest's device only holds demo seed data).
    const slugKey = getHouseholdSlugKey(householdMatch)
    const guests = (householdMatch.guests || []).map((guest, index) => ({
      ...guest,
      rsvpStatus: targetResponses[index] || guest.rsvpStatus || 'Awaiting response',
      tischRsvp: normalizeTischRsvp(targetTischResponses[index], householdMatch?.tischInvited),
      dietary: targetDietaries[index] || guest.dietary || 'None',
    }))
    const plusOneAccepted = householdMatch.plusOneAllowed ? targetPlusOne : false
    const anyAccepted =
      guests.some((guest) => ['Both events', 'Ceremony only', 'Reception only'].includes(normalizeRsvpStatus(guest.rsvpStatus))) ||
      plusOneAccepted
    const allDeclined = guests.every((guest) => normalizeRsvpStatus(guest.rsvpStatus) === 'Not attending') && !plusOneAccepted
    const rsvpStatus = anyAccepted ? 'Accepted' : allDeclined ? 'Declined' : 'Awaiting response'
    const refreshed = {
      ...householdMatch,
      email: targetEmail,
      guests,
      plusOneAccepted,
      notes: targetNotes,
      rsvpStatus,
      rsvpLocked: true,
    }

    try {
      // Persist to the shared guest list (S3) so the RSVP reaches the manager.
      // Without this the response only ever lived in the guest's own browser.
      const response = await fetch(`${FUNCTIONS_BASE}/guest-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upserts: [refreshed] }),
      })
      if (!response.ok) {
        throw new Error('Save failed')
      }

      // Cache locally so a returning guest sees their saved answers immediately.
      try {
        const households = loadInitialHouseholds()
        const hasMatch = households.some((household) => getHouseholdSlugKey(household) === slugKey)
        const nextHouseholds = hasMatch
          ? households.map((household) => (getHouseholdSlugKey(household) === slugKey ? refreshed : household))
          : [...households, refreshed]
        window.localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(nextHouseholds))
      } catch (error) {
        console.warn('Unable to cache RSVP locally', error)
      }

      onHouseholdUpdate?.(refreshed)
      setTargetLocked(true)
      setFormStatus('success')
      setSubmissionAction('updated')
      setHasSubmitted(true)
    } catch (error) {
      console.error('household rsvp save error', error)
      setFormStatus('error')
      setFormError('Unable to save RSVP right now. Please try again.')
    }
  }

  const refreshGallery = async () => {
    setGalleryLoading(true)
    setGalleryError('')
    try {
      const response = await fetch(`${FUNCTIONS_BASE}/list-gallery`)
      if (!response.ok) {
        throw new Error('Failed to load gallery')
      }
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error('Gallery response not JSON')
      }
      const data = await response.json()
      if (Array.isArray(data.items) && data.items.length > 0) {
        const mapped = data.items.map((item, index) => ({
          id: item.key || index,
          src: item.url,
          caption: new Date(item.lastModified).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        }))
        setGalleryItems(mapped)
      }
    } catch (error) {
      console.error(error)
      setGalleryError('Unable to load the live gallery right now. Showing a curated preview instead.')
      setGalleryItems(fallbackGallery)
    } finally {
      setGalleryLoading(false)
    }
  }

  useEffect(() => {
    refreshGallery()
  }, [])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RSVP_STORAGE_KEY)
      if (stored === 'true') {
        setHasSubmitted(true)
      }
    } catch (error) {
      console.warn('Unable to read RSVP submission flag', error)
    }
  }, [])

  useEffect(() => {
    if (!householdMatch) {
      setTargetResponses([])
      setEventTouched([])
      setTargetTischResponses([])
      setTargetDietaries([])
      setTargetPlusOne(false)
      setTargetNotes('')
      setTargetEmail('')
      setTargetLocked(false)
      setHasSubmitted(false)
      setSubmissionAction('created')
      return
    }
    setTargetResponses((householdMatch.guests || []).map((guest) => normalizeRsvpStatus(guest.rsvpStatus)))
    setEventTouched(
      (householdMatch.guests || []).map((guest) => {
        // A stored decisive status means both events were already answered;
        // "Awaiting response" means neither has been touched yet.
        const answered = normalizeRsvpStatus(guest.rsvpStatus) !== 'Awaiting response'
        return { ceremony: answered, reception: answered }
      }),
    )
    setTargetTischResponses(
      (householdMatch.guests || []).map((guest) => normalizeTischRsvp(guest.tischRsvp, householdMatch.tischInvited)),
    )
    setTargetDietaries((householdMatch.guests || []).map((guest) => guest.dietary || 'None'))
    setTargetPlusOne(Boolean(householdMatch.plusOneAccepted))
    setTargetNotes(householdMatch.notes || '')
    setTargetEmail(householdMatch.email || '')
    setTargetLocked(Boolean(householdMatch.rsvpLocked))
    setHasSubmitted(Boolean(householdMatch.rsvpLocked))
    setSubmissionAction(householdMatch.rsvpLocked ? 'updated' : 'created')
  }, [householdMatch])

  const triggerFilePicker = () => {
    hiddenFileInput.current?.click()
  }

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    setSelectedFiles(files)
    await handleUpload(files)
  }

  const requestUploadUrl = async (filename, contentType, metadata) => {
    const response = await fetch(`${FUNCTIONS_BASE}/get-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        contentType,
        metadata,
      }),
    })

    if (!response.ok) {
      throw new Error('Unable to generate upload URL')
    }

    return response.json()
  }

  const uploadFileToS3 = async (file) => {
    const { uploadUrl } = await requestUploadUrl(file.name, file.type || 'application/octet-stream', {
      uploader: 'wedding-guest',
      email: 'n-a',
    })

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    })

    if (!uploadResponse.ok) {
      throw new Error('File upload failed')
    }
  }

  const handleUpload = async (filesArg) => {
    if (uploadStatus === 'submitting') return
    const files = filesArg || selectedFiles
    setUploadStatus('submitting')
    setUploadError('')

    try {
      if (files.length === 0) {
        throw new Error('Choose at least one photo or video to upload.')
      }

      for (const file of files) {
        await uploadFileToS3(file)
      }

      setUploadStatus('success')
      setSelectedFiles([])
      await refreshGallery()
    } catch (error) {
      console.error(error)
      setUploadStatus('error')
      setUploadError(error.message || 'Upload failed. Please try again.')
    } finally {
      setTimeout(() => setUploadStatus('idle'), 2000)
    }
  }

  const renderDoodleArea = (wrapperClass = '', boardWrapperClass = '') => (
    <div className={`space-y-3 ${wrapperClass}`}>
      <DoodleBoard ref={doodleBoardRef} disabled={submissionLocked} onHasDrawingChange={setHasDoodle} className={`mx-auto w-full ${boardWrapperClass}`} />
      <button
        type="button"
        onClick={handleClearDoodle}
        disabled={!hasDoodle || submissionLocked}
        className="rounded-full border border-sage/40 px-4 py-2 text-[0.65rem] uppercase tracking-[0.4em] text-sage-dark transition hover:border-sage hover:text-sage-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        Clear doodle
      </button>
    </div>
  )

  return (
    <>
      {!hasSubmitted && (
        <div className="fixed top-0 left-0 right-0 z-50 border-b border-sage/30 bg-bone/90 px-6 py-3 text-center text-sm text-sage-dark backdrop-blur">
          <span className="font-semibold">RSVP by July 31</span>
          {' — '}
          <a href="#rsvp" className="underline underline-offset-2 transition hover:text-sage">let us know you're coming</a>
        </div>
      )}
      <main className={`min-h-screen bg-mist px-4 py-12 sm:px-8${!hasSubmitted ? ' pt-20' : ''}`}>
      <section className="relative mx-auto flex min-h-[520px] max-w-5xl flex-col overflow-hidden rounded-2xl bg-bone shadow-frame md:min-h-[600px] md:flex-row" id="home">
        <div className="flex flex-col justify-between bg-sage px-6 py-10 text-bone md:w-1/2 md:px-8 lg:px-10">
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.55rem] uppercase tracking-[0.3em] text-bone/70 md:flex-nowrap md:gap-6 md:text-[0.65rem] md:tracking-[0.5em]">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="hover:text-white transition-colors">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-12">
            <div className="flex items-center gap-5 sm:gap-6">
              <h1 className="font-serif text-[15vw] leading-tight sm:text-6xl md:text-7xl lg:text-8xl">Erika &amp; Oliver</h1>
              <a
                href="#rsvp"
                className="inline-flex h-20 w-20 min-h-[5rem] min-w-[5rem] flex-none items-center justify-center rounded-full border border-white/70 bg-white/10 text-lg font-serif italic uppercase tracking-[0.15em] text-white text-center leading-none backdrop-blur-2xl transition hover:border-white md:hidden"
              >
                RSVP
              </a>
            </div>
          </div>

          <div className="space-y-4 pt-10">
            {heroDetails.map((item) => (
              <div key={item.label} className="flex justify-between text-xs tracking-wide text-bone/70">
                <span className="uppercase">{item.label}</span>
                <span className="font-medium text-bone">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative md:w-1/2">
          <img src={heroImage} alt="Oliver holding Erika on the steps outside a venue" className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>

        <a
          href="#rsvp"
          className="absolute left-1/2 top-1/2 hidden h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/10 text-[1.25rem] font-serif italic uppercase tracking-[0.25em] text-white text-center leading-none backdrop-blur-2xl transition hover:border-white md:flex"
        >
          RSVP
        </a>
      </section>

      <section id="agenda" className="mx-auto mt-12 max-w-5xl rounded-2xl border border-white/50 bg-white/75 p-10 text-charcoal shadow-frame backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-sage-dark/60">Agenda</p>
            <h2 className="mt-3 font-serif text-4xl text-sage-dark">Day-of flow</h2>
            <p className="mt-2 text-sm text-charcoal/75">Times update based on your invite link. You’ll only see the tisch if you’re invited.</p>
          </div>
          {isTischInvite && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
              <p className="font-semibold">You’re invited to the tisch</p>
              <p className="mt-1">
                Please arrive by {TISCH_START_TIME}. We’ll sing, toast, and sign our ketubah before joining everyone at 4:30 PM.
              </p>
            </div>
          )}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {agendaItems.map((item) => (
            <div key={item.key} className="rounded-2xl border border-sage/25 bg-white/80 p-5 shadow-sm">
              <p className="text-[0.7rem] uppercase tracking-[0.35em] text-sage-dark/70">{item.time}</p>
              <p className="mt-2 text-lg font-semibold text-sage-dark">{item.title}</p>
              <p className="mt-1 text-sm text-charcoal/75">{item.description}</p>
              {item.key === 'tisch' && (
                <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  What’s a tisch? It’s a joyful pre-ceremony gathering with singing, toasts, and shared blessings around the table.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="travel" className="mx-auto mt-16 max-w-5xl rounded-2xl border border-white/50 bg-white/70 p-10 text-charcoal shadow-frame backdrop-blur">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-sage-dark/60">Travel &amp; Accommodations</p>
            <h2 className="mt-4 font-serif text-4xl text-sage-dark">The Garden at Elm Bank</h2>
            <p className="mt-2 text-sm text-charcoal/80">900 Washington St, Wellesley, MA 02482</p>
            <div className="mt-8 space-y-6">
              {travelNotes.map((note) => (
                <div key={note.title}>
                  <p className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">{note.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal/80">{note.text}</p>
                  {note.link && (
                    <a
                      href={note.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-sage/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-sage-dark transition hover:border-sage hover:bg-sage/10"
                    >
                      {note.linkText || 'Learn more'}
                    </a>
                  )}
                  {note.title === 'Dress Code' && (
                    <div className="mt-4">
                      <p className="text-[0.7rem] uppercase tracking-[0.35em] text-sage-dark/60">Palette (just for inspiration!)</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {dressCodePalette.map((color, index) => (
                          <span
                            key={color}
                            role="img"
                            aria-label={`Suggested dress code color ${index + 1}`}
                            className="h-10 w-10 rounded-full shadow-sm ring-1 ring-black/10"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10">
            <iframe
              title="Map showing The Garden at Elm Bank"
              src="https://www.google.com/maps?q=The+Gardens+at+Elm+Bank,900+Washington+St,+Wellesley,+MA+02482&output=embed"
              className="h-full min-h-[320px] w-full"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <section id="gallery" className="mx-auto mt-16 max-w-5xl rounded-2xl border border-white/50 bg-white/90 p-10 text-charcoal shadow-frame backdrop-blur">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-sage-dark/60">Gallery</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="mt-4 font-serif text-4xl text-sage-dark"><em>Oliverika</em> Memories</h2>
              <p className="mt-2 max-w-xl text-sm text-charcoal/80">
                Photos from the wedding (and other photos celebrating our love) will appear here. Please feel free to contribute your own!
              </p>
              {galleryError && <p className="mt-3 text-xs uppercase tracking-[0.3em] text-amber-700">{galleryError}</p>}
              {!galleryError && galleryItems.length > 0 && (
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-sage-dark/60 sm:hidden">Swipe within the gallery to see more</p>
              )}
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <button
                type="button"
                onClick={triggerFilePicker}
                disabled={uploadStatus === 'submitting'}
                className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-sage to-sage-dark px-6 py-3 text-xs uppercase tracking-[0.4em] text-white shadow-lg shadow-sage/40 transition hover:-translate-y-0.5 hover:from-sage-dark hover:to-sage disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span role="img" aria-hidden="true" className="text-base transition group-hover:scale-110">
                  📸
                </span>
                {uploadStatus === 'submitting' ? 'Uploading…' : 'Add Photos'}
              </button>
              <input
                ref={hiddenFileInput}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploadStatus === 'success' && (
                <p className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">Photos received, thank you!</p>
              )}
              {uploadStatus === 'error' && (
                <p className="text-xs uppercase tracking-[0.3em] text-rose-800">{uploadError}</p>
              )}
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {galleryLoading && <p className="text-sm text-sage-dark/80">Loading latest photos…</p>}
            <div className="columns-1 gap-4 overflow-y-auto pr-2 max-h-[70vh] sm:max-h-none sm:overflow-visible sm:pr-0 sm:columns-2 lg:columns-3">
              {galleryItems.map((photo) => (
                <figure key={photo.id} className="mb-4 break-inside-avoid overflow-hidden">
                  <img src={photo.src} alt="" className="w-full object-cover" loading="lazy" />
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="rsvp" className="mx-auto mt-16 max-w-5xl rounded-2xl bg-white/80 p-10 text-charcoal shadow-frame backdrop-blur">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.5em] text-sage-dark/60">RSVP</p>
            <h2 className="font-serif text-4xl text-sage-dark">Let us know you're coming</h2>
            <p className="text-sm text-charcoal/80">We kindly request a response by <strong>July 31</strong> so we can finalize guest counts.</p>
            <ul className="space-y-3 text-sm text-charcoal/75">
              <li>• Search your name or the name of anyone in your household to find your form.</li>
              <li>• Use the notes field for accessibility needs, questions, or song requests.</li>
            </ul>
          </div>

          <div className="grid gap-8 md:grid-cols-[1.6fr,1fr]">
            <div className="space-y-4">
            {hasSubmitted && (
              <div className="rounded-2xl border border-sage/30 bg-sage/10 p-4 text-sm text-sage-dark">
                <p>
                  {submissionAction === 'updated'
                    ? 'We have updated your RSVP with the latest info.'
                    : 'Thanks! We already have your RSVP on file.'}
                </p>
                {!isSlugRsvp && (
                  <>
                    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-sage-dark/70">
                      Need to make a change? Click below to unlock the form.
                    </p>
                    <button
                      type="button"
                      onClick={handleAllowResubmit}
                      className="mt-3 rounded-full border border-sage/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-sage-dark transition hover:border-sage hover:text-sage-dark"
                    >
                      Update RSVP
                    </button>
                  </>
                )}
              </div>
            )}

            {isSlugRsvp ? (
              <form onSubmit={handleHouseholdSubmit} className="space-y-6" aria-disabled={targetLocked}>
                <div className="rounded-2xl border border-sage/30 bg-sage/10 p-4 text-sm text-sage-dark">
                  <p className="font-semibold text-sage-dark">RSVP for {householdMatch?.envelopeName}</p>
                  <p className="text-charcoal/70">Please reply for each person on your invite.</p>
                  {isTischInvite && (
                    <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Tisch invite: please arrive by {TISCH_START_TIME} for singing, toasts, and ketubah signing before the ceremony.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="slug-email" className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">
                    Email for updates
                  </label>
                  <input
                    id="slug-email"
                    type="email"
                    value={targetEmail}
                    onChange={(event) => setTargetEmail(event.target.value)}
                    disabled={targetLocked}
                    className="mt-2 w-full rounded-xl border border-sage/20 bg-white/70 px-4 py-3 text-sm outline-none ring-sage/30 transition focus:border-sage focus:ring-2 disabled:bg-sage/10"
                  />
                </div>

                {(householdMatch?.guests || []).map((guest, index) => {
                  const current = targetResponses[index] || 'Awaiting response'
                  const selections = eventSelectionsFromStatus(current)
                  const setDietary = (value) =>
                    setTargetDietaries((prev) => {
                      const next = [...prev]
                      next[index] = value
                      return next
                    })
                  const dietaryValue = targetDietaries[index] || 'None'
                  const tischValue = normalizeTischRsvp(targetTischResponses[index], isTischInvite)
                  const touched = eventTouched[index] || { ceremony: false, reception: false }
                  const markNotAttending = () => {
                    setTargetResponses((prev) => {
                      const next = [...prev]
                      next[index] = 'Not attending'
                      return next
                    })
                    markEventTouched(index, { ceremony: true, reception: true })
                    if (isTischInvite) {
                      setTischResponse(index, 'Not attending')
                    }
                  }
                  return (
                    <div key={guest.id} className="space-y-3 rounded-2xl border border-sage/20 bg-white/70 p-4 shadow-sm">
                      <p className="text-sm font-semibold text-sage-dark">{guest.name}, are you coming?</p>
                      {isTischInvite && (
                        <div className="rounded-xl border border-sage/30 bg-white/70 p-3 shadow-sm">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-[0.7rem] uppercase tracking-[0.3em] text-sage-dark/70">Tisch {TISCH_START_TIME}</span>
                            <span className="text-[0.65rem] uppercase tracking-[0.15em] text-charcoal/60">pre-ceremony</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            {[
                              { value: 'Attending', label: 'I’ll be there' },
                              { value: 'Not attending', label: 'Can’t make it' },
                            ].map((option) => {
                              const isActive = tischValue === option.value
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  disabled={targetLocked}
                                  onClick={() => setTischResponse(index, option.value)}
                                  className={`rounded-full border px-4 py-2 transition ${
                                    isActive
                                      ? 'border-sage bg-sage text-white shadow-sm'
                                      : 'border-sage/40 bg-white text-sage-dark hover:border-sage hover:bg-sage/10'
                                  } disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                  {option.label}
                                </button>
                              )
                            })}
                          </div>
                          <p className="mt-2 text-xs text-charcoal/70">
                            What’s a tisch? A spirited gathering with songs, toasts, and well wishes before the ceremony.
                          </p>
                        </div>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-sage/30 bg-white/70 p-3 shadow-sm">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-[0.7rem] uppercase tracking-[0.3em] text-sage-dark/70">Ceremony</span>
                            <span className="text-[0.65rem] uppercase tracking-[0.15em] text-charcoal/60">Garden chuppah</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            <button
                              type="button"
                              disabled={targetLocked}
                              onClick={() => setEventAttendance(index, 'ceremony', true)}
                              className={`rounded-full border px-4 py-2 transition ${
                                selections.ceremony
                                  ? 'border-sage bg-sage text-white shadow-sm'
                                  : 'border-sage/40 bg-white text-sage-dark hover:border-sage hover:bg-sage/10'
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              I’ll be there
                            </button>
                            <button
                              type="button"
                              disabled={targetLocked}
                              onClick={() => setEventAttendance(index, 'ceremony', false)}
                              className={`rounded-full border px-4 py-2 transition ${
                                touched.ceremony && !selections.ceremony
                                  ? 'border-sage bg-sage text-white shadow-sm'
                                  : 'border-sage/40 bg-white text-sage-dark hover:border-sage hover:bg-sage/10'
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              Skip ceremony
                            </button>
                          </div>
                        </div>
                        <div className="rounded-xl border border-sage/30 bg-white/70 p-3 shadow-sm">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-[0.7rem] uppercase tracking-[0.3em] text-sage-dark/70">Reception</span>
                            <span className="text-[0.65rem] uppercase tracking-[0.15em] text-charcoal/60">Dinner + dancing</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            <button
                              type="button"
                              disabled={targetLocked}
                              onClick={() => setEventAttendance(index, 'reception', true)}
                              className={`rounded-full border px-4 py-2 transition ${
                                selections.reception
                                  ? 'border-sage bg-sage text-white shadow-sm'
                                  : 'border-sage/40 bg-white text-sage-dark hover:border-sage hover:bg-sage/10'
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              I’ll be there
                            </button>
                            <button
                              type="button"
                              disabled={targetLocked}
                              onClick={() => setEventAttendance(index, 'reception', false)}
                              className={`rounded-full border px-4 py-2 transition ${
                                touched.reception && !selections.reception
                                  ? 'border-sage bg-sage text-white shadow-sm'
                                  : 'border-sage/40 bg-white text-sage-dark hover:border-sage hover:bg-sage/10'
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              Skip reception
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <button
                          type="button"
                          disabled={targetLocked}
                          onClick={markNotAttending}
                          className="rounded-full border border-rose-200 px-4 py-2 font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Can’t attend either
                        </button>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">Dietary preference</label>
                        <select
                          value={dietaryValue}
                          onChange={(event) => setDietary(event.target.value)}
                          disabled={targetLocked}
                          className="mt-2 w-full rounded-xl border border-sage/30 bg-white/90 px-4 py-3 text-sm outline-none ring-sage/30 transition focus:border-sage focus:ring-2 disabled:bg-sage/10"
                        >
                          {dietaryOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}

                {householdMatch?.plusOneAllowed && (
                  <label className="flex items-center gap-3 rounded-2xl border border-sage/30 bg-white/70 px-4 py-3 text-sm text-charcoal/80">
                    <input
                      type="checkbox"
                      checked={targetPlusOne}
                      onChange={(event) => setTargetPlusOne(event.target.checked)}
                      disabled={targetLocked}
                      className="accent-sage h-4 w-4"
                    />
                    <span className="font-semibold text-sage-dark">Bringing your plus-one</span>
                  </label>
                )}

                <div>
                  <label htmlFor="slug-notes" className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">
                    Notes / Requests
                  </label>
                  <textarea
                    id="slug-notes"
                    rows={3}
                    value={targetNotes}
                    onChange={(event) => setTargetNotes(event.target.value)}
                    disabled={targetLocked}
                    className="mt-2 w-full rounded-xl border border-sage/20 bg-white/70 px-4 py-3 text-sm outline-none ring-sage/30 transition focus:border-sage focus:ring-2 disabled:bg-sage/10"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={targetLocked || formStatus === 'submitting'}
                    className="rounded-full bg-sage px-6 py-3 text-xs uppercase tracking-[0.4em] text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:bg-sage/60"
                  >
                    {formStatus === 'submitting' ? 'Saving…' : targetLocked ? 'RSVP locked' : 'Submit RSVP'}
                  </button>
                  {formStatus === 'error' && formError && (
                    <p className="text-sm text-amber-700" role="alert">
                      {formError}
                    </p>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl border border-sage/30 bg-sage/10 p-4 text-sm text-sage-dark">
                  <p className="font-semibold text-sage-dark">Find your RSVP</p>
                  <p className="mt-1 text-charcoal/70">
                    Search your name or the name of anyone in your household to find your custom RSVP form.
                  </p>
                </div>
                <form onSubmit={handleLookup} className="space-y-4">
                  <div>
                    <label htmlFor="lookupQuery" className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">
                      Your name
                    </label>
                    <input
                      id="lookupQuery"
                      type="text"
                      required
                      value={lookupQuery}
                      onChange={(event) => {
                        setLookupQuery(event.target.value)
                        setLookupError('')
                      }}
                      className="mt-2 w-full rounded-xl border border-sage/20 bg-white/70 px-4 py-3 text-sm outline-none ring-sage/30 transition focus:border-sage focus:ring-2"
                      placeholder="e.g. Erika Anclade or Oliver Shoulson"
                    />
                  </div>
                  {lookupError && (
                    <p className="text-sm text-amber-700" role="alert">
                      {lookupError}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="rounded-full bg-sage px-6 py-3 text-xs uppercase tracking-[0.4em] text-white transition hover:bg-sage-dark"
                  >
                    Find my RSVP
                  </button>
                </form>
              </div>
            )}
          </div>
            <div className="space-y-4">
              {renderDoodleArea('', 'max-w-sm mx-auto')}
            </div>
          </div>
        </div>
      </section>
      {formStatus === 'success' && (
        <div className="mx-auto mt-6 w-full max-w-5xl rounded-2xl border border-sage/30 bg-sage/10 p-4 text-center text-sm text-sage-dark" role="status">
          <p>{submissionAction === 'updated' ? 'We updated your RSVP. Thank you!' : "Thanks! We'll be in touch with next steps."}</p>
        </div>
      )}

      <section id="registry" className="mx-auto mt-16 max-w-5xl rounded-2xl border border-white/50 bg-white/70 p-10 text-charcoal shadow-frame backdrop-blur">
        <p className="text-xs uppercase tracking-[0.5em] text-sage-dark/60">Registry</p>
        <h2 className="mt-4 font-serif text-4xl text-sage-dark">Gifts &amp; Registry</h2>
        <p className="mt-3 max-w-xl text-sm text-charcoal/80">
          Coming soon — check back closer to the wedding for registry details.
        </p>
      </section>
      </main>
    </>
  )
}

function App() {
  const [isGuestRoute, setIsGuestRoute] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname.startsWith('/guest-list') : false,
  )
  const [slugHousehold, setSlugHousehold] = useState(null)
  const [householdCache, setHouseholdCache] = useState(null)
  const [currentSlug, setCurrentSlug] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return () => {}
    const handleRouteChange = () => {
      const path = window.location.pathname
      setIsGuestRoute(path.startsWith('/guest-list'))
      if (!path || path === '/' || path.startsWith('/guest-list')) {
        setSlugHousehold(null)
        setCurrentSlug(null)
        return
      }
      const slug = decodeURIComponent(path.replace(/^\/+|\/+$/g, ''))
      const slugKey = normalizeSlug(slug)
      setCurrentSlug(slugKey)
      const households = householdCache || loadInitialHouseholds()
      const match = households.find((household) => getHouseholdSlugKey(household) === slugKey)
      setSlugHousehold(match || null)
    }
    handleRouteChange()
    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [householdCache])

  useEffect(() => {
    if (!currentSlug || !householdCache) return
    const match = householdCache.find((household) => getHouseholdSlugKey(household) === currentSlug)
    setSlugHousehold(match || null)
  }, [currentSlug, householdCache])

  useEffect(() => {
    const loadRemote = async () => {
      try {
        const response = await fetch(`${FUNCTIONS_BASE}/guest-list`)
        if (!response.ok) {
          throw new Error('guest list fetch failed')
        }
        const data = await response.json()
        if (Array.isArray(data.households)) {
          const normalized = data.households.map(normalizeHousehold)
          setHouseholdCache(normalized)
          try {
            window.localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(normalized))
          } catch (error) {
            console.warn('Unable to cache guest list', error)
          }
        }
      } catch (error) {
        console.warn('Unable to fetch guest list', error)
      }
    }
    loadRemote()
  }, [])

  return isGuestRoute ? <GuestListManager /> : <WeddingSite householdMatch={slugHousehold} onHouseholdUpdate={setSlugHousehold} />
}

export default App
