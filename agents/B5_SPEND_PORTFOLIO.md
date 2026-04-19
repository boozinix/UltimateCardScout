# Build Agent B5 — Bonus Spend Tracker + Points Portfolio
**Phase:** 3 + 4
**Duration:** 1.5 weeks
**Depends on:** B4 (velocity engine complete)
**Can parallel with:** B6 (zero file overlap)
**Blocks:** QA4

---

## Read These First

1. `agents/AGENT_MASTER_PLAN.md`
2. `AGENT_HANDOFF.md`
3. `lib/applicationTypes.ts` — Application, PointsBalance, PortfolioSummary types
4. `hooks/useApplications.ts` — application CRUD
5. `hooks/usePointsBalances.ts` — portfolio CRUD (from B2)
6. `lib/theme.ts` — design tokens
7. Components in `components/primitives/` and `components/composed/` from B3

---

## What You're Building

Two related features about tracking progress and value:

1. **Bonus Spend Tracker** — Progress bars and deadlines for active signup bonuses
2. **Points Portfolio** — "Your portfolio: $7,553" screen with per-program breakdowns

---

## Part 1: Bonus Spend Tracker (Phase 3, 3-4 days)

### Spend Progress on Application Detail

Update `app/(tabs)/intelligence/[id].tsx` (built by B3):

If application has `status === 'active'` AND `bonus_min_spend > 0` AND `bonus_achieved === false`:

```
┌─────────────────────────────────┐
│ Bonus Progress                  │
│                                 │
│ ████████████░░░░░░ 68%          │
│ $2,720 / $4,000                 │
│                                 │
│ 47 days left · Need $27/day     │
│                                 │
│ [Update Spend]                  │
└─────────────────────────────────┘
```

- ProgressBar component (from B3 primitives)
- Color: green if on pace, amber if behind, red if <7 days and not met
- "Need $X/day" calculation: `(min_spend - spend_current) / days_remaining`
- "Update Spend" button → bottom sheet with number input to update `spend_current`
- "Mark Bonus Received" button when `spend_current >= bonus_min_spend`

### Deadline Countdown Component

Create `components/composed/SpendProgress.tsx`:

Props:
- `application: Application`
- `onUpdateSpend: (amount: number) => void`
- `onMarkComplete: () => void`

Shows:
- Progress bar
- Dollar amounts
- Days remaining
- Daily spend needed
- Status badge (On Pace / Behind / Almost There / Achieved)

### Push Notifications (scaffold only)

Create `lib/notifications.ts`:

- `scheduleSpendReminder(applicationId, deadline, daysOut)` — schedule for 30 days and 7 days before deadline
- Uses `expo-notifications` with local scheduling
- Permission request on first schedule attempt
- Cancel notification when bonus marked complete

**Note:** Actual push notification testing requires device. Scaffold the logic, test the scheduling math, but don't block on physical device testing.

### Intelligence Hub Update

Update `app/(tabs)/intelligence/index.tsx`:

Add "Active Bonuses" section showing cards with unmet spend deadlines:
- Show top 3 most urgent (closest deadline)
- Each: card name, progress bar (small), days remaining
- Tap → navigate to application detail

---

## Part 2: Points Portfolio (Phase 4, 3-4 days)

### Portfolio Screen

Create `app/(tabs)/intelligence/portfolio.tsx`:

```
┌─────────────────────────────────┐
│      Total Portfolio Value       │
│          $7,553                  │
│   Updated Apr 2026 · TPG rates  │
├─────────────────────────────────┤
│                                  │
│ Chase Ultimate Rewards           │
│ 247,000 pts    $3,087   1.25¢   │
│ ████████████████████░░ 41%      │
│                                  │
│ Amex Membership Rewards          │
│ 180,000 pts    $2,250   1.25¢   │
│ ███████████████░░░░░░░ 30%      │
│                                  │
│ World of Hyatt                   │
│ 94,000 pts     $1,410   1.50¢   │
│ ██████████░░░░░░░░░░░░ 19%      │
│                                  │
│ United MileagePlus               │
│ 62,000 pts      $806   1.30¢    │
│ ██████░░░░░░░░░░░░░░░░ 10%      │
│                                  │
│ [+ Add Program]                  │
│                                  │
│ Values based on TPG estimates.   │
│ Actual redemption value varies.  │
└─────────────────────────────────┘
```

- Hero number: total dollar value using `Text variant="display"`
- Per-program rows: program name, point count, dollar value, CPP rate
- Progress bar width = % of total portfolio
- Color per program (theme tokens or issuer colors)
- "Add Program" button → bottom sheet: select program from `points_valuations`, enter balance
- Tap any row → edit balance (bottom sheet with number input)
- Household member filter chips at top
- Household total + per-member breakdown

### Data Flow

- Read balances: `hooks/usePointsBalances.ts` (from B2)
- Read CPP rates: query `points_valuations` table
- Compute: `balance * cpp / 100 = dollar value`
- Display dollar value as primary, raw points as secondary
- "Last updated" shows `last_updated` field from `points_balances`

### Intelligence Hub Update

Update hub to show portfolio total if balances exist:
- StatCard: "$7,553 portfolio" with trend if balance changed since last update

---

## Hard Rules

1. Use primitives from B3. No raw styled components.
2. Dollar amounts always displayed with `Text variant="mono"`.
3. Portfolio headline is dollars, never raw points.
4. Progress bars use the ProgressBar component from B3.
5. Do NOT build fee advisor or spend optimizer — that's B6.
6. Do NOT build deal passport — that's B7.
7. Push notification logic is scaffolded but doesn't need device testing.

---

## When Done

1. Application detail shows bonus spend progress with update flow
2. Notification scheduling logic exists
3. Points portfolio screen shows total + per-program breakdown
4. Intelligence hub shows active bonuses and portfolio total
5. Household filter works on portfolio screen
6. Update `AGENT_HANDOFF.md` and `PROGRESS_TRACKER.md`
