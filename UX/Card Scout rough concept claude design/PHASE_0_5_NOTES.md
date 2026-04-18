# Phase 0.5 — CardScout Digest (from feature/redesign-v4)

**Source:** `boozinix/cc-recommender @ feature/redesign-v4`
**Files read:** `CLAUDE.md`, `package.json`, `REDESIGN_TRACKER.md`, `app/globals.css`, `app/layout.tsx`, `app/` tree
**Status:** CardScout codebase + design intent digested. PerksVault still needed. Screenshots still welcome but no longer blocking.

---

## The headline

**CardScout is already mid-redesign to v4.0.** `REDESIGN_TRACKER.md` is, effectively, a detailed design spec you've already authored. The merged-app design should **align with v4.0**, not deviate from it. This simplifies Phase 1 significantly — I'm not proposing three aesthetic directions anymore; I'm extending one that already exists and is committed.

---

## Tokens lifted verbatim (single source of truth)

### Light mode
- `--bg: #F7F6F3` · warm off-white
- `--surface: #FFFFFF`
- `--surface-raised: #F0EFEB`
- `--text-primary: #1A1917` · near-black
- `--text-secondary: #6B6864`
- `--text-muted: #A09D99`
- `--border: #E4E2DC`
- `--accent: #1B4FD8` · committed blue

### Dark mode
- `--bg: #111318`
- `--surface: #1C2030`
- `--surface-elevated: #232A3C`
- `--text-primary: #ECEAE4`
- `--text-secondary: #9A9896`
- `--border: #303848`
- `--accent: #4F7FFF`

### Mode accents (data-card-mode)
- `personal: #1B4FD8` blue
- `business: #9D8468` warm tan (→ `#C9A227` amber in dark)
- `advanced: #BE185D` magenta

### Shadows
- sm · `0 1px 2px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04)`
- md · `0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04)`
- lg · `0 16px 40px rgba(0,0,0,.12)`

### Radii (from REDESIGN_TRACKER)
- 2px tags · 6px buttons/inputs · 8px cards · 12px hero path cards

### Type
- **Hero H1 only:** Instrument Serif 400
- **Headings:** Manrope 700/800, letter-spacing −0.02em
- **Body:** Inter / Geist Sans, 16–18px, line-height 1.6
- **Numbers / fees / rates:** Geist Mono (`.mono` utility, tabular-nums)

### Motion primitives already present
- `fadeInUp` · 0.52s cubic-bezier(.22,1,.36,1)
- `cardSlideUp` · staggered 70ms per child in results grid
- `sheet-slide-up` · 220ms for bottom sheets
- `shimmerSweep` for skeletons
- Full `prefers-reduced-motion` respect

---

## Design intent from REDESIGN_TRACKER — adopting as-is

- **No gradient backgrounds.** Neutral only.
- **Accent used ONLY for:** primary CTAs, active nav state, key data numbers.
- **Card tile = horizontal list item**, not a box. Inline expand, no modal. No colored pros/cons boxes.
- **Nav:** 3 dropdowns (Find a Card / Tools / Learn) + persistent "Browse All Cards" + theme toggle. Bottom-sheet drawer on mobile.
- **Wizard:** full-screen, one question per viewport, slide transition, no nav chrome.
- **Results:** 256px fixed sidebar + main grid; bottom drawer on mobile.
- **Homepage:** 3-path intent router, trust bar, calculators as data rows (not grids).

---

## What this changes in the Phase 0 plan

1. **§7 (Design system — three directions to explore)** is replaced with: **extend v4.0**. Single aesthetic direction. The funk you wanted still lives in motion, iconography choices, and the cinematic moments — not in picking a type system.
2. **§2 (Naming)** — recommendation strengthens to **keep "Card Scout"** (option E). The brand, URL, visual language, SEO equity, and in-progress redesign all stack. Launching a new name forfeits all of that. We can refresh the wordmark within the Card Scout name.
3. **Phase 1 deliverable** becomes: v4.0 tokens + type + components rendered in a single reviewable HTML, extended with the Expo/mobile-native components (tab bar, scan center action, wallet tile, wealth-ring primitive) that don't exist in the web app yet.

---

---

# PerksVault Digest (from `boozinix/PerksVault@master`)

