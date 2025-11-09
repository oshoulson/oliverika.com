# Oliverika Wedding Site

Custom React + Vite experience for sharing event details, collecting RSVPs, and letting guests upload photos. The project runs on Netlify so we can mix a static front end with serverless functions (S3 uploads + Google Sheets writes).

## RSVP → Google Sheets pipeline

The `/.netlify/functions/submit-rsvp` function appends every submission to a Google Sheet so you can review and sort responses in one place.

1. **Create the sheet**
   - Add a tab named `RSVPs` (or change the `GOOGLE_SHEETS_RANGE` env var) with a header row such as `Timestamp | Name | Email | Attendance | Plus One | Guest Name | Notes`.
   - Copy the spreadsheet ID from the sheet URL: `https://docs.google.com/spreadsheets/d/<THIS_PART_IS_THE_ID>/edit`.

2. **Create Google credentials (one-time)**
   - In [Google Cloud Console](https://console.cloud.google.com/), create/select a project and enable the **Google Sheets API**.
   - Create a **service account**, generate a JSON key, and download it. Note the service account email (ends with `iam.gserviceaccount.com`).
   - Share the Google Sheet with that service account email as an editor—otherwise the function cannot write rows.

3. **Configure Netlify environment variables**
   - `GOOGLE_SHEETS_ID` – the ID from step 1.
   - `GOOGLE_SHEETS_RANGE` *(optional)* – defaults to `RSVPs!A:G`. Update if you renamed the tab or want more columns.
   - Service-account credentials: either
     - `GOOGLE_SERVICE_ACCOUNT` – paste the raw JSON key into Netlify’s “environment variable” modal (Netlify preserves newlines), **or**
     - `GOOGLE_SERVICE_ACCOUNT_B64` – `base64` encode the JSON if you prefer (`cat key.json | base64`).
   - Re-deploy (or run `netlify deploy --build`) so the new secrets reach the function.

4. **Test locally**
   - Install Netlify’s CLI (`npm install -g netlify-cli`) if you haven’t already.
   - Run `netlify dev` from the repo root; the CLI automatically exposes variables defined in Netlify or `.env`.
   - Submit the RSVP form in the browser and confirm a new row appears in the sheet. Errors surface inline under the submit button.

5. **Production verification**
   - After deploying, send yourself a test RSVP from `oliverika.com`, refresh the sheet, and verify the row + timestamp.

### Duplicate protection

- **Server-side dedupe**: `submit-rsvp` now checks the sheet for an existing row with the same email. If found, it updates that row instead of appending, so Google Sheets stays clean even if someone re-submits from another device.
- **Client-side nudge**: The browser stores a `localStorage` flag after a successful submission, disables the form, and shows a small notice with an “Update RSVP” button. Guests can still update if needed, but they won’t accidentally double-submit from the same device.

## Available scripts

- `npm run dev` – Vite dev server (front end only; use `netlify dev` when you need serverless functions locally).
- `npm run build` – Production build.
- `npm run preview` – Serve the production build locally.
- `npm run lint` – ESLint.

## Environment variables overview

| Name | Required | Description |
| --- | --- | --- |
| `GOOGLE_SERVICE_ACCOUNT` or `GOOGLE_SERVICE_ACCOUNT_B64` | ✅ | Service-account JSON used to authorize the Sheets API. |
| `GOOGLE_SHEETS_ID` | ✅ | Spreadsheet ID that stores RSVP data. |
| `GOOGLE_SHEETS_RANGE` | ❌ | Sheet tab + columns to write to (default `RSVPs!A:G`). |
| `AWS_*` variables | ✅ | Already used for gallery uploads (unchanged). |
