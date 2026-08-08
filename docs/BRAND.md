# Brand

AdeptBay. Appendix A, stage 02.

---

## The name

**Adept** — skilled, and quietly so. **Bay** — sheltered water; a place things
come into safely.

Together the promise the whole product runs on: *this is where your work gets
done, and it stays here.* It is short (8 characters), pronounceable, spells
itself over the phone, and is category-neutral, so nothing about it constrains
the platform to text tools or PDF tools or any other division.

**Tagline:** Every everyday tool, in one bay. *(Six words.)*

---

## The mark

A ring open to the east with a dot entering it.

A bay is a curve that shelters. The ring is the harbour, the dot is what comes
into it. Two shapes, no text, no gradient dependency for legibility — which
means it survives being rendered at 16 pixels in a browser tab.

```
Ring   circle r=7.5, stroke 3.6, dasharray "34.03 13.09", dashoffset -6.55
       → a 100° gap centred at 3 o'clock
Vessel circle r=2.2 at (25, 16)
Tile   32×32, radius 9, gradient #1BAE9A → #0E6A62 at 135°
```

Files: `src/app/icon.svg` (favicon, auto-detected by Next), `public/logo.svg`
(full lockup), `src/ui/Logo.tsx` (`<Logo/>` and `<LogoMark/>`).

Never re-colour the mark, never place it on a busy background, never set the
wordmark in anything but Inter Semibold.

---

## Colour

### Why teal

Market research, not preference. The online-tools category is dominated by two
palettes: **red** (iLovePDF, Smallpdf, TinyPNG) and **generic indigo**
(it-tools, 10015, most developer utility sites).

Deep teal is unclaimed in the category, reads as infrastructure rather than
consumer software, and ties to the name — a bay is water.

### The ramp

| Token | Hex | Used for |
|---|---|---|
| `brand-50` | `#eefbf8` | Tinted surfaces, light |
| `brand-100` | `#d2f5ee` | |
| `brand-200` | `#a6eadd` | Hairlines on tinted surfaces |
| `brand-300` | `#6fd8c7` | Link text, dark theme |
| `brand-400` | `#38bdab` | Action fill, dark theme |
| `brand-500` | `#16a18f` | Focus ring |
| `brand-600` | `#0f8274` | **Action fill, light theme** |
| `brand-700` | `#0f6961` | **Link text, light theme** |
| `brand-800` | `#11544f` | Pressed |
| `brand-900` | `#124542` | |
| `brand-950` | `#052b29` | Label on brand fill, dark theme |

Neutrals are a cool ink ramp, `ink-50` … `ink-950`, faintly green-shifted so
they sit under the brand rather than fighting it.

### Contrast — measured, not eyeballed

| Pair | Ratio | Standard |
|---|---|---|
| `brand-600` on white | 4.71:1 | AA normal text ✓ |
| `brand-700` on white | 6.53:1 | AA normal, AAA large ✓ |
| `brand-400` on `brand-950` | 6.53:1 | AA normal ✓ |
| `brand-300` on `ink-950` | 10.97:1 | AAA ✓ |

**Dark mode is not an inversion.** A mid-teal cannot carry white text at AA on
a dark ground, so the brand fill flips: dark fill with light text in light
mode, light fill with dark text in dark mode.

### The rule components follow

Components reference **semantic roles only** — `bg-panel`, `text-fg-muted`,
`border-line`, `bg-brand`. Never `bg-brand-600`, never a hex value. One role
swap in `src/config/theme.css` restyles every page.

---

## Typography

Two families, no more (stage 02 item 10).

**Inter** — UI and prose. The most legible free grotesque at the 13–15px sizes
tool interfaces live at, with a huge character set and a variable optical-size
axis. Loaded through `next/font`, so it is self-hosted with a size-adjusted
fallback and causes no layout shift.

**JetBrains Mono** — every byte of user data. Unambiguous `0`/`O` and
`1`/`l`/`I`, which is the whole reason a mono face exists on a site where
people read hashes, JWTs and generated passwords.

### Scale

| Role | Size | Weight |
|---|---|---|
| Page H1 | 24–28px | 600 |
| Section H2 | 18px | 600 |
| Sub-heading H3 | 14px | 500–600 |
| Body | 15px | 400 |
| Secondary / UI | 13px | 400 |
| Meta / caption | 11–12px | 400 |
| Stat headline | 24px mono | 600, tabular |

Headings use `text-wrap: balance`, body uses `text-wrap: pretty`, and
tracking tightens by 1.8% on headings.

---

## Voice

Five lines, from `src/core/site.ts`:

1. **Plain.** Say what the tool does in the fewest words that are still true.
2. **Specific.** "0.4s on a 5 MB file", never "blazing fast".
3. **Honest about limits.** Every tool page states what it cannot do.
4. No hype, no exclamation marks, no fake urgency, no cookie-cutter filler.
5. Written for someone mid-task who wants to leave as soon as they are done.

### In practice

| Don't | Do |
|---|---|
| "Blazingly fast PDF compression!" | "Compress PDF — 68% average reduction on 42 test files" |
| "The best free word counter" | "Word Counter — counts CJK and Bangla correctly" |
| "Something went wrong" | "Line 4, column 22 — trailing comma before this bracket" |
| "Unlimited free forever!!" | "No account, no daily limit, no watermark" |

The differentiator goes in the sub-heading, not the headline. The headline is
the keyword.

---

## Assets

| What | Where |
|---|---|
| Favicon | `src/app/icon.svg` |
| Full lockup | `public/logo.svg` |
| React component | `src/ui/Logo.tsx` |
| Design tokens | `src/config/theme.css` |
| OG image template | `src/app/api/og/route.tsx` |
| Brand facts (name, tagline, voice, contact) | `src/core/site.ts` |

`site.ts` is the single source of truth for anything that appears in metadata,
schema, the footer or the OG image. Change it there and it changes everywhere.
