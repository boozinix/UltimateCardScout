# UI Design System — Claude Code Brief

> **Target:** Build the component library + design system catalog from `lib/theme.ts`.
> **Duration:** 5-7 days.
> **This is a prompt file for Claude Code.** Hand this to Claude Code as-is.
> **Philosophy:** Build primitives once. Review. Then every screen afterward is assembled from reviewed parts. This is the "design-system-first" path — no custom component design per screen.

---

## Why Before What

Your UI has drifted. Screens have inconsistent spacing, buttons with different padding, colors that are close-but-not-identical. This happens when you design per-screen. The fix is to build a small number of primitives, review them carefully once, and then enforce that every screen uses them.

After this phase, any time you're tempted to write `<View style={{ backgroundColor: '#FAFAF9', padding: 16 }}>`, stop. Use `<Surface>`. If the primitive doesn't exist yet, add it to this file first, build it once, reuse forever.

---

## Approach: DesignSystemScreen, Not Storybook

Storybook works on RN but the setup overhead isn't worth it for a solo builder. Instead:

Build `app/dev/design-system.tsx` — a single dev-only screen that renders every primitive in every state. Accessible via the DevToggle menu (or `/dev/design-system` URL on web). Hidden in production builds.

Every primitive lives in `components/primitives/`. Every composed component in `components/composed/`. The design-system screen imports everything and displays it.

---

## Step 1 — Read These Files First

Before building, read:

1. `lib/theme.ts` — the design tokens (colors, typography, spacing, radii, shadows)
2. `MASTER_PROGRESS_TRACKER.md` — locked decisions, especially "theme: light editorial"
3. `components/` directory — what's already been built
4. `app/(tabs)/**` — how existing screens are structured

Do not modify `lib/theme.ts` values. If a token is missing, flag it — do not add tokens opportunistically.

---

## Step 2 — Audit Existing Components

List every custom component currently in `components/` and categorize:

- **Keep and formalize:** component works, needs cleanup and state coverage
- **Replace:** component exists but is inconsistent with theme — rewrite as primitive
- **Delete:** component is duplicate or orphaned

Write the audit output to `UI_DESIGN_SYSTEM_AUDIT.md` at the repo root. I'll review before you rebuild anything.

---

## Step 3 — Build Primitives (in this exact order)

### Atoms (build first — everything depends on these)

#### `<Text>`
**File:** `components/primitives/Text.tsx`

Variants (via prop):
- `display` — Playfair Display, 40-48px, used for hero numbers
- `heading1` — Playfair, 28-32px
- `heading2` — Playfair, 22-24px
- `heading3` — Inter semibold, 18-20px
- `body` — Inter regular, 15-16px (default)
- `bodySmall` — Inter regular, 13-14px
- `caption` — Inter regular, 12px, secondary color
- `mono` — Geist Mono, 14-15px, tabular-nums (used for money/numbers)
- `label` — Inter medium, 13px, uppercase, letter-spacing 0.5

All variants support:
- `color` prop (primary/secondary/muted/inverse/danger/success/warning)
- `align` (left/center/right)
- `weight` override (light/regular/medium/semibold/bold)
- `numberOfLines` passthrough

Acceptance: render all 9 variants in DesignSystemScreen with sample text "The quick brown fox 1234567890"

---

#### `<Button>`
**File:** `components/primitives/Button.tsx`

Variants:
- `primary` — filled blue, white text
- `secondary` — outlined, blue text
- `tertiary` — no border, blue text (link-style)
- `destructive` — filled red, white text
- `icon` — circular, icon only

Sizes:
- `sm` — 32px height
- `md` — 44px height (default, iOS min tap target)
- `lg` — 52px height

States:
- default
- pressed (Pressable with opacity animation)
- disabled
- loading (shows spinner, disables interaction)

Props:
- `onPress: () => void | Promise<void>` — auto-show loading on promise
- `leftIcon` / `rightIcon` (from lucide-react-native)
- `fullWidth?: boolean`
- `haptic?: 'light' | 'medium' | 'heavy' | false` (default light on primary)

