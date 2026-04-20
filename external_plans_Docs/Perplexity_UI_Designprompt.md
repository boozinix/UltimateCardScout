One screen per chunk so nothing gets cut off.

***

# `UI_DESIGN_PROMPTS.md` — Part 1: Core Screens

***

## PROMPT 1 — Home Dashboard

```
Dark theme mobile app screen. Financial dashboard.
Background #0A0A0F. Cards and surfaces #13131A.
Brand accent #6C63FF. Success green #22C55E.
Warning amber #F59E0B. Danger red #EF4444.
White text #F0F0FF. Secondary text #8888AA.

Top section:
- Small greeting "Good morning" in secondary text
- User first name in white, 24pt semibold
- Row of 3 stat chips: "3 cards" / "4/5 5/24" / "$7,553 portfolio"
  Each chip: surface-raised background, rounded-full,
  small icon left, value in white, label below in secondary

Middle section titled "Expiring Soon":
- Horizontal scroll row of alert chips
- Each chip shows: benefit name, card name, days left
- Color coded: green >30 days, amber 8-30 days, red <7 days
- Chip style: rounded-lg, surface-raised bg, left colored
  dot indicator

Below that, "Active Bonus Trackers" section:
- 2 cards stacked vertically
- Each card: surface bg, rounded-xl, padding 16
- Card name + issuer logo placeholder left
- Progress bar below (colored by urgency)
- "$X / $X spent" and "XX days left" in secondary text
- "Need $XX/day" in small caption

Bottom section "Deal Passport Preview":
- Single highlighted card with brand accent left border
- "🔥 LIVE" red pill badge top right
- Deal title in white 16pt
- Short description in secondary text
- Expiry countdown in amber

All sections have SectionHeader with label left
and "See all" right in brand accent color.
Spacing between sections 24pt.
No bottom nav shown — just the screen content.
React Native compatible. Use View/Text/ScrollView.
Tailwind classes with custom tokens.
```

***

## PROMPT 2 — Vault Screen (My Cards)

```
Dark theme mobile screen. My Cards / Vault screen.
Same color tokens: bg #0A0A0F, surface #13131A,
surface-raised #1C1C26, brand #6C63FF.

Top: circular progress ring (Wealth Ring) centered.
Ring is 160px diameter. Multiple arc segments in
different colors representing benefit categories:
Travel (blue #3B82F6), Dining (orange #F97316),
Hotel (purple #A855F7), Fitness (green #22C55E),
Shopping (pink #EC4899), Entertainment (yellow #EAB308).
Center of ring shows large dollar amount "$2,840"
in white 32pt bold, "available this year" below
in secondary text 12pt.

Below ring: horizontal row of category legend dots
with labels and dollar amounts. Small, compact.

Section "My Cards" with "+ Add" button right:
- 3 card tiles stacked
- Each tile: surface bg, rounded-xl, 16px padding
- Left side: colored rectangle (card art placeholder,
  80x50px, rounded-lg, gradient matching issuer color)
  Chase: #117ACA gradient, Amex: #016FD0 gradient
- Right of card art: card name 16pt white semibold,
  issuer 13pt secondary, "opened Mar 2024" caption
- Right side of tile: vertical stack showing
  annual fee amount, days until renewal in amber
  if < 60 days
- Bottom of tile: thin progress bar showing
  benefits captured % this year

Tapping a tile should visually indicate it's
pressable (slight opacity change).
React Native, NativeWind v4, no bottom nav shown.
```

***

## PROMPT 3 — Application Ledger Screen

```
Dark theme mobile screen. Application history /
credit card ledger. Replace the churner spreadsheet.
bg #0A0A0F, surface #13131A, brand #6C63FF.

Top: Velocity Summary card — surface bg, rounded-xl.
Shows "5/24 Status" with large "3 / 5" in white bold,
progress bar below (3 of 5 filled in brand color),
"Next drop-off in 47 days" in amber below bar.
Small row of issuer rule pills: "Amex ✓ Clear" green,
"Citi ✓ Clear" green, "CapOne ✓ Clear" green.

Section "Open Cards (4)" with "+ Add" right:
List of application rows. Each row:
- surface bg, rounded-xl, marginBottom 8
- Left: issuer colored dot (Chase blue, Amex blue, etc.)
- Card name 15pt white, issuer 13pt secondary below
- Right side: status pill (green "Approved", red "Denied")
- Below card name: "Opened Jan 2024 · $695/yr fee"
  in caption secondary
- If bonus not yet achieved: amber pill "Bonus in progress"
- If annual fee due within 60 days: red pill "Fee due soon"

Section "Closed / Denied (2)" collapsed by default.
Chevron right to expand. Muted styling.

FAB button bottom right: "+" in brand color circle,
opens Add Application form.

React Native, NativeWind v4.
```

