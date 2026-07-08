# Design System Spec — "QA Dashboard" Look & Feel

> **Purpose of this file.** This is a machine-readable design brief for a CLI coding agent
> (Claude Code, Cursor, etc.). Point the agent at this file and at the target project and say:
>
> > "Restyle this existing project to match the design system described in `DESIGN_SYSTEM.md`."
>
> The agent should treat the rules below as the **single source of truth** for visual language.
> Reproduce the *look* (colors, surfaces, radii, gradients, signature patterns), **not** the
> business logic, page structure, or content of the QA Dashboard. Adapt the tokens to whatever
> components already exist in the target project.

---

## 0. Agent Instructions (read first)

When applying this design to an **existing project**, follow this order:

1. **Detect the stack.** Read `package.json` / lockfiles. Identify framework (Next.js, Vite+React,
   Vue, plain HTML, etc.) and Tailwind version. Do **not** reframework the project — only restyle it.
2. **Install the token layer.** Port the CSS variables in §3 into the project's global stylesheet.
   - Tailwind v4 → use the `@theme inline` + `:root` / `.dark` block verbatim (see §3.1).
   - Tailwind v3 → put the variables in `:root`/`.dark` and map them in `tailwind.config.{js,ts}`
     under `theme.extend.colors` using `hsl(var(--…))` / direct `var(--…)` references.
   - No Tailwind → emit the variables and write plain CSS utility classes.
3. **Set the global frame** (§4): dark mode on by default, RTL if the app is Hebrew/Arabic, base
   font stack, custom scrollbar, focus ring, selection color.
4. **Restyle shared primitives first** (§6): Button, Card, Badge, Input, Tabs, Dialog. If the
   project uses shadcn/ui, align variants; otherwise apply the equivalent classes.
5. **Apply signature patterns** (§7): gradient header with decorative circles, gradient rounded
   sidebar, glass surfaces, stats cards, hover-lift cards. These are what make the look recognizable.
6. **Verify** against the checklist in §9.

**Hard rules**
- Never hardcode hex colors in components. Always reference tokens (`bg-dashboard-card`,
  `text-white/60`, `var(--status-passed)`, etc.).
- Surfaces on the dark background are built from **white-opacity overlays** (`bg-white/10`,
  `border-white/10`), not opaque grays.
- Icons: **lucide-react** (or any single consistent SVG set). The only emoji used as a "logo" glyph
  in the source is intentional/legacy — prefer SVG for new work.
- Keep one container rhythm: `p-6` page padding, `gap-4`/`gap-6` between cards, `rounded-xl` cards,
  `rounded-2xl` panels.

---

## 1. Identity in one paragraph

A **dark, modern admin dashboard** with a deep navy-to-near-black background, **glassmorphism-lite**
surfaces (translucent white overlays with hairline white borders), a **purple accent**, and
**navy-blue gradients** on the two hero surfaces (top header bar and side navigation). Corners are
generously rounded. Status is communicated with a fixed 4-color semantic palette (green/red/yellow/blue).
Motion is subtle: 200–300ms transitions, gentle fade/slide-in, a hover "lift" on cards, and a pulsing
glow border around the viewport while a long task runs. The product is **RTL-first (Hebrew)** and
**dark-mode-first**.

Style keywords: `dark-mode` · `glassmorphism` · `gradient-accent` · `rounded` · `dashboard` · `RTL`.

---

## 2. Tech Stack (reference implementation)

| Concern        | Choice                                                          |
|----------------|-----------------------------------------------------------------|
| Framework      | Next.js 15 (App Router), React 19, TypeScript                   |
| Styling        | **Tailwind CSS v4** (CSS-first `@theme`, no `tailwind.config.js`)|
| Components     | shadcn/ui — **"new-york"** style, `baseColor: neutral`, CSS vars |
| Icons          | **lucide-react**                                                |
| Variants       | `class-variance-authority` (cva)                                |
| Class merge    | `clsx` + `tailwind-merge` exposed as `cn()` in `lib/utils`       |
| Animations     | `tw-animate-css` + hand-written keyframes                       |
| Fonts          | `Geist` + `Geist Mono` via `next/font/google`                   |

