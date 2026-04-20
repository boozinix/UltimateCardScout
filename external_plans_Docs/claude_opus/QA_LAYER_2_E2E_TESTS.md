# QA Layer 2 — Playwright E2E Tests

> **Purpose:** Automated browser-based end-to-end tests that run on every PR in GitHub Actions.
> **Stakes:** Catches broken user flows before they reach production. Guards against the "Calendar tab is a redirect stub" class of bugs.
> **When to run:** Every commit to a PR branch. Pre-merge gate.
> **Runtime target:** Full suite completes in <5 minutes in CI.

---

## How Layer 2 Relates to Layers 1 and 3

| Layer | Type | Frequency | Speed | Scope |
|---|---|---|---|---|
| **Layer 1** (Vitest) | Unit/logic | Every commit | <2s | Pure functions, velocity engine, data transforms |
| **Layer 2** (Playwright) | E2E browser | Every PR | <5min | Critical user flows in real browser |
| **Layer 3** (QA Agent) | Guided exploratory | Phase close | 15-30min | Full app walkthrough with severity triage |

If all three pass, confidence is high. Layer 2 specifically catches: broken navigation, missing screens, API contract drift, auth regressions, payment flow breakage, accessibility regressions.

Layer 2 does NOT catch: business logic bugs (Layer 1 does), visual polish issues (Layer 3 does), performance regressions (separate Lighthouse CI).

---

## Setup

### Install

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Config (`playwright.config.ts`)

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8081',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npx expo start --web',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### GitHub Actions workflow (`.github/workflows/e2e.yml`)

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci --legacy-peer-deps
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          BASE_URL: http://localhost:8081
          SUPABASE_URL: ${{ secrets.SUPABASE_URL_TEST }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY_TEST }}
          STRIPE_PUBLISHABLE_KEY: ${{ secrets.STRIPE_PUBLISHABLE_KEY_TEST }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### package.json

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:mobile": "playwright test --project=mobile",
    "test:e2e:desktop": "playwright test --project=desktop"
  }
}
```

---

## Test Helpers (`e2e/helpers/`)

### `auth.ts`

```ts
import { Page } from '@playwright/test';

export async function signInAsFreeUser(page: Page) {
  await page.goto('/');
  await page.getByText('Get started').click();
  await page.getByLabel('Email').fill('test-free@cardscout.app');
  await page.getByText('Send magic link').click();
  
  // In CI, use seeded user with known session token bypass
  // In dev, poll Supabase for magic link
  const token = await getTestAuthToken('test-free@cardscout.app');
  await page.goto(`/auth/callback?token=${token}`);
  await page.waitForURL('**/discover');
}

export async function signInAsProUser(page: Page) {
  // Same pattern with test-pro@cardscout.app
}

export async function signOut(page: Page) {
  await page.goto('/settings');
  await page.getByText('Sign out').click();
  await page.waitForURL('**/auth/**');
}
```

### `data.ts`

```ts
// Reset test DB to known state before each test run
export async function resetTestData() {
  const { supabase } = createServiceClient();
  await supabase.rpc('reset_test_data'); // custom Postgres function
}

// Create a supabase function `reset_test_data()` that wipes user data 
// for test accounts and re-seeds known state
```

### `stripe.ts`

```ts
export async function completeStripeCheckout(page: Page) {
  // Stripe Checkout runs on checkout.stripe.com
  // Wait for redirect
  await page.waitForURL('**/checkout.stripe.com/**', { timeout: 30_000 });
  
  // Fill test card
  await page.frameLocator('iframe[name*="card"]').getByLabel('Card number').fill('4242 4242 4242 4242');
  await page.frameLocator('iframe[name*="card"]').getByLabel('Expiration').fill('12 / 34');
  await page.frameLocator('iframe[name*="card"]').getByLabel('CVC').fill('123');
  await page.getByLabel('Name on card').fill('Test User');
  await page.getByLabel('ZIP').fill('94103');
  
  await page.getByRole('button', { name: /subscribe/i }).click();
  
  // Wait for redirect back to app
  await page.waitForURL('**/subscription/success**', { timeout: 30_000 });
}
```

---

## Test Suites

Organize tests into suites by feature area. Each suite has its own file in `e2e/`.

### `e2e/00-smoke.spec.ts` — Smoke Tests

**Purpose:** Catch total-breakage bugs in <30 seconds. Runs first, fails fast.

```ts
import { test, expect } from '@playwright/test';

