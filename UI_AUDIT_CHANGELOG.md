# UI Audit Changelog

**Date:** 2025-02-11  
**Scope:** Visual and layout only. No game logic was modified.

---

## 1. Global / Design System

### CSS bug fix
- **`:root`** – Removed erroneous nesting: `.bracket-connectors-overlay` was inside `:root`, which broke the cascade. That block was removed from `:root` (the same rule already exists later in the file at `.bracket-connectors-overlay`).

### Design tokens added (`:root`)
- **Typography:** `--font-sans`, `--text-xs` through `--text-3xl`, `--font-medium` / `--font-semibold` / `--font-bold` / `--font-extrabold` / `--font-black`, `--leading-tight` / `--leading-normal` / `--leading-relaxed`.
- **Spacing:** `--space-1` (4px) through `--space-12` (48px).
- **Radius:** `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`.
- **Aliases:** `--bg-secondary`, `--text-muted` (alias of `--muted`) for use in components (e.g. StandingsScreen).

### Fonts
- **index.html** – Added Google Fonts preconnect and **Outfit** (weights 400, 500, 600, 700, 800) for a consistent, modern UI font.
- **body** – `font-family` set to `var(--font-sans)` (Outfit + system fallbacks); added `font-size: var(--text-base)`, `line-height: var(--leading-normal)`, and `-webkit-font-smoothing` / `-moz-osx-font-smoothing` for clearer text.

---

## 2. Layout & Spacing

- **.topBar** – Padding uses `var(--space-4)` and `var(--space-6)`; added `gap` and `flex-wrap` for better behavior when the sim progress badge is shown.
- **.content** – Padding changed from `24px` to `var(--space-6)`.
- **.grid2** – Gap uses `var(--space-4)`.
- **.homeContainer** – Gap and padding-bottom use `var(--space-8)` and `var(--space-12)`.
- **.card** – Padding and border-radius use `var(--space-6)` and `var(--radius-lg)`.
- **.cardTitle** – Margin and font-size use `var(--space-5)` and `var(--text-2xl)`; font-weight uses `var(--font-extrabold)`; line-height uses `var(--leading-tight)`.
- **.listRow** – Padding and border-radius use spacing/radius variables.
- **.input** – Padding, border-radius, font-size, and line-height use design tokens; added `font-family: inherit`.
- **.modalContent** – Padding and border-radius use variables; added `box-shadow` for depth.
- **.modalTitle** – Margin and font-size use variables; added `letter-spacing`.
- **.modalActions** – Gap and margin use `var(--space-3)` and `var(--space-4)`.
- **.hubCoachPrestigeGrid** – Gap and margin use spacing variables.

---

## 3. New Components / Classes

### Sim progress (top bar)
- **.simProgress** – Wrapper for the “Simulating: X / Y games” block: padding, background, border, border-radius, min-width.
- **.simProgressText** – Text color and font size/weight.
- **.simProgressBarTrack** – Track for the progress bar (height, background, radius).
- **.simProgressBarFill** – Fill bar (height, background, radius, width transition).

**App.tsx** – Replaced inline styles on the sim progress block with these classes. The only remaining inline style is `width` on the fill (dynamic from progress).

### Dynasty Hub
- **.hubCardLabel** – New class for “Head Coach”, “Prestige Rating”, “Season”, “Career Stats” labels: small caps, muted color, spacing (was previously undefined and inherited only).

### Season highlights (StandingsScreen)
- **.seasonHighlightsSection** – Section container: top margin, top padding, top border.
- **.seasonHighlightsSection .cardTitle** – Margin for the section title.
- **.seasonHighlightsGrid** – Grid for highlight cards (gap from tokens).
- **.highlightCard** – Card: padding, left border, background, radius, transition; **.highlightCard.clickable** for cursor and hover.
- **.highlightCardInner** – Flex row for icon + content.
- **.highlightCardIcon** – Icon size and flex.
- **.highlightCardContent** – Content flex child.
- **.highlightCardTitle** – Title font size/weight/margin; **.highlightCardTitle.high** for high-importance (gold) color.
- **.highlightCardDesc** – Description text and color.
- **.highlightCardMeta** – Small meta line (e.g. city, state).

**StandingsScreen.tsx** – Season highlights block refactored to use the above classes. Inline styles kept only where values are dynamic: `borderLeftColor` on each card and the `clickable` class based on `onTeamClick` / `highlight.teamId`.

---

## 4. Buttons

- **.btn.primary** – Explicit rule so “btn primary” has the same primary (orange) styling as the base `.btn` (some screens use `className="btn primary"`).
- **.btn.secondary** – Unchanged; already defined.

---

## 5. Files Touched

| File | Changes |
|------|--------|
| **index.html** | Font preconnect + Outfit link. |
| **src/App.css** | `:root` fix, design tokens, body font, topBar/content/card/grid2/homeContainer/listRow/input/modal/hub spacing and tokens, sim progress classes, hubCardLabel, season highlights classes, .btn.primary. |
| **src/App.tsx** | Sim progress block: use .simProgress, .simProgressText, .simProgressBarTrack, .simProgressBarFill; remove inline styles except progress bar width. |
| **src/ui/screens/StandingsScreen.tsx** | Season highlights: use seasonHighlightsSection, seasonHighlightsGrid, highlightCard*, with dynamic borderLeftColor and clickable class only. |

---

## 6. What Was Not Changed

- **Game logic** – No changes to simulation, recruiting, progression, or data flow.
- **Screen behavior** – No new features; only styling and class usage.
- **Other screens** – No edits to HomeScreen, NewDynastyScreen, RosterScreen, RecruitingScreen, BoxScoreScreen, BracketScreen, etc., except where noted above.
- **Inline styles** – Remaining inline styles are only where values are dynamic (e.g. progress bar width, highlight border color, or conditional cursor). All static styling was moved to CSS where practical.

---

## Summary

- Fixed a `:root` CSS bug and introduced a small design token system (typography, spacing, radius).
- Switched the app to the Outfit font and tuned body typography.
- Standardized spacing and radii on top bar, content, cards, grids, modals, and forms using variables.
- Added dedicated classes for sim progress, hub card labels, and season highlights, and refactored App.tsx and StandingsScreen to use them.
- Documented all edits in this changelog.