**Files read:** `design-system/MASTER.md` (33KB, full spec), `lib/theme.ts`, `components/WealthRing.tsx`, `components/CuratorInsightCard.tsx`, `components/PaywallModal.tsx`, `app/(tabs)/index.tsx` (dashboard — mobile + desktop), `ux/stich-1/.../linen_slate/DESIGN.md`.
**Files imported to project:** all 15 HTML mockups under `ux/stich-1/stitch_rewards_tracker_premium_ux/` (8 screens × mobile + desktop variants).

## Concept

**"The Curator"** — editorial luxury. Rejects utility-first density. Quiet, warm, intentional. Playfair Display italic for hero. Warm linen `#FAFAF9` canvas. Gold `#92400E` (amber-brown, NOT bright gold) as single accent. No glass morphism (explicitly killed in MASTER.md, PART I).

**Important caveat:** two design specs coexist in the repo. MASTER.md (dated 2026-04-15, labeled "single source of truth") **wins** over the earlier `ux/.../linen_slate/DESIGN.md` — the latter uses slate-blue primary + Noto Serif + anti-gold rules that contradict the shipped direction. **I follow MASTER.md.**

## Tokens (from `lib/theme.ts` — ship-ready)

### Base neutrals
- `bg: #FAFAF9` · warm linen canvas
- `sidebar: #F2EFE9` · desktop sidebar (deeper linen)
- `surface: #FFFFFF` · all cards
- `border: #E2DDD6` · all dividers
- `text: #1C1917` · near-black
- `muted: #78716C` · labels

### Brand accent
- `gold: #92400E` · CTAs, active nav, ring arc, left-border urgency accents, prices
- `goldBg: #FEF3C7` · curator note, calendar today cell

### Semantic
- urgent `#C2410C` / `#FFF1EE` · expiring ≤7 days
- warn `#B45309` / `#FEF3C7` · expiring 8–30 days
- success `#166534` / `#DCFCE7` · used / completed

### Categories (6) — each with text + bg
travel `#1D4ED8`/`#DBEAFE` · dining `#B45309`/`#FEF3C7` · entertainment `#6D28D9`/`#F3E8FF` · fitness `#166534`/`#DCFCE7` · hotel `#BE123C`/`#FFF1F2` · shopping `#C2410C`/`#FFF7ED`

### Card brand gradients (used for WalletCard + hero card banners)
- amexPlatinum: `#2D2D2D → #5A5A5A → #3A3A3A`
- chaseSapphire: `#0F2B5B → #1D4ED8`
- amexGold: `#92400E → #D97706 → #FCD34D`
- capitalVenture: `#1E293B → #334155`
- default: `#374151 → #6B7280`

### Type
- **Serif (hero, amounts, card titles):** Playfair Display, italic for display
- **Sans (body, labels):** Inter
- Desktop hero: 42–52px italic · Mobile hero: 28–32px italic
- Amount display: 44px mobile / 52px desktop, Playfair bold

### Spacing & radii (4pt grid)
- 4/8/16/24/32/48
- Radii: 8 buttons · 12 chips · 14–16 cards · 16–18 wallet cards · 9999 pills

### Motion
- Press scale 0.97 → spring (stiffness 200, damping 20)
- List stagger 80ms
- Ring chart fill 0→value, 1.2s, cubic-bezier(0.34, 1.56, 0.64, 1)
- Haptics: light tap / success mark used / warning snooze / heavy add card

## Components already built (lift, don't redesign)
- **WealthRing** — multi-segment SVG donut, animated, per-category arc. Already production in `components/WealthRing.tsx`. Reuse as-is.
- **CuratorInsightCard** — dark `#1C1917` card, white italic headline, gold CTA "EXECUTE STRATEGY". Reuse.
- **PaywallModal** — bottom-sheet upgrade flow, gold badge, perks list, Stripe checkout link. This becomes the **free→paid gate** in the merged app.
- **BenefitRow / BenefitChip / CategoryPill / WalletCard / CuratorNote / QuoteBlock** — fully specified in MASTER.md, some already coded.

## Architecture that matters for the merge
- **4 tabs on mobile, same 4 in desktop sidebar:** Portfolio · Benefits · Calendar · Concierge (AI)
- **Dual layout:** `< 768px = mobile, bottom tabs` / `≥ 768px = desktop, 240px sticky sidebar`. Both shipped.
- **Screens covered:** Dashboard, Calendar, My Cards (Portfolio), Add Card (Acquisition), Benefit Detail, plus auth, admin (skippable), card-benefits, card-detail.
- **Signature copywriting:** "ADD TO VAULT" (not "Add Card"), "SECURE TO WALLET" (not "Save"), "EXECUTE STRATEGY", "MEMBER DASHBOARD · Good afternoon, Zubair", "A legacy of refined accumulation" (hero). Voice is deliberately overwrought / concierge. **We need to decide whether the merged app keeps this voice or dials it back by 30%.**