test.describe('Smoke', () => {
  test('app loads at root', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CardScout/);
    // No console errors
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    expect(errors).toHaveLength(0);
  });
  
  test('four tabs are visible after auth', async ({ page }) => {
    await signInAsFreeUser(page);
    await expect(page.getByRole('tab', { name: 'Discover' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Vault' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Tracker' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Settings' })).toBeVisible();
    // Concierge must not exist
    await expect(page.getByRole('tab', { name: 'Concierge' })).not.toBeVisible();
  });
  
  test('no unhandled promise rejections', async ({ page }) => {
    const rejections: string[] = [];
    page.on('pageerror', e => rejections.push(e.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    expect(rejections.filter(r => r.includes('Unhandled'))).toHaveLength(0);
  });
});
```

---

### `e2e/01-onboarding.spec.ts` — Onboarding & Auth

```ts
test.describe('Onboarding', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });
  
  test('skip onboarding routes to Discover', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Find the right card')).toBeVisible();
    await page.getByText('Skip').click();
    await expect(page).toHaveURL(/\/discover/);
  });
  
  test('complete all three onboarding screens', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Next').click();  // Screen 1 → 2
    await page.getByText('Next').click();  // Screen 2 → 3
    await page.getByText('Get started').click();  // Screen 3 → auth
    await expect(page).toHaveURL(/\/auth/);
  });
  
  test('onboarding does not re-appear after skip', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Skip').click();
    await page.reload();
    await expect(page).toHaveURL(/\/discover/);
    await expect(page.getByText('Find the right card')).not.toBeVisible();
  });
});

