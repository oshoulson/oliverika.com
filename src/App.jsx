import { useEffect, useRef, useState } from 'react'
import heroImage from './assets/hero.jpg'
import DoodleBoard from './components/DoodleBoard.jsx'
import GuestListManager, { DATA_STORAGE_KEY, loadInitialHouseholds, slugify } from './components/GuestListManager.jsx'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Travel', href: '#travel' },
  { label: 'RSVP', href: '#rsvp' },
  { label: 'Registry', href: '#registry' },
]

const details = [
  { label: 'Date', value: 'October 11, 2026' },
  { label: 'Arrival', value: 'Guests at 4:30 PM' },
  { label: 'Venue', value: 'The Gardens at Elm Bank' },
  { label: 'City', value: 'Wellesley, Massachusetts' },
]

const travelNotes = [
  { title: 'Stay Nearby', text: 'We reserved blocks at Hotel Commonwealth (Boston) and The Wellesley Inn. Mention “Oliver & Erika” for preferred rates through April 15.' },
  { title: 'Getting There', text: 'The venue is a 30-minute ride from downtown Boston. Rideshare drop-off is at the Cheney Gate entrance; limited parking is available on site.' },
  { title: 'Dress Code', text: 'Cocktail; Autumn Colors. Please plan for an outdoor ceremony on grass followed by a reception inside the carriage house.' },
]

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
const normalizeHousehold = (household) => ({
  ...household,
  slug: household.slug || slugify(household.envelopeName || 'household'),
  plusOneAccepted: Boolean(household.plusOneAccepted),
  rsvpLocked: Boolean(household.rsvpLocked),
  guests: (household.guests || []).map((guest) => ({
    ...guest,
    rsvpStatus: normalizeRsvpStatus(guest.rsvpStatus),
    dietary: guest.dietary || 'None',
  })),
})

const useIsDesktop = () => {
  const getMatch = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia('(min-width: 768px)').matches
  }
  const [isDesktop, setIsDesktop] = useState(getMatch)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return () => {}
    }
    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const handler = (event) => setIsDesktop(event.matches)
    mediaQuery.addEventListener('change', handler)
    setIsDesktop(mediaQuery.matches)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return isDesktop
}

const createInitialFormState = () => ({
  fullName: '',
  email: '',
  attendance: 'yes',
  bringingGuest: 'no',
  guestName: '',
  notes: '',
})