> If the target project is on Tailwind v3 or a different framework, keep the **tokens and patterns**;
> just change the mechanism (see §0.2).

---

## 3. Design Tokens

All colors come from CSS variables. Dashboard-specific surfaces and status colors are **plain hex**
(consistent across light/dark); the shadcn base palette uses **OKLCH**.

### 3.1 Token block (Tailwind v4 — paste into `globals.css`)

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  /* shadcn surface roles (card/popover/primary/secondary/muted/accent/etc.) */
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* radius scale derived from one base */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  /* DASHBOARD-SPECIFIC TOKENS — the signature of this design */
  --color-dashboard-bg: var(--dashboard-bg);
  --color-dashboard-card: var(--dashboard-card);
  --color-dashboard-sidebar: var(--dashboard-sidebar);
  --color-dashboard-accent: var(--dashboard-accent);
  --color-status-passed: var(--status-passed);
  --color-status-failed: var(--status-failed);
  --color-status-warning: var(--status-warning);
  --color-status-info: var(--status-info);
}

:root {
  --radius: 0.625rem; /* 10px base */

  /* shadcn light defaults (kept, but app runs dark-first) */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --border: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);

  /* Dashboard signature colors */
  --dashboard-bg: #f5f5f5;
  --dashboard-card: #ffffff;
  --dashboard-sidebar: #f0f0f0;
  --dashboard-accent: #9f7aea;   /* purple accent */
  --status-passed: #48bb78;       /* green  */
  --status-failed: #f56565;       /* red    */
  --status-warning: #ecc94b;      /* yellow */
  --status-info: #4299e1;         /* blue   */
}

.dark {
  --background: #0f1117;
  --foreground: oklch(0.985 0 0);
  --card: #141724;
  --card-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --border: oklch(1 0 0 / 10%);   /* hairline white border */
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);

  /* gradient seeds for header + sidebar */
  --primary-color: #1e3c72;       /* navy   */
  --secondary-color: #2a5298;     /* blue   */

  /* Dashboard signature colors (dark) */
  --dashboard-bg: #0f1117;        /* page background */
  --dashboard-card: #141724;      /* card surface    */
  --dashboard-sidebar: #0f0f23;   /* sidebar base    */
  --dashboard-accent: #9f7aea;
  --status-passed: #48bb78;
  --status-failed: #f56565;
  --status-warning: #ecc94b;
  --status-info: #4299e1;
}
```

### 3.2 Color reference table

| Token                  | Dark value | Role                                                |
|------------------------|------------|-----------------------------------------------------|
| `--dashboard-bg`       | `#0f1117`  | App background (almost-black navy)                  |
| `--dashboard-card`     | `#141724`  | Card / panel surface                                |
| `--dashboard-sidebar`  | `#0f0f23`  | Sidebar base color (bottom of its gradient)         |
| `--dashboard-accent`   | `#9f7aea`  | Purple accent — focus ring, selection, highlights   |
| `--primary-color`      | `#1e3c72`  | Navy — top of header/sidebar gradient               |
| `--secondary-color`    | `#2a5298`  | Blue — mid of header gradient                        |
| `--status-passed`      | `#48bb78`  | Success / passed                                    |
| `--status-failed`      | `#f56565`  | Error / failed                                      |
| `--status-warning`     | `#ecc94b`  | Warning                                             |
| `--status-info`        | `#4299e1`  | Info                                                |
| Indigo/violet glow     | `#6366f1` / `#8b5cf6` | "running" halo + accents (see §7.5)      |

**Text-on-dark scale (use white with opacity, never gray hexes):**
`text-white` (primary) → `text-white/70` (secondary) → `text-white/60` (muted) →
`text-white/50` (faint) → `text-white/40` (disabled/decorative).

**Borders on dark:** `border-white/10` default, `border-white/20`–`/30` on hover/emphasis.

### 3.3 Radius scale