test.describe('Auth', () => {
  test('magic link sign in', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill('test-free@cardscout.app');
    await page.getByText('Send magic link').click();
    await expect(page.getByText(/check your email/i)).toBeVisible();
    // Simulate magic link callback (using test helper)
    const token = await getTestAuthToken('test-free@cardscout.app');
    await page.goto(`/auth/callback?token=${token}`);
    await expect(page).toHaveURL(/\/discover/);
  });
  
  test('sign out clears session', async ({ page }) => {
    await signInAsFreeUser(page);
    await signOut(page);
    // Attempt to access protected route
    await page.goto('/vault');
    await expect(page).toHaveURL(/\/auth/);
  });
  
  test('signed-out user cannot access Vault', async ({ page }) => {
    await page.goto('/vault');
    await expect(page).toHaveURL(/\/auth/);
  });
});
```

---

### `e2e/02-quiz-flow.spec.ts` — Quiz → Results → Add Card

```ts
test.describe('Quiz Flow', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsFreeUser(page);
  });
  
  test('complete quiz and see ranked results', async ({ page }) => {
    await page.goto('/discover');
    await page.getByText('Find my card').click();
    
    // Question 1: spending category
    await page.getByText('Dining').click();
    
    // Question 2: travel frequency
    await page.getByText('A few trips per year').click();
    
    // Question 3: annual fee tolerance
    await page.getByText('Up to $95').click();
    
    // Results
    await expect(page).toHaveURL(/\/discover\/results/);
    const cards = page.getByTestId('result-card');
    await expect(cards).toHaveCount({ min: 3, max: 10 });
    
    // Top card has a score
    const topCard = cards.first();
    await expect(topCard.getByTestId('score')).toBeVisible();
  });
  
  test('adding card triggers paywall for free user', async ({ page }) => {
    await page.goto('/discover/results?preset=test');  // helper route that pre-seeds results
    await page.getByTestId('result-card').first().click();
    await page.getByText('Add to Vault').click();
    
    await expect(page.getByText(/start your.*trial/i)).toBeVisible();
    await expect(page.getByText('$9.99/mo')).toBeVisible();
    await expect(page.getByText('$99/yr')).toBeVisible();
  });
  
  test('dismissing paywall returns to previous screen', async ({ page }) => {
    await page.goto('/discover/results?preset=test');
    await page.getByTestId('result-card').first().click();
    await page.getByText('Add to Vault').click();
    await page.getByText('Maybe later').click();
    
    // Should be back on card detail, not trapped
    await expect(page.getByText('Add to Vault')).toBeVisible();
  });
});
```

---

### `e2e/03-stripe-checkout.spec.ts` — Payment Flow

**Critical: these tests use Stripe test mode and real test card `4242 4242 4242 4242`.**

```ts
test.describe('Stripe Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await resetTestData();
    await signInAsFreeUser(page);
  });
  
  test('monthly subscription checkout completes', async ({ page }) => {
    await triggerPaywall(page);  // helper to get to paywall screen
    await page.getByText('Start 14-day free trial').click();
    
    await completeStripeCheckout(page);
    
    // After return, user should be pro
    await expect(page).toHaveURL(/\/subscription\/success/);
    await page.getByText('Continue').click();
    
    // Verify pro state
    await page.goto('/vault');
    await expect(page.getByText('Pro')).toBeVisible();
    await expect(page.getByText('Trial ends in 14 days')).toBeVisible();
  });
  
  test('annual subscription checkout completes', async ({ page }) => {
    await triggerPaywall(page);
    await page.getByText('Annual').click();
    await page.getByText('Start 14-day free trial').click();
    await completeStripeCheckout(page);
    await expect(page).toHaveURL(/\/subscription\/success/);
  });
  
  test('declined card shows error, does not subscribe', async ({ page }) => {
    await triggerPaywall(page);
    await page.getByText('Start 14-day free trial').click();
    await page.waitForURL('**/checkout.stripe.com/**');
    
    // Use Stripe declined test card
    await page.frameLocator('iframe[name*="card"]').getByLabel('Card number').fill('4000 0000 0000 0002');
    await page.frameLocator('iframe[name*="card"]').getByLabel('Expiration').fill('12 / 34');
    await page.frameLocator('iframe[name*="card"]').getByLabel('CVC').fill('123');
    await page.getByRole('button', { name: /subscribe/i }).click();
    
    await expect(page.getByText(/card was declined/i)).toBeVisible();
    
    // Navigate back to app manually
    await page.goto('/');
    await expect(page.getByText('Pro')).not.toBeVisible();
  });
});
```

**Note:** Stripe checkout tests run slower (network-dependent). Mark them `@slow` and allow opting out in local dev: `playwright test --grep-invert @slow`.

---

### `e2e/04-navigation.spec.ts` — Tab Navigation

```ts
test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsProUser(page);
  });
  
  test('all four tabs render without error', async ({ page }) => {
    const tabs = ['Discover', 'Vault', 'Tracker', 'Settings'];
    for (const tab of tabs) {
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.getByTestId(`${tab.toLowerCase()}-screen`)).toBeVisible();
    }
  });
  
  test('tab state preserved on return', async ({ page }) => {
    await page.getByRole('tab', { name: 'Vault' }).click();
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByRole('tab', { name: 'Vault' }).click();
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(500);
  });
});
```

---

### `e2e/05-application-ledger.spec.ts` — Phase 1+

```ts
test.describe('Application Ledger', () => {
  test.beforeEach(async ({ page }) => {
    await resetTestData();
    await signInAsProUser(page);
  });
  
  test('add new application', async ({ page }) => {
    await page.goto('/tracker');
    await page.getByText('Add your first application').click();
    
    // Card search with prefill
    await page.getByPlaceholder('Search card catalog').fill('Sapphire');
    await page.getByText('Chase Sapphire Preferred').click();
    
    // Form should be prefilled
    await expect(page.getByLabel('Annual fee')).toHaveValue('95');
    await expect(page.getByLabel('Minimum spend')).toHaveValue('4000');
    
    // Fill remaining
    await page.getByLabel('Applied month').fill('2026-02');
    await page.getByLabel('Household member').selectOption('Alex');
    await page.getByLabel('Credit bureau').selectOption('equifax');
    
    await page.getByText('Save application').click();
    
    // Returns to ledger with new row
    await expect(page).toHaveURL(/\/tracker$/);
    await expect(page.getByText('Chase Sapphire Preferred')).toBeVisible();
  });
  
  test('edit existing application updates values', async ({ page }) => {
    // Seed with one application
    await seedApplication({ card_name: 'Chase Sapphire Preferred', applied_month: '2026-02' });
    
    await page.goto('/tracker');
    await page.getByText('Chase Sapphire Preferred').click();
    await page.getByText('Edit').click();
    
    await page.getByLabel('Spend progress').fill('3500');
    await page.getByText('Save').click();
    
    await expect(page.getByText('87% to bonus')).toBeVisible();
  });
  
  test('delete application with undo', async ({ page }) => {
    await seedApplication({ card_name: 'Chase Sapphire Preferred' });
    await page.goto('/tracker');
    
    await page.getByText('Chase Sapphire Preferred').click();
    await page.getByText('Delete').click();
    await page.getByText('Confirm').click();
    
    // Undo toast
    await expect(page.getByText('Application deleted')).toBeVisible();
    await page.getByText('Undo').click();
    
    // Back in ledger
    await expect(page.getByText('Chase Sapphire Preferred')).toBeVisible();
  });
});
```

---

### `e2e/06-household.spec.ts` — Phase 1+

```ts
test.describe('Household Setup', () => {
  test.beforeEach(async ({ page }) => {
    await resetTestData();
    await signInAsProUser(page);
  });
  
  test('first tracker visit prompts household setup', async ({ page }) => {
    await page.goto('/tracker');
    await expect(page.getByText(/tracking just you/i)).toBeVisible();
  });
  
  test('solo user skips household setup', async ({ page }) => {
    await page.goto('/tracker');
    await page.getByText('Just me').click();
    await expect(page.getByText(/tracking just you/i)).not.toBeVisible();
    
    // Should not re-appear
    await page.reload();
    await expect(page.getByText(/tracking just you/i)).not.toBeVisible();
  });
  
  test('couple sets up household', async ({ page }) => {
    await page.goto('/tracker');
    await page.getByText('Me + partner').click();
    await page.getByLabel('Your name').fill('Alex');
    await page.getByLabel('Partner name').fill('Jordan');
    await page.getByText('Save').click();
    
    // Filter chips visible
    await expect(page.getByTestId('filter-chip-Alex')).toBeVisible();
    await expect(page.getByTestId('filter-chip-Jordan')).toBeVisible();
  });
});
```

---

### `e2e/07-csv-import.spec.ts` — Phase 1+

```ts
test.describe('CSV Import', () => {
  test('import valid CSV populates ledger', async ({ page }) => {
    await signInAsProUser(page);
    await page.goto('/tracker');
    await page.getByText('Import CSV').click();
    
    // Upload test fixture
    await page.setInputFiles('input[type="file"]', 'e2e/fixtures/sample_churning_sheet.csv');
    
    // Column mapping
    await page.getByLabel('Applied date column').selectOption('Opened');
    await page.getByLabel('Person column').selectOption('Person');
    await page.getByLabel('Card name column').selectOption('Card');
    
    await page.getByText('Preview').click();
    await expect(page.getByTestId('preview-row')).toHaveCount(20);
    
    await page.getByText('Import 20 applications').click();
    
    // Returns to ledger
    await expect(page).toHaveURL(/\/tracker$/);
    await expect(page.getByTestId('ledger-row')).toHaveCount(20);
  });
  
  test('malformed CSV shows error gracefully', async ({ page }) => {
    await signInAsProUser(page);
    await page.goto('/tracker');
    await page.getByText('Import CSV').click();
    
    await page.setInputFiles('input[type="file"]', 'e2e/fixtures/malformed.csv');
    await expect(page.getByText(/could not parse/i)).toBeVisible();
    
    // Ledger unchanged
    await page.getByText('Cancel').click();
    await expect(page.getByTestId('ledger-row')).toHaveCount(0);
  });
});
```

---

### `e2e/08-admin.spec.ts` — Phase 0.5+

```ts
test.describe('Admin Review Queue', () => {
  test('non-admin gets 403 on /admin', async ({ page }) => {
    await signInAsProUser(page);
    await page.goto('/admin/proposals');
    await expect(page.getByText(/403|not authorized/i)).toBeVisible();
  });
  
  test('admin approves a proposal', async ({ page }) => {
    await seedProposal({ 
      source_type: 'doc_scraper',
      target_table: 'cards',
      confidence_score: 0.95 
    });
    
    await signInAsAdmin(page);
    await page.goto('/admin/proposals');
    
    await expect(page.getByTestId('proposal-card')).toBeVisible();
    await page.keyboard.press('a');  // approve shortcut
    
    await expect(page.getByText(/approved/i)).toBeVisible();
    // Next proposal or empty state
  });
  
  test('admin rejects a proposal', async ({ page }) => {
    await seedProposal({ confidence_score: 0.6 });
    await signInAsAdmin(page);
    await page.goto('/admin/proposals');
    await page.keyboard.press('r');
    await expect(page.getByText(/rejected/i)).toBeVisible();
  });
});
```

---

### `e2e/09-paywall-gates.spec.ts` — Feature Gating

```ts
test.describe('Paywall Gates', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsFreeUser(page);
  });
  
  test('free user blocked from Velocity Dashboard', async ({ page }) => {
    await page.goto('/tracker/velocity');
    await expect(page.getByText(/unlock velocity/i)).toBeVisible();
  });
  
  test('free user can view basic Vault but cannot add 4th card', async ({ page }) => {
    // Seed 3 cards
    await seedUserCards(3);
    await page.goto('/vault');
    await page.getByText('Add card').click();
    await expect(page.getByText(/unlock unlimited/i)).toBeVisible();
  });
  
  test('trialing user has full access', async ({ page }) => {
    await signInAsTrialingUser(page);
    await page.goto('/tracker/velocity');
    await expect(page.getByTestId('velocity-dashboard')).toBeVisible();
    await expect(page.getByText(/unlock/i)).not.toBeVisible();
  });
});
```

---

## Critical Paths Matrix

These are the flows that must ALWAYS pass. If any fail, blocker.

| Path | Test File | Blocker? |
|---|---|---|
| App loads | `00-smoke` | Yes |
| Four tabs visible | `00-smoke` | Yes |
| Auth (magic link + social) | `01-onboarding` | Yes |
| Sign out clears session | `01-onboarding` | Yes |
| Quiz → results → paywall | `02-quiz-flow` | Yes |
| Stripe checkout success | `03-stripe-checkout` | Yes |
| Stripe declined gracefully | `03-stripe-checkout` | Yes |
| Feature gating enforced | `09-paywall-gates` | Yes |
| Application CRUD | `05-application-ledger` | Yes (Phase 1+) |
| Household setup | `06-household` | Yes (Phase 1+) |
| Admin auth gate | `08-admin` | Yes (Phase 0.5+) |

Non-blocker paths can fail in CI with `test.fixme()` marking and a linked issue — but no more than 5 at any time.

---

## Handling Flaky Tests

Some E2E tests will flake — network conditions, timing, browser quirks. Don't tolerate indefinite flakiness.

### Playwright auto-retry

Config already retries failed tests twice in CI. This covers most transient flakes.

### Flaky test policy

1. First flaky failure: investigate immediately
2. Second flaky failure within same week: mark `test.fixme(...)` with TODO comment, open issue
3. Fix within 7 days or delete the test

**Never merge a PR with a `test.fixme` you added in that same PR.** Fix it or remove it.

### Common flake sources

- Waiting on animations — use `waitForTimeout` only as last resort; prefer `waitForSelector`
- Race conditions on async data loading — always `await` query invalidations
- External service timing (Stripe, Supabase) — increase timeout for those specific tests
- Non-deterministic test data — always seed + reset

---

## Local Development

```bash
# Run all tests
npm run test:e2e

