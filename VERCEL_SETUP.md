# Vercel Setup Guide (MDB Dashboard)

This project is a Vite + React frontend that uses Firebase (Auth + Realtime Database).

## 1) Prerequisites

- GitHub/GitLab/Bitbucket repo connected to Vercel
- A Vercel account
- Firebase project credentials

## 2) Import Project in Vercel

1. Open [https://vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Select the project folder: `mdb-dashboard` (if your repo has multiple folders)

## 3) Build Settings

Use these values in Vercel Project Settings:

- **Framework Preset:** `Vite`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

## 4) Environment Variables

Add these in **Project Settings -> Environment Variables** (Production, Preview, and Development as needed):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

Use values from your local `.env` / Firebase console.

## 5) SPA Routing Fix (Important)

This app uses React Router, so direct refresh on routes like `/invoices`, `/ledger`, `/manual-billing` must fallback to `index.html`.

Create `vercel.json` in project root:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## 6) Deploy

- Push code to your connected branch (e.g., `main`)
- Vercel auto-builds and deploys
- Open the generated deployment URL

## 7) Post-Deploy Checklist

- Login works
- Data loads from Firebase
- Page refresh works on nested routes:
  - `/dashboard`
  - `/customers`
  - `/invoices`
  - `/ledger`
  - `/manual-billing`

## 8) Common Issues

- **Blank page / Firebase errors:** missing or wrong `VITE_` env vars in Vercel
- **404 on refresh:** missing `vercel.json` rewrite
- **Wrong app from monorepo:** incorrect Root Directory (must point to `mdb-dashboard`)

---

If you want, I can also create the `vercel.json` file now so routing is production-safe immediately.
