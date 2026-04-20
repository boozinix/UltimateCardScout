# Direction 5: Quiet Intelligence

## Thesis
Ultra-minimal. Almost no color. Typography weight, size, and whitespace create all hierarchy. The MOTION_SPEC's "considered, not celebrated" philosophy applied to every visual decision. This direction asks: what if we trusted the data to speak for itself without ANY visual assistance beyond type?

## Color Tokens

### Light (Primary)
```
bg:         #FEFEFE    (near-white, no tint)
sidebar:    #F8F8F8    (barely there)
surface:    #FFFFFF    (pure white surfaces)
border:     #E8E8E8    (neutral gray, no warmth or coolness)
text:       #1A1A1A    (near-black)
muted:      #999999    (true neutral mid-gray)

accent:     #3E3A85    (deep indigo — the ONE color, used sparingly)
accentBg:   #EEEDFA    (whisper of indigo)

gold:       #1A1A1A    (no gold — values shown in text color, differentiated by weight/size)
goldBg:     #F8F8F8

urgent:     #C13838    (muted red)
urgentBg:   #FFF5F5
warn:       #9A7B00    (muted amber)
warnBg:     #FEFCE8
success:    #1B7A3D    (muted green)
successBg:  #F0FFF4
```

### Dark (Available)
```
bg:         #111111
surface:    #1A1A1A
border:     #2A2A2A
text:       #E8E8E8
muted:      #777777
accent:     #7B74D1    (lighter indigo)
accentBg:   #1E1D2E
```

## Typography
- **Display:** Gambetta (Google Fonts) — an unusual high-contrast serif with sharp details. Used ONLY for the single largest number on each screen. 44-56px. The one moment of drama.
- **Headings:** Epilogue (Google Fonts) — clean, slightly geometric, slightly wide. Not cold. 18-28px SemiBold.
- **Body:** Epilogue Regular, 15px, line-height 1.65 (generous — letting text breathe is this direction's core move)
- **Mono:** Geist Mono, tabular-nums, 14px. All financial figures.
- **Labels:** Epilogue Medium, 11px, uppercase, letter-spacing 1.2px, muted color

## Component Treatments

### Intelligence Hub
- One enormous number. That's the hero. The portfolio total in Gambetta at 56px.
- Everything else is small, quiet, arranged below with generous whitespace.
- No cards. No borders. Just text groups separated by 48px vertical gaps.
- Feature nav: simple text list with no icons. Just names and arrows.

### Stat Displays
- Number: Epilogue SemiBold, 24px, text color (not accent — accent is reserved)
- Label: 11px caps muted, positioned ABOVE the number
- No wrapper, no border, no background. Just text on canvas.

### Progress Bars
- 2px height. Square ends. Muted gray fill.
- No color coding by default. Only urgent/danger gets the red treatment.
- Percentage in mono, right-aligned, same line as bar.

### Cards/Surfaces
- Almost invisible. 1px border in border color only when grouping is semantically needed.
- Radius: 2px (nearly square — decoration-free)
- No shadow. Background = canvas (not surface — cards shouldn't pop).
- Hover: nothing visible. Cursor change only.

### Buttons
- Primary: indigo bg (#3E3A85), white text, 2px radius, Epilogue Medium 14px
- Secondary: transparent, 1px indigo border, indigo text
- Tertiary: indigo text, no decoration, no underline (even on hover — radical minimalism)
- ALL buttons are quiet. The page should feel calm even with 3 CTAs visible.

### Section Organization
- No section headers as visual elements. Just generous spacing (64px) between logical groups.
- If a label is needed: 11px uppercase muted, 4px letter-spacing. Positioned as a whisper.

## Screen Compositions

### Intelligence Hub (complete rethink)
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│            $47,832                  │  ← Gambetta 56px, centered
│                                     │
│        captured this year           │  ← Epilogue 14px muted, centered
│                                     │
│                                     │
│                                     │  ← 64px gap
│                                     │
│  ACTIVE                             │  ← 11px caps, muted
│                                     │
│  Chase Ink Cash                     │  ← Epilogue 16px
│  78% · 23 days left                │  ← 14px muted + mono
│  ────────────────────── 78%        │  ← 2px bar
│                                     │
│  Amex Gold                          │
│  45% · 67 days left                │
│  ──────────────  45%               │
│                                     │
│                                     │  ← 64px gap
│                                     │
│  NAVIGATE                           │  ← 11px caps
│                                     │
│  Velocity Dashboard            →   │  ← Epilogue 15px, no icon
│  Application Ledger            →   │
│  Points Portfolio              →   │
│  Annual Fee Advisor            →   │
│  Spend Optimizer               →   │
│                                     │
└─────────────────────────────────────┘
```

### Discover Home
- Gambetta 44px italic headline: "Find your next card"
- Body text below: "Answer three questions." That's it. One CTA button.
- Search below, no pills. Just the input.
- Radical simplicity. Everything unnecessary is removed.

### Velocity Dashboard
- Each issuer: heading + status text (not badge) + count
- No cards. No icons. No color except danger states.
- Dense text layout with generous vertical rhythm

## Motion (per MOTION_SPEC)
- The MOST minimal application of the spec:
- Pattern 1 (Number Morph): portfolio total only. All other numbers are static.
- Pattern 3 (Tap Feedback): scale 0.99 (barely perceptible — a breath, not a bounce)
- Pattern 5 (Status Crossfade): velocity status text only
- Pattern 6 (Skeleton): static gray rectangles (no pulse — even the loading state is quiet)
- Everything else: instant. No animation.
