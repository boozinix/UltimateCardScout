# UI Screens — Claude Code Brief

> **Target:** Build app screens from the primitives library.
> **Prerequisite:** `UI_DESIGN_SYSTEM_PROMPT.md` must be complete. Primitives + composed components exist and are reviewed.
> **Duration:** 2-3 weeks across multiple sessions. One tab (or one major screen) per session.
> **Philosophy:** Screens are compositions of primitives. Every screen should read like a list of components with data bound in. No custom styling inside screen files.

---

## Pre-Flight Check

Before any screen build session, confirm:

- [ ] Primitives exist in `components/primitives/`
- [ ] Composed components exist in `components/composed/`
- [ ] `app/dev/design-system.tsx` renders cleanly (no errors)
- [ ] `lib/theme.ts` is unchanged from design-system session
- [ ] `UI_DESIGN_SYSTEM_AUDIT.md` shows replacement sweep is done

If any of these fail, stop. Go back to the design system phase.

---

## Global Constraints

These apply to every screen:

1. **No inline styles.** Zero. All spacing/colors/typography come from primitives.
2. **No custom components inside screen files.** If you need something reusable, it goes in `components/`.
3. **All data loading uses React Query.** No `useEffect` + `fetch`. No loose state for server data.
4. **Loading state renders `<Skeleton>`**, not blank screen, not spinner-in-center.
5. **Error state renders `<EmptyState>`** with retry action, not raw error text.
6. **Empty state is a first-class concern.** Every list has one.
7. **Safe area insets respected.** Use `useSafeAreaInsets()` from react-native-safe-area-context.
8. **Responsive behavior works via DevToggle.** Every screen tested in MOB and DSK modes.
9. **Every interactive element has minimum 44px tap target** on mobile.
10. **PostHog events fire** where `MASTER_PROGRESS_TRACKER.md` Phase 0 Task 7 specifies.

---

## Screen-Building Session Template

Every session for screen work follows this pattern:

```
1. Read MASTER_PROGRESS_TRACKER.md + AGENT_HANDOFF.md + latest CONVERSATION_LOG
2. Read UI_SCREENS_PROMPT.md (this file) — specifically the screen being built
3. Read components/primitives/* and components/composed/* to know what's available
4. Build the screen — one file, bound to real data, with all states
5. Test in DevToggle MOB and DSK modes
6. Run Playwright E2E test for this screen (from QA_LAYER_2_E2E_TESTS.md)
7. Update AGENT_HANDOFF.md: what was built, screenshots if helpful
8. Close session
```

One screen per session. Do not batch.

---

## Tab 1: Discover

### `app/(tabs)/discover/index.tsx` — Discover Home

**Purpose:** Entry point. Routes users to the thing they want.

**Composition:**

```tsx
<Container>
  <AppHeader title="Discover" />
  <Stack gap="lg">
    {/* Hero quiz CTA */}
    <Surface variant="gradient" padding="lg" radius="lg">
      <Stack gap="md">
        <Text variant="heading1">Find your next card</Text>
        <Text variant="body" color="secondary">
          Answer 3 questions. We'll rank your options.
        </Text>
        <Button variant="primary" onPress={startQuiz}>Start quiz</Button>
      </Stack>
    </Surface>

    {/* Quick actions grid */}
    <Text variant="heading3">Or browse</Text>
    <Grid mobile={2} desktop={4} gap="md">
      <Tile icon="search" label="All cards" onPress={() => router.push('/discover/browse')} />
      <Tile icon="calculator" label="Calculators" onPress={() => router.push('/discover/tools')} />
      <Tile icon="book" label="Guides" onPress={() => router.push('/discover/guides')} />
      <Tile icon="trending-up" label="Deals" onPress={() => router.push('/discover/deals')} />
    </Grid>

    {/* Trending deals from Deal Passport (Phase 7+) */}
    {isPhase7Plus && <TrendingDealsSection />}
  </Stack>
</Container>
```

**States:**
- Default (always renders — no loading needed, static content)
- If user is signed in: show personalized deals
- If user is anonymous: show generic card recommendations

**Phase availability:** Phase 0. Refine in Phase 7 when Deal Passport ships.

---

### `app/(tabs)/discover/quiz.tsx` — Card Finder Quiz

**Purpose:** 3-question quiz → ranked card results.

**Composition:**

