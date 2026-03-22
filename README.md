# PickAI

A lightweight football betting picks UI with an AI-backed analysis endpoint.

## Project Structure
- `index.html` - Main UI
- `styles.css` - Styles
- `script.js` - Frontend logic
- `api/analyze.js` - Serverless API proxy to Anthropic
- `manifest.json` / `sw.js` - PWA assets

## Local Usage
Open `index.html` directly in a browser for the UI. For API calls, you need to run the project in an environment that supports `/api/analyze` (e.g. Vercel) and provides the API key.

## Deployment (Vercel)
1. Import this repo in Vercel.
2. Set the environment variable `ANTHROPIC_API_KEY` in the Vercel project settings.
3. Deploy. The frontend will call `/api/analyze`.

## Environment Variables
- `ANTHROPIC_API_KEY` - Required. Your Anthropic API key.

## Notes
- The API endpoint only accepts `POST`.
- Do not expose your API key in frontend code.
