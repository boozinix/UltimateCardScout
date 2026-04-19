# User Action Items — CardScout UnifiedApp
Last updated: 2026-04-18

These are tasks only YOU can complete. No AI agent can do these for you.
Once each item is done, update its status and resume AI coding work.

---

## 1. Supabase Setup (required for: auth, vault sync, reminders, AI features)

- [ ] Create a new Supabase project at https://supabase.com (free tier is fine to start)
- [ ] Run `supabase/schema.sql` in the Supabase SQL editor (creates all 4 tables + RLS)
- [ ] Run `supabase/seed.sql` if present (or use `npm run ingest` after step below)
- [ ] Copy your project URL and anon key into `UnifiedApp/.env.local`:
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```
- [ ] Enable Email magic link auth in Supabase dashboard → Authentication → Providers → Email
- [ ] Set your app's redirect URL in Supabase dashboard → Authentication → URL Configuration
  - Add: `exp://localhost:8081` (local dev) and your eventual Vercel URL

---

## 2. Card Database Ingest (required for: card catalog in app)

- [ ] Confirm `data/cards.csv` is up to date (copy from cc-recommender if needed: `cp ../cc-recommender/public/cards.csv data/cards.csv`)
- [ ] Add your Supabase service role key to your local environment (NOT in `.env.local` — use terminal export or a separate local secrets file):
  ```
  export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```
- [ ] Run: `npm run ingest` — upserts all 110 cards into Supabase `cards` table

---

## 3. Stripe Setup (required for: Pro subscriptions, paywall)

- [ ] Create a Stripe account at https://stripe.com (or log into existing)
- [ ] Create two products in Stripe dashboard:
  - Monthly: $6.99/month, 14-day free trial
  - Annual: $49.00/year, 14-day free trial
- [ ] Note the Price IDs for each (starts with `price_...`)
- [ ] Add to `UnifiedApp/.env.local`:
  ```
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_... for testing)
  ```
- [ ] Add to Supabase Edge Function secrets (Supabase dashboard → Edge Functions → Secrets):
  ```
  STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
  ```
- [ ] Set your Stripe webhook endpoint to your Vercel URL + `/api/stripe-webhook` after Vercel deploy
- [ ] Add webhook signing secret to Supabase Edge Function secrets:
  ```
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

---

## 4. OpenAI Setup (required for: AI benefit extraction, Concierge chat)

- [ ] Get an OpenAI API key at https://platform.openai.com/api-keys
- [ ] Add to Supabase Edge Function secrets:
  ```
  OPENAI_API_KEY=sk-...
  ```
- [ ] (Optional) Set a usage limit in OpenAI dashboard to avoid surprise bills

---

## 5. Resend Setup (required for: magic link emails, benefit reminder emails)

- [ ] Create a Resend account at https://resend.com
- [ ] Verify your sending domain (or use onboarding@resend.dev for testing)
- [ ] Add to Supabase Edge Function secrets:
  ```
  RESEND_API_KEY=re_...
  ```

---

## 6. PostHog Setup (required for: analytics events — optional but recommended)

- [ ] Create a PostHog project at https://posthog.com (free tier is generous)
- [ ] Add to `UnifiedApp/.env.local`:
  ```
  EXPO_PUBLIC_POSTHOG_KEY=phc_...
  EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
  ```
- [ ] If you skip this, analytics events are silently dropped (no-op wrapper) — app still works

---

## 7. Deploy Supabase Edge Functions (required for: AI extraction, Stripe, emails, Concierge)

After all secrets are set:
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Login: `supabase login`
- [ ] Link to your project: `supabase link --project-ref your-project-ref`
- [ ] Deploy all functions:
  ```bash
  supabase functions deploy scrape-card
  supabase functions deploy create-checkout
  supabase functions deploy stripe-webhook
  supabase functions deploy send-email
  # (ask-concierge will be added by AI agent — deploy it once coded)
  ```

---

## 8. EAS Build — iOS TestFlight (required for: iOS testing)

- [ ] Create an Apple Developer account at https://developer.apple.com ($99/yr)
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login: `eas login`
- [ ] Configure: `eas build:configure` (run once in `UnifiedApp/` directory)
- [ ] Build for iOS simulator (free): `eas build --platform ios --profile preview`
- [ ] Build for TestFlight: `eas build --platform ios --profile production`
- [ ] Submit to TestFlight: `eas submit --platform ios`

---

## 9. EAS Build — Android (required for: Android testing)

- [ ] Build APK for local testing: `eas build --platform android --profile preview`
- [ ] Build for Play Store: `eas build --platform android --profile production`
- [ ] (Optional) Create Google Play Developer account ($25 one-time) for distribution

---

## 10. Vercel Deployment — Web (required for: web version)

- [ ] Create a Vercel account at https://vercel.com (free tier works)
- [ ] From `UnifiedApp/` directory: `npx vercel --prod`
- [ ] Add all `EXPO_PUBLIC_*` env vars in Vercel dashboard → Project Settings → Environment Variables
- [ ] Add your Vercel URL to Supabase allowed redirect URLs
- [ ] Add your Vercel URL as Stripe webhook endpoint

---

## Summary — Dependency Order

```
Supabase project created
  → schema.sql run
    → card ingest (npm run ingest)
    → Edge Functions deployed
      → OpenAI key set (enables Concierge + AI extraction)
      → Resend key set (enables emails)
      → Stripe keys set (enables paywall)
        → Vercel deployed (enables Stripe webhooks)
          → EAS Build (iOS + Android)
```

PostHog is optional at any point. App works without it.