```tsx
<Container>
  <AppHeader
    title={`Question ${current} of 3`}
    leftAction={{ icon: "arrow-left", onPress: goBack }}
  />
  <ProgressBar current={current} total={3} animated />

  <Stack gap="lg">
    <Text variant="heading2">{question.text}</Text>
    <Stack gap="sm">
      {question.options.map(opt => (
        <OptionCard
          key={opt.id}
          label={opt.label}
          description={opt.description}
          selected={answers[question.id] === opt.id}
          onPress={() => select(opt.id)}
        />
      ))}
    </Stack>
  </Stack>

  <StickyFooter>
    <Button variant="primary" disabled={!selected} onPress={next}>
      {current === 3 ? "See results" : "Next"}
    </Button>
  </StickyFooter>
</Container>
```

**States:**
- Loading: Skeleton for question text
- Default: question rendered
- Transitioning: Reanimated fade between questions
- Last question: CTA label changes

**Events:** `quiz_start` on first render, `quiz_complete` on submit.

---

### `app/(tabs)/discover/results.tsx` — Quiz Results

**Purpose:** Ranked list of recommended cards.

**Composition:**

```tsx
<Container>
  <AppHeader title="Your matches" />
  <Text variant="body" color="secondary">
    Based on your answers, these cards give you the most value.
  </Text>

  <Stack gap="md">
    {rankedCards.map((card, i) => (
      <ResultCard
        key={card.id}
        rank={i + 1}
        card={card}
        score={card.score}
        whyItFits={card.reasons}
        onPress={() => openCardDetail(card.id)}
      />
    ))}
  </Stack>

  <Stack gap="sm">
    <Button variant="secondary" onPress={retakeQuiz}>Retake quiz</Button>
  </Stack>
</Container>
```

**Desktop layout:** Filter sidebar left + results list right. Implement in Phase 9.

**States:**
- Loading: 3 ResultCard skeletons
- Default: 3-5 ranked cards
- Empty: "No cards matched your answers" with CTA to adjust quiz

---

### `app/(tabs)/discover/browse.tsx` — Card Database Browser

**Purpose:** Filterable list of all cards in catalog.

**Composition:**

```tsx
<Container>
  <AppHeader title="All cards" rightActions={[{ icon: "sliders", onPress: openFilters }]} />

  <Input type="search" placeholder="Search cards" value={query} onChangeText={setQuery} />

  <Row gap="sm" scrollable>
    <FilterChip label="All" selected={!activeFilter} onPress={clearFilter} />
    <FilterChip label="Chase" selected={activeFilter === 'chase'} onPress={...} />
    <FilterChip label="Amex" selected={activeFilter === 'amex'} onPress={...} />
    <FilterChip label="Citi" selected={activeFilter === 'citi'} onPress={...} />
    <FilterChip label="No AF" selected={noFee} onPress={...} />
    <FilterChip label="Business" selected={business} onPress={...} />
  </Row>

  <Grid mobile={1} tablet={2} desktop={3} gap="md">
    {filteredCards.map(card => <CardArt key={card.id} card={card} onPress={...} />)}
  </Grid>
</Container>
```

**States:**
- Loading: 6 CardArt skeletons
- Default: grid of cards
- Empty search: "No cards match 'ink'" with Clear button

---

### `app/(tabs)/discover/card/[id].tsx` — Card Detail

**Purpose:** Full detail on a single card. Primary CTA = "Add to Vault."

**Composition:**

```tsx
<Container>
  <AppHeader leftAction={{ icon: "arrow-left", onPress: back }} />

  <CardArt card={card} variant="3d-tilt" />

  <Stack gap="lg">
    <Stack gap="xs">
      <Text variant="heading1">{card.name}</Text>
      <Text variant="caption" color="secondary">{card.issuer}</Text>
    </Stack>

    <Row gap="md">
      <StatCard value={`$${card.annual_fee}`} label="Annual fee" />
      <StatCard
        value={card.signup_bonus?.toLocaleString()}
        label={`${card.bonus_type} bonus`}
        emphasis="primary"
      />
    </Row>

    <Section title="Benefits">
      <Stack gap="sm">
        {card.benefits.map(b => (
          <ListItem
            key={b.id}
            leftIcon={categoryIcon(b.category)}
            title={b.title}
            subtitle={`$${b.value} ${b.frequency}`}
          />
        ))}
      </Stack>
    </Section>

    <Section title="Earning rates">
      {Object.entries(card.category_rates).map(([cat, rate]) => (
        <ListItem key={cat} title={cat} rightElement={<Text variant="mono">{rate}x</Text>} />
      ))}
    </Section>
  </Stack>

  <StickyFooter>
    <Row gap="sm">
      <Button variant="secondary" onPress={openApplyLink}>Apply</Button>
      <Button variant="primary" fullWidth onPress={addToVault}>Add to Vault</Button>
    </Row>
  </StickyFooter>
</Container>
```

