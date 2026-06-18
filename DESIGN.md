# Terminal-Grid Navigation — Design Spec

A horizontal navigation bar built as a **single-row CSS grid of equal cells**, separated by thin hairline rules. Each cell holds one piece of nav (wordmark, link, social cluster, theme toggle). The signature interaction is a **character-scramble decode** on the text links: hovering a link causes its label to cycle through random glyphs and lock into the real word one character at a time, left to right, with a blinking block caret at the end.

The register is **terminal / system-utility**: monospace labels, ASCII glyph soup during the decode, dithered cursor, hairline cell rules — the kind of UI that feels like it was extruded from an SGI workstation, not a 2024 design system. This document is an *original pattern spec*; it does not borrow brand, wordmark, type, or copy from any specific product.

---

## 1. Anatomy

```
┌─────────────┬──────────┬──────────┬──────────────┬──────────────┐
│             │          │          │              │              │
│  WORDMARK   │   Docs   │  Portal  │   Socials  ⌗ │   Theme  ◐   │
│  (2 lines)  │          │          │              │              │
│             │          │          │              │              │
└─────────────┴──────────┴──────────┴──────────────┴──────────────┘
   col 1         col 2      col 3       col 4          col 5
```

- **Container** — `display: grid`, `grid-template-columns: 1.4fr 1fr 1fr 1.4fr 1.4fr` (wordmark and the right two cells take a touch more width).
- **Borders** — only `border-top` and `border-bottom` on the container; cells get a `border-right` (dropped on `:last-child`). Hairline weight `1px`, color `var(--fg)` at 14% alpha via `color-mix`.
- **Visibility** — `display: none` below `lg` (≥1024px); on mobile the nav collapses to a separate drawer (out of scope here).
- **Cell padding** — `1.25rem 1.5rem`.
- **Cell min-height** — `5.5rem` (the wordmark sets the floor; the text-link and right-side cells vertically align to top via `align-items: flex-start`).

---

## 2. Tokens

Original palette + type. The theme toggle (§6) flips between modes; CSS custom properties on the root carry the active values so cells inherit cleanly.

### Color — Light mode

| Token              | Value                       | Use                          |
|--------------------|-----------------------------|------------------------------|
| `--bg`             | `oklch(0.97 0.005 95)`      | Page background (warm bone)  |
| `--fg`             | `oklch(0.18 0.01 95)`       | Text + borders (ink)         |
| `--midground`      | `oklch(0.82 0.01 95)`       | Hover-fill overlay + knob    |
| `--accent`         | `oklch(0.62 0.14 55)`       | Focus ring (rust)            |

### Color — Dark mode

| Token              | Value                       | Use                          |
|--------------------|-----------------------------|------------------------------|
| `--bg`             | `oklch(0.16 0.01 250)`      | Page background (cool ink)   |
| `--fg`             | `oklch(0.94 0.005 250)`     | Text + borders (paper)       |
| `--midground`      | `oklch(0.32 0.015 250)`     | Hover-fill overlay + knob    |
| `--accent`         | `oklch(0.78 0.13 75)`       | Focus ring (amber)           |

### Type

| Role          | Family                            | Size / Tracking / Weight             |
|---------------|-----------------------------------|--------------------------------------|
| Wordmark      | **Space Grotesk** 700             | `42px` / `-0.005em` / `1.0` line     |
| Nav label     | **JetBrains Mono** 500            | `15px` / `0.1875em` / uppercase      |
| Cell heading  | JetBrains Mono 500, 50% opacity   | `15px` / `0.1875em` / uppercase      |

Two families, max. No Inter, no Roboto. The mono pulls the system-utility register; the grotesk keeps the wordmark feeling like a *mark*, not a label. The wordmark inherits `color: currentColor` from the root so it reads as ink on light and paper on dark — no blend modes.

---

## 3. Cells

### 3.1 Wordmark (col 1)

- Two-line wordmark, set in Space Grotesk 700, `42px / 1.0`, `letter-spacing: -0.005em`.
- The whole cell is the link target (`<a>` fills the cell via flex stretch).
- **Color: plain `currentColor`** — inherited from the root via `var(--fg)`. No `mix-blend-mode`. Earlier drafts used `mix-blend-mode: plus-lighter` for layering over colored hero bands; it broke light-mode legibility and was removed.
- No hover treatment beyond cursor — the wordmark is dignity, not interaction.

### 3.2 Text links — "Docs" and "Portal" (col 2, col 3)

These cells are the signature interaction. Each is an `<a>` whose entire box is the hover target (move into any pixel of the cell and the decode fires — not just the text).

Inside the link:

```
[ small.label ]            ← holds the rendered text + a block caret
[ overlay span ]           ← absolute, inset 4px, the hover-fill flash
```

