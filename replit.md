# KhetiSmart

AI-powered farming companion for Nepal — a single-page React app powered by Google's Gemini API.

## Tech Stack

- **Framework:** React 19 + Vite 6 (TypeScript)
- **Styling:** Tailwind CSS (via CDN in `index.html`)
- **AI:** `@google/genai` (Gemini 2.5 Flash) for farming advice, crop image analysis, market prices, and chat
- **Icons:** lucide-react
- **Persistence:** Browser `localStorage` (sessions, profiles, cached AI responses)

## Project Structure

- `index.html` — HTML entry, loads Tailwind CDN and `/index.tsx`
- `index.tsx` — React root mount
- `App.tsx` — Top-level routing between views, auth state, dark mode
- `components/` — `LoginView`, `HomeView`, `Navigation`, `MarketView`, `DoctorView`, `GuideView`, `FarmingView`, `ProfileView`, `WeatherCard`, `Header`
- `services/geminiService.ts` — All Gemini API calls + caching
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