Base `--radius: 0.625rem` (10px). Usage convention:
- Buttons, inputs, small controls → `rounded-md`
- Cards → `rounded-xl`
- Hero panels (header, sidebar) → `rounded-2xl` (sidebar uses `rounded-l-2xl`)
- Badges / pills / avatars-circles → `rounded-full`

### 3.4 Typography

- **Sans:** `Geist` (via `next/font`, `--font-geist-sans`). **Mono:** `Geist Mono` (`--font-geist-mono`).
- **Hebrew/RTL fallback stack** (used for UI chrome): `'Assistant', 'Heebo', 'Rubik', 'Segoe UI', system-ui, sans-serif`.
- **Body fallback:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`.
- **Mono / console:** `'Consolas', 'Monaco', 'Courier New', monospace`, 13px, line-height 1.6.

Type scale in use:
| Element            | Classes                                  |
|--------------------|------------------------------------------|
| Page/header title  | `text-2xl font-bold tracking-tight`      |
| Card title         | `font-semibold leading-none` (`text-white`) |
| Stat value         | `text-2xl font-bold` (gradient card) / `text-xl font-bold` (accent card) |
| Body               | default (~14px / `text-sm` in dense areas) |
| Secondary/meta     | `text-sm text-white/60`                  |
| Micro / timestamps | `text-xs ... font-mono`                  |

---

## 4. Global Frame

```html
<!-- Root html element -->
<html lang="he" dir="rtl" class="dark">
  <body class="<geistSans.variable> <geistMono.variable> antialiased">
```

Required global CSS (in `@layer base` or equivalent):

```css
@layer base {
  * { @apply border-border outline-ring/50; }
  html { direction: rtl; scroll-behavior: smooth; }   /* drop `direction: rtl` for LTR apps */
  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
  }
}
```

Plus these global affordances (copy as-is, they are part of the identity):

- **Custom scrollbar** — thin (8px), translucent white thumb (`rgba(255,255,255,0.2)`), darker track.
- **Focus ring** — `:focus-visible { outline: 2px solid var(--dashboard-accent); outline-offset: 2px; }`
- **Selection** — `::selection { background: var(--dashboard-accent); color: white; }`
- **Cursor** — `button, a, [role=button], label[for], select, … { cursor: pointer; }`

> **RTL note:** This project is RTL. If the target app is LTR, remove `dir="rtl"` /
> `direction: rtl`, flip the sidebar to the left (`left-0`, `rounded-r-2xl`, `ml-*` margins),
> and drop the `.rtl-flip` / `[data-direction]` helpers.

---

## 5. Layout Model

```
┌─────────────────────────────────────────────┐
│  <main> page padding p-6                      │
│  margin-right reserves sidebar width          │
│  ┌─────────────────────────────────────────┐ │
│  │  Gradient Header (rounded-2xl, mb-6)      │ │  ← §7.1
│  ├─────────────────────────────────────────┤ │
│  │  Stats row (grid, gap-4)                  │ │  ← §7.3
│  ├─────────────────────────────────────────┤ │
│  │  Content cards grid (cols 1→2→3, gap-4)   │ │  ← §7.4
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
  Fixed Sidebar on the right (RTL), rounded-l-2xl  ← §7.2
```

- **Shell:** `<div class="min-h-screen bg-dashboard-bg">` wraps a fixed `<Sidebar>` + `<main>`.
- **Sidebar width:** `w-64` expanded, `w-16` collapsed, `transition-all duration-300`.
  Main content mirrors with `mr-64` / `mr-16` (RTL). For LTR use `ml-*` and a left sidebar.
- **Page padding:** `p-6` everywhere.
- **Card grids:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`.
- **Breakpoints:** ≤1024px collapse sidebar to icons; ≤768px hide sidebar, stack grids to 1 column.
- **Z-index scale:** sidebar `z-50`, running-halo overlay `z-[9999]`, in-panel overlays `z-10`.

---

## 6. Core Primitives (shadcn-aligned)

Use `cva` for variants and `cn()` to merge classes. Base specs:

