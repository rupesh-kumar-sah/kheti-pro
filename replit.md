# KhetiSmart

AI-powered farming companion for Nepal — a single-page React app powered by Google's Gemini API.

## Tech Stack

- **Framework:** React 19 + Vite 6 (TypeScript)
- **Styling:** Tailwind CSS (via CDN in `index.html`)
- **AI:** `@google/genai` (Gemini 2.5 Flash) for farming advice, crop image analysis, market prices, and chat — proxied through the Express backend (`/api/ai/*`) using Replit AI Integrations (no client-side API key)
- **Icons:** lucide-react
- **Persistence:** PostgreSQL (server-side users + profiles); browser `localStorage` (session token, cached AI responses)
- **Backend:** Express 5 with helmet, gzip compression, rate limiting, HMAC-signed session tokens, bcryptjs hashing
- **PWA:** Installable on Android/iOS/desktop. Service worker (`public/sw.js`) caches the app shell for offline use. Manifest at `public/manifest.json`, custom icons in `public/icons/`. Install prompt UI (`components/InstallPrompt.tsx`) for both Android (`beforeinstallprompt`) and iOS (manual "Add to Home Screen" hint).
- **Market Prices:** Gemini-grounded Kalimati + Nepal retail prices. Returns 70-90 items covering vegetables, fruits, all rice varieties (basmati, jeera masino, mansuli, chiura), wheat/atta/maida, maize/millet/buckwheat, all dals (masoor, mung, chana, kalo maas, toor, rajma, soyabean), spices, and cooking oils. Each item has both English and Nepali (Devanagari) names; UI shows Nepali name as the primary heading. Categories: Vegetable / Fruit / Grain / Pulse / Spice / Other. Cache key bumped to `khetismart_market_prices_v2`.

## Project Structure

- `index.html` — HTML entry, loads Tailwind CDN and `/index.tsx`
- `index.tsx` — React root mount
- `App.tsx` — Top-level routing between views, auth state, dark mode
- `components/` — `LoginView`, `HomeView`, `Navigation`, `MarketView`, `DoctorView`, `GuideView`, `FarmingView`, `ProfileView`, `WeatherCard`, `Header`
- `services/geminiService.ts` — Frontend wrapper that calls `/api/ai/*` endpoints + browser-side caching
- `services/authService.ts` — Frontend wrapper for the signup/login/profile API
- `services/locationService.ts` — Shared location store (GPS + reverse geocode + profile fallback) with subscribe pattern
- `services/notificationService.ts` — Browser Notification API permission flow + per-day deduped alerts (weather, market, schemes, daily tips)
- `server/index.ts` — Express API: signup/login (bcrypt), `/api/me`, profile updates, serves `dist/` in production
- `server/aiRoutes.ts` — Express router exposing `/api/ai/*` endpoints that proxy Gemini calls server-side
- `types.ts` — Shared TypeScript types
- `vite.config.ts` — Dev server (port 5000, host 0.0.0.0, all hosts allowed); proxies `/api` to the API on port 3001

## Local Development

The `Start application` workflow runs `npm run dev`, serving on port 5000.

## Environment

- `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL` — auto-provisioned by Replit AI Integrations. Required server-side for Gemini calls. The browser never sees these.
- `DATABASE_URL` — auto-provisioned by Replit PostgreSQL.
- `SESSION_SECRET` — used to sign session tokens. Auto-generated per-process if unset.

## Deployment

Configured as a **static** deployment:

- Build: `npm run build`
- Public dir: `dist`
