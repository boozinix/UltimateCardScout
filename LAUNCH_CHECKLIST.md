# CardScout UnifiedApp — Launch Checklist
> Created: 2026-04-19
> Status: Pre-launch — all code complete, infrastructure setup needed

Complete these steps **in order**. Each step lists what it unlocks.

---

## Step 1: Supabase Project
**Time:** ~10 min | **Unlocks:** Auth, database, all backend features

1. Go to https://supabase.com → New Project
2. Name: `cardscout` (or whatever you want)
3. Set a strong database password (save it somewhere)
4. Region: pick closest to you (e.g., `us-east-1`)
5. Wait for project to provision (~2 min)
6. Go to Settings → API → copy:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...` — keep this secret)
7. Paste into `UnifiedApp/.env.local`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
   ```

**Verify:** Restart the dev server (`npm run web`), app should load without Supabase connection errors in console.

---

## Step 2: Run Database Migrations
**Time:** ~5 min | **Unlocks:** All tables, RLS policies, seed data

Option A — **Supabase CLI** (recommended):
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

Option B — **SQL Editor** (manual):
1. Go to Supabase Dashboard → SQL Editor
2. Run these files in order:
   - `supabase/schema.sql`
   - `supabase/migrations/001_applications_ledger.sql`
   - `supabase/migrations/002_extra_tables.sql`
   - `supabase/migrations/003_email_aliases.sql`
3. Then run seed files:
   - `supabase/seed-points-valuations.sql`
   - `supabase/seed-retention-scripts.sql`
   - `supabase/seed-downgrade-paths.sql`
   - `supabase/seed-card-categories.sql`

**Verify:** Go to Supabase → Table Editor → you should see tables: `cards`, `benefits`, `user_cards`, `reminders`, `applications`, `household_members`, `points_balances`, etc.

---

## Step 3: Enable Auth
**Time:** ~5 min | **Unlocks:** Login, magic links, sign-up

1. Supabase Dashboard → Authentication → Providers
2. Enable **Email** (magic link enabled by default)
3. Go to Authentication → URL Configuration
4. Add redirect URLs:
   - `exp://localhost:8081` (local dev)
   - `http://localhost:8081` (web dev)
   - Your eventual production URL (add later)
5. (Optional) Enable Apple Sign In:
   - Requires Apple Developer account ($99/yr)
   - Create a Service ID in Apple Developer portal
   - Add credentials in Supabase → Auth → Apple
6. (Optional) Enable Google Sign In:
   - Create OAuth credentials in Google Cloud Console
   - Add client ID/secret in Supabase → Auth → Google

**Verify:** Open app → tap Login → enter your email → check inbox for magic link.

---

## Step 4: Ingest Card Database
**Time:** ~3 min | **Unlocks:** Card catalog, quiz results, card browser

```bash
cd UnifiedApp

# Make sure CSV is current
cp ../cc-recommender/public/cards.csv data/cards.csv

# Run ingest (needs SUPABASE_SERVICE_ROLE_KEY in env)
npm run ingest
```

**Verify:** Supabase → Table Editor → `cards` table → should show 110+ rows.

---

## Step 5: Stripe Setup
**Time:** ~15 min | **Unlocks:** Pro subscriptions, paywall, $8/mo billing

1. Go to https://stripe.com → create account (or log in)
2. **Use Test Mode first** (toggle in top-right of Stripe dashboard)
3. Create products:
   - Product: "CardScout Pro"
   - Price 1: $8.00/month, 14-day free trial
   - Price 2: (optional) $69/year, 14-day free trial
4. Copy the Price IDs (start with `price_...`)
5. Copy keys from Developers → API Keys:
   - Publishable key → `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local`
   - Secret key → save for Edge Function secrets (Step 7)
6. Update price IDs in the app code if they differ from placeholders

**Verify:** You'll test the full checkout flow after Edge Functions are deployed (Step 7).

---

## Step 6: OpenAI + Resend Keys
**Time:** ~5 min | **Unlocks:** AI extraction, email notifications

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Create a new key
3. (Recommended) Set a $10/month usage limit
4. Save the key for Edge Function secrets (Step 7)

### Resend
1. Go to https://resend.com → create account
2. For testing: use `onboarding@resend.dev` (no domain verification needed)
3. For production: verify your domain (e.g., `cardscout.app`)
4. Copy API key for Edge Function secrets (Step 7)

---

## Step 7: Deploy Edge Functions
**Time:** ~15 min | **Unlocks:** AI extraction, Stripe webhooks, automation pipeline, emails

