# QA Agent QA3 — Velocity Engine Tests
**Runs after:** B4 (Phase 2)
**Severity gate:** ALL unit tests must pass. ALL Sev 1/2 fixed before B5/B6.
**This is the most critical QA agent.** If velocity rules are wrong, users get denied for cards. Trust-destroying.

---

## Read These First

1. `agents/AGENT_MASTER_PLAN.md`
2. `agents/B4_VELOCITY.md` — what was built
3. `lib/issuerRules.ts` — the 14 rules
4. `lib/velocityEngine.ts` — the computation engine
5. `__tests__/velocityEngine.test.ts` — existing unit tests

---

## What You're Testing

Three layers:
1. **Unit tests pass** — run `npm test` and report results
2. **Dashboard renders correctly** — visual verification
3. **Manual calculation cross-check** — verify engine output against hand calculations

---

## Layer 1: Unit Test Verification

### Run the tests
```bash
npm test
```

### Report format for test results
```
Total: XXX tests
Pass:  XXX
Fail:  XXX
Skip:  XXX
Coverage: XX% (target: 95% on issuerRules.ts + velocityEngine.ts)
```

### If any tests fail:
Report each failure:
- Test name
- Expected value
- Received value
- File + line number
- Is the test wrong, or is the code wrong? (Your analysis)

### If coverage is below 95%:
Report uncovered branches:
- Which rule functions have gaps
- Which edge cases are untested
- Suggest specific test cases to add

---

## Layer 2: Dashboard Visual Verification

### Flow 1 — Empty Velocity Dashboard
1. Sign in as pro user with 0 applications
2. Navigate to Intelligence → Velocity
3. Verify empty state or baseline state (all issuers "clear")

**Expected:** Dashboard renders. All issuers show clear status. No crashes.
**Sev 2 if:** Crashes on empty data.

### Flow 2 — Velocity with Known Data
1. Add these applications manually (or via CSV):

| Card | Issuer | Type | Person | Applied | Status |
|---|---|---|---|---|---|
| Amex Platinum | amex | personal | Zubair | 2023-01 | active |
| Chase Sapphire Reserve | chase | personal | Zubair | 2024-03 | active |
| Amex Gold | amex | personal | Zubair | 2024-06 | active |
| Chase Ink Preferred | chase | business | Zubair | 2024-09 | active |
| Chase Freedom Flex | chase | personal | Zubair | 2022-01 | active |
| Citi Strata Premier | citi | personal | Halima | 2025-01 | active |
| Capital One Venture X | capital_one | personal | Halima | 2025-10 | active |

2. Navigate to Velocity Dashboard

### Expected results for Zubair:

**Chase 5/24:**
- Count should be **2** (CSR 2024-03 + Amex Gold 2024-06). Amex Plat 2023-01 is >24 months ago. Freedom Flex 2022-01 is >24 months. Ink Preferred is business = excluded.
- Status: `clear`
- Next drop-off: CSR at 2026-03

**Amex 1-in-90:**
- Last Amex credit card: need to check if Gold is credit or charge. Gold is a CHARGE card → exempt from 1-in-90.
- Status: `clear`

**Amex Once-Per-Lifetime:**
- Platinum: burned (if bonus_achieved)
- Gold: burned (if bonus_achieved)

### Expected results for Halima:

**Chase 5/24:**
- Count should be **2** (Citi Strata Premier 2025-01 + Venture X 2025-10). NOTE: Citi business cards count toward 5/24, but this is Citi personal, so it counts anyway.
- Status: `clear`

3. Verify dashboard matches these calculations.

**Sev 1 if:** 5/24 count is wrong.
**Sev 1 if:** Business card incorrectly counted for Chase.
**Sev 1 if:** Charge card counted in 1-in-90.

### Flow 3 — Household Side-by-Side
1. With both Zubair and Halima data loaded
2. Verify filter chips for both members
3. Tap Zubair → see Zubair's velocity
4. Tap Halima → see Halima's velocity
5. Verify they show different data

**Expected:** Separate calculations per person. Not mixed.
**Sev 1 if:** One person's data leaks into another's view.

### Flow 4 — Pro Gate
1. Sign in as free user
2. Navigate to Intelligence → Velocity
3. Verify paywall/blur on velocity dashboard

**Expected:** Dashboard visible but locked/blurred. Paywall trigger available.
**Sev 1 if:** Free user sees full velocity data (gating broken).

---

## Layer 3: Manual Cross-Check

### Scenario A — 5/24 edge case
Manually calculate: if Zubair has these personal cards in last 24 months (from today 2026-04):
- 2024-06: counts (22 months ago)
- 2024-03: counts (25 months ago) — **WAIT: is this still in window?**

Check the engine's convention: does "24 months" mean `applied_month >= current_month - 24`? If current is 2026-04, then 24 months back is 2024-04. So 2024-03 is 25 months ago = **OUT of window**.

Verify the engine agrees. Document the convention.

### Scenario B — Amex charge vs credit
Verify that Amex Gold, Platinum, Green, Business Gold, Business Platinum, Business Green are classified as charge cards and exempt from 1-in-90.

Verify that Amex Delta Gold, Blue Cash Everyday, Hilton Aspire, etc. are classified as credit cards and count toward 1-in-90.

**Sev 1 if:** Classification is wrong for any card.

### Scenario C — Citi business in 5/24
Add a Citi AAdvantage Business card for Zubair.
Verify the 5/24 count increases (Citi business DOES count).
Then add a Chase Ink Business card.
Verify the 5/24 count does NOT increase (Chase business doesn't count).

**Sev 1 if:** Citi business excluded. Chase business included.

---

## Report Format

```markdown
# QA3 Report — [Date]

## Unit Test Results
- Total: XXX
- Pass: XXX
- Fail: XXX
- Coverage: XX%

## Failed Tests (if any)
### [Test name]
- Expected: [value]
- Got: [value]
- Analysis: [test wrong or code wrong?]

## Dashboard Flows
- Flow 1 (Empty): PASS/FAIL
- Flow 2 (Known data): PASS/FAIL
- Flow 3 (Household): PASS/FAIL
- Flow 4 (Pro gate): PASS/FAIL

## Manual Cross-Check
- Scenario A (5/24 edge): PASS/FAIL — [explain]
- Scenario B (charge vs credit): PASS/FAIL — [explain]
- Scenario C (Citi biz in 5/24): PASS/FAIL — [explain]

## Sev 1 Issues
[...]

## Sev 2 Issues
[...]

## Observations
[...]
```

---

## Rules

1. Do NOT fix bugs. Report only.
2. If a unit test fails, analyze whether the TEST is wrong or the CODE is wrong.
3. Document the 24-month window convention (inclusive or exclusive of boundary month).
4. All Sev 1 issues MUST be resolved before B5 and B6 can start.
