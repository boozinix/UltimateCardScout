# Build Agent B3 — Ledger UI + Core Primitives
**Phase:** 1b
**Duration:** 1-1.5 weeks
**Depends on:** B2 (data layer complete)
**Blocks:** B4, QA2

---

## Read These First

1. `agents/AGENT_MASTER_PLAN.md`
2. `AGENT_HANDOFF.md`
3. `DECISIONS_NEEDED.md`
4. `lib/applicationTypes.ts` — types from B2
5. `hooks/useApplications.ts` — CRUD hooks from B2
6. `hooks/useHousehold.ts` — household hooks from B2
7. `lib/csvParser.ts` — CSV logic from B2
8. `lib/theme.ts` — design tokens (never hardcode)

---

## What You're Building

The Intelligence tab hub and Application Ledger screens — the core paid feature that replaces the churner's spreadsheet. Also building 5-6 core UI primitives that all future screens will use.

---

## Locked Decisions

| Decision | Value |
|---|---|
| Tab name | "Intelligence" |
| Household cap | 4 members. Defaults: Johnny, Moira, David, Alexis (Schitt's Creek) |
| Import | CSV with column mapping + NL chatbot for single entries |
| Date precision | Month ('YYYY-MM') in UI |
| Free tier | Unlimited history viewing. Paid = velocity + fee advisor + alerts |
| Voice | Florid concierge tone. Empty state: "Your intelligence suite awaits." |

---

## Part 1: Core Primitives (build FIRST, 1-2 days)

Build these in `components/primitives/` and `components/composed/`. Every screen you build afterward MUST use these. No raw `<View style={{...}}>`.

### Primitives (`components/primitives/`)

#### `Text.tsx`
Variants: `display` (Playfair 40px), `heading1` (Playfair 28px), `heading2` (Playfair 22px), `heading3` (Inter semibold 18px), `body` (Inter 15px, default), `bodySmall` (Inter 13px), `caption` (Inter 12px), `mono` (Geist Mono 14px, tabular-nums), `label` (Inter medium 13px, uppercase).

Props: `variant`, `color` (primary/secondary/muted/danger/success/warning), `align`, `numberOfLines`.

#### `Button.tsx`
Variants: `primary` (filled blue), `secondary` (outlined), `tertiary` (text-only), `destructive` (red).
Sizes: `sm` (32px), `md` (44px default), `lg` (52px).
States: default, pressed (opacity), disabled, loading (spinner).
Props: `onPress`, `leftIcon`, `rightIcon`, `fullWidth`, `loading`.

#### `Input.tsx`
Variants: `text`, `email`, `number`, `search` (with clear), `multiline`.
States: default, focused (primary border), error (red border + message), disabled.
Props: `label`, `error`, `helperText`, `prefix` (e.g. "$"), standard TextInput passthrough.

#### `Surface.tsx`
Variants: `canvas` (base bg), `card` (elevated, shadow), `inset` (input background).
Props: `padding` (xs/sm/md/lg/xl from theme spacing), `radius` (sm/md/lg), `border`.

#### `Badge.tsx`
Variants: `neutral`, `success`, `warning`, `danger`, `info`, `pro` (gold).
Props: `label`, `size` (sm/md), `dot` (colored dot prefix).

### Composed (`components/composed/`)

#### `ListItem.tsx`
Props: `leftIcon`, `title`, `subtitle`, `rightElement` (chevron, value, badge), `onPress`, `variant` (default/compact).

#### `StatCard.tsx`
Big number + label + optional progress. Uses `Text variant="display"` for number.
Props: `value`, `label`, `trend`, `progress` (current/total), `emphasis`.

#### `ProgressBar.tsx`
Props: `current`, `total`, `variant` (auto-color by %), `showLabel`, `animated`.

#### `EmptyState.tsx`
Props: `icon`, `title`, `description`, `action` (label + onPress).

#### `FilterChip.tsx`
Tappable pill for filters. Props: `label`, `selected`, `onPress`.

---

## Part 2: Intelligence Hub Screen (half day)

### `app/(tabs)/intelligence/index.tsx`

Hub screen with sub-navigation links:

```
Welcome greeting: "Good afternoon, Zubair."
If no applications: EmptyState "Your intelligence suite awaits. Add your first application."
If has data: Summary cards → quick stats (card count, 5/24 status, portfolio value)

Sub-feature cards (ListItem style, tap to navigate):
  - Application Ledger → /intelligence/ledger
  - Velocity Dashboard → /intelligence/velocity (locked icon if free)
  - Points Portfolio → /intelligence/portfolio (locked icon if free)
  - Annual Fee Advisor → /intelligence/fee-advisor (locked icon if free)
  - Spend Optimizer → /intelligence/spend (locked icon if free)
  - Deal Passport → /intelligence/deals (locked icon if free)
```

Use `router.push()` for sub-navigation. Not sub-tabs — these are list items.

---

## Part 3: Ledger Screens (3-4 days)

### `app/(tabs)/intelligence/ledger.tsx` — Ledger List

The spreadsheet as a screen.

- Household member filter chips at top (FilterChip components)
- Status filter: Open / Closed / All
- Application rows: card name, issuer dot color, applied month, status badge, bonus progress if active
- FAB button: "+" to add
- Empty state: "No applications yet. Import your spreadsheet or add your first card."
- Sorts: newest first by default

### `app/(tabs)/intelligence/add.tsx` — Add Application Form

Smart form with catalog prefill:

1. Card search input (searches catalog by name/issuer) — on select, prefills fee, bonus, min spend
2. If card not in catalog: `card_name_override` text field
3. Household member selector (dropdown from useHousehold)
4. Applied month (month/year picker)
5. Status (Pending / Approved / Denied / Closed)
6. Credit bureau (Equifax / TransUnion / Experian / Unknown)
7. Annual fee (prefilled from catalog)
8. Card type (Personal / Business)
9. If status = Approved: bonus amount, min spend, spend window, spend progress
10. Notes (optional multiline)
11. Save button (calls useCreateApplication)

### `app/(tabs)/intelligence/[id].tsx` — Application Detail/Edit

View mode:
- Card art placeholder (gradient by issuer)
- Detail rows (ListItem): applied month, status, fee, bureau, bonus progress
- If active bonus: ProgressBar with deadline countdown
- Notes section
- Edit button → switches to form mode (reuse add form fields)
- Delete button → confirm dialog → soft delete with undo toast

### `app/(tabs)/intelligence/csv-import.tsx` — CSV Import

1. File picker (document picker for CSV)
2. Column mapping UI: dropdowns to map CSV columns → application fields
3. Preview: first 5 parsed rows in a table
4. Import button: "Import N applications"
5. Error display: inline per-row errors, allow skip
6. Success: return to ledger with imported rows visible

Uses `lib/csvParser.ts` from B2.

---

## Part 4: Household Setup (half day)

First-run modal when user opens Intelligence tab for the first time:

- "Tracking just your cards, or a partner's too?"
- Option 1: "Just me" → creates 1 member with user's name, dismiss
- Option 2: "Me + partner" → two name inputs, save both, dismiss
- "Add more later in Settings" caption
- Persists `householdSetupComplete` flag in AsyncStorage
- Does NOT re-appear after dismissal

Default placeholder names in the input fields: Johnny, Moira (from Schitt's Creek).

---

## Design & Copy Rules

- All colors from `lib/theme.ts` via `useTheme()` — never hardcode
- Primary accent: `#1B4FD8` for buttons, active states
- Gold `#92400E`: semantic only for captured value
- Canvas: `#FAFAF9`
- Empty states use florid concierge voice
- Status badges: success=green (Approved), danger=red (Denied), warning=amber (Pending), muted=grey (Closed)

---

## Hard Rules

1. Every screen uses primitives from Part 1. No raw `<View style={{...}}>` with colors.
2. All data via React Query hooks from B2. No `useEffect + fetch`.
3. Loading states render Skeleton, not blank.
4. Empty states use EmptyState component with concierge voice.
5. Every interactive element: 44px min tap target.
6. Do NOT build velocity, portfolio, fee-advisor, spend-optimizer, or deals screens. Those are other agents.

---

## When Done

1. Intelligence tab opens to hub screen
2. Can add an application with catalog prefill
3. Ledger list shows applications with member filter
4. Can edit and delete applications
5. CSV import works with column mapping
6. Household setup modal shows on first visit
7. All screens use primitives consistently
8. Update `AGENT_HANDOFF.md` and `PROGRESS_TRACKER.md`
9. Trigger QA2