---

# The merge direction — reconciling two design worlds

CardScout v4.0 and PerksVault are **aesthetically incompatible on paper** but **tonally aligned in intent**:

| Dimension | CardScout v4.0 | PerksVault | Merge call |
|---|---|---|---|
| Canvas | `#F7F6F3` cool off-white | `#FAFAF9` warm linen | **Warm linen wins.** `#FAFAF9` is 2 points warmer and lets amber/gold sing. |
| Accent | `#1B4FD8` committed blue | `#92400E` amber gold | **Split: blue for personal/acquisition flows, gold for ownership/curation.** See reveal pattern. |
| Display type | Instrument Serif 400 (hero only) | Playfair Display italic (liberal use) | **Playfair wins everywhere.** Instrument Serif is a near-cousin; Playfair is more versatile with its italic. Italic reserved for hero only. |
| Body type | Manrope / Inter / Geist | Inter | **Inter.** Drop Manrope and Geist. |
| Numbers | Geist Mono (tabular) | Playfair bold | **Playfair bold for display amounts, Geist Mono for dense data tables (fee, APR).** Best of both. |
| Card radius | 8px | 14–16px | **12px compromise.** Soft but not pillowy. Wallet cards stay at 16px. |
| Card tile style | Horizontal list item, inline expand, no box | Surface card with border, rounded | **Context-dependent.** Discovery results = list item (Scout mode). Owned wallet = gradient card (Vault mode). This IS the reveal pattern. |
| Emoji/icon | Lucide, line style | Ionicons, line style | **Lucide.** CardScout already on it, mono style matches. |

## The reveal pattern — simplified after screenshots + user correction

**No dual-mode aesthetic.** User pushed back correctly: the "mode toggle" in the current app is just their viewport switcher, not a product concept. Abandoning Scout/Vault as visual modes.

**Instead — one unified visual system, functional gating:**
- **One signed-in app, one aesthetic, modal upgrade.** (B from the Phase 0 plan.)
- **Blue `#1B4FD8` is the sole brand accent** across everything. Gold `#92400E` retires to a semantic "captured value / ownership / success stamp" role — used in the portfolio wealth ring, "$X captured this year" displays, and the Vault lock glyph. Not a page-level accent.
- **Vault tab is visible to everyone** with a small lock glyph for free users. Tapping opens the existing `PaywallModal`. No separate Scout/Vault chrome.
- **Three delivery surfaces, one design system:** desktop web (≥1024px sidebar layout), mobile web (<1024px bottom-sheet drawers), mobile app (native bottom tabs via Expo). Same tokens, same type, same components — React + Next on web, React Native + NativeWind on mobile app.

## Voice — simplified

PerksVault's florid concierge voice ("refined accumulation", "EXECUTE STRATEGY", "SECURE TO WALLET") is retired from chrome and navigation. CardScout's clean utility voice wins across the app. The florid voice survives in **one allowed location per screen** — a pull-quote block or an AI concierge response — as personality texture, not as UI copy. This matches what `REDESIGN_TRACKER.md` already implies.

## Observations pulled from the screenshots — these become Phase 1 fixes

Ranked by severity. Screenshots are the primary source; details below feed directly into Phase 1 decisions.

### S1 · Dark mode is three different darks
Homepage dark ≈ slate-blue `#0E1320`, Tax guide ≈ pure near-black, wizard result ≈ blue-tinted `#13182A`. REDESIGN_TRACKER specified `#111318` — it isn't appearing. **Fix:** adopt `#111318` everywhere; retire the others.

### S2 · Emoji in production UI ships today
Card Finder wizard items: 💰 Cashback · ✈️ Travel rewards · 🎁 Signup bonus · 🧾 Everyday spending. Signup Bonus Planner: same. **Fix:** Lucide icon swap. Single biggest perceived-quality lift available.

### S3 · Dark-mode hero second line low-contrast
"We'll find your best card" in `#1B4FD8` on `#0E1320` fails WCAG AA. **Fix:** lift blue to `#4F7FFF` (the dark-mode accent already specified in globals.css) or tint the italic.