***

## PROMPT 4 — Velocity Dashboard Screen

```
Dark theme mobile screen. Velocity Dashboard.
Shows all credit card application rules auto-calculated.
bg #0A0A0F, surface #13131A, border #2A2A38.

Screen title "Velocity Dashboard" 24pt white semibold.
Subtitle "Based on your application history" secondary.

CHASE section — surface card, rounded-xl, padding 16:
Section label "CHASE" in brand color caps, 11pt.
Large "5/24 Status" row:
  Left: "3 / 5" in 36pt white bold
  Right: status pill "2 slots open" in green
Linear progress bar, brand color fill, 3/5 filled.
Below bar: "Next drop-off: Amex Platinum · Jun 5, 2026"
  "47 days away" in amber
Divider line.
"Sapphire Bonus Eligibility" row:
  Left icon + label in white
  Right: green pill "Eligible now ✓" OR
         amber pill "Eligible in 8 months"

AMEX section — same card style:
Label "AMEX" in brand color.
"Velocity" row: label left, "✓ Clear" green pill right.
"Last Amex opened 8 months ago" in secondary caption.
"Lifetime Burns" row below:
  Small list of burned card families with ✗ icons
  in muted red. "Platinum family · Gold family"

CITI section:
"8-day rule ✓" and "65-day rule ✓" as two rows
with green check pills.

CAPITAL ONE section:
"6-month window ✓ Clear" single row.

Each section separated by 16pt gap.
React Native, NativeWind v4. Scrollable.
```

***

## PROMPT 5 — Points Portfolio Screen

```
Dark theme mobile screen. Points Portfolio.
Financial brokerage-style design for loyalty points.
bg #0A0A0F, surface #13131A, brand #6C63FF.

Top hero section: centered, large number.
Label "Total Portfolio Value" in secondary 13pt.
Dollar amount "$7,553" in white 48pt bold tabular-nums.
Small subtitle "Updated Apr 2026 · TPG valuations"
in muted text 11pt.
Thin horizontal divider below.

Section "Your Programs":
Each program row is a surface card, rounded-xl,
marginBottom 8, padding 16.

Program row layout:
- Left: program logo placeholder colored circle
  (Chase UR: blue, Amex MR: blue-grey, Hyatt: gold,
   United: dark blue)
- Program name 15pt white, "247,000 pts" secondary below
- Right: dollar value "$3,087" white 17pt semibold
         "1.25¢/pt" caption secondary below value
- Full-width progress bar at bottom of row
  Width proportional to % of total portfolio
  Color matches program color

Programs listed: Chase UR, Amex MR, Hyatt, United.

Below list: "+ Add Program" button in dashed border,
brand accent color, rounded-xl, full width.

Footer note: "Values based on TPG estimates.
Actual redemption value varies." in muted 11pt.

Tap any row = edit balance (bottom sheet).
React Native, NativeWind v4. No bottom nav.
```

***

## PROMPT 6 — Spend Optimizer Screen

```
Dark theme mobile screen. "Which Card?" spend optimizer.
Fast, clean, minimal — opened at point of sale.
bg #0A0A0F, surface #13131A.

Top: large title "Which Card?" 28pt white bold.
Subtitle "For your best return" secondary.

Category selector grid — 2 columns, 5 rows of chips:
Each chip: surface-raised bg, rounded-xl, padding 12,
centered icon (emoji) + label below.
Selected state: brand #6C63FF bg, white text, slight scale.
Categories:
  🍽 Dining      🛒 Grocery
  ✈️ Travel       ⛽ Gas
  🏨 Hotels      📱 Streaming
  🚇 Transit     💊 Drugstore
  🛍 Shopping    📦 Everything Else

Amount input below grid:
Label "Amount (optional)" in secondary.
Input field: surface bg, rounded-xl, "$" prefix,
numeric keyboard, 16pt white text.

Results section (appears after category selected):
Title "Best card for Dining" in white 17pt.

Result rows ranked:
  Row 1 (best): surface bg, rounded-xl, left border
    4px brand color. Medal emoji 🥇 left.
    Card name 16pt white bold.
    "4x MR on dining" in secondary.
    Right: "$3.40 value" in success green 18pt bold
           "on $85 spend" caption below.

  Row 2: same style, left border 3px #888.
    Medal 🥈. Slightly less prominent.

  Row 3: same, left border 3px #555. Medal 🥉.

  Remaining rows: no border, no medal, muted styling.

React Native, NativeWind v4. Fast, minimal UI.
```

***

## PROMPT 7 — Annual Fee Advisor Screen