**Events:** `card_added` on "Add to Vault" tap. If free user: triggers paywall immediately after.

---

## Tab 2: Vault

### `app/(tabs)/vault/index.tsx` — Vault Home

**Purpose:** Your open cards. Free tier = up to 3, Pro = unlimited.

**Composition:**

```tsx
<Container>
  <AppHeader title="Vault" rightActions={[{ icon: "plus", onPress: addCard }]} />

  {!isPro && (
    <AlertBanner
      variant="info"
      title={`${cards.length}/3 free cards`}
      action={{ label: "Upgrade", onPress: showPaywall }}
    />
  )}

  {cards.length === 0 ? (
    <EmptyState
      icon="credit-card"
      title="Your Vault is empty"
      description="Add a card to track benefits, fees, and earnings."
      action={{ label: "Browse cards", onPress: () => router.push('/discover/browse') }}
    />
  ) : (
    <Grid mobile={1} tablet={2} desktop={3} gap="md">
      {cards.map(card => <UserCardTile key={card.id} card={card} onPress={...} />)}
    </Grid>
  )}

  {/* Pro features teased if free */}
  {!isPro && cards.length > 0 && (
    <Surface variant="card" padding="lg">
      <Stack gap="sm">
        <Badge variant="pro" label="Pro" />
        <Text variant="heading3">See what you're missing</Text>
        <Text variant="body" color="secondary">
          Benefits dashboard. Fee tracker. Retention advisor.
        </Text>
        <Button variant="primary" onPress={showPaywall}>Start 14-day trial</Button>
      </Stack>
    </Surface>
  )}
</Container>
```

---

### `app/(tabs)/vault/[id].tsx` — User Card Detail (Pro)

**Purpose:** Full view of a card in vault with benefits tracking.

**Composition:** Similar to Card Detail but with user data bound — benefits checked/unchecked, progress toward fee breakeven, calendar of upcoming resets.

**Pro-only.** Free tier shows paywall.

---

### `app/(tabs)/vault/optimize.tsx` — Spend Optimizer (Phase 6)

Not built in early phases. Specced in `MASTER_PROGRESS_TRACKER.md` Phase 6.

---

## Tab 3: Tracker

### `app/(tabs)/tracker/_layout.tsx` — Tracker Tab Nav

Sub-tabs: Ledger / Velocity / Portfolio / Fees.

On first-ever visit: household setup modal (see Phase 1 in `MASTER_PROGRESS_TRACKER.md`).

```tsx
<Stack>
  <HouseholdSetupModal visible={isFirstTime} onComplete={...} />
  <Tabs
    tabs={[
      { id: 'ledger', label: 'Ledger' },
      { id: 'velocity', label: 'Velocity', badge: warnings.length },
      { id: 'portfolio', label: 'Portfolio' },
      { id: 'fees', label: 'Fees', badge: upcomingFees.length },
    ]}
    selected={activeTab}
    onChange={setActiveTab}
  />
  <Slot />
</Stack>
```

---

### `app/(tabs)/tracker/index.tsx` — Ledger List

**Purpose:** The spreadsheet, replaced.

**Composition:**

```tsx
<Container>
  <Row gap="sm">
    {householdMembers.map(m => (
      <FilterChip
        key={m.id}
        label={m.name}
        selected={memberFilter === m.id}
        onPress={() => setMemberFilter(m.id)}
      />
    ))}
    <FilterChip label="All" selected={!memberFilter} onPress={() => setMemberFilter(null)} />
  </Row>

  <Row gap="sm">
    <FilterChip label="Open" selected={statusFilter === 'open'} onPress={...} />
    <FilterChip label="Closed" selected={statusFilter === 'closed'} onPress={...} />
    <FilterChip label="Pending" selected={statusFilter === 'pending'} onPress={...} />
  </Row>

  {applications.length === 0 ? (
    <EmptyState
      icon="list"
      title="No applications yet"
      description="Import your spreadsheet or add your first card."
      action={{ label: "Add application", onPress: openAddForm }}
    />
  ) : (
    <Stack gap="sm">
      {applications.map(app => (
        <LedgerRow
          key={app.id}
          application={app}
          onPress={() => router.push(`/tracker/${app.id}`)}
        />
      ))}
    </Stack>
  )}

  <FAB icon="plus" onPress={openAddForm} />
</Container>
```