Acceptance: render all variants × sizes × states grid in DesignSystemScreen.

---

#### `<Input>`
**File:** `components/primitives/Input.tsx`

Variants:
- `text` (default)
- `email` (keyboardType + autoCapitalize)
- `number` (numeric keyboard, optional decimal)
- `password` (secureTextEntry with show/hide toggle)
- `search` (with search icon + clear button)
- `multiline` (textarea, 3-6 lines)

States:
- default
- focused (border becomes primary color)
- error (border red, error message below)
- disabled
- loading (right-side spinner)

Props:
- `label?: string`
- `error?: string`
- `helperText?: string`
- `prefix?: React.ReactNode` (e.g. "$" for currency)
- `suffix?: React.ReactNode`
- standard TextInput props passthrough

Acceptance: every variant × every state in DesignSystemScreen.

---

#### `<Surface>`
**File:** `components/primitives/Surface.tsx`

The base container. Replaces raw `<View>` for any bounded visual element.

Variants:
- `canvas` — base background (`theme.colors.canvas`)
- `card` — elevated surface, subtle shadow
- `glass` — frosted glass look with backdrop-filter (expo-blur)
- `gradient` — accepts gradient tokens
- `inset` — inset look, used for input backgrounds

Props:
- `padding` — spacing token (xs/sm/md/lg/xl)
- `radius` — radius token (sm/md/lg/full)
- `shadow` — shadow token (none/sm/md/lg)
- `border?: boolean`

Acceptance: render all variants with sample content.

---

#### `<Icon>`
**File:** `components/primitives/Icon.tsx`

Wrapper around lucide-react-native. Enforces consistent sizing and color.

Sizes: `xs` (12), `sm` (16), `md` (20), `lg` (24), `xl` (32)

Props:
- `name: LucideIconName`
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number`
- `color?: ColorToken`

Acceptance: render a grid of 20 commonly-used icons at md size.

---

#### `<Badge>`
**File:** `components/primitives/Badge.tsx`

Small pill for status indicators.

Variants:
- `neutral` (grey)
- `success` (green)
- `warning` (amber)
- `danger` (red)
- `info` (blue)
- `pro` (gold-ish, used for paid features)

Sizes: `sm`, `md`

Props:
- `label: string`
- `leftIcon?: IconName`
- `dot?: boolean` (shows colored dot prefix)

Acceptance: render all variants + sizes combinations.

---

#### `<Spinner>` and `<Skeleton>`
**Files:** `components/primitives/Spinner.tsx`, `components/primitives/Skeleton.tsx`

`<Spinner>` — circular loader, sizes xs/sm/md/lg, accepts color token

`<Skeleton>` — shimmer placeholder block. Props: `width`, `height`, `radius`. Used for loading states on cards/lists.

Acceptance: spinner at all sizes, skeleton in 3 common shapes (card, list item, text line).

---

#### `<Checkbox>`, `<Radio>`, `<Switch>`
**Files:** `components/primitives/Checkbox.tsx`, etc.

Standard form primitives. Each:
- Controlled (`value`, `onValueChange`)
- States: default, checked, disabled, error
- Optional `label` prop

Acceptance: all three shown in DesignSystemScreen with label + standalone variants.

---

### Molecules (compose atoms)

#### `<FormField>`
**File:** `components/composed/FormField.tsx`

Wraps Input + label + helper text + error consistently. Used everywhere a form input appears.

```tsx
<FormField label="Email" helperText="We'll send a magic link" error={errors.email}>
  <Input value={email} onChangeText={setEmail} type="email" />