### Set secrets first:
```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  OPENAI_API_KEY=sk-... \
  RESEND_API_KEY=re_... \
  ADMIN_EMAIL=zubair@example.com \
  APP_URL=http://localhost:8081 \
  ADMIN_USER_ID=your-supabase-user-id
```

### Deploy all functions:
```bash
supabase functions deploy scrape-card
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
supabase functions deploy send-email
supabase functions deploy ingest-doc
supabase functions deploy ingest-reddit
supabase functions deploy ingest-email
supabase functions deploy auto-apply
supabase functions deploy weekly-summary
```

### Set up cron schedules (Supabase Dashboard → Edge Functions):
| Function | Schedule | Cron |
|---|---|---|
| `ingest-doc` | Monday 6 AM PT | `0 13 * * 1` |
| `ingest-reddit` | Daily 7 AM PT | `0 14 * * *` |
| `auto-apply` | Hourly | `0 * * * *` |
| `weekly-summary` | Sunday 9 PM PT | `0 4 * * 1` |

**Verify:** `supabase functions list` shows all 9 functions deployed.

---

## Step 8: PostHog Analytics (Optional)
**Time:** ~5 min | **Unlocks:** Event tracking, funnels, user analytics

1. Go to https://posthog.com → create project (free tier is generous)
2. Add to `.env.local`:
   ```
   EXPO_PUBLIC_POSTHOG_KEY=phc_...
   EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```

If you skip this, all analytics calls are no-ops. App works fine without it.

---

## Step 9: Sentry Error Monitoring (Optional)
**Time:** ~5 min | **Unlocks:** Crash reporting, error tracking

1. Go to https://sentry.io → create project (React Native)
2. Add to `.env.local`:
   ```
   EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
   ```

---

## Step 10: SendGrid Email Forwarding (Optional)
**Time:** ~15 min | **Unlocks:** Email forwarding feature (auto-import card emails)

1. Sign up at https://sendgrid.com
2. Settings → Inbound Parse → Add Host & URL:
   - Hostname: `in.cardscout.app`
   - URL: `https://your-project.supabase.co/functions/v1/ingest-email`
3. Add DNS MX record for `in.cardscout.app`:
   - Type: MX, Host: `in`, Value: `mx.sendgrid.net`, Priority: 10

---

## Step 11: Test Everything Locally
**Time:** ~30 min

Run through each feature:
- [ ] Open app at http://localhost:8081
- [ ] Quiz flow: answer 3 questions → see ranked results
- [ ] Card browser: filter by issuer, type, fee
- [ ] Login with magic link
- [ ] Add a card to vault
- [ ] Add an application to the ledger
- [ ] Check velocity dashboard
- [ ] Check points portfolio
- [ ] Check fee advisor
- [ ] Check spend optimizer
- [ ] Trigger paywall (tap a Pro feature)
- [ ] Test Stripe checkout (use test card: `4242 4242 4242 4242`)
- [ ] Dark mode toggle in Settings

---

## Step 12: Build & Deploy
**Time:** ~30 min (mostly waiting for builds)

### Web (Vercel):
```bash
cd UnifiedApp
npx vercel --prod
```
Add all `EXPO_PUBLIC_*` env vars in Vercel dashboard.

### iOS (TestFlight):
```bash
npm install -g eas-cli
eas login
eas build:configure  # run once
eas build --platform ios --profile production
eas submit --platform ios
```
Requires Apple Developer account ($99/yr).

### Android:
```bash
eas build --platform android --profile preview   # APK for testing
eas build --platform android --profile production # Play Store bundle
```

---

## Step 13: App Store Submission
**Time:** ~1 hour

Prepare in App Store Connect / Google Play Console:
- App name: **CardScout**
- Subtitle: **Credit Card Intelligence**
- Screenshots needed (from running app):
  - Velocity Dashboard
  - Points Portfolio
  - Spend Optimizer
  - Fee Advisor
  - Quiz flow
- Privacy policy page on cardscout.app
- Data collection: email, manually-entered card data, analytics
- No bank logins, no Plaid, no third-party data sharing

---

## Quick Reference — All Env Vars

```bash
# UnifiedApp/.env.local
EXPO_PUBLIC_SUPABASE_URL=https://...supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_POSTHOG_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
EXPO_PUBLIC_APP_URL=http://localhost:8081

# Supabase Edge Function Secrets (set via supabase secrets set)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
ADMIN_EMAIL=your-email
APP_URL=https://your-app-url
ADMIN_USER_ID=your-supabase-user-id
```