function WeddingSite({ householdMatch, onHouseholdUpdate }) {
  const [formData, setFormData] = useState(createInitialFormState)
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
  const [targetDietaries, setTargetDietaries] = useState([])
  const [targetNotes, setTargetNotes] = useState('')
  const [targetPlusOne, setTargetPlusOne] = useState(false)
  const [targetLocked, setTargetLocked] = useState(false)
  const [targetEmail, setTargetEmail] = useState('')
  const hiddenFileInput = useRef(null)
  const doodleBoardRef = useRef(null)
  const isDesktop = useIsDesktop()

  const isAttending = formData.attendance === 'yes'
  const bringingGuest = formData.bringingGuest === 'yes' && isAttending
  const submissionLocked = hasSubmitted
  const isSlugRsvp = Boolean(householdMatch)

  const updateField = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const rememberSubmissionFlag = () => {
    try {
      window.localStorage.setItem(RSVP_STORAGE_KEY, 'true')
    } catch (error) {
      console.warn('Unable to persist RSVP submission flag', error)
    }
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

  const handleHouseholdSubmit = (event) => {
    event.preventDefault()
    if (!householdMatch || targetLocked) return
    setFormStatus('submitting')
    setFormError('')
    try {
      const households = loadInitialHouseholds()
      const slug = householdMatch.slug || slugify(householdMatch.envelopeName)
      const updated = households.map((household) => {
        if ((household.slug || slugify(household.envelopeName)) !== slug) return household
        const guests = (household.guests || []).map((guest, index) => ({
          ...guest,
          rsvpStatus: targetResponses[index] || guest.rsvpStatus || 'Awaiting response',
          dietary: targetDietaries[index] || guest.dietary || 'None',
        }))
        const plusOneAccepted = household.plusOneAllowed ? targetPlusOne : false
        const anyAccepted = guests.some((guest) => guest.rsvpStatus === 'Accepted') || plusOneAccepted
        const allDeclined = guests.every((guest) => guest.rsvpStatus === 'Declined') && !plusOneAccepted
        const rsvpStatus = anyAccepted ? 'Accepted' : allDeclined ? 'Declined' : 'Awaiting response'
        return {
          ...household,
          email: targetEmail,
          guests,
          plusOneAccepted,
          notes: targetNotes,
          rsvpStatus,
          rsvpLocked: true,
        }
      })
      window.localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(updated))
      const refreshed = updated.find((h) => (h.slug || slugify(h.envelopeName)) === slug)
      onHouseholdUpdate?.(refreshed)
      setTargetLocked(true)
      setFormStatus('success')
      setSubmissionAction('updated')
      setHasSubmitted(true)
    } catch (error) {
      setFormStatus('error')
      setFormError('Unable to save RSVP right now. Please try again.')
    }
  }

  const handleSubmit = async (event) => {
    if (householdMatch) {
      return handleHouseholdSubmit(event)
    }
    event.preventDefault()
    if (formStatus === 'submitting') return
    if (hasSubmitted) {
      setFormError('We already have your RSVP. Click "Update RSVP" if you need to make a change.')
      return
    }

    setFormStatus('submitting')
    setFormError('')

    const includesGuest = formData.attendance === 'yes' && formData.bringingGuest === 'yes'
    const doodleDataUrl = hasDoodle ? doodleBoardRef.current?.toDataUrl?.() || '' : ''
    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      attendance: formData.attendance,
      bringingGuest: formData.bringingGuest,
      guestName: includesGuest ? formData.guestName.trim() : '',
      notes: formData.notes.trim(),
      doodleDataUrl,
    }

    try {
      const response = await fetch(`${FUNCTIONS_BASE}/submit-rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let parsedBody = null
      try {
        parsedBody = await response.json()
      } catch (parseError) {
        console.warn('Unable to parse RSVP response body', parseError)
      }

      if (!response.ok) {
        const message = parsedBody?.error || 'Unable to send your RSVP right now. Please try again.'
        throw new Error(message)
      }

      setSubmissionAction(parsedBody?.action === 'updated' ? 'updated' : 'created')
      rememberSubmissionFlag()
      setHasSubmitted(true)
      setFormStatus('success')
      setFormData(createInitialFormState())
      doodleBoardRef.current?.clear?.()
    } catch (error) {
      console.error('submit rsvp error', error)
      setFormStatus('error')
      setFormError(error.message || 'Unable to send your RSVP right now. Please try again or email us.')
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
    if (!householdMatch) return
    setTargetResponses((householdMatch.guests || []).map((guest) => guest.rsvpStatus || 'Awaiting response'))
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
    <main className="min-h-screen bg-mist px-4 py-12 sm:px-8">
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
            {details.map((item) => (
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

      <section id="travel" className="mx-auto mt-16 max-w-5xl rounded-2xl border border-white/50 bg-white/70 p-10 text-charcoal shadow-frame backdrop-blur">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-sage-dark/60">Travel &amp; Accommodations</p>
            <h2 className="mt-4 font-serif text-4xl text-sage-dark">The Gardens at Elm Bank</h2>
            <p className="mt-2 text-sm text-charcoal/80">900 Washington St, Wellesley, MA 02482</p>
            <div className="mt-8 space-y-6">
              {travelNotes.map((note) => (
                <div key={note.title}>
                  <p className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">{note.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal/80">{note.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10">
            <iframe
              title="Map showing The Gardens at Elm Bank"
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
            <p className="text-sm text-charcoal/80">We kindly request a response by April 30 so we can finalize guest counts.</p>
            <ul className="space-y-3 text-sm text-charcoal/75">
              <li>• Include the name that appears on your invitation.</li>
              <li>• Plus-one invitations are noted on your envelope—only fill in guest info if applicable.</li>
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
                  {householdMatch?.plusOneAllowed && (
                    <p className="mt-2 text-xs text-charcoal/70">Plus-one noted on your envelope.</p>
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
                  const setValue = (value) =>
                    setTargetResponses((prev) => {
                      const next = [...prev]
                      next[index] = value
                      return next
                    })
                  const setDietary = (value) =>
                    setTargetDietaries((prev) => {
                      const next = [...prev]
                      next[index] = value
                      return next
                    })
                  const dietaryValue = targetDietaries[index] || 'None'
                  return (
                    <div key={guest.id} className="space-y-3 rounded-2xl border border-sage/20 bg-white/70 p-4 shadow-sm">
                      <p className="text-sm font-semibold text-sage-dark">{guest.name}, are you coming?</p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        {[
                          { value: 'Both events', label: 'Obviously (ceremony + reception)' },
                          { value: 'Ceremony only', label: 'Ceremony only' },
                          { value: 'Reception only', label: 'Reception only' },
                          { value: 'Not attending', label: '😢😢😢😢 Neither' },
                        ].map((option) => {
                          const isActive = current === option.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              disabled={targetLocked}
                              onClick={() => setValue(option.value)}
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
              <form onSubmit={handleSubmit} className="space-y-6" aria-disabled={submissionLocked}>
                <div>
                  <label htmlFor="fullName" className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={updateField('fullName')}
                    className="mt-2 w-full rounded-xl border border-sage/20 bg-white/70 px-4 py-3 text-sm outline-none ring-sage/30 transition focus:border-sage focus:ring-2"
                    placeholder="First & Last Name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={updateField('email')}
                    className="mt-2 w-full rounded-xl border border-sage/20 bg-white/70 px-4 py-3 text-sm outline-none ring-sage/30 transition focus:border-sage focus:ring-2"
                    placeholder="you@email.com"
                  />
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">Will you attend?</legend>
                  <div className="flex gap-4 text-sm">
                    {['yes', 'no'].map((value) => (
                      <label key={value} className="flex items-center gap-2 rounded-full border border-sage/30 px-4 py-2">
                        <input
                          type="radio"
                          name="attendance"
                          value={value}
                          checked={formData.attendance === value}
                          onChange={updateField('attendance')}
                          className="accent-sage"
                        />
                        {value === 'yes' ? 'Obviously' : '😢😢😢😢 Neither'}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {isAttending && (
                  <fieldset className="space-y-3">
                    <legend className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">Bringing a plus one?</legend>
                    <div className="flex gap-4 text-sm">
                      {['no', 'yes'].map((value) => (
                        <label key={value} className="flex items-center gap-2 rounded-full border border-sage/30 px-4 py-2">
                          <input
                            type="radio"
                            name="bringingGuest"
                            value={value}
                            checked={formData.bringingGuest === value}
                            onChange={updateField('bringingGuest')}
                            className="accent-sage"
                          />
                          {value === 'yes' ? 'Yes, noted on invite' : 'No, just me'}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                {bringingGuest && (
                  <div>
                    <label htmlFor="guestName" className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">
                      Guest Name
                    </label>
                    <input
                      id="guestName"
                      type="text"
                      required
                      value={formData.guestName}
                      onChange={updateField('guestName')}
                      className="mt-2 w-full rounded-xl border border-sage/20 bg-white/70 px-4 py-3 text-sm outline-none ring-sage/30 transition focus:border-sage focus:ring-2"
                      placeholder="Plus-one full name"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="notes" className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">
                    Notes / Requests
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={updateField('notes')}
                    className="mt-2 w-full rounded-xl border border-sage/20 bg-white/70 px-4 py-3 text-sm outline-none ring-sage/30 transition focus:border-sage focus:ring-2"
                  />
                </div>

                {!isDesktop && renderDoodleArea('pt-2', '')}

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={submissionLocked || formStatus === 'submitting'}
                    className="rounded-full bg-sage px-6 py-3 text-xs uppercase tracking-[0.4em] text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:bg-sage/60"
                  >
                    {formStatus === 'submitting' ? 'Sending…' : 'Submit RSVP'}
                  </button>
                  {formStatus === 'error' && formError && (
                    <p className="text-sm text-amber-700" role="alert">
                      {formError}
                    </p>
                  )}
                </div>
              </form>
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
    </main>
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
      const slug = decodeURIComponent(path.replace(/^\//, ''))
      setCurrentSlug(slug)
      const households = householdCache || loadInitialHouseholds()
      const match = households.find((household) => (household.slug || slugify(household.envelopeName)) === slug)
      setSlugHousehold(match || null)
    }
    handleRouteChange()
    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [householdCache])

  useEffect(() => {
    if (!currentSlug || !householdCache) return
    const match = householdCache.find((household) => (household.slug || slugify(household.envelopeName)) === currentSlug)
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