</FormField>
```

---

#### `<StatCard>`
**File:** `components/composed/StatCard.tsx`

Big number + label + optional trend + optional progress bar. Used everywhere metrics render (5/24 count, portfolio total, benefits captured).

Props:
- `value: string | number`
- `label: string`
- `trend?: { value: number; direction: 'up' | 'down' | 'neutral' }`
- `progress?: { current: number; total: number }`
- `emphasis?: 'default' | 'primary' | 'success' | 'warning' | 'danger'`

Uses `<Text variant="display">` for the number. Uses `<Text variant="caption">` for the label.

Acceptance: 4 StatCards shown with different emphasis states.

---

#### `<ProgressBar>`
**File:** `components/composed/ProgressBar.tsx`

Horizontal progress. Used for bonus spend progress, annual fee breakeven, etc.

Props:
- `current: number`
- `total: number`
- `variant?: 'default' | 'success' | 'warning' | 'danger'` (auto-color based on percentage if not specified: >80% green, 50-80% amber, <50% red — customizable per-instance)
- `showLabel?: boolean` — "73%" or "$3,450 / $5,000"
- `animated?: boolean` (Reanimated spring)

---

#### `<ListItem>`
**File:** `components/composed/ListItem.tsx`

Standard row for lists (ledger, vault, settings, etc.).

Slots:
- `leftIcon?` / `leftAvatar?`
- `title` (required)
- `subtitle?`
- `rightElement?` (chevron, value text, badge, button)
- `onPress?`

Variants:
- `default`
- `compact`
- `detailed` (two lines of subtitle)

Acceptance: 5-6 list items shown, covering typical use cases (settings row, card row, ledger row, etc.)

---

#### `<Chip>` and `<FilterChip>`
**Files:** `components/composed/Chip.tsx`, `components/composed/FilterChip.tsx`

Tappable pills for filters and tags. Different from `<Badge>` (which is purely visual).

Props:
- `label`
- `selected?: boolean`
- `onPress?: () => void`
- `onRemove?: () => void` (shows X icon)
- `leftIcon?`

Used for household member filter, category filters, issuer filters.

---

#### `<Tabs>` (Segmented Control)
**File:** `components/composed/Tabs.tsx`

Horizontal tab selector (different from bottom nav tabs). Used for sub-tabs inside screens.

Props:
- `tabs: { id: string; label: string; badge?: number }[]`
- `selected: string`
- `onChange: (id: string) => void`

Acceptance: 3-tab and 5-tab variants.

---

#### `<BottomSheet>`
**File:** `components/composed/BottomSheet.tsx`

Drag-to-dismiss modal from bottom. Used for card details, quick edits, confirmations.

Props:
- `visible: boolean`
- `onClose: () => void`
- `snapPoints?: number[]` (e.g. [0.4, 0.9] for partial and full height)
- `children: ReactNode`
- `title?: string`

Reanimated-based. Drag handle always visible.

---

#### `<Modal>` (Dialog)
**File:** `components/composed/Modal.tsx`

Centered dialog for desktop. On mobile, falls back to BottomSheet. Same API as BottomSheet.

Acceptance: DesignSystemScreen demonstrates both mobile and desktop modes via DevToggle.

---

#### `<EmptyState>`
**File:** `components/composed/EmptyState.tsx`

Shown when a list has no data.

Props:
- `icon` or `illustration`
- `title`
- `description?`
- `action?: { label: string; onPress: () => void }`

Used on: empty ledger, empty vault, empty deals feed, empty search results.

---

#### `<AlertChip>` / `<AlertBanner>`
**Files:** `components/composed/AlertChip.tsx`, `components/composed/AlertBanner.tsx`

Inline warnings/tips. Chip is small, Banner is full-width.

Props:
- `variant: 'info' | 'success' | 'warning' | 'danger'`
- `title: string`
- `description?: string`
- `action?: { label; onPress }`
- `dismissible?: boolean`

Used for: "Your Amex Plat fee posts in 12 days", "Velocity: You're at 4/24, next card should be Amex or business", etc.

---

### Organisms (app-specific composed)

#### `<CardArt>`
**File:** `components/composed/CardArt.tsx`

Visual representation of a credit card. 1.586:1 ratio.

Props:
- `card: Card` (from catalog) or manual props
- `variant?: 'flat' | '3d-tilt'` (tilt on hover/press, Reanimated)
- `showDetails?: boolean` (last 4, name)

Background: gradient from theme.gradients per issuer, or actual card image if available. Issuer network logo bottom-right. Card name and last-4 if shown.

Acceptance: render 4 different cards side-by-side.

---

#### `<PaywallModal>`
**File:** `components/composed/PaywallModal.tsx`

The single most important conversion screen. Exists as BottomSheet on mobile, Dialog on desktop.

Structure:
- Header: context-specific ("Unlock the Ledger" or "Unlock unlimited cards")
- 2-3 bullet points of what unlocks
- Monthly / Annual toggle
- Price display with trial messaging
- Primary CTA: "Start 14-day free trial"
- Secondary: "Maybe later" (always visible, always works)

Props:
- `visible`, `onClose`
- `trigger: 'card_added' | 'feature_gate' | 'manual'` (affects copy)
- `recommendedPlan?: 'monthly' | 'annual'` (annual if user adds 3+ cards, monthly otherwise)

Acceptance: render in DesignSystemScreen for all three triggers.

---

#### `<TabBar>` (bottom nav)
**File:** `components/composed/TabBar.tsx`

The four-tab navigator. Already exists but probably needs polish. Discover / Vault / Tracker / Settings.

Requirements:
- Active tab color: primary blue
- Inactive: muted secondary
- Optional badge dots (e.g., red dot on Tracker when proposals are pending)
- Safe area inset respected
- 44px min tap target
- Haptic feedback on switch (light)

---

#### `<AppHeader>`
**File:** `components/composed/AppHeader.tsx`

Top header for screens.

Props:
- `title: string`
- `subtitle?: string`
- `leftAction?: { icon; onPress }` (e.g., back button)
- `rightActions?: { icon; onPress }[]` (e.g., filter, add)
- `transparent?: boolean` (for hero screens that have their own header imagery)

---

## Step 4 — DesignSystemScreen Layout

Build `app/dev/design-system.tsx` with sections:

```
┌─ Foundations ─────────────────────┐
│ Color palette (all tokens)         │
│ Typography (all variants)          │
│ Spacing scale (visual)             │
│ Radii scale                        │
│ Shadows scale                      │
└───────────────────────────────────┘

