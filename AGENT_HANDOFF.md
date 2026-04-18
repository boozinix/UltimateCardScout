# Agent Handoff Document
**Project:** Card Scout Unified App  
**Date:** 2026-04-18  
**Repo:** https://github.com/boozinix/UltimateCardScout  
**Working dir:** `/Users/zubairnizami/Projects/Ultimate Card Scout/UnifiedApp/`

---

## What This Project Is

A unified credit card discovery + benefits tracking mobile/web app.  
Merges two prior prototypes: **CardScout** (web discovery engine) + **PerksVault** (benefits tracker).  
Ships as a single Expo SDK 54 codebase to iOS, Android, and web.

The app is **fully coded and locally runnable** but not yet connected to a live backend. All screens render with CSV fallback data. The user tests locally only — no Vercel, no EAS build yet.

---

## How to Run

```bash
cd "/Users/zubairnizami/Projects/Ultimate Card Scout/UnifiedApp"
npm install --legacy-peer-deps   # lucide-react-native has React 19 peer conflict
npx expo start --web
# Open http://localhost:8081
```

Cards load from `public/cards.csv` when Supabase is unreachable (always in local demo).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54, Expo Router v3 |
| Styling | NativeWind v4 + `lib/theme.ts` design tokens |
| State / Data | React Query (`@tanstack/react-query`) |
| Backend | Supabase (PostgreSQL + Auth + RLS + Deno Edge Functions) |
| Auth | Supabase magic link |
| Payments | Stripe ($6.99/mo or $49/yr, 14-day trial) |
| AI | OpenAI gpt-4o via Edge Functions (Pro only) |
| Analytics | PostHog — no-op wrapper if key not set |
| Email | Resend |
| Build | EAS Build (iOS/Android), Vercel (web) |

---

## Design Tokens (never hardcode these)

All in `lib/theme.ts`:

- **Primary accent:** `#1B4FD8` (blue) — buttons, active states, CTAs
- **Gold:** `#92400E` — **semantic only** for captured value displays (WealthRing arcs, "$X captured")
- **Canvas:** `#FAFAF9` warm linen
- **Typography:** Playfair Display (hero H1s), Inter (body), Geist Mono (numeric/tabular)
- **Status colors:** `colors.success` (green), `colors.warn` (amber), `colors.urgent` (red), `colors.muted` (grey)

---

## Navigation Structure

```
4 visible tabs (mobile bottom nav / desktop sidebar):
  Discover    → /(tabs)/discover
  Vault       → /(tabs)/portfolio
  Calendar    → /(tabs)/calendar
  Concierge   → /(tabs)/concierge

Hidden tabs (accessible via router.push, no tab bar entry):
  Tools       → /(tabs)/tools
  Insights    → /(tabs)/insights
  Settings    → /(tabs)/settings
```

Desktop (≥1024px): 240px sidebar with brand block, nav items, insights + settings footer links.  
Mobile (<1024px): standard bottom tab bar.  
Breakpoint logic: `hooks/useBreakpoint.ts` — `width >= 1024`.

---

## Free vs Pro Boundary

```
FREE: quiz, search, results, all tools, card browser, guides, 3-card vault limit
PRO ($6.99/mo or $49/yr): unlimited vault, reminders, insights dashboards, AI URL extraction
```

Gate checks: `hooks/useSubscription.ts` → `useFeatureGate(feature)`.  
Feature keys: `'wallet'`, `'reminders'`, `'dashboard'`, `'ai_extraction'`.  
**Never trust client-side alone** — Supabase RLS enforces server-side.

Paywall trigger: after 3rd card add, or tapping locked feature. NOT on app open.

---

## Key Files

### App Screens
| File | Purpose |
|---|---|
| `app/(tabs)/discover/index.tsx` | NL search, quick pills, tools section |
| `app/(tabs)/discover/quiz.tsx` | Step wizard (ranked + single-select) |
| `app/(tabs)/discover/results.tsx` | Scored card results with CardTile |
| `app/(tabs)/portfolio/index.tsx` | VaultScreen — card list, add/remove, insights link |
| `app/(tabs)/portfolio/add-card.tsx` | Search mode + By URL AI extraction mode (Pro) |
| `app/(tabs)/portfolio/benefits.tsx` | Per-card benefit list |
| `app/(tabs)/calendar/index.tsx` | Re-exports portfolio/calendar |
| `app/(tabs)/concierge/index.tsx` | AI chat UI — wired to placeholder, needs real Edge Function |
| `app/(tabs)/tools/` | All calculators, browser, guides |
| `app/(tabs)/insights/index.tsx` | Insights hub (Pro-gated) |
| `app/(tabs)/insights/breakeven.tsx` | Per-card breakeven tracker (Pro-gated) |
| `app/(tabs)/settings/index.tsx` | Account + billing settings |
| `app/(auth)/login.tsx` | Magic link login + guest bypass |

