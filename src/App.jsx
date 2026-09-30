import { useEffect, useRef, useState } from 'react'
import { readCookie, writeCookie } from './utils/cookies.js'
const heroImage = '/STDEdit.jpg'
import GuestListManager, {
  DATA_STORAGE_KEY,
  applyPlusOneModel,
  loadInitialHouseholds,
  normalizeSlug,
  slugify,
} from './components/GuestListManager.jsx'

const TISCH_START_TIME = '4:00 PM'
// Remembers tisch invitees who opened their invite link, so the plain homepage
// still shows them tisch timing on later visits.
const TISCH_COOKIE = 'oliverikaTisch'
const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Travel', href: '#travel' },
  { label: 'Registry', href: '#registry' },
]

const defaultDetails = [
  { label: 'Date', value: 'October 11, 2026' },
  { label: 'Arrival', value: 'Guests at 4:30 PM' },
  { label: 'Venue', value: 'The Garden at Elm Bank' },
  { label: 'City', value: 'Wellesley, Massachusetts' },
]

const tischDetails = [
  { label: 'Date', value: 'October 11, 2026' },
  { label: 'Tisch', value: `${TISCH_START_TIME} (songs, toasts, ketubah signing)` },
  { label: 'Ceremony', value: 'Chuppah at 5:00 PM' },
  { label: 'Venue', value: 'The Gardens at Elm Bank' },
  { label: 'City', value: 'Wellesley, Massachusetts' },
]

