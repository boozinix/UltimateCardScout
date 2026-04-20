# Direction 4: Scout Continuum

## Thesis
Visual continuity with CardScout web (thecardscout.app). Users who know the website should feel instant recognition. Same color language, same component vocabulary, evolved for mobile. The app is the website's native companion, not a separate product.

## Color Tokens

### Light (matching web exactly)
```
bg:         #F7F6F3    (warm off-white — web's --bg)
sidebar:    #F0EFEB    (web's --surface-raised)
surface:    #FFFFFF    (web's --surface)
border:     #E4E2DC    (web's --border)
text:       #1A1917    (web's --text-primary)
muted:      #6B6864    (web's --text-secondary)

accent:     #1B4FD8    (THE Scout blue — web's --accent personal mode)
accentBg:   #DBEAFE    (web's --accent-light)

gold:       #92400E    (web value display color)
goldBg:     #FEF3C7

urgent:     #B91C1C    (web's --error)
urgentBg:   #FEF2F2
warn:       #B45309    (web's --warning)
warnBg:     #FFFBEB
success:    #15803D    (web's --success)
successBg:  #F0FDF4
```

### Dark (matching web dark mode)
```
bg:         #111318    (web's dark --bg)
surface:    #1C2030    (web's dark --surface)
border:     #303848    (web's dark --border)
text:       #ECEAE4    (web's dark --text-primary)
muted:      #9A9896    (web's dark --text-secondary)
accent:     #4F7FFF    (web's dark mode blue)
accentBg:   #1A2548
```

### Business Mode (matching web)
```
accent:     #9D8468    (web's business mode accent)
accentBg:   #E8DFD4
```

## Typography
- **Display:** System font or Manrope Bold (web uses Manrope for H1-H3) — 28-48px
- **Headings:** Manrope SemiBold, 18-24px (direct port from web)
- **Body:** System sans (San Francisco on iOS, Roboto on Android) — 15-16px, line-height 1.6
  - NOTE: Web uses Inter, but for native apps system font is preferred for reading comfort. This is the one intentional break from web parity.
- **Mono:** Geist Mono, tabular-nums (same as web)
- **Hero accent:** Instrument Serif Italic for the one hero H1 on Discover Home (web's `.hero-serif`)
- **Labels:** Manrope Medium, 12px, uppercase, letter-spacing 0.5px

## Component Treatments

### Carrying from Web (exact port)

**Intent Cards (Home page):**
- 3-column grid (1-col mobile)
- Each card: icon (colored) + heading + description + CTA link
- Colors: blue (#1B4FD8), green (#059669), violet (#7C3AED)
- Border: 2px solid var(--border), radius 14px
- Hover: translateY(-4px), shadow increase, border → accent

**Calculator Result Cards (Stat Trio):**
- 3 stat cards in a row
- Each: icon + label (small) + value (large mono)
- Background: surface. 1px border.

**Verdict Card:**
- Full-width. Red border for negative, green for positive.
- Large heading + explanatory paragraph.

**Fee Coverage Progress Bar:**
- Gradient fill from green through yellow to red based on percentage
- Percentage label right-aligned

**Search + Pills:**
- Search bar: surface bg, border, search icon left
- Popular pills: small rounded buttons, border, no fill. Selected = accent bg + white text.

### Cards/Surfaces
- 14px radius (matching web's card-radius)
- 1-2px border in border color
- Box-shadow: web's shadow-sm (0 1px 2px rgba(0,0,0,0.06))
- Hover: slight lift on web/desktop, scale 0.97 on press for mobile

### Buttons
- Primary: accent blue bg, white text, 8px radius
- Secondary: transparent, 1px accent border, accent text
- Matches web button styling exactly

## Screen Compositions

### Intelligence Hub
Same functional layout as current, but with web-style card treatments:
- Stat cards match the web's "stat trio" pattern
- Feature nav uses web-style ListItems with chevrons
- Progress bars use web's gradient fill pattern

### Discover Home (MUST match web's home page feel)
```
┌─────────────────────────────────────┐
│                                     │
│  Tell us how you spend.             │  ← Manrope 28px bold
│  We'll find your best card.         │  ← with Instrument Serif italic span
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐       │  ← 3 intent cards (web port)
│  │  🧭  │ │  📋  │ │  🔍  │       │     blue / green / violet
│  │Start │ │Plan  │ │Browse│       │
│  │ out  │ │Cards │ │ All  │       │
│  └──────┘ └──────┘ └──────┘       │
│                                     │
│  [🔍 Search by card name...    ]   │  ← Search bar
│                                     │
│  Popular: travel cashback no-AF     │  ← Pills
│                                     │
└─────────────────────────────────────┘
```

### Velocity Dashboard
- Web-style cards for each issuer
- Status badges matching web's Badge component
- Progress bars matching web's gradient style

## Motion (per MOTION_SPEC)
- Match web animation patterns where applicable:
  - Web's cardSlideUp → Pattern 2 (List Settlement) on card enter
  - Web's hover lift → Pattern 3 (Tap Feedback) with scale
  - Web's fadeInUp → no equivalent (MOTION_SPEC says no stagger)
- All 7 MOTION_SPEC patterns applied per the spec inventory table