**LedgerRow component** (add to `components/composed/`):
- Card art thumbnail (small)
- Card name + member chip
- Applied month
- Status badge
- If active bonus: progress bar + deadline
- If fee due soon: amber badge

---

### `app/(tabs)/tracker/add.tsx` — Add Application

**Purpose:** Form to add a new application.

**Composition:**

```tsx
<Container>
  <AppHeader title="Add application" leftAction={{ icon: "x", onPress: cancel }} />

  <Stack gap="md">
    <FormField label="Card">
      <CardSearchInput
        onSelect={card => {
          setCardId(card.id);
          setAnnualFee(card.annual_fee);
          setMinSpend(card.signup_bonus_min_spend);
          setBonusAmount(card.signup_bonus);
        }}
      />
    </FormField>

    <FormField label="Household member">
      <Select options={members} value={memberId} onChange={setMemberId} />
    </FormField>

    <FormField label="Applied month">
      <MonthPicker value={appliedMonth} onChange={setAppliedMonth} />
    </FormField>

    <FormField label="Status">
      <Select
        options={[
          { value: 'pending', label: 'Pending' },
          { value: 'active', label: 'Approved (active)' },
          { value: 'denied', label: 'Denied' },
        ]}
        value={status}
        onChange={setStatus}
      />
    </FormField>

    <FormField label="Credit bureau">
      <Select options={BUREAU_OPTIONS} value={bureau} onChange={setBureau} />
    </FormField>

    <FormField label="Annual fee" prefix="$">
      <Input type="number" value={annualFee} onChangeText={setAnnualFee} />
    </FormField>

    {/* Bonus details only shown if status=active */}
    {status === 'active' && (
      <>
        <FormField label="Signup bonus">
          <Input type="number" value={bonusAmount} onChangeText={setBonusAmount} />
        </FormField>
        <FormField label="Min spend" prefix="$">
          <Input type="number" value={minSpend} onChangeText={setMinSpend} />
        </FormField>
        <FormField label="Spend window (months)">
          <Input type="number" value={spendMonths} onChangeText={setSpendMonths} />
        </FormField>
      </>
    )}

    <FormField label="Notes (optional)">
      <Input type="multiline" value={notes} onChangeText={setNotes} />
    </FormField>
  </Stack>

  <StickyFooter>
    <Button variant="primary" onPress={save} loading={saving}>Save application</Button>
  </StickyFooter>
</Container>
```

**Smart prefill:** When user picks a card from catalog, auto-fill annual_fee, bonus_amount, min_spend, spend_months from the catalog row.

---

### `app/(tabs)/tracker/[id].tsx` — Application Detail / Edit

**Purpose:** View and edit a single application.

**Composition:**

```tsx
<Container>
  <AppHeader title={app.card_name} leftAction={{ icon: "arrow-left" }} />

  <Stack gap="lg">
    <CardArt card={catalogCard} />

    {app.status === 'active' && app.bonus_min_spend > 0 && !app.bonus_achieved && (
      <Section title="Bonus progress">
        <ProgressBar
          current={app.bonus_spend_progress}
          total={app.bonus_min_spend}
          showLabel
        />
        <Text variant="caption">
          {daysUntil(app.bonus_spend_deadline)} days left · Need ${perDay}/day
        </Text>
      </Section>
    )}

    <Section title="Details">
      <ListItem title="Applied" rightElement={<Text variant="mono">{app.applied_month}</Text>} />
      <ListItem title="Status" rightElement={<Badge variant={statusToVariant(app.status)} label={app.status} />} />
      <ListItem title="Annual fee" rightElement={<Text variant="mono">${app.annual_fee}</Text>} />
      <ListItem title="Credit bureau" rightElement={<Text>{app.credit_bureau}</Text>} />
      <ListItem title="Counts 5/24" rightElement={<Text>{app.counts_toward_5_24 ? "Yes" : "No"}</Text>} />
    </Section>

    {retentionOutcomes.length > 0 && (
      <Section title="Retention history">
        {retentionOutcomes.map(r => <RetentionOutcomeRow key={r.id} outcome={r} />)}
      </Section>
    )}

    {app.notes && (
      <Section title="Notes">
        <Text variant="body">{app.notes}</Text>
      </Section>
    )}
  </Stack>

  <StickyFooter>
    <Row gap="sm">
      <Button variant="secondary" onPress={edit}>Edit</Button>
      <Button variant="destructive" onPress={confirmDelete}>Delete</Button>
    </Row>
  </StickyFooter>
</Container>
```

