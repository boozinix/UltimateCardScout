# Motion Spec

> **Purpose:** A complete, executable spec for motion across CardScout. Seven patterns, applied consistently, cover 100% of the app.
> **Phase:** Applied in Phase 10 (polish). Not before.
> **Philosophy:** Subtle, considered, physical. Users should feel the app as responsive — not watch it perform.
> **Implementation:** Reanimated 3 for anything gesture- or state-driven. Moti for one-off entrances where DX matters more than the extra frame. Never use React Native's built-in `Animated` API for any of this.

---

## The Rules Before the Patterns

Read these first. They govern every decision below.

1. **Motion exists to communicate state change, not to decorate.** If a user can't articulate what the animation told them, it shouldn't be there.
2. **60fps or nothing.** Any animation that drops frames on a low-end Android feels worse than no animation.
3. **Interrupt gracefully.** Every animation can be cancelled by the next user action. No animation locks UI.
4. **Respect reduced motion.** `useReducedMotion()` from Reanimated. If true, animations collapse to instant or ~100ms fades.
5. **No animation on first paint.** Initial screen render is instant. Motion happens when something *changes*, not when something appears for the first time.
6. **Don't stagger.** Tempting, always wrong for this product. Stagger reads as performative.
7. **Exit animations are 60% the duration of entrance animations.** Gone feels faster than arriving. Always.

---

## Shared Tokens

Add to `lib/theme.ts` under `motion` (only token addition allowed outside of design-system phase):

```ts
export const motion = {
  duration: {
    instant: 0,
    fast: 120,       // taps, state flips
    normal: 200,     // list items, modals
    medium: 350,     // shared element transitions
    slow: 600,       // status crossfades, long morphs
  },
  spring: {
    tap: { damping: 25, stiffness: 400, mass: 0.5 },
    sheet: { damping: 22, stiffness: 180, mass: 1 },
    number: { damping: 18, stiffness: 200, mass: 1 },
    list: { damping: 24, stiffness: 260, mass: 0.8 },
  },
  easing: {
    standard: Easing.bezier(0.4, 0.0, 0.2, 1),   // most things
    enter: Easing.bezier(0.0, 0.0, 0.2, 1),      // things appearing
    exit: Easing.bezier(0.4, 0.0, 1, 1),          // things leaving
  },
};
```

These seven values are the entire motion vocabulary. Never use raw numbers anywhere else.

---

## Pattern 1 — Number Morph

**When:** Any numeric value changes while visible. 5/24 counts, portfolio totals, bonus progress, days remaining, retention offer amounts.

**Not when:** Initial render (number just appears). Loading state transitioning to loaded (use skeleton instead).

**Behavior:** Digits morph from old to new over `motion.duration.slow` with `motion.spring.number`. Tabular-figure font required (Geist Mono with `font-variant-numeric: tabular-nums` on web, font-feature-settings on mobile) so digits don't jitter on width change.

**Reference implementation:**

```tsx
// components/primitives/AnimatedNumber.tsx
import Animated, { useSharedValue, useAnimatedProps, withSpring } from 'react-native-reanimated';
import { TextInput } from 'react-native';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function AnimatedNumber({
  value,
  format = (n: number) => n.toLocaleString(),
  style,
}: {
  value: number;
  format?: (n: number) => string;
  style?: TextStyle;
}) {
  const animatedValue = useSharedValue(value);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    animatedValue.value = reducedMotion
      ? value
      : withSpring(value, motion.spring.number);
  }, [value, reducedMotion]);

  const animatedProps = useAnimatedProps(() => ({
    text: format(Math.round(animatedValue.value)),
    defaultValue: format(Math.round(animatedValue.value)),
  }));

  return (
    <AnimatedTextInput
      editable={false}
      style={[{ fontFamily: 'GeistMono', fontVariant: ['tabular-nums'] }, style]}
      animatedProps={animatedProps}
    />
  );
}
```