const travelNotes = [
  {
    title: 'Stay Nearby',
    text: 'We reserved a block at the Residence Inn by Marriott Boston Natick ($229/night, full-suite rooms with kitchens, about 15 minutes from the venue). Book by September 9 for Friday–Monday, October 9–12.',
    link: 'https://app.marriott.com/reslink?id=1770067768707&key=GRP&app=resvlink',
    linkText: 'Book your room',
  },
  { title: 'Getting There', text: 'The hotel is about a 15 minute drive from the venue. We won\'t be providing transportation, but rideshare is easy and there is limited parking available on site. Rideshare drop-off at the Cheney Gate entrance.' },
  { title: 'Dress Code', text: 'Cocktail; Autumn Colors. Please plan for an outdoor ceremony on grass followed by a reception inside the Hunnewell Building.' },
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

const faqItems = [
  {
    q: 'When should I arrive?',
    a: '4:30 for a 5:00 ceremony unless otherwise notified!',
  },
  {
    q: 'Will there be transportation from the hotel?',
    a: 'Unfortunately, because of weight restrictions on a bridge leading into the property, we are not able to provide a bus or shuttle from the hotel. The garden is about a 15 minute Uber/taxi ride from the hotel, though!',
  },

  {
    key: 'dress',
    q: 'What should I wear?',
    a: 'The dress code is somewhere in the cocktail/semi-formal realm. For those in tailored clothing, a jacket is appropriate, and a tie is very much appreciated. For those who wear dresses, midi or maxi length is fine. We ask everyone to join in the autumnal spirit by wearing fall colors if you can! See below for inspiration.',
  },
  {
    q: 'What shoes should I wear?',
    a: 'Weather permitting, the ceremony is outdoors on grass, so block heels, wedges, or flats will serve you better than stilettos.',
  },
  {
    q: 'What should I expect at the ceremony?',
    a: 'The ceremony is based on a traditional Jewish wedding ceremony, but with many personal deviations and customizations crafted by Erika and Oliver in collaboration with their loved ones and with their officiant. We will be providing ceremony programs to help guide you through the symbols and steps of a Jewish wedding.',
  },
  {
    q: 'Is the food kosher?',
    a: 'Yes! A dairy kosher meal will be provided during the reception.',
  },
  {
    q: 'Can I film/take pictures on my phone during the ceremony?',
    a: 'You are welcome to film and take pictures during the processional and recessional, but we ask for your undivided attention during the solemnization of the marriage beneath the chuppah.',
  },
  {
    q: 'How can I share my photos?',
    a: 'Upload them to the gallery below (or scan the QR code at the venue). We would love to see the day through your eyes!',
  },
  {
    q: 'When will it end?',
    a: 'Why are you asking 🤨? Jk, Elm Bank gives us a hard stop of 10:30 PM.',
  },
  {
    q: 'What kind of weather can I expect?',
    a: 'Your guess is as good as ours at this point. Weather permitting, the ceremony will be outside in the Italianate Garden, and forecasts are showing temperatures in the 50s, so bring a layer! In the event of rain, the ceremony will be moved inside to the Hunnewell Building.',
  },
]

const baseAgendaItems = [
  {
    key: 'arrival',
    time: '4:30 PM',
    title: 'Guest Arrival',
    description: 'Stroll the grounds, say hi to family, and find your seat before we head to the chuppah.',
  },
  {
    key: 'ceremony',
    time: '5:00 PM',
    title: 'Ceremony',
    description: 'We will gather under the chuppah outdoors (with an indoor backup if New England weather insists).',
  },
  {
    key: 'reception',
    time: '5:50 PM',
    title: 'Cocktail Hour into Reception',
    description: 'Cocktail hour flows into dinner and dancing inside the Hunnewell Building.',
  },
  {
    key: 'send-off',
    time: '10:30 PM',
    title: 'Festivities End',
    description: '',
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
const normalizeHousehold = (household) =>
  applyPlusOneModel({
    ...household,
    customSlug: typeof household?.customSlug === 'string' ? household.customSlug : '',
    slug: getHouseholdSlugKey(household),
    tischInvited: Boolean(household.tischInvited),
    rsvpLocked: Boolean(household.rsvpLocked),
    guests: (household.guests || []).map((guest) => ({
      ...guest,
      rsvpStatus: normalizeRsvpStatus(guest.rsvpStatus),
      tischRsvp: normalizeTischRsvp(guest.tischRsvp, household.tischInvited),
      dietary: guest.dietary || 'None',
    })),
  })

function WeddingSite({ householdMatch }) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadStatus, setUploadStatus] = useState('idle')
  const [uploadError, setUploadError] = useState('')
  const [galleryItems, setGalleryItems] = useState(fallbackGallery)
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryError, setGalleryError] = useState('')
  const hiddenFileInput = useRef(null)

  const [hasTischCookie, setHasTischCookie] = useState(() => readCookie(TISCH_COOKIE) === '1')
  const isTischInvite = householdMatch ? Boolean(householdMatch.tischInvited) : hasTischCookie
  const heroDetails = isTischInvite ? tischDetails : defaultDetails
  const agendaItems = isTischInvite ? [tischAgendaItem, ...baseAgendaItems] : baseAgendaItems

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
    if (!householdMatch?.tischInvited) return
    writeCookie(TISCH_COOKIE, '1')
    setHasTischCookie(true)
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

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-sage/30 bg-bone/90 px-6 py-3 text-center text-sm text-sage-dark backdrop-blur">
        <p className="font-semibold">
          {isTischInvite
            ? "We can't wait to see you so soon! Please arrive at Elm Bank at 4:00 for the tisch, before the ceremony begins at 5!"
            : "We can't wait to see you so soon! Please arrive at Elm Bank at 4:30 for a ceremony beginning at 5!"}
        </p>
      </div>
      <main className="min-h-screen bg-mist px-4 py-12 pt-28 sm:px-8 sm:pt-20">
      <section className="relative mx-auto flex min-h-[520px] max-w-5xl flex-col overflow-hidden rounded-2xl bg-bone shadow-frame md:min-h-[600px] md:flex-row" id="home">
        <div className="flex flex-col justify-between bg-sage px-6 py-10 text-bone md:w-1/2 md:px-8 lg:px-10">
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.55rem] uppercase tracking-[0.3em] text-bone/70 lg:flex-nowrap md:gap-5 md:text-[0.65rem] md:tracking-[0.35em]">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="hover:text-white transition-colors">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-12">
            <h1 className="font-serif text-[15vw] leading-tight sm:text-6xl md:text-7xl lg:text-8xl">Erika &amp; Oliver</h1>
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

      </section>

      <section id="faq" className="mx-auto mt-12 max-w-5xl rounded-2xl border border-white/50 bg-white/80 p-10 text-charcoal shadow-frame backdrop-blur">
        <p className="text-xs uppercase tracking-[0.5em] text-sage-dark/60">FAQ</p>
        <h2 className="mt-3 font-serif text-4xl text-sage-dark">Good questions</h2>
        <div className="mt-6 divide-y divide-sage/20">
          {faqItems.map((item) => (
            <div key={item.q} className="py-5">
              <p className="text-lg font-semibold text-sage-dark">{item.q}</p>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/80">{item.a}</p>
              {item.key === 'dress' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {dressCodePalette.map((color, index) => (
                    <span
                      key={color}
                      role="img"
                      aria-label={`Suggested fall color ${index + 1}`}
                      className="h-10 w-10 rounded-full shadow-sm ring-1 ring-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
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
                Please arrive by {TISCH_START_TIME}. We’ll sing, toast, and sign our ketubah before joining everyone at 5:00 PM.
              </p>
            </div>
          )}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {agendaItems.map((item) => (
            <div key={item.key} className="rounded-2xl border border-sage/25 bg-white/80 p-5 shadow-sm">
              <p className="text-[0.7rem] uppercase tracking-[0.35em] text-sage-dark/70">{item.time}</p>
              <p className="mt-2 text-lg font-semibold text-sage-dark">{item.title}</p>
              {item.description && <p className="mt-1 text-sm text-charcoal/75">{item.description}</p>}
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

      <section id="registry" className="mx-auto mt-16 max-w-5xl rounded-2xl border border-white/50 bg-white/70 p-10 text-charcoal shadow-frame backdrop-blur">
        <p className="text-xs uppercase tracking-[0.5em] text-sage-dark/60">Registry</p>
        <h2 className="mt-4 font-serif text-4xl text-sage-dark">Gifts &amp; Registry</h2>
        <p className="mt-3 max-w-xl text-sm text-charcoal/80">
          Your presence is truly the greatest gift. If you'd like to celebrate us further, we've put together a registry with a few things we love.
        </p>
        <a
          href="https://www.myregistry.com/giftlist/oliverika"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-sage px-8 py-3 text-xs uppercase tracking-[0.4em] text-white shadow-lg shadow-sage/30 transition hover:-translate-y-0.5 hover:bg-sage-dark"
        >
          View our registry
        </a>
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

  return isGuestRoute ? <GuestListManager /> : <WeddingSite householdMatch={slugHousehold} />
}

export default App
