# KhetiSmart

AI-powered farming companion for Nepal — a single-page React app powered by Google's Gemini API.

## Tech Stack

- **Framework:** React 19 + Vite 6 (TypeScript)
- **Styling:** Tailwind CSS (via CDN in `index.html`)
- **AI:** `@google/genai` (Gemini 2.5 Flash) for farming advice, crop image analysis, market prices, and chat
- **Icons:** lucide-react
- **Persistence:** PostgreSQL (server-side users + profiles); browser `localStorage` (session token, cached AI responses)
- **Backend:** Express 5 with helmet, gzip compression, rate limiting, HMAC-signed session tokens, bcryptjs hashing
- **PWA:** Installable on Android/iOS/desktop. Service worker (`public/sw.js`) caches the app shell for offline use. Manifest at `public/manifest.json`, custom icons in `public/icons/`. Install prompt UI (`components/InstallPrompt.tsx`) for both Android (`beforeinstallprompt`) and iOS (manual "Add to Home Screen" hint).

## Project Structure

- `index.html` — HTML entry, loads Tailwind CDN and `/index.tsx`
- `index.tsx` — React root mount
- `App.tsx` — Top-level routing between views, auth state, dark mode
- `components/` — `LoginView`, `HomeView`, `Navigation`, `MarketView`, `DoctorView`, `GuideView`, `FarmingView`, `ProfileView`, `WeatherCard`, `Header`
- `services/geminiService.ts` — All Gemini API calls + caching
- `services/authService.ts` — Frontend wrapper for the signup/login/profile API
- `services/locationService.ts` — Shared location store (GPS + reverse geocode + profile fallback) with subscribe pattern
- `services/notificationService.ts` — Browser Notification API permission flow + per-day deduped alerts (weather, market, schemes, daily tips)
- `server/index.ts` — Express API: signup/login (bcrypt), `/api/me`, profile updates, serves `dist/` in production
- `types.ts` — Shared TypeScript types
- `vite.config.ts` — Dev server (port 5000, host 0.0.0.0, all hosts allowed) and `process.env.GEMINI_API_KEY` injection

## Local Development

The `Start application` workflow runs `npm run dev`, serving on port 5000.

## Environment

- `GEMINI_API_KEY` — required for AI features (farming guides, crop diagnosis, market prices, chat). Without it the UI loads but AI calls return error messages.

## Deployment

Configured as a **static** deployment:

- Build: `npm run build`
- Public dir: `dist`
