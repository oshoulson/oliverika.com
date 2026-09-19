import { useEffect, useRef, useState } from 'react'

const FUNCTIONS_BASE = '/.netlify/functions'
const MAX_PARALLEL = 3

let nextId = 0

const requestUploadUrl = async (file) => {
  const response = await fetch(`${FUNCTIONS_BASE}/get-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name || 'photo',
      contentType: file.type || 'application/octet-stream',
      metadata: { uploader: 'wedding-guest-qr', email: 'n-a' },
    }),
  })
  if (!response.ok) throw new Error('Unable to generate upload URL')
  return response.json()
}

// XHR rather than fetch so phones on slow venue wifi get a real progress bar.
const putWithProgress = (url, file, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('File upload failed')))
    xhr.onerror = () => reject(new Error('File upload failed'))
    xhr.send(file)
  })

export default function PhotoUpload() {
  const [items, setItems] = useState([])
  const inputRef = useRef(null)
  const itemsRef = useRef(items)
  const activeRef = useRef(0)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    document.title = 'Share your photos · Oliverika'
    return () => itemsRef.current.forEach((item) => item.preview && URL.revokeObjectURL(item.preview))
  }, [])

  const patchItem = (id, patch) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  const pump = () => {
    while (activeRef.current < MAX_PARALLEL) {
      const next = itemsRef.current.find((item) => item.status === 'queued')
      if (!next) return
      activeRef.current += 1
      // Mark synchronously so the next loop iteration doesn't pick it again.
      itemsRef.current = itemsRef.current.map((item) => (item.id === next.id ? { ...item, status: 'uploading' } : item))
      patchItem(next.id, { status: 'uploading', progress: 0 })
      requestUploadUrl(next.file)
        .then(({ uploadUrl }) => putWithProgress(uploadUrl, next.file, (progress) => patchItem(next.id, { progress })))
        .then(() => patchItem(next.id, { status: 'done', progress: 1 }))
        .catch((error) => {
          console.error(error)
          patchItem(next.id, { status: 'error', progress: 0 })
        })
        .finally(() => {
          activeRef.current -= 1
          // Let the state update land in itemsRef before looking for more work.
          setTimeout(pump, 0)
        })
    }
  }

  const enqueue = (files) => {
    const added = files.map((file) => ({
      id: ++nextId,
      file,
      status: 'queued',
      progress: 0,
      isVideo: (file.type || '').startsWith('video/'),
      preview: (file.type || '').startsWith('image/') ? URL.createObjectURL(file) : null,
    }))
    itemsRef.current = [...itemsRef.current, ...added]
    setItems((current) => [...current, ...added])
    pump()
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length > 0) enqueue(files)
  }

  const retryFailed = () => {
    itemsRef.current = itemsRef.current.map((item) => (item.status === 'error' ? { ...item, status: 'queued' } : item))
    setItems(itemsRef.current)
    pump()
  }

  const total = items.length
  const done = items.filter((item) => item.status === 'done').length
  const failed = items.filter((item) => item.status === 'error').length
  const busy = items.some((item) => item.status === 'queued' || item.status === 'uploading')
  const overall = total === 0 ? 0 : items.reduce((sum, item) => sum + (item.status === 'done' ? 1 : item.progress || 0), 0) / total

  // Warn before a guest navigates away mid-upload.
  useEffect(() => {
    if (!busy) return () => {}
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  let statusLine = ''
  if (busy) statusLine = `Uploading ${Math.min(done + 1, total)} of ${total}… keep this page open`
  else if (failed > 0) statusLine = `${failed} didn't make it`
  else if (total > 0) statusLine = `${done} received, thank you!`

  return (
    <main className="flex min-h-[100dvh] flex-col bg-bone text-charcoal">
      <header className="bg-sage px-6 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))] text-center text-bone">
        <p className="text-[0.6rem] uppercase tracking-[0.5em] text-bone/70">Erika &amp; Oliver</p>
        <h1 className="mt-3 font-serif text-4xl">
          Share your <em>photos</em>
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm text-bone/80">
          Add your pictures from the celebration to our shared gallery. Pick as many as you like.
        </p>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="-mt-6">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-sage to-sage-dark px-6 py-5 text-sm uppercase tracking-[0.35em] text-white shadow-lg shadow-sage/40 transition active:scale-[0.98]"
          >
            <span role="img" aria-hidden="true" className="text-xl">
              📸
            </span>
            {total === 0 ? 'Choose photos' : 'Add more'}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {total === 0 ? (
          <p className="mt-8 text-center text-xs uppercase tracking-[0.3em] text-sage-dark/60">
            Photos &amp; videos from your camera roll
          </p>
        ) : (
          <section className="mt-6" aria-live="polite">
            <div className="flex items-baseline justify-between gap-3">
              <p className={`text-xs uppercase tracking-[0.3em] ${failed > 0 && !busy ? 'text-rose-800' : 'text-sage-dark/80'}`}>
                {statusLine}
              </p>
              {failed > 0 && !busy && (
                <button
                  type="button"
                  onClick={retryFailed}
                  className="shrink-0 rounded-full border border-sage/40 px-4 py-2 text-[0.65rem] uppercase tracking-[0.3em] text-sage-dark"
                >
                  Retry
                </button>
              )}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sage/15">
              <div
                className="h-full rounded-full bg-sage transition-[width] duration-300"
                style={{ width: `${Math.round(overall * 100)}%` }}
              />
            </div>

            <ul className="mt-5 grid grid-cols-3 gap-2">
              {items.map((item) => (
                <li key={item.id} className="relative aspect-square overflow-hidden rounded-lg bg-sage/10">
                  {item.preview ? (
                    <img src={item.preview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl" aria-hidden="true">
                      {item.isVideo ? '🎞️' : '🖼️'}
                    </div>
                  )}
                  {item.status !== 'done' && (
                    <div className="absolute inset-0 flex items-end bg-charcoal/40">
                      {item.status === 'error' ? (
                        <span className="w-full bg-rose-800/90 py-1 text-center text-[0.6rem] uppercase tracking-[0.2em] text-white">
                          Failed
                        </span>
                      ) : (
                        <div className="h-1 w-full bg-white/30">
                          <div className="h-full bg-white" style={{ width: `${Math.round((item.progress || 0) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  )}
                  {item.status === 'done' && (
                    <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-sage text-[0.65rem] text-white">
                      ✓
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-auto pt-10 text-center">
          <a href="/#gallery" className="text-xs uppercase tracking-[0.3em] text-sage-dark/70 underline underline-offset-4">
            See the gallery
          </a>
        </footer>
      </div>
    </main>
  )
}
