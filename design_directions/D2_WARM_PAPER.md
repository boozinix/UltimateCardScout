# Direction 2: Warm Paper

## Thesis
Light editorial. The app feels like a beautifully typeset financial report printed on heavy cream stock. It trusts content over decoration — data speaks through typography and whitespace, not through color or chrome. Think: Monocle magazine meets a private wealth statement.

## Color Tokens

### Light (Primary)
```
bg:         #F5F0E8    (warm cream, not cold white)
sidebar:    #EDE8DE    (slightly deeper cream)
surface:    #FDFBF7    (near-white paper)
border:     #D4CFC4    (warm gray)
text:       #2C2A25    (warm near-black, not cold)
muted:      #807A6F    (warm gray text)

accent:     #1A6B5F    (deep teal — calm, distinctive, not blue)
accentBg:   #E8F5F0    (very light teal)

gold:       #8B6914    (rich ochre for value displays)
goldBg:     #FDF6E3    (warm highlight)

urgent:     #B33A3A    (muted red, not screaming)
urgentBg:   #FDF0EF
warn:       #9A6700    (deep amber)
warnBg:     #FDF6E3
success:    #1A6B3A    (forest green)
successBg:  #EDFCF2
```

### Dark (Secondary)
```
bg:         #1A1816    (warm charcoal)
surface:    #252320    (warm dark card)
border:     #3D3A35
text:       #E8E2D8    (cream text)
muted:      #9A9488
accent:     #2D9E8A    (lighter teal for dark bg)
```

## Typography
- **Display:** Newsreader... no, reflex list. Try: Lora... also reflex. Try: **Cormorant**... reflex too. Actually use **EB Garamond** (Google Fonts) — true Garamond, editorial authority, not overused in AI contexts. 36-48px for hero displays.
- Wait — let me pick outside the reflex list entirely.
- **Display:** **Libre Baskerville** — no, too common. **Source Serif 4** (Adobe/Google) — clean, modern serif with optical sizing. Not on reflex list. 36-48px.
- **Headings:** **Bricolage Grotesque** (Google Fonts) — geometric sans with personality, slightly quirky terminals. 18-28px.
- **Body:** Bricolage Grotesque Regular, 15-16px, line-height 1.6
- **Mono:** Geist Mono, tabular-nums. All financial figures.
- **Labels:** Bricolage Grotesque Medium, 11px, letter-spacing 0.8px, uppercase, muted color

## Component Treatments

### Intelligence Hub
- Hero: Source Serif display number for portfolio total, ochre gold color
- Stats: Set as a horizontal rule-separated row, not cards. "$47,832 captured | 12 cards open | 3 bonuses active"
- Feature nav: Simple text links with right arrows, grouped under section headers
- The hub feels like the table of contents of a well-designed annual report

### Stat Displays
- No card wrapper. Number + label inline, separated by thin 1px rules
- Number: Source Serif 4 at 28px, text color (not accent)
- Label: 11px uppercase, muted

### Progress Bars
- 3px height (thinner than current). Rounded.
- Teal fill for positive. Muted for neutral. Warm red for danger.
- Label sits to the right of the bar, not below.

### Cards/Surfaces
- Very subtle: 1px border in border color. No shadow at all.
- Radius: 4px (tighter — editorial, not bubbly)
- Background: surface color (#FDFBF7) — barely distinguishable from canvas
- On hover: background shifts to sidebar color (#EDE8DE). No transform.

### Buttons
- Primary: teal bg (#1A6B5F), cream text, no border, 4px radius
- Secondary: transparent, 1px teal border, teal text
- Tertiary: teal text only, underline on hover
- All buttons: 13px Bricolage Grotesque Medium, letter-spacing 0.3px

### Section Dividers
- Thin 1px rules in border color, not card separators
- Generous margin above rules (32px), tight below (12px) — asymmetric spacing creates rhythm

## Screen Compositions

### Intelligence Hub (complete rethink)
```
┌─────────────────────────────────────┐
│                                     │
│  Your Portfolio                     │  ← Bricolage 14px uppercase label
│                                     │
│  $47,832                           │  ← Source Serif 44px, ochre gold
│  captured value this year           │  ← Bricolage 14px muted
│                                     │
│  ─────────────────────────────────  │  ← 1px rule
│                                     │
│  12 cards open · 3 bonuses active  │  ← Inline stats, body text
│  · 2 fees due within 30 days       │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  ACTIVE BONUSES                     │  ← 11px caps label
│                                     │
│  Chase Ink Cash          ████░ 78%  │  ← Card name left, bar right
│  $3,900 / $5,000 · 23 days left    │
│                                     │
│  Amex Gold               ██░░ 45%  │
│  $2,250 / $5,000 · 67 days left    │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  INTELLIGENCE                       │  ← Section header
│                                     │
│  Velocity Dashboard            →   │  ← Simple text rows
│  Application Ledger            →   │
│  Points Portfolio              →   │
│  Annual Fee Advisor       PRO  →   │
│  Spend Optimizer          PRO  →   │
│                                     │
└─────────────────────────────────────┘
```

### Discover Home
- Large Source Serif headline: "Find your next card"
- Search: minimal input with teal focus border, no background color
- Pills: text-only with 1px border, teal when selected
- No decorative cards or gradients

### Velocity Dashboard
- Each issuer as a text section, not a card
- Rule-separated. Issuer name as heading, status as inline badge
- Expandable detail as indented text below

## Motion (per MOTION_SPEC)
- Minimal motion. This direction is the quietest.
- Pattern 1 (Number Morph): portfolio total only
- Pattern 3 (Tap Feedback): scale 0.98 (even subtler than spec's 0.97)
- Pattern 5 (Status Crossfade): badges only
- Pattern 6 (Skeleton): very slow pulse (3-second cycle instead of 2)
- Exits: 50% of entry duration (even faster than spec's 60%)
