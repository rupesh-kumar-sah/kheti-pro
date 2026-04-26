# Deploying KhetiSmart to Render (Free Tier)

This guide walks you through deploying KhetiSmart to Render's free tier with a custom domain.

## What you'll need (all free)

1. A **Render** account — https://render.com
2. A **Neon** PostgreSQL database (free forever) — https://neon.tech
3. A **Google Gemini API key** — https://aistudio.google.com/app/apikey
4. A **GitHub** account to host your code — https://github.com

> **Note about Render's free tier:** Free web services sleep after 15 minutes of inactivity and take ~30 seconds to wake up on the next request. For a production app with regular users, consider Render's $7/month Starter plan.

---

## Step 1 — Push your code to GitHub

1. Create a new GitHub repository (e.g. `khetismart`).
2. From your project folder, push the code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/khetismart.git
   git push -u origin main
   ```

## Step 2 — Create a free PostgreSQL database on Neon

1. Sign up at https://neon.tech and create a new project.
2. Copy the **connection string** shown on the dashboard. It looks like:
   ```
   postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require
   ```
3. In the Neon SQL editor, run this once to create the users table:
   ```sql
   CREATE TABLE IF NOT EXISTS users (
     phone VARCHAR(10) PRIMARY KEY,
     password_hash TEXT NOT NULL,
     profile JSONB NOT NULL DEFAULT '{}'::jsonb,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   ```

## Step 3 — Get a Google Gemini API key

1. Visit https://aistudio.google.com/app/apikey
2. Click **Create API key** and copy it.

## Step 4 — Deploy on Render

1. Sign in at https://render.com and click **New → Blueprint**.
2. Connect your GitHub account and select your `khetismart` repo.
3. Render will detect the included `render.yaml` and create the service.
4. When prompted, fill in these environment variables:
   - `DATABASE_URL` — paste your Neon connection string
   - `AI_INTEGRATIONS_GEMINI_API_KEY` — paste your Gemini key
   - `ALLOWED_ORIGINS` — leave blank for now, fill in once you have a custom domain
5. Click **Apply**. Render will build and deploy. First build takes ~3–5 minutes.

Your app will be live at `https://khetismart.onrender.com` (or similar).

## Step 5 — Add your custom domain (free on Render)

1. In your Render service, go to **Settings → Custom Domains**.
2. Click **Add Custom Domain** and enter your domain (e.g. `khetismart.com`).
3. Render shows you DNS records to add. At your domain registrar:
   - For an apex/root domain (`khetismart.com`): add an **A record** pointing to the IP Render shows.
   - For a subdomain (`app.khetismart.com`): add a **CNAME** pointing to the value Render shows.
4. Wait a few minutes for DNS to propagate. Render auto-provisions HTTPS.
5. Once verified, update the `ALLOWED_ORIGINS` env var in Render to:
   ```
   https://khetismart.com,https://www.khetismart.com
   ```
   then click **Save Changes** (Render will redeploy automatically).

---

## Updating your app

Push to your GitHub `main` branch — Render auto-deploys on every push.

## Troubleshooting

- **App won't start:** check the Render **Logs** tab for errors. Most issues are missing or wrong environment variables.
- **Login/signup errors:** confirm `DATABASE_URL` is set and the `users` table exists in Neon.
- **AI features return 503:** confirm `AI_INTEGRATIONS_GEMINI_API_KEY` is set and your key is valid.
- **CORS errors after adding custom domain:** make sure `ALLOWED_ORIGINS` includes your full https URL exactly.
