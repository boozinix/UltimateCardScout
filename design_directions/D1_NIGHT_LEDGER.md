# Direction 1: Night Ledger

## Thesis
Dark mode primary. The app is a premium financial instrument for sophisticated churners tracking $50K+ in annual card value. It should feel like opening a leather-bound portfolio — quiet authority, not flashy fintech.

## Color Tokens

### Dark (Primary)
```
bg:         #0D1117    (GitHub-dark depth, not pure black)
sidebar:    #161B22    (slightly elevated)
surface:    #1C2128    (card surfaces)
border:     #30363D    (subtle separation)
text:       #E6EDF3    (high-contrast but not pure white)
muted:      #8B949E    (secondary text)

accent:     #C8A86E    (muted gold — wealth, not bling)
accentBg:   #1C1A14    (very dark warm)

gold:       #C8A86E    (same as accent in this direction)
goldBg:     #1C1A14

urgent:     #DA3633    (clear red, not orange)
urgentBg:   #1F0F0F
warn:       #D29922    (amber)
warnBg:     #1C1700
success:    #3FB950    (GitHub green)
successBg:  #0D1F0D
```

### Light (Secondary — available but not promoted)
```
bg:         #F6F5F0    (warm parchment)
surface:    #FFFFFF
border:     #D8D3C8
text:       #1C1917
muted:      #6B6864
accent:     #8B7340    (darker gold for light backgrounds)
```

## Typography
- **Display:** Literata (Google Fonts) — scholarly serif with optical sizing. 36-48px for hero numbers.
- **Headings:** General Sans (self-hosted or Fontsource) — clean geometric, not cold. 18-28px.
- **Body:** General Sans Regular, 15-16px, line-height 1.55
- **Mono:** Geist Mono with tabular-nums. All financial figures.
- **Labels:** General Sans Medium, 12px, letter-spacing 0.5px, uppercase

## Component Treatments

### Intelligence Hub
- Hero section: Large Literata display number for portfolio total value in gold
- Feature nav: Horizontal scroll of surface cards with icon + label, no borders — just bg differentiation
- Active bonuses: Compact rows with gold progress bar fill
- The hub should feel like a dashboard login screen at a private bank

### Stat Cards
- No border. Surface bg only. Number in Literata serif at 32px. Label below in 12px caps General Sans.
- Gold accent on the primary metric only. Everything else uses muted text.

### Progress Bars
- Single-color fills: gold for positive, muted for neutral, red for danger
- No gradient. 4px height. Rounded ends.

### Cards/Surfaces
- No box-shadow. Use 1px border in border color only.
- Radius: 8px (tighter than current 12px — more serious)
- No hover lift animations. Hover changes border to accent color only.

### Buttons
- Primary: Gold bg, dark text (#0D1117), no border
- Secondary: transparent bg, 1px gold border, gold text
- Tertiary: no border, gold text, underline on hover
- Destructive: #DA3633 bg, white text

## Screen Compositions

### Intelligence Hub (complete rethink)
```
┌─────────────────────────────────────┐
│ Portfolio Total        $47,832      │  ← Literata 40px gold, right-aligned
│ captured this year                  │  ← General Sans 14px muted
├─────────────────────────────────────┤
│                                     │
│  [Active Bonuses]  ── 3 compact rows with gold progress bars
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ 3/5  │ │  12  │ │ $280 │       │  ← 3 stat cards: Chase, Apps, Fees Due
│  │Chase │ │ Open │ │ Fees │       │
│  └──────┘ └──────┘ └──────┘       │
│                                     │
│  Feature Nav (vertical list)        │  ← ListItems with icons, PRO badges
│  ─ Velocity Dashboard              │
│  ─ Application Ledger              │
│  ─ Points Portfolio                │
│  ─ Annual Fee Advisor              │
│  ─ Spend Optimizer                 │
│  ─ Deal Passport                   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ "Your next move: apply for  │   │  ← Recommendation card
│  │  Amex Gold before 5/24      │   │     Surface bg, gold left icon
│  │  window closes in 47 days"  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Discover Home
- Search bar: dark surface bg, 1px border, gold search icon
- Quick pills: no border, surface-raised bg, muted text. Selected = gold text + gold border
- Intent section: 2-column grid of surface cards with category icon

### Velocity Dashboard
- Issuer cards: full-width surface cards, issuer name in heading, status badge right-aligned
- 5/24 counter: large Literata number, progress bar below
- Expandable detail: slides down within same card, no modal

## Motion (per MOTION_SPEC)
- Pattern 1 (Number Morph): portfolio total, velocity counts
- Pattern 3 (Tap Feedback): scale 0.97 on all pressables
- Pattern 5 (Status Crossfade): velocity badges, fee recommendation badges
- Pattern 6 (Skeleton): slow pulse at 0.4-0.6 opacity on dark surfaces
- No stagger. No celebration. No count-up on initial render.
