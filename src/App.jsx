import { useEffect, useRef, useState } from 'react'
import heroImage from './assets/hero.jpg'

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

function App() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    attendance: 'yes',
    bringingGuest: 'no',
    guestName: '',
    notes: '',
  })
  const [formStatus, setFormStatus] = useState('idle')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploadStatus, setUploadStatus] = useState('idle')
  const [uploadError, setUploadError] = useState('')
  const [galleryItems, setGalleryItems] = useState(fallbackGallery)
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryError, setGalleryError] = useState('')
  const hiddenFileInput = useRef(null)

  const isAttending = formData.attendance === 'yes'
  const bringingGuest = formData.bringingGuest === 'yes' && isAttending

  const updateField = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setFormStatus('submitting')

    setTimeout(() => {
      console.table(formData)
      setFormStatus('success')
    }, 600)
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
    <main className="min-h-screen bg-mist px-4 py-12 sm:px-8">
      <section className="relative mx-auto flex min-h-[520px] max-w-5xl flex-col overflow-hidden rounded-2xl bg-bone shadow-frame md:min-h-[600px] md:flex-row" id="home">
        <div className="flex flex-col justify-between bg-sage px-8 py-10 text-bone md:w-1/2 lg:px-10">
          <nav className="flex items-center gap-6 text-[0.65rem] uppercase tracking-[0.5em] text-bone/70">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="hover:text-white transition-colors">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="space-y-6 pt-16">
            <h1 className="font-serif text-6xl leading-tight md:text-7xl lg:text-8xl">Erika &amp; Oliver</h1>
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
          className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/10 text-[1.25rem] font-serif italic uppercase tracking-[0.25em] text-white text-center leading-none backdrop-blur-2xl transition hover:border-white"
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
        <div className="grid gap-10 md:grid-cols-[1.1fr,0.9fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-sage-dark/60">RSVP</p>
            <h2 className="mt-4 font-serif text-4xl text-sage-dark">Let us know you&apos;re coming</h2>
            <p className="mt-4 text-sm text-charcoal/80">
              We kindly request a response by April 30 so we can finalize guest counts.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-charcoal/75">
              <li>• Include the name that appears on your invitation.</li>
              <li>• Plus-one invitations are noted on your envelope—only fill in guest info if applicable.</li>
              <li>• Use the notes field for accessibility needs, questions, or song requests.</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                    {value === 'yes' ? 'Obviously' : '😢😢😢😢'}
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
                placeholder="Accessibility needs, questions, song requests..."
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={formStatus === 'submitting'}
                className="rounded-full bg-sage px-6 py-3 text-xs uppercase tracking-[0.4em] text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:bg-sage/60"
              >
                {formStatus === 'submitting' ? 'Sending…' : 'Submit RSVP'}
              </button>
              {formStatus === 'success' && (
                <p className="text-xs uppercase tracking-[0.3em] text-sage-dark/70">
                  Thanks! We&apos;ll be in touch with next steps.
                </p>
              )}
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}

export default App
