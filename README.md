# Ignite Aviation — RV-12iS Build Tracker

A lightweight, mobile-friendly web app for tracking RV-12iS parts, bags, tools, and build notes.

## Overview

This project is a static front-end (HTML/CSS/JS) backed by a Google Apps Script API connected to Google Sheets.

- **Parts Finder** (`index.html`) searches inventory parts and shows bag status context.
- **Bag Tracker** (`bags.html`) tracks bag section/status/location/notes and photo links.
- **Tool Tracker** (`Tools.html`) tracks tool status/location/notes and photo links.
- **Manuals** (`manuals.html`) links to build manuals and references.
- **Admin** (`admin.html`) provides password-protected updates for bags/tools and photo uploads.

## Tech Stack

- Plain HTML, CSS, and vanilla JavaScript
- Google Apps Script backend (`apps-scrip/Code.gs`)
- Google Sheets data store (`Inventory`, `Bags`, `Tools`)
- Cloudinary for uploaded photo hosting
- Firebase Hosting (optional deployment target)

## Repository Structure

```text
.
├── index.html             # Parts finder UI
├── bags.html              # Bag tracker UI
├── Tools.html             # Tool tracker UI
├── manuals.html           # Manuals page
├── admin.html             # Admin login + update UI
├── apps-scrip/Code.gs     # Google Apps Script backend
├── service-worker.js      # Offline/PWA caching logic
├── sw-register.js         # Service worker registration
├── manifest.json          # PWA manifest
├── icon.PNG               # App icon
├── firebase.json          # Firebase Hosting config
└── DEPLOY_FIREBASE.md     # Firebase deploy instructions
```

## Data Model

The Google Sheet should contain these tabs:

1. `Inventory`
2. `Bags`
3. `Tools`

The Apps Script file defines expected columns and uses these sheets for all read/write operations.

## Local Development

Because this is a static web app, you can run it with any local static server.

### Option 1: Python

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

### Option 2: VS Code Live Server

Open the repo in VS Code and run Live Server on `index.html`.

## Backend Setup (Google Apps Script)

1. Create or open a Google Spreadsheet with tabs: `Inventory`, `Bags`, and `Tools`.
2. Copy `apps-scrip/Code.gs` into a Google Apps Script project bound to that sheet.
3. Deploy the script as a **Web App**.
4. Update frontend API endpoint variables in HTML pages to point to your deployed script URL.

> Tip: keep one script deployment URL and reuse it across pages.

## Photo Uploads (Cloudinary)

`admin.html` supports photo uploads for bag/tool updates via Cloudinary.

To enable uploads, set your Cloudinary configuration in the admin page script (or your chosen config source), then verify uploads return a usable URL stored in the sheet.

## Deployment

Firebase Hosting deployment support is included.

- See `DEPLOY_FIREBASE.md` for one-time setup and CI/CD details.
- Manual deploy command:

```bash
firebase deploy --only hosting
```

## Notes

- Keep the UI simple and mobile-first.
- Avoid adding new frameworks unless explicitly needed.
- Preserve existing page structure/styling patterns when extending features.