```
Dark theme mobile screen. Annual Fee Advisor.
Shown when annual fee is approaching due date.
bg #0A0A0F, surface #13131A, warning #F59E0B.

Top alert banner: amber bg #F59E0B, rounded-xl,
padding 12. Icon ⚠️ left. "Amex Platinum fee of $695
due in 30 days" white text. Full width.

Card summary row below banner:
Card art placeholder left (80x50, Amex blue gradient).
Card name "Amex Platinum" 17pt white.
"Member since Jan 2023 · 3 years" secondary.

Section "Benefits Captured This Year":
List of benefit rows — compact, no cards, just rows.
Each row: benefit name left, value right.
Checkmark ✓ in green left of name if used.
✗ in muted red if not used.
Used: full white text. Unused: secondary/muted text.

Rows:
✓ Uber Cash (12 months)      $120
✓ Airline Fee Credit          $200
✓ Saks Credit (×2)            $100
✗ Fine Hotels & Resorts         $0
✗ Global Entry Credit           $0
✗ Equinox Credit                $0

Divider then summary row:
"Captured: $420 / $695" left, "60%" right in amber.
Progress bar: amber fill, 60% width, full rounded.

Recommendation card below: surface-raised bg,
rounded-xl, left border 4px amber.
"⚠️ Call Retention First" title amber 16pt semibold.
2-line explanation in secondary text.

Retention script box: surface bg, rounded-xl,
italic quote text in white, "Copy Script" button
bottom right in brand color small.

4-button outcome grid at bottom:
[Got Offer] [Fee Waived]
[Downgraded] [Cancelled]
Each: surface-raised, rounded-xl, centered text.
React Native, NativeWind v4.
```

***

## PROMPT 8 — Deal Passport Screen

```
Dark theme mobile screen. Deal Passport.
Personalized financial opportunity feed.
bg #0A0A0F, surface #13131A, brand #6C63FF.

Screen title "Deal Passport" 24pt white.
Subtitle "Relevant to your wallet" secondary.
Notification bell icon top right with badge count.

Section "FOR YOUR WALLET":

Deal card 1 — Transfer Bonus (highest priority):
surface bg, rounded-xl, padding 16.
Top row: red "🔥 LIVE" pill left, "28 days left" amber right.
Title "Chase UR → Hyatt  +30%" white 17pt semibold.
"You hold 247,000 UR" secondary 13pt.
Divider.
Two stat rows:
  "Transfer now:" left — "+74,100 Hyatt pts" green right
  "Est. value added:" left — "+$1,111" green bold right
"Learn More →" brand color, bottom right, 13pt.

Deal card 2 — Elevated Signup:
surface bg, rounded-xl. Top row: blue "📈 ELEVATED" pill,
"Ends Sunday" red right.
Title "Chase Sapphire Preferred" white 17pt.
"80,000 UR  ·  normally 60,000" secondary.
Green pill "You're bonus-eligible ✓" below.
"View Card →" brand color bottom right.

Deal card 3 — Community Report:
surface bg, rounded-xl. "💬 Community" grey pill.
Title "Amex Platinum Retention" white 16pt.
"30,000–50,000 MR reported this week" secondary.
"14 data points · last 30 days" muted caption.
"Read Thread →" brand color bottom right.

Section "OTHER DEALS" collapsed:
Muted row showing count "5 deals for cards
you don't hold" with chevron to expand.

React Native, NativeWind v4. ScrollView.
```

***

## PROMPT 9 — Onboarding Screen (Step 3 — Value Hook)

```
Dark theme mobile onboarding screen. Step 3 of 5.
This is the most important screen — user sees their
portfolio value for the first time. Must feel like
an "aha" moment.
bg #0A0A0F. No nav chrome. Just content.

Top: step indicator — 5 dots, 3rd filled brand color,
others muted. Centered, top of screen.

Center section (hero):
Large animated circular ring (Wealth Ring).
200px diameter. Multiple colored arc segments.
Center: "$2,840" in white 42pt bold.
Below center number inside ring: "/ year available"
in secondary 12pt.

Below ring:
Two rows showing card breakdown:
  "💳 Amex Platinum" left — "$1,540" green right
  "💳 Chase Sapphire Reserve" left — "$1,300" green right

Highlight callout box below rows:
surface-raised bg, rounded-xl, brand left border 4px.
"⚡ 3 benefits expiring this month" amber text.
"📅 Annual fee due in 47 days" secondary text.

Bottom section:
Large CTA button full width: "Explore My Cards →"
bg brand #6C63FF, white text, rounded-xl, 52px height.

Below button in secondary text small:
"We found $2,840 in annual value across your