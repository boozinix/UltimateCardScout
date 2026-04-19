# Build Agent B8 — Polish & Launch
**Phase:** 9-12
**Duration:** 3-4 weeks
**Depends on:** B7 (automation + deals complete)
**Blocks:** QA5

---

## Read These First

1. `agents/AGENT_MASTER_PLAN.md`
2. `AGENT_HANDOFF.md`
3. `DECISIONS_NEEDED.md`
4. `lib/theme.ts` — light + dark tokens
5. `contexts/ThemeContext.tsx` — existing light/dark architecture
6. All screens in `app/(tabs)/` — you're polishing these

---

## What You're Building

Four phases of polish and launch prep:
1. **Onboarding v2** — "show value first" conversion flow
2. **Desktop layouts** — two-column, hover states, centered modals
3. **Visual polish** — card art, animations, dark mode
4. **App Store submission** — screenshots, metadata, submit

---

## Part 1: Onboarding Refinement (Phase 9, 3-4 days)

Replace the simple 3-screen onboarding (from B1) with the value-first flow:

### Screen 1: "What cards do you have?"
- Multi-select grid of top 20 cards (from catalog)
- Card art thumbnails
- Search bar for finding specific cards
- "I don't have any yet" skip option
- Minimum 0 cards to proceed

### Screen 2: "Here's what you're sitting on."
- Instant value calculation from selected cards' benefits
- Wealth Ring visualization (SVG ring with category segments)
- Big number: "$2,840 / year available"
- Per-card breakdown below ring
- Callouts: "3 benefits expiring this month", "Annual fee due in 47 days"
- This is the "aha moment" — user sees real value before creating account

### Screen 3: Account creation
- Apple Sign In (primary)
- Google Sign In (secondary)
- Email magic link (tertiary)

### Screen 4: Notifications permission
- Explain value: "We'll remind you before benefits expire and fees post."
- Request push notification permission
- "Not now" option

### Screen 5: Pro upsell (conditional)
- Only show if user selected 3+ cards in Screen 1
- "You have $X in annual value to track. Start your 14-day free trial."
- Monthly/annual toggle
- "Continue free" always visible

**Acceptance:** PostHog funnel shows onboarding steps. Target >40% completion.

---

## Part 2: Desktop Layout (Phase 10, 1-1.5 weeks)

Every screen tested in DSK mode via DevToggle.

### Layout changes:
- **Container:** 1200px max-width, 32px padding on desktop
- **Results page:** filter sidebar left (240px) + card list right
- **Vault:** two-column card grid
- **Ledger:** table-style layout (columns: Card, Person, Date, Status, Bonus, Fee)
- **Velocity:** two-column: issuers left, detail right
- **Portfolio:** two-column: programs left, chart right
- **Fee advisor:** two-column: card list left, detail right
- **Spend optimizer:** category grid + results side-by-side
- **Settings:** narrow column centered (600px max)

### PaywallModal
- Mobile: BottomSheet (current)
- Desktop (≥1024px): centered dialog with backdrop
- Same content, different container

### Hover states
- All buttons: slight color shift on hover
- Card tiles: subtle lift shadow on hover
- List items: background highlight on hover
- React Native Web supports `:hover` via Pressable's `style` callback

### Keyboard shortcuts (power user)
- `?` → help overlay showing all shortcuts
- `/` → focus search
- `n` → new application (in ledger)
- `1-4` → switch tabs

---

## Part 3: Visual Polish (Phase 11, 1-1.5 weeks)

### Card Art
- Gradient backgrounds per issuer (already have gradient tokens)
- Card shape: 1.586:1 ratio (standard credit card)
- Issuer logo placeholder (text-based for now)
- Network logo bottom-right (Visa/MC/Amex)
- Create `components/composed/CardArt.tsx` if not already built

### Animations (Reanimated 3 + Moti)
- Tab switch: 150ms ease-out
- Screen push: 250ms slide (iOS default)
- Modal: 250ms spring (gentle)
- Progress bar fill: 400ms spring on value change
- StatCard number: 600ms count-up animation
- Card tilt: 3D perspective on press/hover (CardArt)
- Only animate where motion serves a purpose

### Dark Mode Toggle
- ThemeContext already supports light/dark
- Complete any remaining dark token gaps in `lib/theme.ts`
- Add toggle in Settings: "Appearance" → Light / Dark / System
- Verify all screens render correctly in dark mode
- This is V2 of the theme — don't rebuild, just wire the toggle

### Accessibility Pass
- All interactive elements: `accessibilityLabel`
- Color contrast ≥4.5:1 body text, ≥3:1 large text
- Focus order logical for keyboard navigation
- 44×44pt minimum tap targets
- Form fields: explicit labels (not just placeholders)
- Loading states announced via `accessibilityLiveRegion`

---

## Part 4: App Store Submission (Phase 12, 1 week)

### Pre-submission
- [ ] Remove DevToggle from production builds (verify `__DEV__` gate)
- [ ] All env vars set for production
- [ ] Sentry DSN configured for production
- [ ] PostHog key configured for production
- [ ] Stripe products in live mode (not test)
- [ ] Run full QA5 agent — zero Sev 1/2

### EAS Build
- [ ] `eas build --platform ios --profile production`
- [ ] `eas build --platform android --profile production`
- [ ] `eas submit --platform ios --latest`
- [ ] `eas submit --platform android --latest`

### App Store Metadata
- App name: "CardScout"
- Subtitle: "Credit Card Intelligence"
- Description: Focus on the value prop — replaces spreadsheet, tracks velocity, catches fee deadlines
- Keywords: credit card tracker, churning, 5/24, rewards optimizer
- Screenshots: 6.7" (iPhone 15 Pro Max), 6.1" (iPhone 15), iPad, Android
- Screenshots should show: Velocity Dashboard, Points Portfolio, Spend Optimizer, Fee Advisor

### Privacy
- Privacy policy page on cardscout.app
- Data collection disclosure: email, card data (manually entered), analytics
- No third-party data sharing
- No Plaid / bank credentials

---

## Hard Rules

1. Desktop layouts use the `useBreakpoint()` hook and DevToggle for testing.
2. Animations use theme motion tokens (from `lib/theme.ts`). No raw spring values.
3. Dark mode uses existing `ThemeContext` — don't rebuild the architecture.
4. Do NOT change app functionality in this phase. Polish only.
5. App Store screenshots must show real-looking data, not empty states.
6. DevToggle must NOT be visible in production builds.

---

## When Done

1. Value-first onboarding works with card selection and instant value calculation
2. All screens render correctly in desktop mode
3. PaywallModal is centered dialog on desktop
4. Card art renders per-issuer gradients
5. Key transitions have spring animations
6. Dark mode toggle works in Settings
7. Accessibility pass complete
8. App Store build submitted
9. Update `AGENT_HANDOFF.md` and `PROGRESS_TRACKER.md`
10. Trigger QA5 (pre-launch full regression)