**Usage:**

```tsx
<AnimatedNumber value={velocitySummary.chase.count} />
<AnimatedNumber value={portfolioTotal} format={(n) => `$${n.toLocaleString()}`} />
```

**Critical:** Use `TextInput` not `Text`. Reanimated can only animate props on `TextInput`. Counterintuitive but required.

---

## Pattern 2 — List Settlement

**When:** Items appear in or disappear from a list. New application added to Ledger, benefit marked used, deal dismissed, card added to Vault.

**Not when:** Initial list render. Scrolling existing items into view. Tab switches.

**Behavior:**
- **Insert:** Slide down 8px + fade from 0 to 1 over `motion.duration.normal` with `motion.easing.enter`.
- **Delete:** Collapse height to 0 + fade to 0 over `motion.duration.fast` (60% of insert — exits are faster).
- No stagger. If 5 items arrive at once, they all animate together.

**Reference implementation:**

Use Reanimated's `LinearTransition` + `FadeInDown` + `FadeOutUp` entering/exiting animations:

```tsx
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

<Animated.View layout={LinearTransition.duration(motion.duration.normal)}>
  {items.map(item => (
    <Animated.View
      key={item.id}
      entering={FadeInDown.duration(motion.duration.normal).easing(motion.easing.enter)}
      exiting={FadeOutUp.duration(motion.duration.fast).easing(motion.easing.exit)}
    >
      <LedgerRow application={item} />
    </Animated.View>
  ))}
</Animated.View>
```

**Delete pattern with undo toast:** when deleted, row collapses. Toast appears from bottom with 5-second timer. Undo restores with insert animation. Never hard-delete synchronously.

---

## Pattern 3 — Tap Feedback (Physical Weight)

**When:** Every interactive element. Buttons, cards, list items, chips, tabs, anything `Pressable`.

**Not when:** Disabled elements. Text inputs (they have their own focus behavior).

**Behavior:**
- Press in: scale to 0.97 over `motion.duration.fast`.
- Press out or release: scale back to 1.0 over `motion.duration.fast`.
- If the press turns into a long press or drag, scale stays at 0.97 until released.
- On mobile: light haptic (`Haptics.ImpactFeedbackStyle.Light`) fires on press-in for primary actions. No haptics on secondary/tertiary actions.

**Reference implementation:**

```tsx
// components/primitives/Pressable.tsx (wraps RN Pressable)
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export function Pressable({ children, haptic = false, onPress, style, ...rest }) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = reducedMotion ? 1 : withTiming(0.97, { duration: motion.duration.fast });
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: motion.duration.fast });
      }}
      onPress={onPress}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
```

**Primary Buttons** pass `haptic={true}`. Everything else omits it. This is intentional — overusing haptics makes the app feel tic-y.

---

## Pattern 4 — Shared Element Transitions (Selective)

**When:** Only when visual continuity actually helps the user understand "this thing became that thing." Use sparingly.

**Approved shared element transitions in CardScout:**
1. Ledger row card thumbnail → Application Detail screen hero
2. Card Browser tile → Card Detail hero
3. Vault tile → Vault Card Detail hero
4. Deal row card thumbnail → Deal Detail hero
5. Optimizer result card → Card Detail hero
6. Paywall "Unlock Pro" card → Checkout screen hero

Six transitions in the entire app. If you find yourself wanting to add a seventh, ask whether the visual continuity is real or whether you're just enjoying the effect.

**Behavior:** Thumbnail grows to hero position over `motion.duration.medium` using `motion.spring.sheet`. The rest of the destination screen fades in behind it over the same duration.

**Reference implementation:**

Reanimated's `SharedTransition` with Expo Router:

```tsx
import { SharedTransition } from 'react-native-reanimated';

const cardTransition = SharedTransition.duration(motion.duration.medium).defaultTransitionType('animation');

// In list:
<Link href={`/card/${card.id}`}>
  <Animated.Image
    sharedTransitionTag={`card-${card.id}`}
    sharedTransitionStyle={cardTransition}
    source={{ uri: card.image }}
  />
</Link>

// In detail screen:
<Animated.Image
  sharedTransitionTag={`card-${card.id}`}
  sharedTransitionStyle={cardTransition}
  source={{ uri: card.image }}
  style={{ height: 220 }}
/>
```

**Critical:** shared transitions depend on the tag matching across screens. Any typo or missing tag = no animation, which looks like a bug. QA checklist item in `QA_LAYER_2_E2E_TESTS.md`: visual regression test for each of the six approved transitions.

---

## Pattern 5 — Status Crossfade

**When:** A semantic state changes. Velocity status goes from blocked to clear. Bonus status changes from pending to achieved. Fee recommendation flips from Keep to Call Retention. Deal expiry changes from active to expired.

**Not when:** Loading to loaded (use skeleton). Unknown to known on first fetch (use skeleton).

**Behavior:** Badge color crossfades from old semantic color to new over `motion.duration.slow`. Text content updates at the midpoint of the crossfade (so old text fades out, new text fades in through the same element). Background color interpolates linearly.

**Reference implementation:**

```tsx
// components/primitives/StatusBadge.tsx
import Animated, { useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';

const STATUS_COLORS = {
  clear: theme.colors.success,
  wait: theme.colors.warning,
  blocked: theme.colors.danger,
  near_limit: theme.colors.warning,
};

export function StatusBadge({ status, label }) {
  const progress = useSharedValue(0);
  const [displayStatus, setDisplayStatus] = useState(status);
  const [displayLabel, setDisplayLabel] = useState(label);

  useEffect(() => {
    if (status !== displayStatus) {
      progress.value = withTiming(1, { duration: motion.duration.slow }, () => {
        runOnJS(setDisplayStatus)(status);
        runOnJS(setDisplayLabel)(label);
        progress.value = 0;
      });
    }
  }, [status, label]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [STATUS_COLORS[displayStatus], STATUS_COLORS[status]]
    ),
  }));

  return (
    <Animated.View style={[styles.badge, animatedStyle]}>
      <Text>{displayLabel}</Text>
    </Animated.View>
  );
}
```

**Note:** text swap happens at `progress.value === 1` (end of fade). Slightly imperfect — ideal would be text swap at midpoint — but much simpler and visually indistinguishable at 600ms. Don't over-engineer.

---

## Pattern 6 — Skeleton Pulse (Slow Breathing)

**When:** Data is loading and no cached version is available. Initial fetch, forced refresh, explicit loading states.

**Not when:** Refreshing data where a stale version already exists (that should update via Pattern 1/5, not skeleton). Initial app launch (splash screen handles that).

**Behavior:**
- Skeleton appears immediately (no fade-in).
- Opacity pulses between 0.40 and 0.60 over 2-second cycle.
- Uses `motion.easing.standard` — smooth, not linear.
- When data arrives: skeleton fades out over `motion.duration.fast`, actual content fades in over `motion.duration.normal` starting at skeleton's midpoint (overlap of 60ms for continuity).

**Critical:** Do NOT use the fast shimmer skeleton you see in most apps. Fast shimmer reads as urgent/anxious. CardScout is about considered decision-making. Slow pulse reads as calm.

**Reference implementation:**

```tsx
// components/primitives/Skeleton.tsx
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

export function Skeleton({ width, height, radius = 8 }) {
  const opacity = useSharedValue(0.4);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 0.5;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.6, { duration: 1000, easing: motion.easing.standard }),
      -1,  // infinite
      true // reverse
    );
  }, [reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.colors.skeletonBase },
        animatedStyle,
      ]}
    />
  );
}
```

---

## Pattern 7 — Respectful Keyboard

**When:** Any form field gains focus on mobile.

