# Phase 0 — Unified Card Platform Plan

**Status:** Draft v1 · Apr 17, 2026
**Author:** Design (Claude) for review by product owner
**Working title of project:** Card Scout New
**Scope of this document:** The complete plan before any pixels. Read end to end, mark it up, push back on anything you disagree with. Nothing is built until you sign off on at least the first four sections.

---

## 0. How to read this document

There are **thirteen sections**. Sections 1–4 are decisions I need from you. Sections 5–10 are the substantive plan (design system, screens, flows, motion, tweaks, deliverables). Sections 11–13 are logistics (what I need from you, phasing, and risks).

If you only have ten minutes, read §1, §2, §4, and §11.

---

## 1. The product thesis, in one paragraph

This is a credit card operating system. Free users come in to **discover** — quiz, database, calculator, guides — and leave knowing which card to get. Paid users stay to **optimize** — wallet, wealth ring, benefits calendar, reminders, ROI, retention scripts — and compound the value over years. The whole point of merging CardScout and PerksVault into one app is that **discovery and optimization are the same job on different timescales**, and a user who did the first will, eventually, want the second. The design has to make that continuity feel inevitable, not bolted together.

The single biggest failure mode — the one you named — is *"a search engine and a reminder app mushed together."* Every decision in this plan is in service of avoiding that.

---

## 2. Naming — decide now

