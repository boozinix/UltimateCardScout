# Card Scout

Unified credit card discovery and benefits tracking platform.  
Merges the CardScout discovery engine with PerksVault benefits tracking into a single app.

**Platforms:** iOS · Android · Web (one Expo codebase)

---

## Stack

- **Expo SDK 54** + Expo Router v3
- **Supabase** — PostgreSQL, Auth, RLS, Deno Edge Functions
- **React Query** — all data fetching
- **NativeWind v4** + custom theme tokens
- **Stripe** — subscriptions ($6.99/mo or $49/yr, 14-day trial)
- **OpenAI gpt-4o** — AI benefit extraction (Edge Function, Pro only)
- **PostHog** — analytics (no-op if key not set)
- **EAS Build** — iOS/Android; **Vercel** — web

---

## Local Dev

```bash
cd UnifiedApp
npm install --legacy-peer-deps
cp .env.example .env.local   # fill in real keys
npx expo start --web
```

Open [http://localhost:8081](http://localhost:8081). Cards load from `public/cards.csv` when Supabase is not connected.

---

## Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
OPENAI_API_KEY=              # server-side only (Edge Functions)
STRIPE_SECRET_KEY=           # server-side only
RESEND_API_KEY=              # server-side only
```

---

## Project Structure

```
UnifiedApp/
  app/
    (auth)/          — Login, signup
    (tabs)/
      discover/      — Quiz, NL search, card results
      portfolio/     — Vault (add/remove cards, benefits)
      calendar/      — Benefit reminder calendar
      concierge/     — AI chat assistant
      tools/         — Calculators, guides
      insights/      — ROI dashboard, breakeven tracker (Pro)
      settings/      — Account, billing
  components/        — CardTile, PaywallModal, WealthRing, ...
  hooks/             — useCards, useSubscription, useBreakpoint
  lib/               — theme, supabase, analytics, scoring, quiz
  utils/             — haptics, formatters, generateReminders
  supabase/          — schema.sql, seed, edge functions
  data/              — cards.csv (master card database)
  public/            — static assets served on web (cards.csv copy)
```

---

## Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Card quiz + search | ✓ | ✓ |
| All calculators & tools | ✓ | ✓ |
| Vault (card storage) | 3 cards | Unlimited |
| Benefit reminders | — | ✓ |
| ROI / Breakeven dashboards | — | ✓ |
| AI benefit extraction by URL | — | ✓ |
| Calendar export | — | ✓ |

---

## Card Database

Cards live in `data/cards.csv`. To sync to Supabase:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run ingest
```

The web build also serves `public/cards.csv` as a static fallback when Supabase is unreachable.

---

## Supabase Setup

1. Create a new Supabase project
2. Run `supabase/schema.sql` in the SQL editor
3. (Optional) Run seed data
4. Fill `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`

---

## Design Tokens

- **Primary accent:** `#1B4FD8` (blue)  
- **Semantic gold:** `#92400E` — used *only* for captured-value displays (WealthRing arcs, "$X captured")  
- **Canvas:** `#FAFAF9` warm linen  
- **Typography:** Playfair Display (hero/display), Inter (body), Geist Mono (numeric data)