**Resting state**
- `small.label` shows the resolved word (`DOCS`, `PORTAL`) in JetBrains Mono 500, 15px, `0.1875em` tracking, uppercase.
- Caret: `display: none`.
- Overlay: `position: absolute; inset: 4px; background: var(--midground); opacity: 0`.

**Hover state (the decode)**

The visible text becomes a function of two pieces of state: `locked` (how many characters have resolved so far, 0 → length) and `scrambleTick` (a counter incremented every animation frame to refresh the random glyphs).

For each position `i < locked` the real character is shown. For each position `i ≥ locked` a glyph is sampled from a pool:

```
GLYPHS = '!@#$%^&*+=<>?/|\:;.,"~`abcdefghijklmnopqrstuvwxyz0123456789'
glyph_i(tick) = GLYPHS[ (tick·(7+i) + 13·i + (tick XOR i)) mod GLYPHS.length ]
```

The prime mixing means each position cycles at a slightly different rate — they don't move in lockstep. Width stays stable throughout because JetBrains Mono is fixed-pitch and the scrambled string is the same length as the target.

Timing:
- `lockEveryMs = 75` — a new character locks in every 75 ms.
- `tickEveryMs = 45` — the rest re-randomize every 45 ms.
- `tailMs = 180` — short flash of caret-only after the last lock before the ticker stops.
- Total roughly `length · 75 + 180` ms — about 480 ms for *DOCS*, 630 ms for *PORTAL*.

Caret: when any decode is in progress *or* the link is hovered, a 1.2-ch block caret renders at the end of the text, dither-filled (§5), blinking on a 1 s `steps(2, end)` cycle.

Overlay: opacity → `0.08` on hover with `transition: opacity 0ms` (instant flash on enter); on mouse-out, `transition: opacity 250ms ease` (slow fade out). This asymmetry is what makes it feel mechanical rather than slick.

**Reset rules**
- Mouse-out cancels the ticker, snaps `locked` back to the word length, hides the caret. Re-entering replays the decode from scratch.
- Switching directly from Docs → Portal also restarts: the previous word snaps to fully resolved before the new decode starts.

**Focus-visible**
- Same caret + overlay as hover; the `:focus-visible` `aria-label` on the anchor (set explicitly to `"Docs"` / `"Portal"`) makes sure screen readers announce the static word regardless of what the visible text is doing.

### 3.3 Socials cluster (col 4)

Two columns inside the cell, `justify-content: space-between`:

- **Left:** the word "Socials" in mono, 15px, `0.1875em` tracking, opacity `0.5`. A *heading*, not a link.
- **Right:** a flex row, `gap: 0.5rem`, of icon links. Each link is a 24×24 hit target containing a 16×16 glyph. Glyphs are `fill: currentColor`, opacity `0.6` resting → `1.0` on hover, `transition: opacity 200ms`. Only platform glyphs you actually need (GitHub, Discord, etc.) — no decorative icons.

### 3.4 Theme toggle (col 5)

Same internal layout as Socials: heading on the left, control on the right.

- **Heading:** "Theme" — mono, 50% opacity.
- **Switch:** 44×24 pill, `border-radius: 9999px`, `border: 1px solid color-mix(in oklch, var(--fg) 25%, transparent)`, `background: color-mix(in oklch, var(--fg) 8%, transparent)`.
- Two 14×14 glyphs (sun, moon), absolutely positioned `left: 4px` / `right: 4px`, opacity `0.4`, `pointer-events: none`.
- 16×16 knob: `background: var(--midground)`, `border-radius: 9999px`, translated between `translateX(2px)` (light) and `translateX(24px)` (dark) with `transition: transform 200ms ease-out`.

---

## 4. The scramble decode — implementation notes

This is the load-bearing interaction. A few things that aren't obvious from the spec:

- **Drive the ticker from the hover handler**, not from a lifecycle hook that depends on `prevState`. Some renderers only pass `prevProps` to `componentDidUpdate`, so a "detect hover change in didUpdate" approach silently never fires. `onHover(which)` should stop any in-flight ticker, set `hovered`, and start the new ticker in the same function.
- The ticker is a chained `setTimeout` (~45 ms) that on every fire (a) increments `scrambleTick`, (b) recomputes `locked` from `(now − start) / lockEveryMs` (clamped to `length`). Don't drive `locked` with `setInterval` — drift will desync the lock cadence from the scramble re-randomization.
- Always clear the timer in both `onUnhover` and `componentWillUnmount`. A leaked ticker keeps calling `setState` after the component unmounts.
- Keep the glyph pool ASCII-only and same-width-in-mono. Adding wide chars (CJK, emoji) breaks the width-stability invariant.
- `text-transform: uppercase` is applied at the CSS layer, so the pool can include lowercase letters — they render uppercase but still visibly *change*, giving the decode more "noise" without enlarging the pool.

---

## 5. The dithered caret

The block cursor at the end of a hovered link is a 1-bit ordered-dither swatch, not a solid rectangle — it reads as "terminal cursor" rather than "highlight bar."

```css
@keyframes caret-blink { 50% { opacity: 0; } }
```

```js
caretStyle = {
  display: 'inline-block',
  width: '0.9ch',
  height: '0.95em',
  marginLeft: '0.5em',
  verticalAlign: '-0.08em',
  backgroundImage:
    `repeating-conic-gradient(${fg} 0% 25%, transparent 0% 50%)`,
  backgroundSize: '2px 2px',
  animation: 'caret-blink 1s steps(2, end) infinite',
};
```

`steps(2, end)` is intentional — a smooth fade would feel UI; the hard step feels like a CRT.

---

## 6. Theme toggle behavior

- The pill's `aria-label` reads `Switch to {next} mode` (computed from current state).
- Click → toggles `state.mode` between `"light"` and `"dark"`. Tokens in §2 are bound at the root via `var(--bg)` / `var(--fg)` / `var(--midground)` / `var(--accent)`, set inline on the root element.
- Persists to `localStorage` under one key, `terminalNav.theme`. On mount, hydrate from storage before first paint.
- The knob's `transform` transition runs `200ms ease-out`. No bounce, no overshoot.

---

## 7. Accessibility

- The container is `<nav aria-label="Primary">`.
- Each text-link `<a>` has an explicit `aria-label="Docs"` / `"Portal"`. The visible label is `aria-hidden="true"` because its text content scrambles during the decode and screen readers shouldn't try to read random glyphs.
- Caret and overlay spans are `aria-hidden="true"`.
- Icon links in the Socials cluster have `title` *and* `aria-label` ("GitHub", "Discord", etc.).
- Focus order follows DOM order: Wordmark → Docs → Portal → Socials (each icon in turn) → Theme toggle.
- Theme toggle is a `<button>`, not a checkbox; it announces its destination state, not its current one (`Switch to dark mode` while currently light).
- All hover affordances also fire on `:focus-visible` so the nav is fully usable from the keyboard.
- `prefers-reduced-motion: reduce` flattens animations and transitions to ~0ms. The scramble ticker is short enough (≤ 0.65 s total) and length-stable that flattening is acceptable; if a stricter implementation is needed, gate the decode itself behind a media query and show the resolved word instantly on hover.
- Color contrast: text against `--bg` ≥ 7:1 in both modes. The `--midground` overlay at 8% opacity is below WCAG thresholds — it's decoration, not signal, so contrast doesn't apply.

---

## 8. What this pattern is for

Use this nav when the product wants to feel like a **tool**, not an app — developer portals, model playgrounds, infra dashboards, anything where the user is technical and the brand wants to register as "made by people who run their own terminal." It will read as affected on a consumer surface; it will read as honest on a docs site.

**Don't** add a fifth or sixth nav cell — the grid stops feeling like *a thing* past 5. If you need more destinations, demote them to a dropdown anchored from "Docs" or "Portal," or put them in a footer.

**Don't** swap the mono for Inter or the grotesk for a serif. The whole point is the friction between *system-utility mono* (links, headings) and *industrial-grotesk wordmark* (identity). Lose either side and you have a generic nav bar with a weird hover.

**Don't** apply the decode to the wordmark or to the cell headings. The decode is a signal of *destination interactivity* — if everything decodes, nothing does. Reserve it for the two link cells.

---

## 9. Implementation checklist

- [ ] Grid container: 5 columns, `border-top`/`border-bottom`, cells get `border-right` except `:last-child`.
- [ ] Wordmark cell, two-line set, color inherited (no blend modes).
- [ ] Docs + Portal cells: hover handler on the `<a>` drives the decode; visible text is computed each render from `(target, locked, scrambleTick)`.
- [ ] Scramble ticker: chained `setTimeout(45ms)`; `locked = clamp(floor((now − start) / 75), 0, length)`; stop after `length·75 + 180` ms.
- [ ] Inset overlay span: opacity 0 → 0.08 on hover (instant in, 250 ms fade out).
- [ ] Dither caret: `repeating-conic-gradient`, 2×2 background-size, blinks via `caret-blink 1s steps(2, end) infinite`.
- [ ] Socials cell: heading + 24×24 icon links wrapping 16×16 glyphs.
- [ ] Theme toggle: pill + sun/moon glyphs + translating knob; persisted to `localStorage.terminalNav.theme`.
- [ ] `aria-label` on each text-link anchor; `aria-hidden` on every visible label that participates in the decode.
- [ ] Tear down the ticker in `onUnhover` *and* in the component's unmount hook.
- [ ] Hide the entire nav below `1024px`; mobile drawer is a separate component.