You said "TBD, propose a wordmark." Here are five directions, each carrying a different product personality. Pick one (or reject all five, we'll do another round).

| # | Name | Sound | Personality | Why it might work |
|---|---|---|---|---|
| **A** | **Sterling** | STUR-ling | Premium, material, old-money British | Evokes silver, value, craft. Pairs well with the card-as-physical-object direction. Dictionary word so SEO is hard but brand is distinctive. |
| **B** | **Vantage** | VAN-tij | Strategic, advisory, sharp | Leans into the optimization angle. "Your cards, from a better vantage." Works for both free (see clearly) and paid (gain an edge). |
| **C** | **Ledger** | LED-jer | Bookkeeping, deliberate, honest | Quietly confident. Feels like it'd build trust with users wary of "AI fintech." Unambiguously about money without being gauche. |
| **D** | **Rook** | rʊk | Witty, strategic (chess piece), short | Playful but not childish. A rook protects and advances. Good for funk. Great for a wordmark — four letters. |
| **E** | **Card Scout** (keep) | — | Inherits existing brand equity | Boring answer but defensible. The URL, SEO, and any existing audience carry over. The merged product becomes "CardScout with a paid tier" rather than a new thing to launch. |

**My recommendation:** **D — Rook** for a new launch, **E — Card Scout** if the existing audience is meaningful. If you pick Rook, the wordmark sketch direction: lowercase geometric sans, the two O's slightly overlapped like concentric discs, evoking the Wealth Ring. If Card Scout, we refresh the wordmark from whatever it is today.

**→ Action: pick one (or say "propose five more") before I start Phase 1.**

---

## 3. The free/paid reveal pattern — decide now

You said "not sure." The three patterns:

### Pattern A — Always visible, always teased
Every tab, every feature, is in the nav from minute one. Paid items have a subtle lock glyph. The user can tap them to see a preview + upsell.

- **Pro:** Clearest value prop upfront. Power users who want the paid tier convert on day one.
- **Con:** Overwhelming. Free users feel like they're in a demo. "Locked" everywhere can read as hostile.

### Pattern B — Earned reveal
Paid features appear only after the user takes a committing action (adds their first card, finishes the quiz, etc.). The product grows with them.

- **Pro:** Feels respectful. Each reveal is a small reward. Great for trust.
- **Con:** New users don't understand the full product until they engage. Risk of them leaving before seeing paid value.

### Pattern C — Moment-of-intent
The paid tier is invisible in nav until a contextual moment makes it relevant. "You just added your Sapphire Reserve — track $1,400/yr in benefits →." The upsell is always tied to a specific user action.

- **Pro:** Most narrative, most integrated. Nothing feels like an ad.
- **Con:** Discoverability is weakest. Users who want to self-explore the paid tier can't.

### My recommendation — hybrid B + C, never A

- **Day one (pre-any-action):** Paid features are **not in the main nav**. The nav has: Explore · Wallet · Guides · Profile. Nothing is locked-looking. The app feels complete and free.
- **Post-first-action:** Wallet sprouts. Once a user adds their first card, the Wallet tab gains a sub-section ("Tracking") that's visibly richer, with a handful of features in a locked-preview state. This is the earned reveal.
- **Moment of intent:** At specific trigger points (finished quiz, added a card, hit a benefit expiration date they forgot), a full-screen contextual upsell fires — the cinematic "feature showcase" from your answers.

This keeps the app feeling generous while making paid features impossible to miss for engaged users.

**→ Action: approve, redirect, or ask for alternatives.**

---

## 4. The CardScout codebase / assets — blocker for Phase 1

I cannot start Phase 1 (design system) without seeing CardScout's actual visual language. You said the site's design is "amazing" and we should anchor to it. Two asks:

1. **Import the CardScout repo via the Import menu → GitHub** (or paste the repo URL in chat and I'll pull it). I need:
   - Color token files (theme.ts, tokens.css, tailwind.config, _variables.scss, wherever they live)
   - Type scale / font imports
   - Component code for: card tile, button, quiz flow, result screen, database row, calculator
   - Any SVG / illustration / icon assets
   - Logo files
2. **Import the PerksVault Expo repo** the same way. I need:
   - Any divergent tokens (if its language differs from CardScout)
   - The wallet, ring, calendar, and benefits components if built
   - Anything you want preserved
3. **Screenshots** of CardScout in light + dark, mobile + desktop. Ideal set: landing, quiz, quiz result, database list, card detail, calculator, guides. Drop them in chat.
4. **Card artwork decision** — if you own rights to any issuer card tile imagery, share it. Otherwise I'll design placeholder tiles that match the system (Chase Sapphire Reserve in the right slot, styled, but with our own artwork, labeled as placeholder — production swaps in licensed imagery). I will not hand-recreate real issuer card designs.

**Until items 1–3 land, Phase 1 is blocked.** I can draft Phase 0 (this document), propose names, and sketch the motion and information architecture in the meantime.

---

## 5. Information architecture

### The six surfaces

Everything in both products maps to one of six surfaces:

| # | Surface | Purpose | Free | Paid | Origin |
|---|---|---|---|---|---|
| **1** | **Explore** | Find the right next card | ✓ all | ✓ all | CardScout |
| **2** | **Wallet** | See what I own | ✓ basic list | ✓ full tracking | PerksVault |
| **3** | **Activity** | Time-based: what's happening with my cards now | — | ✓ | PerksVault |
| **4** | **Ring** | Holistic value view | — | ✓ | PerksVault |
| **5** | **Guides & Tools** | Reference material + calculators | ✓ all | ✓ all + saved states | CardScout |
| **6** | **Profile** | Auth, settings, subscription | ✓ | ✓ | Both |

### Why this structure works

- **Explore and Guides & Tools are free, full-fat.** No locks, no degraded experience. A free user who never pays gets a complete product — that's what makes the "search engine" part of CardScout stand alone with dignity.
- **Wallet is the seam.** Adding a card is the gateway action. A free Wallet is a list of cards you own. A paid Wallet has benefit tracking, expiration reminders, value calculations. Same surface, deepens with payment.
- **Activity and Ring are paid-only surfaces, but they don't appear in nav for day-one users.** They light up after the first card is added (see §3).
- **Profile carries subscription state.** Not novel, but worth stating: the subscription isn't in a separate "Premium" tab; it's in Profile like any normal setting.

### Mobile nav (bottom tabs + center action)

Five slots. Center slot is the prominent action from your answer.

```
[ Explore ]  [ Wallet ]  [ + SCAN ]  [ Activity ]  [ Profile ]
                              ↑
                    Center button: "Scan a card"
                    (opens AI extraction flow)
```

- **Pre-first-card state:** Activity tab shows a tastefully empty state ("Add a card to see your activity"). Not locked, just empty — which is truthful, not hostile.
- **Center SCAN button:** This is the hero action. It fires the cinematic AI extraction. It's free to *try* — any user can scan a card to see its benefits extracted (a genuine wow moment). What's gated is *saving* the extracted card to a tracked portfolio. The scan itself is the demo.

This choice — letting anyone scan, gating the save — is a bet: the cinematic extraction is too good to hide behind a paywall. It should be the feature that sells the paid tier, not the feature the paid tier unlocks.

**Ring lives inside Wallet as a view toggle, not as its own tab.** Wallet has three views: List · Ring · Cards-spread. This keeps the nav at five clean slots instead of six cluttered ones.

**Guides & Tools lives inside Explore** as a secondary section. Explore top-level has Quiz, Database, and Guides as segmented sections.

### Web nav

Web gets a **left sidebar**, collapsible, with the same six surfaces + sub-items visible as a tree. The sidebar can be collapsed to icons-only for density.

```
◉ Card Scout [or final name]
├─ ◎ Explore
│   ├─ Quiz
│   ├─ Database
│   └─ Guides & Tools
├─ ◎ Wallet
│   ├─ List
│   ├─ Ring
│   └─ Benefits
├─ ◎ Activity
├─ ◎ Profile
└─ [Upgrade]  (if on free tier)
```

The sidebar's collapsed state is tiny icons; expanded, it shows the tree. Web does not get a bottom nav.

### Interleaving discovery and tracking

Per your "one product" mandate, the surfaces do not silo:

- Quiz result page has an "Add to Wallet" CTA inline — bridge to tracking.
- Card detail page (same component whether reached from Database or Wallet) shows discovery data (fees, bonus, review score) + tracking data (your usage, benefits redeemed) if you own it.
- Wealth Ring surface has a "boost this ring" empty state: the Dining slice is thin → suggests dining cards from the Database, filtered.
- Calculator in Guides can be seeded from a card you own (one click) or used anonymously.
- Benefits Calendar surfaces upcoming expirations that link back to the Database if you haven't redeemed the benefit and need a reminder of what it is.

This is the thing that makes it feel like one product.

---

## 6. The full screen inventory (all ~30)

Organized by surface. Each row: screen name · mobile/web/both · state notes · free/paid · priority for design pass.

### Landing & Onboarding (pre-auth)
| Screen | Platforms | States | Tier | Priority |
|---|---|---|---|---|
| Marketing landing | Web (mobile-responsive) | Hero, features, pricing, footer | Public | **Hero** |
| Sign up | Both | Clerk magic link input, email-sent confirm, magic-link landing | Public | **Hero** |
| Log in | Both | Same as sign up | Public | Standard |
| Welcome / intro | Both | 3-step intro carousel with skip | Both | Standard |

### Explore surface (CardScout DNA, all free)
| Screen | Platforms | States | Tier | Priority |
|---|---|---|---|---|
| Explore home | Both | Quiz entry, Database entry, Guides entry, "for you" shelf | Free | **Hero** |
| Quiz — conversational | Both | Question stream (chat bubbles), typing indicators, progress bar at top | Free | **Hero** |
| Quiz result | Both | 1 hero card, 2 alt cards, reasoning per card, "add to wallet" CTA, "browse all matches" | Free | **Hero** |
| Database — list | Both | Filter chips, sort, infinite scroll list, empty-filter state | Free | Standard |
| Database — filters sheet | Mobile primary | Annual fee, category bonuses, issuer, features | Free | Standard |
| Card detail | Both | Hero tile, key stats, benefits accordion, calculator link, review score, similar cards, "add to wallet" or "you own this" | Both | **Hero** |
| Calculator | Both | Spend inputs by category, output: estimated annual value per card, compare up to 3 cards | Free | Standard |
| Valuator (what's my card worth) | Both | Pick a card you own/target → current points value → cash/transfer/travel modes | Free | Standard |
| Expander | Both | Pick a card → shows the ecosystem (related cards for maximum strategy) | Free | Standard |
| Guides index | Both | List of long-form guides, category filter, search | Free | Standard |
| Guide detail | Both | Article layout, table of contents, inline card tiles, related guides | Free | Standard |
| Sequencer | Both | Signup bonus planner: card queue ordered by open date, spend requirement per card, timeline view | Free | Standard |

### Wallet surface (seam between free and paid)
| Screen | Platforms | States | Tier | Priority |
|---|---|---|---|---|
| Wallet — empty | Both | "No cards yet" CTA to add | Free | Standard |
| Wallet — list view | Both | Card tile list, badges for tracked benefits, sort/filter | Free | **Hero** |
| Wallet — spread/cards view | Both | Cards laid out with depth, tappable | Free | **Hero** |
| Wallet — Ring view | Both | Radial/bar/grid value visualization, slice interaction | Paid | **Hero** |
| Add card — scan (cinematic) | Both | Camera/upload → reading → extracting → value assigned | Both (try free, save paid after limit) | **Hero** |
| Add card — manual | Both | Search + select from Database, confirm | Both | Standard |
| Card detail (wallet variant) | Both | Same component as Explore's, with usage data overlaid | Both | Standard |

### Activity surface (paid)
| Screen | Platforms | States | Tier | Priority |
|---|---|---|---|---|
| Benefits Calendar | Both | Month grid, upcoming/used/expired pills, tap into benefit | Paid | **Hero** |
| Benefit detail | Both | What it is, how to redeem, timer, mark-as-redeemed, notes | Paid | Standard |
| Reminders | Both | Card fee due dates, bonus deadlines, benefit expirations | Paid | Standard |
| ROI dashboard | Both | Paid fees vs value extracted, per card and total | Paid | Standard |
| Breakeven tracker | Both | Progress bars per card: "$450 paid / $820 extracted — breakeven at 55%" | Paid | Standard |
| Retention script | Both | Pick card → generates call script with branching rep responses | Paid | Standard |

### Upsell, Profile, System
| Screen | Platforms | States | Tier | Priority |
|---|---|---|---|---|
| Upsell — feature showcase | Both | 4 feature scenes, cinematic transitions, CTA at end | Free → Paid | **Hero** |
| Trial activation | Both | Confirm trial, set reminder for renewal, enter Wallet | Free → Paid | Standard |
| Profile / settings | Both | Account, subscription, notifications, export, delete | Both | Standard |
| Subscription management | Both | Plan, price, next bill, cancel, billing history | Paid | Standard |
| Notifications center | Both | Read/unread, filter, settings | Both | Standard |
| Empty states (category) | Both | One pattern repeated — friendly, iconographic, single CTA | Both | Standard |
| Error states (category) | Both | 404, network, permission, auth expiry | Both | Standard |

**Hero screens** (11): Landing, Signup, Explore home, Quiz, Quiz result, Card detail, Wallet list, Wallet Ring, Add card scan (cinematic), Upsell showcase, Benefits Calendar. These are the clickable prototype for Phase 2. Everything else is canvas in Phase 3.

---

## 7. Design system — principles (tokens come in Phase 1 from CardScout source)

### Aesthetic directions — three to explore

Since you said "explore a few," I'll mock the design system in three distinct moods. You pick one in Phase 1 and we commit.

**Direction 1 — Plate** · serif/mono pairing
A nod to editorial finance publications (Monocle, Bloomberg Businessweek) made digital. Serif display (something like Tiempos or a modern didone), mono for numbers, generous whitespace contradicted by dense data tables. Card tiles sit on a warm off-white like prints on a page. Dark mode is deep ink, not black.

**Direction 2 — Precinct** · geometric + functional
Single confident geometric sans (think GT America or National 2), monospace for data, cool neutral palette with a single saturated accent. Feels like a professional instrument. Closer to Linear/Things aesthetic, applied to money. Dense but not cluttered.

**Direction 3 — Heirloom** · warm + material
Warm neutrals (bone, cream, ink, a burnished gold accent), grotesque sans with subtle character (think ABC Diatype or Söhne), card tiles rendered with real shadow and depth. Feels premium without being cold. Some funk in iconography and micro-interactions — the bit you wanted.

Each direction produces: type scale, color ramp (light + dark), spacing scale, radius scale, elevation scale, motion curves, card tile style, icon style, and button/input/sheet/modal components. All three get mocked side-by-side in Phase 1 on one HTML page.

### What's constant across all three directions

Regardless of which direction we pick:

- **Density:** Sized to your "60" answer. Type scale starts at 13px body (tight but readable), headings max 48px on mobile / 72px web. Line heights 1.35–1.45.
- **Both light and dark.** Designed in parallel, with real attention to dark mode (not inverted).
- **Iconography only** — no illustration beyond icons and card art.
- **Real card tiles with real logos** — photographic feel, via your asset import.
- **Iconography:** my call per your answer — I'm picking a **custom set at 1.5px stroke with filled accent states**. Not a generic Lucide install. Drawn per-category so Dining, Travel, Groceries etc. feel distinct. This is where some funk lives.
- **Motion:** 100. Details in §8.
- **Cross-platform parity.** Every component designs once and reflows between mobile and web. No mobile-only visual tricks that break on web, no web-only hover states that leave mobile behind.

### Component inventory (Phase 1 output)

- Typography ramp (display, title, body, caption, mono)
- Color tokens (bg, surface, surface-elevated, text-primary, text-secondary, accent, state colors, card-category colors)
- Spacing + radius + elevation scales
- Button (primary, secondary, ghost, destructive, icon-only)
- Input (text, search, email, pin)
- Select / dropdown
- Card tile (the hero component)
- List row (card in wallet, guide in list, benefit in calendar)
- Tab bar (mobile)
- Sidebar (web)
- Sheet / bottom sheet (mobile)
- Modal / dialog (web + mobile)
- Toast
- Segmented control
- Pill / chip
- Icon set (core 40-ish)
- Empty state pattern
- Loading state pattern (shimmer + skeleton)
- Ring / visualization primitive (three variants)
- Lock indicator (subtle glyph for paid-feature teasers)

---

## 8. Motion — principle document

You said 100. Cinematic. That's a promise we have to keep across 30 screens, not blow on one.

### Motion principles

1. **Every transition has choreography.** No cuts. Elements travel, stage elements stagger, outgoing content steps aside rather than disappearing.
2. **Physics, not ease-in-out.** Spring curves (Reanimated 3 / CSS `linear()` timing functions) across the board. Default spring: stiffness ~200, damping ~22.
3. **Shared element transitions** are the backbone. Card tile in Wallet → tap → it lifts and expands into the Detail view. Same tile, scaled. This is the "one product" thing made visual.
4. **Cinematic moments are reserved.** Three only: (a) AI card scan, (b) Upsell feature showcase, (c) Quiz result reveal. Reserving these means they hit. Everywhere else: fast, snappy, respectful of time.
5. **Reduced motion is real.** All cinematic motion has a reduced-motion fallback. Not just "disable," but redesigned — the card scan becomes a quick fade-through-stages with text labels.

### The three cinematic moments in detail

**(a) AI Card Scan / Extraction**
Sequence:
1. User taps center SCAN button → camera opens, but we show a styled placeholder if uploading image, with card-shaped viewfinder.
2. Captured → the card image settles into the center of the screen on a dark backdrop.
3. "Reading card" — a scan line sweeps top to bottom, card details fade in below (name, issuer, last 4 if visible).
4. "Finding benefits" — the card flips to reveal the back; a list of benefits emerges one by one with a typed-in feel (not a terminal log, more like letterpress coming in).
5. "Valuing benefits" — each benefit gets a dollar value animated next to it, counting up.
6. The card flips back to front. Total annual value is stamped on it.
7. CTA: "Add to Wallet."

~8–12 seconds. Skippable after 2 seconds for second-time users. Reduced-motion version: three distinct labeled stages, fade between.

**(b) Upsell Feature Showcase**
Four full-screen scenes, one per paid feature, auto-advancing with manual swipe. Each scene:
- Full-bleed imagery of the feature in use (using the user's actual data where possible — their card in the ring, their benefit in the calendar).
- A single headline.
- A detail line in smaller type.
- Progress dots at top.
Transitions between scenes: the UI elements travel. The Wealth Ring slices spin down into the next scene's Calendar grid. This is the most story-like motion in the product.

Four features to showcase (ranked by "wow"):
1. **Benefits Calendar** — "Never miss $1,400/yr."
2. **Wealth Ring** — "See what every card really earns."
3. **Auto-extraction** — "Add a card in 4 seconds." (even though they may have just done this)
4. **Retention scripts** — "Keep your card — keep the perks."

Final CTA scene: "Start 14-day trial" + "Skip for now."

**(c) Quiz Result Reveal**
After the last answer:
- Chat interface stays visible, a "thinking" state with three animated dots.
- Then the chat view recedes — scale down, pushed to the background with a blur.
- A card tile rises from the bottom of the screen, rotates to face the user, settles into hero position.
- Reasoning bullets fade in below.
- Two alt cards slide in from the sides, smaller.
- CTA: "Add this to my Wallet" + "Browse all matches."

### Everywhere else

- Page transitions: lateral slide on mobile; fade+shift on web.
- List items: stagger entry (50ms between).
- Buttons: scale-press (0.97) + haptic on mobile.
- Sheets: spring from bottom.
- Modals: fade backdrop + spring card.
- Loading: shimmer sweep at 1.8s loop.

---

## 9. Tweaks catalog — for Phase 2 prototype

You want lots. Here's what I'm planning to expose in the Tweaks panel on the clickable prototype:

### Visual
- **Aesthetic direction** — Plate / Precinct / Heirloom (switches tokens, type, icon set)
- **Mode** — Light / Dark
- **Accent color** — 5 presets per direction
- **Density** — Tight / Default / Roomy

### Wealth Ring
- **Ring style** — Ring / Constellation / Bar Garden / Grid
- **Ring metric** — Annual value / Usage / Breakeven progress

### Card tile
- **Tile style** — Photographic / Editorial flat / Data-forward row
- **Tile size** — Compact / Standard / Showcase

### Nav
- **Mobile center action** — Scan / Quick menu / Add
- **Web sidebar** — Expanded / Icons-only

### Content / state
- **User tier** — Free / Trial / Paid (toggles what's visible throughout)
- **Wallet fullness** — Empty / 1 card / 5 cards / 12 cards (tests density)
- **Reveal pattern** — B (earned) / C (moment-of-intent) / Hybrid — so you can feel §3 in practice

### Motion
- **Motion level** — Full / Reduced / Off (respects the promise in §8)

~16 toggles total. All in a bottom-right panel, titled "Tweaks."

---

## 10. Cross-platform strategy

You said identical design language, one codebase (Expo + web). Here's how that holds up in practice:

- **Tokens are single source of truth.** Colors, type, spacing, radius, elevation all live in one tokens file imported by both RN and web.
- **Components are designed twice and implemented once.** For each component I'll mock the mobile and web version side-by-side in Phase 1 so you can see the reflow. But in code, it's one `<Button>`, one `<CardTile>`, branching only on layout props.
- **Layout is the only thing that truly diverges.** Nav (bottom tabs mobile, sidebar web), list density (touch-optimized mobile, mouse-optimized web), modal behavior (sheets mobile, centered modals web). Everything else is identical.
- **Cinematic motion ports to Reanimated 3.** All the motion described in §8 uses primitives that exist on both native and web. No CSS-only tricks.
- **Web gets hover states mobile can't have.** Not a contradiction — hovers are progressive enhancement, not a different design.

---

## 11. What I need from you — the dependencies

Before Phase 1 can start:

| # | I need | How to deliver | Blocks |
|---|---|---|---|
| 1 | CardScout codebase | Import menu → GitHub, or paste repo URL | Phase 1 (design system) |
| 2 | PerksVault codebase | Import menu → GitHub | Phase 1 |
| 3 | CardScout screenshots (light+dark, mobile+desktop, ~7 screens) | Drag into chat | Phase 1 |
| 4 | Name decision (§2) | Reply | Phase 1 wordmark |
| 5 | Reveal pattern decision (§3) | Reply | Phase 2 prototype |
| 6 | Card artwork rights call | Reply | Phase 1 card tile |
| 7 | Sign-off on this doc | Reply with edits | Everything |

If you can deliver 1 and 3 today, we can start Phase 1 tomorrow.

---

## 12. Phasing and estimates

| Phase | What lands | Deliverable | My time |
|---|---|---|---|
| **0** (now) | This plan | `PHASE_0_PLAN.md` | 1 pass |
| **0.5** | I digest CardScout + PerksVault code | Short notes file | 1 pass after you import |
| **1** | Design system in 3 directions, both light/dark, mobile + web | `design-system.html` showing all three side by side | 1 long pass |
| **1.5** | You pick one direction, name is decided, wordmark drafted | `brand.html` | 1 pass |
| **2** | Hero prototype: 11 screens, clickable, Tweaks live, both platforms | `prototype.html` | 1 long pass |
| **3** | Remaining ~19 screens on a design canvas, same system | `canvas.html` | 1 long pass |
| **4** | Iteration based on your notes | Revised files | Ongoing |

Total to Phase 3 complete: roughly five working sessions with you in between for review.

---

## 13. Risks and open questions

1. **CardScout's visual language may not carry to 30 screens.** The site is (presumably) a marketing + research surface. A full app has empty states, transitions, wallet UI, calendar UI, notification UI that probably don't exist on the site yet. I will extend the language — that's unavoidable. The risk is my extensions not feeling like CardScout. Mitigation: Phase 1 extends a few components you can gut-check before I commit.
2. **Motion at 100 is a promise to keep on real devices.** Reanimated 3 is fast, but 60fps on web with heavy shared-element transitions on low-end Android is a real engineering cost. The prototype will demonstrate the motion; production performance is an engineering problem we'll note but not solve in design.
3. **Card artwork is the IP landmine.** Spelled out in §4. Need a decision.
4. **"Conversational quiz" can feel gimmicky** if done lazily — chat bubbles with canned responses. Mitigation: the quiz is short (3–5 questions), each question animates in thoughtfully, and the result is cinematic enough that the chat form feels earned. If it doesn't land, we revert to Typeform-style in Phase 2 iteration.
5. **Retention script is the weirdest feature.** I'm designing it as a **teleprompter view with branching** — you see the line to read, hit a button for how the rep responded, next line appears. This feels like a tool a power user would actually use on a phone call. If you wanted a simple copy-paste, tell me now.
6. **The free tier is genuinely valuable.** That's the point. The risk is it's *so* valuable no one converts. Mitigation is §3 — paid features appear at exactly the moments they'd be useful, with cinematic framing. But ultimately this is a pricing/positioning question, not a design one.

---

## 14. TL;DR — the six things you need to do after reading

1. Pick a name (§2) — or say "propose five more."
2. Approve/redirect the reveal pattern (§3).
3. Import CardScout repo + screenshots (§11).
4. Import PerksVault repo (§11).
5. Make the card artwork rights call (§4).
6. Sign off on this plan, or mark it up.

Then we're off to Phase 1.
