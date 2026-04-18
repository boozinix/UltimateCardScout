```markdown
# Design System Document: The Editorial Curated Experience

## 1. Overview & Creative North Star
**Creative North Star: The Digital Curator**

This design system is not a utility; it is a gallery. It rejects the frantic, "utility-first" density of modern SaaS in favor of **Quiet Luxury**. Our goal is to create a digital environment that feels like a high-end editorial spread or a boutique hotel concierge—calm, intentional, and profoundly human.

To move beyond the "template" look, this system utilizes **The Art of the Void**. We use expansive whitespace (negative space) not as "empty room," but as a premium design element that directs the eye. We break the rigid, boxy grid through intentional asymmetry—placing typography off-center or allowing imagery to bleed across container boundaries—to create a sense of bespoke craftsmanship.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule

The palette is a sophisticated study in warm neutrals and muted earth tones. It avoids the clinical coldness of pure whites and the aggression of high-contrast blacks.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. 
Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section should sit directly against a `surface` background to create a "ledge" of depth.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of fine linen paper. 
- **Base Layer:** `surface` (#fffcf7) – The canvas.
- **Structural Sections:** `surface-container-low` (#fcf9f3) – Use for secondary sidebars or subtle background shifts.
- **Interactive Elements:** `surface-container-highest` (#eae8de) – Use for primary cards or elevated functional areas.

### The "Glass & Gradient" Rule
To ensure the UI feels "alive," use Glassmorphism for floating navigation or overlays. Use `surface` colors at 80% opacity with a `20px` backdrop-blur. 
*   **Signature Textures:** For main CTAs or Hero sections, apply a subtle linear gradient (135°) from `primary` (#555f71) to `primary-container` (#d9e3f9) at low opacity to create a "silk-screen" sheen.

---

## 3. Typography: Editorial Authority

We use a high-contrast typographic scale to establish a clear hierarchy that feels like a luxury magazine.

*   **The Voice (Serif):** `Noto Serif` is our anchor. It is used for `display` and `headline` levels. It communicates history, trust, and sophistication. Use `display-lg` (3.5rem) with tighter letter-spacing (-0.02em) for a high-end, "locked-in" look.
*   **The Engine (Sans-Serif):** `Inter` is our utility. Used for `title`, `body`, and `labels`. It provides the modern, clean counterpoint to the serif headings. 

**Typographic Intent:** Always pair a `display-md` Noto Serif heading with a `body-lg` Inter sub-header. The juxtaposition of the traditional serif and the modernist sans-serif is the hallmark of this system.

---

## 4. Elevation & Depth: Tonal Layering

We reject the traditional "drop shadow" in favor of **Ambient Light**.

*   **The Layering Principle:** Depth is achieved by "stacking" the surface-container tiers. Place a `surface-container-lowest` card on a `surface-container-low` background to create a soft, natural lift without a single pixel of shadow.
*   **Ambient Shadows:** If an element must "float" (e.g., a dropdown or modal), use an ultra-diffused shadow: `0px 20px 40px rgba(56, 56, 49, 0.06)`. The shadow color is a tint of our `on-surface` (#383831), never pure black.
*   **The "Ghost Border" Fallback:** If accessibility requires a container edge, use a "Ghost Border": `outline-variant` (#babab0) at 15% opacity. High-contrast borders are strictly forbidden.

---

## 5. Components

### Buttons: The Tactile Interaction
*   **Primary:** `primary` (#555f71) background with `on-primary` (#f6f7ff) text. Corner radius: `xl` (12px). No shadows; use a slight scale-down (0.98) on click.
*   **Secondary:** `surface-container-highest` background. It should blend into the UI, appearing only as a "touchable area."
*   **Tertiary:** Text-only, using `primary` color with a 2px underline that only appears on hover.

### Cards & Lists: The Borderless Canvas
*   **Constraint:** Forbid the use of divider lines. 
*   **Implementation:** Use vertical whitespace (referencing the `24px` or `32px` spacing scale) to separate list items. For cards, use a `surface-container-low` background with an `xl` (12px) corner radius.

### Input Fields: The Subtle Field
*   **Default State:** `surface-container-highest` background, no border, `md` (8px) radius. 
*   **Focus State:** A 1px "Ghost Border" of `primary` at 40% opacity and a subtle `surface-tint` glow.

### Signature Component: The "Editorial Quote"
A specific component for this system: Large `display-sm` serif text, center-aligned, with a `tertiary` (#536a55) vertical accent line (2px wide) to the left. Used to break up long-form data or text.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Asymmetry:** Align headings to the left while keeping body text centered in a narrower column to create visual interest.
*   **Use Tonal Shifts:** Change the background color of the entire page section to signal a change in context rather than using a divider line.
*   **Prioritize Legibility:** Keep `body-md` at a minimum of 1.5 line-height to maintain the "breathable" feel.

### Don’t:
*   **Don't use Bright Golds:** While this is "Luxury," we avoid the cliché of gold. Use `tertiary` (soft sage) or `secondary` (muted slate) for accents.
*   **Don't use Hard Corners:** Avoid `none` or `sm` rounding. Everything must feel "soft-touch."
*   **Don't Over-Saturate:** If the UI feels "loud," reduce the usage of `primary` and return to the neutral `surface` tiers. The system should whisper, not shout.
*   **Don't use 100% Opaque Borders:** This is the quickest way to break the "Quiet Luxury" aesthetic. If you think you need a border, try a 4px padding increase instead.