**Behavior:**
- ScrollView adjusts so the focused field sits at 1/3 from the top of the visible area (not pinned flush above the keyboard edge).
- Uses the keyboard's own timing curve and duration (obtained from `keyboardWillShow` event).
- Returns to original position on blur with the same timing.
- Only applies to screens with forms. Pure display screens don't need this.

**Reference implementation:**

Use `react-native-keyboard-controller` for this — it's the cleanest implementation. Alternative: `KeyboardAwareScrollView` from `react-native-keyboard-aware-scroll-view`.

```tsx
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

<KeyboardAwareScrollView
  bottomOffset={100}
  extraKeyboardSpace={0}
  keyboardShouldPersistTaps="handled"
>
  {/* form fields */}
</KeyboardAwareScrollView>
```

**Not a Reanimated pattern directly** — this is an OS-integration concern that uses the keyboard's actual timing. Do not try to replicate with your own spring; it will desync on different iOS versions.

---

## What We Are Explicitly Not Doing

These patterns get cut, and they're listed so no future Claude Code session re-introduces them under a different name:

- **Count-up animations on initial render.** Numbers just appear. Only changes are animated (Pattern 1).
- **Staggered entrances.** If 5 items appear, all 5 animate together. No cascade.
- **Scroll-linked parallax.** No element moves at a different rate than scroll.
- **Hero animations / splash screens.** Standard Expo splash, no custom animation.
- **Celebration moments.** No confetti, no card flying across screen, no "achievement unlocked" animations. We discussed this; no celebration on firsts or repeats.
- **Page-curl, flip-card, or 3D transforms on standard transitions.** Only the 6 approved shared element transitions use any 3D.
- **Pulsing or breathing on non-loading elements.** Only skeleton uses pulse.
- **Loading spinners.** Replaced entirely by skeletons. Spinners only allowed inside buttons during submit.
- **Animated icons.** Lucide static icons only. No micro-animated icon libraries.
- **Scroll hijacking or scroll-triggered reveals in the app.** Marketing site is a separate question.

---

## Per-Screen Motion Inventory

Reference table — what motion appears on each screen.

| Screen | Patterns applied |
|---|---|
| Onboarding | Pattern 3 (tap feedback) only |
| Auth / Login | Pattern 3 only |
| Discover Home | Pattern 3, Pattern 6 (skeleton on deals load) |
| Quiz | Pattern 3, Pattern 2 (question transitions use list settlement) |
| Results | Pattern 3, Pattern 6, Pattern 4 (shared element to card detail) |
| Card Browser | Pattern 3, Pattern 6, Pattern 4 |
| Card Detail | Pattern 3, Pattern 4 (shared element from browser) |
| Vault | Pattern 2, Pattern 3, Pattern 4, Pattern 6 |
| Vault Card Detail | Pattern 3, Pattern 4, Pattern 5 (benefit status changes) |
| Tracker Ledger | Pattern 2, Pattern 3, Pattern 6 |
| Add Application | Pattern 3, Pattern 7 (keyboard) |
| Application Detail | Pattern 1 (bonus progress), Pattern 3, Pattern 5 (status badge) |
| Velocity Dashboard | Pattern 1 (counts), Pattern 3, Pattern 5 (issuer status badges), Pattern 6 |
| Points Portfolio | Pattern 1 (balances + total), Pattern 3, Pattern 7 |
| Annual Fees | Pattern 1 (days remaining), Pattern 3, Pattern 5 (recommendation badge) |
| Deal Passport | Pattern 2 (new deals), Pattern 3, Pattern 4, Pattern 6 |
| Settings | Pattern 3 only |
| Paywall | Pattern 3, Pattern 4 (Pro card to Checkout) |

If a screen appears to need a pattern not listed, that's a design decision — stop and ask, don't add it silently.

---

## Reduced Motion Behavior

When `useReducedMotion()` returns true (user has enabled "Reduce Motion" in OS settings):