**Button** (`rounded-md text-sm font-medium`, `transition-all`, `disabled:opacity-50`):
- `default`: `bg-primary text-primary-foreground hover:bg-primary/90`
- `destructive`: `bg-destructive text-white hover:bg-destructive/90`
- `outline`: `border bg-background hover:bg-accent` (dark: `bg-input/30 border-input`)
- `secondary`, `ghost` (`hover:bg-accent`), `link`
- Sizes: `xs`(h-6) · `sm`(h-8) · `default`(h-9) · `lg`(h-10) · icon variants (`size-6/8/9/10`)

**Card** — `bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm`.
In dashboard usage, override to the signature surface: `className="bg-dashboard-card border-white/10"`.
Sub-parts: `CardHeader` (px-6, grid), `CardTitle` (`font-semibold leading-none`), `CardContent` (px-6),
`CardFooter`.

**Badge** — `rounded-full border px-2 py-0.5 text-xs font-medium`. Variants mirror Button.
Glass badge recipe (used for the clock): `bg-white/[0.08] border-white/[0.12] text-white/70 font-mono backdrop-blur-sm`.

**Input / Select / Tabs / Dialog / Dropdown** — standard shadcn "new-york" primitives, themed by the
tokens above. Keep Radix under the hood if available.

---

## 7. Signature Patterns (these define the look — implement them)

### 7.1 Gradient Header bar
A rounded hero bar at the top of every page.
```
<header class="relative overflow-hidden rounded-2xl p-6 mb-6">
  <!-- layer 1: horizontal navy→blue→navy gradient -->
  <div class="absolute inset-0 bg-gradient-to-l
       from-[var(--primary-color)] via-[var(--secondary-color)] to-[var(--primary-color)]"></div>
  <!-- layer 2: darkening from bottom -->
  <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
  <!-- decorative translucent circles, pointer-events-none -->
  <div class="pointer-events-none absolute top-0 left-0 w-72 h-72 bg-white/[0.06] rounded-full -translate-x-1/3 -translate-y-1/2"></div>
  <div class="pointer-events-none absolute bottom-0 right-1/3 w-48 h-48 bg-white/[0.05] rounded-full translate-y-1/2"></div>
  <!-- content sits in a relative wrapper -->
  <div class="relative flex items-center justify-between"> … </div>
</header>
```
- Title: `text-2xl font-bold text-white tracking-tight`; subtitle `text-white/60 text-sm`.
- Logo chip: `h-12 w-12 rounded-xl bg-white/10 p-1.5 backdrop-blur-sm border border-white/10`.
- Right side: action buttons + small `opacity-80` logo + live clock in a glass `Badge`.

### 7.2 Gradient Sidebar (rounded, decorative)
```
<aside class="fixed right-0 top-0 bottom-0 z-50 w-64 transition-all duration-300">
  <div class="relative w-full h-full overflow-hidden rounded-l-2xl
       bg-gradient-to-b from-[var(--primary-color)] to-[#0f1a30]
       border-l border-white/10 shadow-xl">
    <!-- decorative circles bg-white/[0.03–0.04] -->
    <!-- logo block: w-10 h-10 rounded-lg bg-white/10 -->
    <!-- nav links -->
  </div>
</aside>
```
- Nav link (inactive): `text-white/70 hover:bg-white/10 hover:text-white rounded-lg px-3 py-2.5`.
- Nav link (active): `bg-white/20 text-white` + trailing chevron.
- A small circular collapse toggle hangs off the panel edge: `w-6 h-6 rounded-full bg-white/10 border border-white/20`.
- Optional gradient-text greeting: `bg-gradient-to-l from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent`.

### 7.3 Stats Cards (two variants)
```
// GRADIENT variant — colored translucent fill (used on home/overview)
<Card class="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30 border">
  <CardContent class="p-4 flex items-center justify-between">
    <div><p class="text-sm text-white/60">{title}</p>
         <p class="text-2xl font-bold text-white mt-1">{value}</p></div>
    <div class="text-white/40">{icon}</div>
  </CardContent>
</Card>

// ACCENT variant — neutral card, colored icon + value (used on history/results)
<Card class="bg-dashboard-card border-white/10">
  <CardContent class="p-4 flex items-center gap-3">
    <div class="text-blue-400">{icon}</div>
    <div class="flex-1"><p class="text-sm text-white/50">{title}</p>
         <p class="text-xl font-bold text-blue-400">{value}</p></div>
  </CardContent>
</Card>
```
Color families: `blue | green | purple | orange | yellow | red`, each as
`from-{c}-500/20 to-{c}-600/20 border-{c}-500/30` (gradient) or `text-{c}-400` (accent).