### Library
| File | Purpose |
|---|---|
| `lib/theme.ts` | All design tokens — colors, spacing, radius, fonts |
| `lib/supabase.ts` | Supabase client (uses `EXPO_PUBLIC_SUPABASE_*` env vars) |
| `lib/analytics.ts` | PostHog wrapper + `Events` constants |
| `lib/scoring.ts` | Quiz answers → card scoring algorithm |
| `lib/quiz.ts` | Wizard question definitions |
| `lib/nlp.ts` | Natural language → quiz answers |
| `lib/cardTypes.ts` | `Card` type definition |
| `lib/cardDisplay.ts` | Display helpers (fee parsing, feature extraction) |
| `lib/subscription.ts` | `createCheckoutSession()`, `FREE_CARD_LIMIT` |
| `lib/pointValues.ts` | Points → USD value estimates |

### Hooks
| File | Purpose |
|---|---|
| `hooks/useCards.ts` | Fetch card catalog (Supabase → CSV fallback) |
| `hooks/useSubscription.ts` | `useFeatureGate()`, subscription status |
| `hooks/useBreakpoint.ts` | `isDesktop` flag (≥1024px) |

### Components
| File | Purpose |
|---|---|
| `components/CardTile.tsx` | Expandable card result tile with gradient header |
| `components/PaywallModal.tsx` | Bottom sheet upgrade modal |
| `components/WealthRing.tsx` | SVG ring — gold arc = captured, grey = remaining |
| `components/Button.tsx` | Shared button component |
| `components/Typography.tsx` | Shared text components |

### Supabase
| File | Purpose |
|---|---|
| `supabase/schema.sql` | Full DB schema — run on fresh Supabase project |
| `supabase/functions/scrape-card/` | GPT-4o benefit extraction from card URL |
| `supabase/functions/create-checkout/` | Stripe checkout session creation |
| `supabase/functions/stripe-webhook/` | Stripe event processor |
| `supabase/functions/send-email/` | Resend email sender |

---

## Environment Variables

File: `UnifiedApp/.env.local` (gitignored — never commit)  
Template: `UnifiedApp/.env.example` (committed, placeholders only)

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_POSTHOG_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Server-side only (set in Supabase Edge Function secrets, not `.env.local`):
```
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
RESEND_API_KEY=
```

---

## Analytics Events (all wired)

All use `capture(Events.X, props?)` from `lib/analytics.ts`.

| Event | Where fired | Properties |
|---|---|---|
| `quiz_started` | quiz.tsx mount | — |
| `quiz_completed` | quiz.tsx goToResults | — |
| `search_performed` | discover/index.tsx handleSearch | `{ query }` |
| `apply_tapped` | CardTile.tsx handleApply | `{ card_name, issuer }` |
| `card_added` | add-card.tsx success | `{ mode }` |
| `card_removed` | portfolio/index.tsx mutation success | — |
| `paywall_shown` | PaywallModal visible=true | `{ feature }` |
| `upgrade_tapped` | PaywallModal handleUpgrade | `{ plan }` |

---

## What Is Complete (AI coding work done)

- [x] Full app scaffold + responsive layout
- [x] All 4 visible tabs + all hidden tab routes
- [x] Card discovery: NL search, quiz wizard, scored results
- [x] Vault: add (search + AI URL), remove, benefit list, benefit detail
- [x] Calendar tab
- [x] Concierge UI (shell complete, needs real Edge Function)
- [x] All tools: value calculator, UR/MR calculators, portfolio expander, bonus sequencer, card browser, guides
- [x] Insights: hub + breakeven tracker
- [x] Settings screen
- [x] Auth: login + guest bypass
- [x] CSV fallback for offline/demo
- [x] PostHog analytics wired everywhere
- [x] PaywallModal + feature gates
- [x] Supabase schema + all 4 Edge Functions scaffolded
- [x] README.md
- [x] PROGRESS_TRACKER.md
- [x] GIT_TRACKER.csv (save 1 + 2)