---

### `app/(tabs)/tracker/velocity.tsx` — Velocity Dashboard (Phase 2)

**Purpose:** Per-issuer velocity status.

**Composition:**

```tsx
<Container>
  <Row gap="sm">
    {householdMembers.map(m => <FilterChip ... />)}
  </Row>

  <Stack gap="md">
    {issuers.map(issuer => (
      <IssuerVelocityCard key={issuer} summary={velocitySummary[issuer]} />
    ))}
  </Stack>

  <Section title="Recommended next">
    <OptimalNextCard recommendation={nextRecommendation} />
  </Section>
</Container>
```

**IssuerVelocityCard** (add to `components/composed/`):
- Issuer logo + name
- Primary status (5/24 count, 1-in-90 days, etc.)
- Badge (clear / warning / blocked)
- Expandable: list specific apps factoring in
- CTA: "Apply when" (e.g., "ready now" or "after 2026-07-15")

---

### `app/(tabs)/tracker/portfolio.tsx` — Points Portfolio (Phase 4)

### `app/(tabs)/tracker/fees.tsx` — Annual Fee Timeline (Phase 5)

See `MASTER_PROGRESS_TRACKER.md` phases 4 and 5 for full specs. Build when those phases ship.

---

## Tab 4: Settings

### `app/(tabs)/settings/index.tsx` — Settings Home

**Composition:**

```tsx
<Container>
  <AppHeader title="Settings" />

  <Section title="Account">
    <ListItem title={user.email} subtitle={plan} onPress={...} />
    {isPro && <ListItem title="Manage billing" rightElement={chevron} onPress={openBillingPortal} />}
  </Section>

  <Section title="Household">
    <ListItem title="Household members" rightElement={chevron} onPress={...} />
  </Section>

  <Section title="Data">
    <ListItem
      title="Email import"
      subtitle="Forward card emails to auto-populate"
      rightElement={chevron}
      onPress={() => router.push('/settings/email-import')}
    />
    <ListItem title="Import CSV" rightElement={chevron} onPress={...} />
    <ListItem title="Export data" rightElement={chevron} onPress={...} />
  </Section>

  <Section title="Preferences">
    <ListItem
      title="Notifications"
      rightElement={<Switch value={notificationsEnabled} onValueChange={...} />}
    />
    <ListItem title="Appearance" subtitle="Light" rightElement={chevron} onPress={...} />
  </Section>

  <Section title="About">
    <ListItem title="Help" onPress={openHelp} />
    <ListItem title="Privacy policy" onPress={openPrivacy} />
    <ListItem title="Terms" onPress={openTerms} />
    <ListItem title={`Version ${appVersion}`} />
  </Section>

  <Stack gap="sm">
    <Button variant="secondary" onPress={signOut}>Sign out</Button>
  </Stack>
</Container>
```

---

### `app/(tabs)/settings/email-import.tsx` — Email Forwarding Setup (Phase 0.5)

**Purpose:** Show user their unique forward address, copy-able filter rules.

**Composition:**

