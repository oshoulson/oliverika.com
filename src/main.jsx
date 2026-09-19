import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PhotoUpload from './components/PhotoUpload.jsx'

// The QR-code upload page stands alone: no guest list fetch, no RSVP flow.
const isPhotoUploadRoute = /^\/photos\/?$/i.test(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPhotoUploadRoute ? <PhotoUpload /> : <App />}
  </StrictMode>,
)
