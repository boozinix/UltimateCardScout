# QA5 Pre-Launch Report — 2026-04-19

## Overall Verdict
- [ ] READY FOR APP STORE SUBMISSION
- [x] NOT READY — 1 Sev 1 and 5 Sev 2 issues remain

## Regression from Prior QA
- QA1 flows: **PASS** — Auth (Apple/Google/magic link), Stripe ($8/mo), tab navigation all intact
- QA2 flows: **PASS** — Ledger CRUD, CSV import, household setup, empty states all intact
- QA3 flows: All unit tests pass? **YES** — 133/133 passing
- QA4 flows: **PASS** — Spend tracker, portfolio, fee advisor, spend optimizer all intact

## New Flows This QA
- Integration (A-C): **3/3 pass** — hooks used correctly across all screens, PaywallModal consistent, data flow intact
- Automation (D-E): **2/2 pass** — admin gate works, email alias generation wired, rate limiting in place
- Desktop (F-G): **1/2 pass** — PaywallModal/Settings/DevToggle correct; 3 screens missing desktop layout
- Visual/A11y (H-I): **2/3 pass** — a11y roles added, dark mode toggle exists; theme persistence missing
- Performance: **1/1 pass** — 133 tests in <1.1s, zero bundle errors, web export clean
- App Store checklist: **10/13 items clear** — 3 items need attention

---

## Sev 1 Issues (Block submission)

### S1-1: EAS Project ID not configured
- **File:** `app.json` lines 68, 72
- **Issue:** `YOUR_EAS_PROJECT_ID` placeholder still in EAS update URL and project config. EAS Build will fail.
- **Fix:** User action item — run `eas init` to generate project ID (already documented in USER_ACTION_ITEMS.md).
- **Classification:** User action item, not a code bug. Does not block code freeze.

---

## Sev 2 Issues (Block submission)

### S2-1: Missing desktop layout — Ledger screen
- **File:** `app/(tabs)/intelligence/ledger.tsx`
- **Issue:** No `useBreakpoint` import. No `DesktopContainer` wrapper. Renders full-width on desktop.
- **Fix:** Import `useBreakpoint`, wrap content in `DesktopContainer`.

### S2-2: Missing desktop layout — Discover Results screen
- **File:** `app/(tabs)/discover/results.tsx`
- **Issue:** No `useBreakpoint` import. No filter sidebar + card list two-column layout on desktop.
- **Fix:** Import `useBreakpoint` + `TwoColumn`, split filters and results.

### S2-3: Missing desktop layout — Portfolio (Vault) screen
- **File:** `app/(tabs)/portfolio/index.tsx`
- **Issue:** No `useBreakpoint` import. No two-column card grid on desktop.
- **Fix:** Import `useBreakpoint` + `DesktopContainer`, add `numColumns` on desktop.

### S2-4: Dark mode preference not persisted
- **File:** `contexts/ThemeContext.tsx` line 13
- **Issue:** Theme mode stored in-memory only. User's selection lost on app restart.
- **Fix:** Persist `mode` to AsyncStorage on change, load on mount.

### S2-5: Missing privacy policy / terms links
- **File:** `app/(auth)/login.tsx` line 195, `app/(tabs)/settings/index.tsx`
- **Issue:** Login screen references Terms/Privacy Policy as text only — no clickable links. Settings has no legal links.
- **Fix:** Add `Pressable` with `Linking.openURL()` for both documents.

---

## Sev 3 Issues (Ship with known issues)

### S3-1: Hardcoded white colors in PaywallModal
- **File:** `components/PaywallModal.tsx` lines 181, 186, 190, 198
- **Issue:** `#FFFFFF` and `rgba(255,255,255,...)` used for button text on accent/dark backgrounds. Won't break in dark mode (accent buttons still need white text) but doesn't follow strict token discipline.
- **Impact:** Minimal — white text on colored buttons is correct regardless of theme.

### S3-2: Hardcoded white in Settings upgrade buttons
- **File:** `app/(tabs)/settings/index.tsx` lines 231-232
- **Issue:** `#fff` and `#ffffff99` in upgrade button text. Same pattern as PaywallModal — white on dark button backgrounds.
- **Impact:** Minimal — functionally correct.

### S3-3: Version number hardcoded
- **File:** `app/(tabs)/settings/index.tsx` line 192
- **Issue:** `"Version 1.0.0"` is a static string, not read from `app.json`. Will drift if version bumps.
- **Impact:** Low — version rarely changes and is easily updated.

### S3-4: Annual pricing comment outdated
- **File:** `lib/subscription.ts` line 52
- **Issue:** Comment says "TBD — annual pricing not finalized" but `$59` is used throughout. Comment is stale.
- **Impact:** None — cosmetic.

---

## Observations

1. **Zero regressions from B1-B7.** All prior features work correctly.
2. **Hook integration is solid.** useApplications, useHousehold, usePointsBalances, useSubscription all properly shared across screens.
3. **Automation pipeline fully wired.** 5 Edge Functions, admin review, email forwarding all structurally sound.
4. **Accessibility pass successful.** Button, ListItem, ProgressBar, StatCard, CardArt all have proper roles/labels.
5. **DevToggle confirmed DEV-only.** `if (!__DEV__) return null` at line 24 — verified.
6. **TypeScript clean.** Zero app-level TS errors (Deno Edge Function errors are expected and pre-existing).
7. **Web bundle exports.** All routes compile and are included in the dist output.

---

## Fix Priority

| Priority | Issue | Effort |
|----------|-------|--------|
| 1 | S2-1/2/3: Desktop layouts for 3 screens | ~30 min each |
| 2 | S2-4: Theme persistence | ~15 min |
| 3 | S2-5: Privacy/Terms links | ~10 min |
| 4 | S1-1: EAS project ID | User action (not code) |

Total fix effort: ~2 hours of coding.

---

## Environment
- Branch: `main`
- Commit: `3e33257`
- Tests: 133/133 passing
- TypeScript: 0 app-level errors
- Web bundle: Exported successfully
- Platforms tested: Code audit (web bundle verified)
- Time: 2026-04-19 20:30