```tsx
<Container>
  <AppHeader title="Email import" leftAction={{ icon: "arrow-left" }} />

  <Stack gap="lg">
    <AlertBanner
      variant="info"
      title="How it works"
      description="Forward card emails to your unique address. We parse approvals, bonuses, fees, and retention offers automatically."
    />

    <Section title="Your unique address">
      <CopyableText value={emailAlias} />
      <Text variant="caption" color="secondary">
        Only emails from recognized card issuers are processed. Anything else is discarded.
      </Text>
    </Section>

    <Section title="Gmail filter (recommended)">
      <Text variant="body">
        Add this rule in Gmail: Settings → Filters → Create filter
      </Text>
      <CopyableText
        value={`from:(chase.com OR americanexpress.com OR citi.com OR capitalone.com OR discover.com)`}
        label="From"
      />
      <CopyableText value={emailAlias} label="Forward to" />
    </Section>

    <Section title="Status">
      <ListItem title="Emails received" rightElement={<Text variant="mono">{stats.total}</Text>} />
      <ListItem title="Auto-applied" rightElement={<Text variant="mono">{stats.autoApplied}</Text>} />
      <ListItem title="Pending review" rightElement={<Text variant="mono">{stats.pending}</Text>} />
      <ListItem title="Last received" rightElement={<Text>{stats.lastReceivedAgo}</Text>} />
    </Section>

    <Stack gap="sm">
      <Button variant="secondary" onPress={sendTestEmail}>Send test email</Button>
      <Button variant="tertiary" onPress={regenerateAlias}>Regenerate address</Button>
    </Stack>
  </Stack>
</Container>
```

---

## Onboarding Screens

### `app/onboarding/index.tsx` — Pager

Uses horizontal scroll with pagination dots. Three screens, then auth.

```tsx
<Container>
  <Stack gap="lg" align="center">
    <PagerView current={page} total={3} />

    {page === 0 && <OnboardingSlide icon="search" title="Find the right card" description="..." />}
    {page === 1 && <OnboardingSlide icon="track" title="Track what you earn" description="..." />}
    {page === 2 && <OnboardingSlide icon="zap" title="Optimize every swipe" description="..." />}
  </Stack>

  <StickyFooter>
    <Row gap="sm">
      <Button variant="tertiary" onPress={skip}>Skip</Button>
      <Button variant="primary" fullWidth onPress={next}>
        {page === 2 ? "Get started" : "Next"}
      </Button>
    </Row>
  </StickyFooter>
</Container>
```

---

### `app/(auth)/login.tsx` — Sign In

Primary Apple + Google buttons, magic link as fallback.

```tsx
<Container>
  <AppHeader transparent leftAction={{ icon: "arrow-left" }} />

  <Stack gap="lg" align="center">
    <AppLogo />
    <Text variant="heading1">Sign in</Text>

    <Stack gap="sm">
      <Button variant="primary" leftIcon="apple" onPress={signInApple} fullWidth>
        Continue with Apple
      </Button>
      <Button variant="secondary" leftIcon="google" onPress={signInGoogle} fullWidth>
        Continue with Google
      </Button>
    </Stack>

    <Text variant="caption" color="secondary">or</Text>

    <FormField label="Email">
      <Input type="email" value={email} onChangeText={setEmail} />
    </FormField>
    <Button variant="primary" onPress={sendMagicLink} loading={sending} fullWidth>
      Send magic link
    </Button>
  </Stack>
</Container>
```

---

## Responsive Patterns

### Mobile (default, <768px)

- Single column everywhere
- Bottom tab bar
- Full-width components
- BottomSheet for modals
- StickyFooter for primary CTAs

### Tablet (768-1023px)

- Two-column grid for card lists
- Otherwise same as mobile

### Desktop (1024px+)

- Max-width container (1200px)
- Three-column grids for cards
- Sidebar + main for lists-with-detail (e.g., Results page)
- Modal as centered dialog (not bottom sheet)
- Top navigation possible (replaces bottom tab bar above 1024px) — Phase 9

---

## Animation Budget

- Tab switch: 150ms ease-out
- Screen push: 250ms slide from right (iOS default)
- Modal open: 250ms spring (gentle)
- Progress bar: 400ms spring on value change
- Number counter (StatCard): 600ms count-up
- Card tilt (3D): realtime, no easing (follow touch)

Do not add animations where there is no motion need. Animation-for-animation's-sake slows perceived performance.

---

## Common Mistakes to Avoid

### Mistake 1 — Building custom components inside screen files

```tsx
// WRONG
const SomeTile = ({ ... }) => <View style={{ ... }}><Text>...</Text></View>;

export default function Screen() {
  return <SomeTile />;
}
```

If `SomeTile` would be used in more than one place, put it in `components/`. If it's truly single-use, still build it with primitives.

### Mistake 2 — useEffect for data

```tsx
// WRONG
useEffect(() => {
  fetch('/api/...').then(setData);
}, []);

// RIGHT
const { data } = useQuery({ queryKey: ['...'], queryFn: () => supabase.from('...').select() });
```

### Mistake 3 — Hardcoded colors