### S4 · Category/issuer left-border accents are semantically confused
Chase = blue, Venture X = red, Amex Gold = green, Discover = orange. Reads as per-card color but isn't a system. **Fix:** left-border encodes **rank/urgency**: top recommendation = blue, runner-up = neutral, expired/warning = red. Issuer color moves into the card artwork itself, not the accent.

### S5 · Results page is still 3-column (old pattern), not list-item (v4.0 spec)
`REDESIGN_TRACKER.md` committed to list-item-with-inline-expand. Current ships 3 side-by-side product cards with "Apply Now" CTAs all visible — feels ad-like and buries the recommendation. **Fix:** migrate to list. One top match expanded, 2 collapsed rows below, Show More.

### S6 · Instrument Serif is inconsistent across screens
Homepage hero uses it; Tax Payments guide H1 uses Manrope bold; Card Planner "Which of these sounds like you?" uses Manrope bold. **Decision needed:** Serif on all H1s, or only on marketing/home hero? My vote — **all H1s on key surfaces** (Home, wizard results, Vault dashboard hero, benefit detail amount). Learn/guide H1s stay Manrope (editorial voice matches sans better for long-form).

### S7 · Calculator's gold accent IS PerksVault gold
The Airport Lounges heading on the Premium Card Calculator uses a brown-gold identical to PerksVault's `#92400E`. The two apps are already borrowing from each other. This confirms gold's semantic role ("earned value") is already latent in CardScout — we just formalize it.

---

## What this means for Phase 1

The Phase 1 deliverable is now:
1. **One merged design system reference HTML** (not two-mode) showing tokens + type + components + three-surface renders (desktop, mobile web, mobile app frame).
2. **A "screenshot remediation" addendum** — the 7 issues above, each with a before/after crop + token change. This becomes your ordered fix list for the existing CardScout repo.
3. **The three new Vault-adjacent surfaces** not yet in CardScout: Vault dashboard (with WealthRing), Calendar, Benefit Detail. Rendered in the unified (blue-primary) system, not PerksVault gold.

Still open:
- Decision on S6 (Serif on all H1s or hero-only).
- Decision on S5 migration timing (now, or keep 3-column for launch and defer).
- Card artwork: confirmed usable per prior turn, proceeding.

## Navigation — merged

Bottom tabs (mobile) / sidebar (desktop), 4 slots:
1. **Discover** — Scout territory. Wizard, browse all cards, comparisons, calculators.
2. **Vault** — PerksVault territory. Wallet, portfolio health ring, expiring soon. **Gated for free users.**
3. **Calendar** — PerksVault territory. Gated.
4. **Concierge** — AI chat. Available to all, but free tier gets Scout questions (recommendations, explain this fee), paid tier adds Vault questions (which of my cards should I use here, when does my credit reset).

**No separate "Learn" or "Tools" tabs** — those collapse under Discover.

## Copywriting voice — decision needed

PerksVault voice is intentionally florid ("refined accumulation", "EXECUTE STRATEGY", "SECURE TO WALLET"). CardScout voice reads as clean-utility.

**Recommendation:** keep florid voice in **Vault mode only** as a signal of the paid experience. Scout mode uses CardScout's existing clean voice. Same dual-personality principle as the accent color. This gives Vault the "you've arrived" feeling that justifies the paywall.

**Needs your call:** are you OK with this split, or do you want one unified voice? If unified, I'd dial Vault down ~30% (keep "Vault" / "Wallet" / "Execute" but ditch "refined accumulation" as hero).

---

# Phase 1 — unblocked

**Deliverable:** a single HTML file — **the merged design system reference** — showing side-by-side:
1. Token palette (neutrals, accents both modes, category colors, card gradients)
2. Type scale (Playfair hero/display, Inter body, Geist Mono numeric)
3. Core components rendered twice — once in Scout blue, once in Vault gold — so you can see the mode switch at the component level
4. Navigation shell: mobile bottom tabs + desktop sidebar, both mode variants
5. One full hero screen per mode: Discover home (Scout) and Portfolio dashboard (Vault)
6. The upgrade paywall (bridges modes)

**Still outstanding for later phases (not blocking Phase 1):**
- CardScout screenshots to gut-check the v4.0 rendered output
- Final copywriting voice call (split vs unified)
- Subscription pricing + Stripe/RevenueCat decision
- Whether the admin surface carries over (probably "no, strip it")