### 7.4 Content / entity card
`bg-dashboard-card border-white/10 transition-colors hover:border-white/30 cursor-pointer`,
with a `rounded-lg` logo/icon chip tinted by the entity color at ~19% alpha
(`backgroundColor: client.colors.primary + '30'`).

### 7.5 Motion & effects (copy keyframes)
- **Card hover lift:** `.card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }` (200ms).
- **Entrance:** `fadeIn` (opacity+translateY 10px, 0.3s) and `slideIn` (translateX 20px, 0.3s).
- **`animate-pulse-slow`:** 2s opacity pulse for "live"/loading dots.
- **Running halo:** a fixed full-viewport `pointer-events-none` overlay (`z-[9999]`) whose inset
  box-shadow pulses indigo→violet (`#6366f1`/`#8b5cf6`) over 3s while a long task runs. Toggle a
  `.is-running` class. This is a distinctive flourish — reuse it for any global "busy" state.
- **Gradient utilities:** `.gradient-primary` (`135deg, #1e3c72→#2a5298`), `.gradient-success`
  (`#38a169→#48bb78`), `.gradient-danger` (`#e53e3e→#f56565`).
- Standard transition timing: **200ms** for color/hover, **300ms** for layout (sidebar), ease-out.

---

## 8. Do / Don't

| Do                                                              | Don't                                              |
|-----------------------------------------------------------------|----------------------------------------------------|
| Build surfaces from `white/opacity` over the dark bg            | Use opaque gray hex panels                          |
| Reference tokens (`bg-dashboard-card`, `var(--status-passed)`)  | Hardcode hex in components                          |
| Round generously (`rounded-xl` cards, `rounded-2xl` heroes)     | Sharp 0–4px corners                                 |
| Keep status to the fixed 4-color semantic set                   | Invent new status hues per page                     |
| Use lucide (one SVG icon set), `w-5 h-5` / `w-4 h-4`            | Mix icon sets or use emojis as functional icons     |
| Subtle motion (≤300ms, transform/opacity)                       | Animate width/height; bouncy or >500ms transitions  |
| Decorative circles at `bg-white/[0.03–0.06]`, behind content    | Loud overlays that reduce text contrast             |
| Respect `prefers-reduced-motion`                                | Force the running-halo/pulse on users who opt out   |

---

## 9. Acceptance Checklist (agent self-verify)

- [ ] Token block ported; `dark` class on root; app renders dark-first.
- [ ] Page bg = `--dashboard-bg`; cards = `--dashboard-card` with `border-white/10`.
- [ ] Header is a `rounded-2xl` navy→blue gradient bar with decorative circles + glass clock badge.
- [ ] Sidebar is a `rounded-l-2xl` (or `-r-` for LTR) vertical gradient with translucent nav states.
- [ ] Stats cards exist in both gradient and accent variants using the 6 color families.
- [ ] Buttons/Badges/Cards follow §6 specs; focus ring is purple `--dashboard-accent`.
- [ ] Custom scrollbar, selection color, and cursor rules applied globally.
- [ ] Card hover-lift + fade/slide-in entrance animations present; ≤300ms.
- [ ] Status colors used semantically (passed/failed/warning/info).
- [ ] (If RTL) layout mirrored correctly; (if LTR) sidebar + margins flipped.
- [ ] No hardcoded hex in components; no emoji icons in new UI; contrast ≥ 4.5:1 for body text.

---

*Generated from the QA Dashboard codebase (`qa-dashboard/`): `app/globals.css`, `app/layout.tsx`,
`components/layout/*`, `components/ui/*`, `components/dashboard/*`. Keep this file in sync if the
design tokens change.*
