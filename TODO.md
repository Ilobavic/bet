# PickAI Improvements TODO

## Status: ✅ ALL COMPLETE

---

## What Was Fixed & Improved

### Phase 1 — Modularity & Assets
- [x] CSS extracted to `styles.css`
- [x] JS extracted to `script.js`
- [x] Meta tags added (description, theme-color, Apple PWA, Open Graph)
- [x] Accessibility improvements (ARIA roles, labels, live regions, focus styles)

### Phase 2 — Polish & Features
- [x] `manifest.json` created (PWA installable on mobile)
- [x] `sw.js` service worker created (offline caching for app shell)
- [x] CSS improvements:
  - Custom dropdown arrow indicator (was missing after -webkit-appearance:none)
  - Improved --muted2 contrast
  - Error state styles for stake input
  - Share button styles
  - Focus-visible outlines on all interactive elements
  - Cleaner print styles
- [x] JS improvements:
  - WAT timezone bug fixed (was: 60 - offset, now: correct UTC+1 offset)
  - Input validation with inline error messages
  - Session storage — last result restores on page refresh (2hr window)
  - Share/Copy slip button with clipboard fallback
  - Native Web Share API support on mobile
  - Analyst note HTML bug fixed (missing space before note text)
  - Service Worker registration
  - Slip stored on window for share callbacks

### Phase 3 — Finalize
- [x] All files updated and consistent
- [x] TODO updated

---

## File Summary
- `index.html` — PWA-ready, accessible, semantic HTML
- `styles.css` — Complete styles with select arrow, error states, share button, print
- `script.js` — Fixed WAT time, validation, session restore, share/copy
- `manifest.json` — PWA manifest (installable on Android/iOS)
- `sw.js` — Service worker for offline app shell caching