┌─ Atoms ───────────────────────────┐
│ Buttons (all variants × sizes)    │
│ Inputs (all variants × states)    │
│ Text (all variants)               │
│ Icons (common 20)                 │
│ Badges                            │
│ Spinners / Skeletons              │
│ Form elements (checkbox/radio/switch) │
└───────────────────────────────────┘

┌─ Molecules ───────────────────────┐
│ FormField                         │
│ StatCard                          │
│ ProgressBar                       │
│ ListItem                          │
│ Chip                              │
│ Tabs                              │
│ BottomSheet / Modal (triggered)   │
│ EmptyState                        │
│ AlertChip / AlertBanner           │
└───────────────────────────────────┘

┌─ Organisms ───────────────────────┐
│ CardArt                           │
│ PaywallModal (triggered)          │
│ AppHeader (preview)               │
└───────────────────────────────────┘

┌─ Dark mode toggle (future) ───────┐
│ DevToggle between mobile/desktop  │
└───────────────────────────────────┘
```

Each primitive appears with:
- Its name
- All variants side-by-side
- All states (default/hover/disabled/loading)
- Code snippet showing usage (toggle via button)

Gate behind `if (!__DEV__) return null` at the top of the component.

Add a route in the dev-only nav: `/dev/design-system`.

---

## Step 5 — Replacement Pass

After primitives are built and reviewed, do a sweep of existing screens:

- Replace every raw `<View style={{ backgroundColor: ... }}>` with `<Surface>`
- Replace every `<Text style={{ fontSize: 18, fontFamily: 'Playfair-Display' }}>` with `<Text variant="heading2">`
- Replace every `TouchableOpacity` with `<Button>` or `<Pressable>` as appropriate
- Replace bespoke modals with `<BottomSheet>` / `<Modal>`

This pass alone will visibly improve the app's consistency without any new features.

---

## Step 6 — Responsive Layout Primitives

After core primitives work, build:

### `<Stack>` and `<Row>`
Simple flex layout helpers.

```tsx
<Stack gap="md">
  <Text>...</Text>
  <Button>...</Button>