```tsx
// WRONG
<View style={{ backgroundColor: '#FAFAF9' }}>

// RIGHT
<Surface variant="canvas">
```

### Mistake 4 — Ignoring empty states

```tsx
// WRONG
{data.length > 0 && data.map(...)}

// RIGHT
{data.length === 0 ? <EmptyState ... /> : data.map(...)}
```

### Mistake 5 — Ignoring loading states

```tsx
// WRONG
{data && data.map(...)}

// RIGHT
{isLoading ? <Skeleton /> : data.map(...)}
```

### Mistake 6 — Blocking UI on mutations

```tsx
// WRONG (button stays active during save, double-submit risk)
<Button onPress={() => mutation.mutate(...)}>Save</Button>

// RIGHT
<Button loading={mutation.isPending} onPress={() => mutation.mutate(...)}>Save</Button>
```

---

## Accessibility Checklist (Every Screen)

- [ ] All interactive elements have `accessibilityLabel`
- [ ] All icons in interactive contexts have labels
- [ ] Color contrast ≥4.5:1 for body text, ≥3:1 for large text
- [ ] No information conveyed by color alone
- [ ] Focus order logical when navigating with keyboard (web)
- [ ] Minimum 44×44pt tap targets on mobile
- [ ] Form fields have explicit labels, not just placeholders
- [ ] Loading states announced to screen readers (`accessibilityLiveRegion`)
- [ ] Error messages announced on submit failure

---

## PostHog Events (Per Screen)

Wire these events from `MASTER_PROGRESS_TRACKER.md` Phase 0 Task 7.

| Screen | Event | Trigger |
|---|---|---|
| Discover home | — | — |
| Quiz | `quiz_start` | First question renders |
| Quiz | `quiz_complete` | Results render |
| Card detail | `card_added` | "Add to Vault" tapped |
| Any | `paywall_viewed` | Paywall modal opens |
| Auth | `signup` | New account created |
| Any tab | `app_open` | App foreground (once/session) |

Do not add undocumented events.

---

## Testing Each Screen

Before declaring a screen done:

1. Renders without console errors
2. Loading, empty, error states all rendered deliberately
3. PostHog events fire (check network tab)
4. DevToggle MOB and DSK both look correct
5. Accessibility checklist passes
6. Playwright E2E test for this screen passes (from `QA_LAYER_2_E2E_TESTS.md`)
7. Sentry shows zero errors during manual test run
8. Updated AGENT_HANDOFF.md with screenshots + notes

---

## Phase Integration

| Phase | Screens built |
|---|---|
| Phase 0 | Onboarding, Auth, Discover Home, Quiz, Results, Browse, Card Detail, Vault Home (basic), Settings Home, Paywall |
| Phase 0.5 | Email Import Setup, Admin Proposals |
| Phase 1 | Tracker layout, Ledger List, Add Application, Application Detail, Household Setup, CSV Import |
| Phase 2 | Velocity Dashboard, IssuerVelocityCard |
| Phase 3 | Bonus spend UI (integrated into Application Detail) |
| Phase 4 | Points Portfolio |
| Phase 5 | Annual Fee Timeline, Retention Log |
| Phase 6 | Spend Optimizer |
| Phase 7 | Deal Passport, Deal Detail |
| Phase 8 | Refined Onboarding (value-first) |
| Phase 9 | Desktop layouts |
| Phase 10 | Polish, card art, animations |

Build in phase order. Do not pre-build screens for phases not yet started — specs will drift.

---

## Session Close Checklist

Every screen-build session ends with:

- [ ] Screen renders cleanly in MOB and DSK modes
- [ ] All states (loading/empty/error) tested
- [ ] Primitives used consistently, no bespoke styling
- [ ] Playwright test from `QA_LAYER_2_E2E_TESTS.md` updated if needed
- [ ] `AGENT_HANDOFF.md` updated with what was built
- [ ] Commit with descriptive message (do not push without Zubair's OK)

---

## Anti-Goals

- **Do not redesign screens that already work.** If a screen ships clean, leave it until there's a reason to revisit.
- **Do not introduce animations that serve no user goal.**
- **Do not pixel-push against designs that don't exist.** If there's no design, the primitive spec IS the design.
- **Do not add features during screen-build.** Screen-build is composition, not invention. Feature scope comes from `MASTER_PROGRESS_TRACKER.md`.
- **Do not batch sessions.** One screen per session. Quality > velocity.
