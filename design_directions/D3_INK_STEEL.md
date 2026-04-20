# Direction 3: Ink & Steel

## Thesis
High-contrast industrial terminal. The app feels like a Bloomberg terminal made accessible — data-dense, monospace-forward, zero decoration. For users who think in spreadsheets and want their app to keep up with their brain. Every pixel earns its keep.

## Color Tokens

### Dark (Primary — no light mode)
```
bg:         #0A0A0B    (near-black, barely warm)
sidebar:    #111112    (sidebar)
surface:    #18181A    (cards/elevated)
border:     #2E2E32    (hard line)
text:       #EDEDEF    (high contrast)
muted:      #71717A    (zinc gray)

accent:     #E5484D    (signal red — attention, urgency)
accentBg:   #1F1315    (dark red tint)

gold:       #E5C07B    (terminal amber for values)
goldBg:     #1A1700

urgent:     #E5484D    (same as accent — intentional)
urgentBg:   #1F1315
warn:       #E5C07B    (amber)
warnBg:     #1A1700
success:    #46A758    (terminal green)
successBg:  #0D1F0D
```

## Typography
- **Display:** Mona Sans Bold (GitHub's font, Google Fonts) — geometric, wide, authoritative. 32-44px.
- **Headings:** Mona Sans SemiBold, 18-24px
- **Body:** JetBrains Mono Regular, 13-14px, line-height 1.6 — yes, mono for body text. This is a terminal-first direction.
- **Numbers:** JetBrains Mono, tabular-nums. Same as body — everything is mono.
- **Labels:** JetBrains Mono Medium, 11px, letter-spacing 1px, uppercase, muted

## Component Treatments

### Intelligence Hub
- The hub IS a terminal. Data grid layout, no visual hierarchy through size — hierarchy through position and density.
- Top row: 4-6 stat cells in a tight grid. Each cell: label above, value below, mono throughout.
- Below: tabular list of recent activity (last 5 applications, last 3 status changes)
- No cards. No shadows. Borders only.

### Stat Displays
- Monospace number, 24px. Label above in 11px caps muted.
- Thin 1px bottom border separating each stat.
- Status colors as text color only — no background badge, no pill. Just colored text.

### Progress Bars
- 2px height. Square ends (no border-radius — industrial).
- Green fill for on-track. Amber for behind. Red for critical.
- Percentage shown right-aligned in mono.

### Cards/Surfaces
- 1px solid border, NO radius (0px — square corners throughout).
- No shadow. Background: surface color.
- Hover: border turns accent red. That's it.

### Buttons
- Primary: accent red bg, white text, 0px radius, uppercase mono 12px
- Secondary: transparent, 1px white border, white text, uppercase
- Tertiary: muted text, underline
- Destructive: same as primary (red IS the brand here)
- All buttons feel like terminal commands

### Tables
- This direction uses actual table layouts where possible
- Alternating row backgrounds (surface / bg)
- Column headers: uppercase, muted, 11px mono
- Cell content: 13px mono

## Screen Compositions

### Intelligence Hub (complete rethink)
```
┌──────────────────────────────────────────┐
│  CARDSCOUT TERMINAL                v1.0  │  ← Mona Sans 14px, muted
├──────────┬──────────┬──────────┬─────────┤
│  CHASE   │  OPEN    │  BONUS   │  FEES   │
│  3/5     │  12      │  3 ACT   │  $1,075 │  ← All JetBrains Mono
│  ■■■░░   │          │  ■■░     │  DUE 32d│
├──────────┴──────────┴──────────┴─────────┤
│                                          │
│  RECENT ACTIVITY                         │
│  ──────────────────────────────────────  │
│  2026-04  Chase Ink Cash      APPROVED   │  ← Green text
│  2026-03  Amex Gold           BONUS MET  │  ← Amber text
│  2026-03  Citi Double Cash    DENIED     │  ← Red text
│  2026-02  Cap One Venture X   OPEN       │  ← Default text
│                                          │
│  MODULES                                 │
│  ──────────────────────────────────────  │
│  [1] Velocity       [2] Ledger           │  ← Keyboard shortcut style
│  [3] Portfolio      [4] Fees             │
│  [5] Optimizer      [6] Deals            │
│                                          │
│  NEXT RECOMMENDED ACTION                 │
│  Apply Amex Gold before 5/24 window      │
│  closes in 47 days. ETA: 2026-06-05      │  ← Amber text for date
│                                          │
└──────────────────────────────────────────┘
```

### Velocity Dashboard
- Pure table layout. One row per issuer.
- Columns: ISSUER | STATUS | COUNT | CLEAR DATE | ACTION
- Status as colored text: CLEAR (green), WAIT (amber), BLOCKED (red)
- Expandable rows show individual applications in sub-table

### Application Ledger
- Full spreadsheet-style table
- Columns: DATE | CARD | ISSUER | STATUS | BONUS | SPEND | BUREAU
- Sortable columns (tap header to sort)
- Dense: 12-13px mono, tight row height (36px)

## Motion (per MOTION_SPEC)
- Minimal, sharp. This direction values speed.
- Pattern 1 (Number Morph): all visible numbers, fast spring (increase stiffness)
- Pattern 3 (Tap Feedback): scale 0.98 (tighter, snappier)
- Pattern 5 (Status Crossfade): colored text crossfades only
- Pattern 6 (Skeleton): pulsing | characters instead of blocks (terminal style)
- Duration.fast reduced to 80ms. Everything feels instant.