| Pattern | Reduced behavior |
|---|---|
| 1 — Number Morph | Instant jump to new value |
| 2 — List Settlement | Instant insert/delete, no fade |
| 3 — Tap Feedback | No scale, haptic still fires (haptic is accessibility-positive) |
| 4 — Shared Element | Instant transition, no morph |
| 5 — Status Crossfade | Instant color swap |
| 6 — Skeleton Pulse | Static 50% opacity, no pulse |
| 7 — Keyboard | Unchanged (OS handles this) |

Implement via a single `useReducedMotion()` hook. All patterns check it. Reduced motion is a first-class path, not an afterthought.

---

## Performance Budget

Every pattern above must meet these metrics on a Pixel 6a and iPhone 12 mini:

- Pattern 1 (number morph): no frame drops during animation
- Pattern 2 (list settlement): handles 50-row lists without jank
- Pattern 3 (tap feedback): responds within 16ms of press event
- Pattern 4 (shared element): no visual tear between screens
- Pattern 5 (status crossfade): CPU usage < 20% during animation
- Pattern 6 (skeleton pulse): negligible CPU, no thermal impact over 60 seconds
- Pattern 7 (keyboard): no disagreement between keyboard and content timing

If any budget is exceeded, reduce the pattern — don't optimize. An animation that's slightly cheaper but still working beats a beautiful one that drops frames.

---

## Implementation Checklist for Phase 10

Single focused session, approximately 3-4 days.

- [ ] Add `motion` tokens to `lib/theme.ts`
- [ ] Create `components/primitives/AnimatedNumber.tsx` (Pattern 1)
- [ ] Create `components/primitives/Pressable.tsx` with scale + haptic (Pattern 3)
- [ ] Create `components/primitives/Skeleton.tsx` with slow pulse (Pattern 6)
- [ ] Create `components/primitives/StatusBadge.tsx` with crossfade (Pattern 5)
- [ ] Install `react-native-keyboard-controller`, wire to form screens (Pattern 7)
- [ ] Wire shared element tags to the 6 approved transitions (Pattern 4)
- [ ] Sweep the Ledger, Vault, and Deal Passport for list entrance/exit animations (Pattern 2)
- [ ] Replace every `Text` rendering a mutable number with `AnimatedNumber`
- [ ] Replace every `Pressable` wrapping interactive content with our Pressable primitive
- [ ] Replace every semantic badge with `StatusBadge`
- [ ] Replace every loading spinner (except in-button) with `Skeleton`
- [ ] Run `useReducedMotion()` test pass across all 7 patterns
- [ ] Performance profile on Pixel 6a and iPhone 12 mini
- [ ] Update `QA_LAYER_2_E2E_TESTS.md` with visual regression tests for 6 shared transitions

---

## Anti-Patterns That Will Sneak In (Resist)

When Phase 10 is underway, these temptations arise. Name them now, reject them when they come up.

- "The empty state would be better with a subtle animated illustration." No. Static EmptyState only.
- "The paywall could have a more dramatic entrance." No. Standard sheet spring, no additional choreography.
- "The first-time user should see the value number count up." We discussed this and rejected it. No celebration moments, no matter how tasteful.
- "The velocity dashboard would be more engaging with little charts that draw in." No. Static numbers that morph when data changes (Pattern 1). That's it.
- "This button could have a subtle glow on primary CTAs." No. Color is its emphasis. Motion isn't.
- "We should animate the tab bar icons." No. Static icons with color state change.

If any of these feel persuasive mid-session, re-read this list. They're persuasive because they look nice in isolation. In aggregate they make the app feel performative, which is what we're explicitly avoiding.

---

## Final Note

The success criterion for Phase 10 motion work: after you ship, when someone tells you "the app feels really nice," they should struggle to name specific animations. They'll say "it feels smooth" or "it feels polished" or "it just works." That's the signal the patterns are correct.

If they say "I love the animation when X happens" — that's a warning. It means the animation is visible enough to notice individually, which means it's doing too much.

Considered, not celebrated.
