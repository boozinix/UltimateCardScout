# QA Agent QA2 — Ledger & Household Tests
**Runs after:** B2 + B3 (Phase 1 complete)
**Severity gate:** Fix all Sev 1 and Sev 2 before B4 starts.

---

## Read These First

1. `agents/AGENT_MASTER_PLAN.md`
2. `AGENT_HANDOFF.md`
3. `lib/applicationTypes.ts` — types
4. `hooks/useApplications.ts` — CRUD hooks

---

## What You're Testing

Application Ledger CRUD, CSV import, household setup, Intelligence hub, empty states, data persistence.

---

## Test Data

Before testing, seed known state:
- Pro user with active subscription
- 0 applications (start empty)
- 0 household members (test first-run flow)
- Have a test CSV file ready (Zubair's spreadsheet format with ~10 rows)

---

## Flows

### Flow 1 — Intelligence Hub (Empty State)
1. Sign in as pro user (no applications yet)
2. Tap Intelligence tab
3. Verify hub screen renders

**Expected:** Hub shows EmptyState: "Your intelligence suite awaits." Sub-feature links visible (Ledger, Velocity, etc.). Velocity/Portfolio/Fee Advisor show lock icons for free users.
**Sev 2 if:** Empty state missing or generic.
**Sev 3 if:** Wrong copy.

### Flow 2 — Household Setup (First Run)
1. Tap Intelligence tab (first time)
2. Household setup modal appears
3. Tap "Just me"
4. Modal dismisses, lands on hub
5. Refresh page
6. Modal does NOT re-appear

**Expected:** Modal shows once only. "Just me" creates 1 member.
**Sev 2 if:** Modal re-appears after refresh.
**Sev 2 if:** Modal never appears.

### Flow 3 — Household Setup (Partner)
1. Reset household state
2. Tap Intelligence tab
3. Modal appears
4. Tap "Me + partner"
5. Enter "Zubair" and "Halima"
6. Save
7. Navigate to ledger
8. Verify two filter chips: "Zubair" and "Halima"

**Expected:** Both members created. Filter chips visible.
**Sev 1 if:** Save fails silently (data loss).
**Sev 2 if:** Member names don't show in filters.

### Flow 4 — Add Application (Catalog Prefill)
1. Navigate to ledger
2. Tap "+" or "Add your first application"
3. Form opens
4. Search "Chase Sapphire Preferred"
5. Tap result from catalog

**Expected:** Form prefills: annual fee $95, bonus 60,000, min spend $4,000, spend window 3 months.
**Sev 2 if:** Prefill doesn't happen.
**Sev 2 if:** Search returns 0 results for known card.

### Flow 5 — Add Application (Complete Form)
1. Continue from Flow 4
2. Select household member (Zubair)
3. Select applied month (Feb 2026)
4. Select credit bureau (TransUnion)
5. Status: Approved
6. Save

**Expected:** Returns to ledger. New row visible with "Chase Sapphire Preferred", "Feb 2026", green "Approved" badge.
**Sev 1 if:** Save fails. Data not persisted.
**Sev 2 if:** Returns to ledger but row not visible.
**Sev 2 if:** Required field validation missing.

### Flow 6 — Add Application (Card Not in Catalog)
1. Tap "+" to add
2. Search "Some Random Store Card" — no results
3. Verify "card not in catalog" option appears
4. Enter card name manually via `card_name_override`
5. Fill remaining fields
6. Save

**Expected:** Application created with override name. Shows in ledger.
**Sev 2 if:** No way to add cards not in catalog.

### Flow 7 — Edit Application
1. Tap an existing application in ledger
2. Detail screen opens
3. Tap "Edit"
4. Change spend progress to $2,000
5. Save

**Expected:** Returns to detail. Updated spend progress visible. Same row, not new row.
**Sev 1 if:** Edit creates duplicate row.
**Sev 2 if:** Changes don't persist.

### Flow 8 — Delete Application
1. Tap an application
2. Tap "Delete"
3. Confirm deletion
4. Verify row removed from ledger

**Expected:** Row deleted. Undo toast shown (5 seconds).
**Sev 2 if:** No confirmation dialog (accidental delete).
**Sev 2 if:** Delete fails silently.
**Sev 3 if:** No undo option.

### Flow 9 — Household Member Filter
1. Add 2 applications: one for Zubair, one for Halima
2. Tap "Zubair" filter chip
3. Verify only Zubair's application visible
4. Tap "Halima"
5. Verify only Halima's visible
6. Tap "All" or clear filter
7. Both visible

**Expected:** Filter works correctly.
**Sev 2 if:** Filter shows wrong person's cards.
**Sev 1 if:** Filter causes data to disappear permanently.

### Flow 10 — CSV Import
1. Navigate to ledger
2. Tap "Import CSV" option
3. Upload test CSV file
4. Column mapping UI appears
5. Map columns: "Opened" → applied_month, "Person" → household_member, "Card" → card_name
6. Preview shows parsed rows
7. Tap "Import"
8. Returns to ledger with imported rows

**Expected:** All rows imported. Date formats parsed correctly (Oct-23 → 2023-10).
**Sev 1 if:** Import silently fails (data loss impression).
**Sev 2 if:** Date parsing fails on "Oct-23" format.
**Sev 2 if:** All rows imported as same person.
**Sev 2 if:** Duplicate detection doesn't work (re-import doubles data).

### Flow 11 — Ledger with Many Rows
1. Import or manually add 15+ applications
2. Scroll through ledger
3. Verify performance

**Expected:** Renders in <300ms. Smooth scrolling. No jank.
**Sev 3 if:** Slow render on 15+ rows.

### Flow 12 — Intelligence Hub with Data
1. After adding several applications
2. Return to Intelligence hub
3. Verify it shows summary (card count, etc.)
4. Tap "Application Ledger" link
5. Verify navigates to ledger

**Expected:** Hub shows real data summaries.
**Sev 2 if:** Hub still shows empty state despite having data.

---

## Report Format

Same as QA1. Use severity classification:
- **Sev 1:** Data loss, silent failures, security issues
- **Sev 2:** Core flow broken but app doesn't crash
- **Sev 3:** Visual glitch, minor UX issue

```markdown
# QA2 Report — [Date]

## Summary
- Flows run: 12
- Pass: X / Sev 1: X / Sev 2: X / Sev 3: X

## [Issues by severity...]
```