---

## What Is NOT Done (blocked on user action or future agent)

### Blocked on user setup (cannot be done by AI):
1. **Supabase project** — create at supabase.com → fill `.env.local` → run `schema.sql`
2. **Stripe products** — create $6.99/mo + $49/yr products, fill `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. **OpenAI API key** — set in Supabase Edge Function secrets as `OPENAI_API_KEY`
4. **PostHog project** — create at posthog.com, fill `EXPO_PUBLIC_POSTHOG_KEY`
5. **Resend** — create account, fill `RESEND_API_KEY` in Edge Function secrets
6. **EAS Build** — `eas build` for iOS TestFlight + Android internal track
7. **Vercel** — `vercel --prod` for web deployment

### Remaining coding work for next agent:

**High priority:**
- `app/(tabs)/concierge/index.tsx` — wire to a real `ask-concierge` Edge Function (doesn't exist yet). Build the Edge Function in `supabase/functions/ask-concierge/` — it should accept `{ message, conversation_history, user_card_ids? }`, call GPT-4o, and return a response. Pro users get vault-aware context (their cards/benefits injected into system prompt).
- `app/(auth)/callback.tsx` — verify magic link callback handler exists and works. Check route is registered in `app/(auth)/_layout.tsx`.
- `app/(tabs)/insights/index.tsx` — add more insight cards beyond breakeven (e.g., monthly ROI chart using WealthRing, upcoming expirations summary, highest-value unused benefits).

**Medium priority:**
- `scripts/ingest-cards.ts` — verify the CSV → Supabase upsert script works once a real Supabase project exists.
- Push notifications for benefit reminders — `utils/generateReminders.ts` generates the schedule; need to wire to Expo Notifications + a Supabase cron or scheduled Edge Function.
- Dark mode — `lib/theme.ts` has a `dark` object but no theme switching UI.

**Low priority / polish:**
- Onboarding flow — currently users land directly on Discover. A brief 2-3 screen onboarding (what the app does, quiz or search prompt) would improve conversion.
- Card images — `assets/` has no card art yet. Cards show gradient fallbacks which look fine, but real card art improves trust.
- `app/(tabs)/tools/guides/` — guide content is scaffolded but may need real editorial content written.

---

## Git State

Repo: https://github.com/boozinix/UltimateCardScout  
Branch: `main`  
Last commit: `93179dc` — Update GIT_TRACKER with save 2

Saves recorded:
| # | Hash | Summary |
|---|---|---|
| 1 | 4b9bae2 | Initial commit: full UnifiedApp scaffold, phases 0–10 |
| 2 | a31968f | Phase 7–9: add-by-URL, breakeven, full analytics wiring |

---

## Voice & Copy Rules (non-negotiable)

Florid concierge voice everywhere. No dial-down.

| Context | Copy |
|---|---|
| Primary CTAs | "ADD TO VAULT" / "EXECUTE STRATEGY" / "SECURE TO WALLET" |
| Dashboard hero | "Good afternoon, [Name]. $1,847 captured this year." |
| Empty states | "Your vault awaits. Begin with a card." |
| Paywall | "Unlock the full intelligence of your portfolio." |
| Quiz entry | "Let us find your perfect card." |
| Quiz result H1 | "Your recommendation." (Playfair italic) |
| Error states | "Something interrupted your session. Return when ready." |

---

## Known Issues / Gotchas

1. **`npm install` requires `--legacy-peer-deps`** — `lucide-react-native` declares React 18 peer dep but project uses React 19. Always use `npm install --legacy-peer-deps`.
2. **Supabase client throws if URL is empty string** — `.env.local` must have a valid URL format even for placeholder (e.g. `https://placeholder.supabase.co`). Never set it to empty string.
3. **`public/cards.csv` must stay in sync with `data/cards.csv`** — if card data is updated, run `cp data/cards.csv public/cards.csv` before committing.
4. **Tools/Insights/Settings are hidden from tab bar** — they use `options={{ href: null }}` in `_layout.tsx`. Navigate to them only via `router.push()`. Do not add them to NAV_ITEMS.
5. **Desktop sidebar does not highlight active route for nested screens** — `segments[1]` gives the tab segment but nested routes (e.g. `/(tabs)/insights/breakeven`) still show the parent as active. This is acceptable for now.
6. **Concierge is a UI shell** — the chat sends messages but responses are placeholder strings. Do not tell the user it "works" until wired to a real Edge Function.