# Run in UI mode (watch tests execute in a browser)
npm run test:e2e:ui

# Run only mobile viewport
npm run test:e2e:mobile

# Run only desktop viewport
npm run test:e2e:desktop

# Run a specific file
npx playwright test e2e/02-quiz-flow.spec.ts

# Debug a specific test
npx playwright test --debug -g "complete quiz"

# Generate a test by recording actions
npx playwright codegen http://localhost:8081
```

---

## When Tests Fail in CI

1. **Click the workflow run in GitHub Actions**
2. **Download the `playwright-report` artifact** — contains trace viewer
3. **Open the HTML report locally:** `npx playwright show-report playwright-report`
4. **Look at the trace:** actions, network calls, DOM snapshots at each step
5. **Reproduce locally:** `npx playwright test --grep "failing test name"`

Don't merge a PR with failing E2E tests unless the test itself is the problem. If the test is right and the code is broken, fix the code.

---

## Test Data Strategy

### Supabase test project

Maintain a **separate** Supabase project for E2E tests. Not shared with dev.

```
Dev DB:  (your personal Supabase project)
Test DB: (dedicated Supabase project for CI)
Prod DB: (launched product)
```

### Reset function

Create Postgres function `reset_test_data()` in the test DB:

```sql
CREATE OR REPLACE FUNCTION reset_test_data()
RETURNS void AS $$
BEGIN
  -- Wipe user-specific data for test accounts only
  DELETE FROM applications WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE 'test-%@cardscout.app'
  );
  DELETE FROM user_cards WHERE user_id IN (...);
  DELETE FROM household_members WHERE user_id IN (...);
  DELETE FROM points_balances WHERE user_id IN (...);
  DELETE FROM subscriptions WHERE user_id IN (...);
  -- Do not wipe auth.users, cards catalog, or seeded reference data
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Call it at the start of each test via `test.beforeEach(resetTestData)`.