</Stack>

<Row gap="sm" align="center">
  <Icon name="check" />
  <Text>Saved</Text>
</Row>
```

### `<Container>`
Page-level wrapper with consistent horizontal padding, max-width on desktop.

```tsx
<Container>
  <AppHeader title="Vault" />
  <Stack>...</Stack>
</Container>
```

Auto-applies:
- Mobile: 16px horizontal padding, no max-width
- Desktop: centered with 1200px max-width, 32px padding

### `<Grid>`
Responsive grid with mobile fallback.

```tsx
<Grid mobile={1} tablet={2} desktop={3} gap="md">
  {cards.map(card => <CardArt key={card.id} card={card} />)}
</Grid>
```

---

## Step 7 — Animation Tokens

Add to `lib/theme.ts` (only token addition allowed during this phase):

```ts
export const motion = {
  spring: {
    gentle: { damping: 20, stiffness: 180 },
    quick: { damping: 15, stiffness: 280 },
    bouncy: { damping: 10, stiffness: 180 },
  },
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  easing: {
    standard: [0.4, 0.0, 0.2, 1],
    enter: [0.0, 0.0, 0.2, 1],
    exit: [0.4, 0.0, 1, 1],
  },
};
```

Use these consistently. No raw `withSpring({ damping: 17, stiffness: 200 })` scattered across components.

---

## Hard Rules

1. **Every component prop is typed.** No `any`. No implicit any.
2. **Every component forwards ref appropriately** if it wraps an RN primitive.
3. **Every component respects dark mode tokens** even though dark mode ships in Phase 10 — use `theme.colors.textPrimary`, not `#1B1B1B`. Means later toggle is trivial.
4. **No inline styles** in any primitive. Use theme tokens.
5. **Every interactive primitive has keyboard accessibility** (web) and VoiceOver labels.
6. **Every component has one file, one default export.** No barrel files for primitives.
7. **Components render in <16ms** on first render (check with React DevTools profiler).

---

## Definition of Done

Phase UI-1 is complete when:

1. DesignSystemScreen shows every primitive listed above
2. Every primitive has default + disabled + loading states visible
3. Existing screens (Discover, Vault, Tracker, Settings) have been swept to use primitives
4. No raw `<View>` with background color or `<Text>` with font style remain in app screens
5. `lib/theme.ts` has no unused tokens AND no hardcoded colors bypass it
6. DevToggle switches between mobile and desktop cleanly in the DesignSystemScreen
7. A "dark mode" section in DesignSystemScreen demonstrates tokens work (even if no app-level toggle yet)

---

## Output Deliverables

By end of session:

- `components/primitives/*.tsx` — 10-12 files
- `components/composed/*.tsx` — 12-15 files
- `app/dev/design-system.tsx` — the catalog
- `UI_DESIGN_SYSTEM_AUDIT.md` — what was replaced / kept / deleted
- Updated `AGENT_HANDOFF.md` with: primitives built, replacement sweep status, next recommended step

Do NOT build new screens in this phase. Screen building is `UI_SCREENS_PROMPT.md` — separate session.

---

## Anti-Goals (Do NOT Do)

- **Do not install Storybook.** Setup overhead too high for solo.
- **Do not introduce new typography libraries.** Playfair + Inter + Geist Mono are locked.
- **Do not add Shadcn/ui or any component library.** Custom primitives only.
- **Do not redesign the theme.** Tokens are locked. If you hate a token, flag it but don't change it in this phase.
- **Do not skip dark mode tokens.** Even if dark mode ships Phase 10, wire the tokens now.
- **Do not leave inline styles in any primitive.** Zero tolerance.

---

## When Stuck

If you encounter any of these, stop and ask Zubair:

- A primitive needs a prop that isn't obvious from the spec
- Two tokens conflict (e.g., two different "card" shadow values in theme.ts)
- A component could reasonably be built 2-3 ways with different tradeoffs
- A feature currently in screens can't be expressed with the primitive set — might need new primitive

The goal is: after this session, building a new screen is "assemble from components like Lego," not "design from scratch."
