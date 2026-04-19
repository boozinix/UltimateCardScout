# QA Agent QA5 — Pre-Launch Full Regression
**Runs after:** B8 (all phases complete)
**Severity gate:** Zero Sev 1. Zero Sev 2. App Store submission blocked until clear.

---

## Read These First

1. `agents/AGENT_MASTER_PLAN.md`
2. `AGENT_HANDOFF.md`
3. All QA reports: QA1, QA2, QA3, QA4

---

## What You're Testing

Full regression across every feature. This is the final gate before App Store submission. Test on:
- Mobile browser (localhost:8081)
- Desktop browser (localhost:8081, wide viewport)
- iOS simulator (`npx expo start --ios`)
- DevToggle in MOB and DSK modes

---

## Section 1: Re-Run All Prior QA Flows

Run every flow from QA1 through QA4. Report any regressions (things that passed before but fail now).

Expected: All flows still pass. If any regressed, it's Sev 1 (means a later phase broke an earlier feature).

---

## Section 2: Cross-Feature Integration

### Flow A — Full Churner Journey
1. Fresh install → onboarding (select 3 cards) → see "$X,XXX in annual value" → create account → start trial
2. Set up household (Zubair + Halima)
3. Import CSV with 10 historical applications
4. View velocity dashboard → verify 5/24 counts match
5. Add points balances → view portfolio total
6. Check fee advisor for upcoming fees
7. Use spend optimizer at "Dining"
8. View deal passport

**Expected:** Every step works in sequence. Data flows correctly between features. No crashes.
**Sev 1 if:** Any step crashes or loses data from prior steps.

### Flow B — Free vs Pro Boundary
1. Sign in as free user
2. Verify can: take quiz, browse cards, view basic vault
3. Verify cannot: access velocity, portfolio, fee advisor, spend optimizer (all show paywall)
4. Verify can: view up to 5 application history entries
5. Verify paywall shows on 6th application add attempt
6. Start trial
7. Verify all features now accessible
8. Simulate trial end (if possible)
9. Verify features re-lock

**Expected:** Free/Pro boundary is crisp. No leaks.
**Sev 1 if:** Free user accesses paid feature without payment.
**Sev 1 if:** Paid user can't access paid feature.

### Flow C — Data Persistence After Sign Out
1. Sign in, add applications, add balances
2. Sign out
3. Sign back in
4. Verify all data persists

**Expected:** No data loss.
**Sev 1 if:** Data missing after re-sign-in.

---

## Section 3: Automation & Email

### Flow D — Admin Review Queue
1. Verify admin screen loads at `/admin/proposals`
2. If proposals exist: approve one, reject one
3. Verify approved proposal applies to target table
4. Verify non-admin user gets 403

**Expected:** Admin flow works. Security gate holds.
**Sev 1 if:** Non-admin can access.

### Flow E — Email Forwarding Setup
1. Navigate to Settings → Email Import
2. Verify unique address generated
3. Verify copy button works
4. Verify Gmail filter instructions display

**Expected:** Setup screen functional.
**Sev 2 if:** Address not generated. Copy broken.

---

## Section 4: Desktop Layout

### Flow F — Desktop-Specific Rendering
Test in DSK mode (DevToggle) or wide browser (>1024px):

1. Quiz results: filter sidebar left, card list right
2. Vault: two-column card grid
3. Ledger: table-style layout
4. Velocity: two-column with detail panel
5. Portfolio: two-column with chart area
6. PaywallModal: centered dialog (not bottom sheet)
7. Settings: narrow centered column

**Expected:** Every screen uses the two-column layout on desktop.
**Sev 2 if:** Any screen is still single-column on desktop (stretched mobile layout).
**Sev 3 if:** Layout exists but has alignment issues.

### Flow G — DevToggle Production Gate
1. In production build: verify DevToggle pill button is NOT visible
2. In dev build: verify it IS visible and functional

**Expected:** DevToggle hidden in production.
**Sev 1 if:** DevToggle visible in production.

---

## Section 5: Visual & Accessibility

### Flow H — Dark Mode
1. Settings → Appearance → Dark
2. Navigate through every tab
3. Verify all text readable (no white-on-white, no black-on-black)
4. Verify design tokens applied (not hardcoded colors)
5. Switch to Light → verify everything returns to normal
6. Switch to System → verify follows OS preference

**Expected:** Dark mode renders correctly on all screens.
**Sev 2 if:** Any screen unreadable in dark mode.
**Sev 3 if:** Minor color inconsistencies.

### Flow I — Accessibility Spot Check
1. Enable VoiceOver (macOS: Cmd+F5)
2. Navigate through Discover tab
3. Verify all interactive elements announced
4. Verify form fields have labels
5. Tab through quiz with keyboard only
6. Verify focus order is logical

**Expected:** Navigable with screen reader. Labels present.
**Sev 2 if:** Critical elements not announced (buttons, inputs).
**Sev 3 if:** Minor label issues.

### Flow J — Performance
1. Load app cold (clear cache)
2. Time to interactive: should be <3 seconds
3. Navigate to ledger with 20+ applications
4. Verify renders in <300ms
5. Switch between tabs 10 times rapidly
6. Check memory (dev tools heap): should not grow continuously

**Expected:** Fast load. No memory leaks. Smooth interactions.
**Sev 2 if:** >5 second cold load. Memory grows continuously.
**Sev 3 if:** Jank during animations.

---

## Section 6: App Store Readiness

### Checklist (verify each)
- [ ] App icon renders correctly
- [ ] App name = "CardScout"
- [ ] No placeholder text visible ("Lorem ipsum", "TODO", etc.)
- [ ] No debug UI visible (DevToggle, console logs in UI)
- [ ] No broken images or missing assets
- [ ] Privacy policy link works in Settings
- [ ] Terms link works in Settings
- [ ] Version number displays in Settings
- [ ] Stripe in LIVE mode (not test mode) — or documented that it switches
- [ ] Sentry DSN configured for production
- [ ] PostHog key configured for production
- [ ] No console errors in production build
- [ ] No console warnings that indicate real issues

**Sev 1 if:** Debug UI visible. Placeholder text. Broken links.
**Sev 2 if:** Missing app icon. Wrong version number.

---

## Report Format

```markdown
# QA5 Pre-Launch Report — [Date]

## Overall Verdict
[ ] READY FOR APP STORE SUBMISSION
[ ] NOT READY — [X] Sev 1 and [Y] Sev 2 issues remain

## Regression from Prior QA
- QA1 flows: X/11 pass
- QA2 flows: X/12 pass
- QA3 flows: all unit tests pass? Y/N
- QA4 flows: X/15 pass

## New Flows This QA
- Integration: X/3 pass
- Automation: X/2 pass
- Desktop: X/2 pass
- Visual/A11y: X/3 pass
- Performance: X/1 pass
- App Store checklist: X/13 items clear

## Sev 1 Issues (Block submission)
[...]

## Sev 2 Issues (Block submission)
[...]

## Sev 3 Issues (Ship with known issues)
[...]

## Observations
[...]

## Environment
- Branch: [branch]
- Commit: [hash]
- Platforms tested: web, iOS simulator, Android emulator
- Time: [date + time]
```

---

## Rules

1. Do NOT fix bugs. Report only.
2. This is the FINAL gate. Be thorough. Miss nothing.
3. If overall verdict is "NOT READY", list exactly what must be fixed.
4. If verdict is "READY", explicitly sign off: "QA5 passes. Ready for App Store submission."