### Auth token helper

Supabase supports service-role sign-in for testing. Create a helper that generates a valid JWT for any test user without the full magic link flow:

```ts
// e2e/helpers/auth-bypass.ts (CI only)
export async function getTestAuthToken(email: string): Promise<string> {
  const { data } = await serviceRoleClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  // Extract token from action_link
  return extractTokenFromLink(data.properties.action_link);
}
```

This bypasses actual email delivery, which is slow and flaky in CI.

---

## Coverage Expectations

Layer 2 is not exhaustive. Coverage targets:

- **Happy path for every critical user flow:** 100%
- **Major failure paths (declined card, auth failure, network error):** 50%+
- **Edge cases (malformed data, offline, slow network):** Layer 3 territory, not here

If you catch yourself writing 20 E2E tests for one feature, stop. That feature probably needs more Layer 1 unit tests instead.

---

## Phase Integration

| Phase | E2E test files added |
|---|---|
| Phase 0 | `00-smoke`, `01-onboarding`, `02-quiz-flow`, `03-stripe-checkout`, `04-navigation`, `09-paywall-gates` |
| Phase 0.5 | `08-admin` |
| Phase 1 | `05-application-ledger`, `06-household`, `07-csv-import` |
| Phase 2 | `10-velocity-dashboard` |
| Phase 3 | `11-bonus-spend-tracker` |
| Phase 4 | `12-points-portfolio` |
| Phase 5 | `13-annual-fee-advisor` |
| Phase 6 | `14-spend-optimizer` |
| Phase 7 | `15-deal-passport` |

Do not pre-write tests for features not yet built. Add them when the feature ships.

---

## Maintenance

- **Weekly:** Review flaky test reports. Fix or mark `fixme`.
- **Per phase close:** Add new E2E tests for new features.
- **Quarterly:** Prune obsolete tests. Update test data fixtures.

A test that no longer reflects real user flow is worse than no test — it creates false confidence.
