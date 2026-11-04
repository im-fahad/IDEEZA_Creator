# Building the mobile prototype (/m)

How a screen of the coded mobile prototype is built. What already works: [features/mobile-app.md](features/mobile-app.md). Code router: [src/components/mobile/README.md](../../src/components/mobile/README.md).

## What decides what (owner, 2026-11-04 / 11-05)

- **Every screen and state in the mobile Figma ships.** The Figma mobile designs are the product's real features, not ideas.
- **The web is newer.** Where the mobile Figma and the web disagree on a feature, its logic or its words, the web wins: reuse its `src/lib` logic, its stores and its words; take the mobile Figma's layout, components and IA. Never drop a Figma screen because the web lacks it — build it on the web's data.
- **Never invent IA.** The tabs, menus and screen order come from the Figma. A screen the Figma doesn't draw follows the nearest drawn pattern.
- Agreed decisions still apply: no Friends (D-1), no group / call / voice rows in Messages (D-2), Feed not Innovations, ETH not MATIC, no sound customization (D-9), no Activity log (D-17).

## The Figma

File `fKXxJ25dXvxWWa0kCKeSF4` ("IDEEZA - Mobile V.2"). Read only — never edit it. Use the 2026 update page when one exists, else the owner's master page:

| Area | Page |
|---|---|
| Account (way in, Sign-in & security, sign out, delete) | Account · 2026 update `10627:28230` |
| AI create | AI create · 2026 update `10706:2` (Full AI flow) |
| Project details | Project Details · 2026 update `10322:2` |
| Product details | Product Details · 2026 update `10459:3` |
| Home = Feed | Feed · 2026 update `10646:2` |
| Messages, creator profiles | People · 2026 update `10673:2` |
| Settings | Settings · 2026 update `10688:2` |
| Sheets, menus, toasts, states, glossary | Shared kit · 2026 update `10600:2` |
| Everything else (Earn Coin tab, Profile hub, Search, Notifications, Plans, KYC, Payments, IDEEZA pay, FAQ, Report an issue, Tutorial, My project) | Design - Light Mode (Current) `10702:161444` |

Each frame's note ("Note · …") beside a row says what the row covers; the Shared kit's Glossary (`10624:5792`) and Copy rules (`10624:5968`) set the words.

## Building blocks (use these, don't rebuild them)

- **Screen** (`components/mobile/screen.tsx`): status bar, `top`, the scrolling content, a pinned `footer`, the home indicator. `status="media"` over a video.
- **TopBar** (Back, centred title, 44 px actions), **TabBar** (only through `app/m/(tabs)/layout.tsx`), **BottomBar** + `SwitchLine` / `TEXT_LINK` (kit/bottom-bar.tsx).
- **Popups — always from the bottom, one style:** `Sheet` (M09: title, description, ✕, content, stacked XL actions), `ActionSheet` (M12 menu, the red destructive row last), `ConfirmSheet` (neutral / destructive / typed), `ReportSheet`, `SheetSelect` (A06 Select as a pick-one sheet). No centred or floating dialog, no dropdown popover.
- **Feedback:** `useToast()` (one at a time, above the foot), `ListBones` / DS `Skeleton`, DS `StateCard` (M48 empty / M49 error, `className="w-full"`), `Banner` (M01: tones `good` · `attention` · `info` · `error`), `useOnline()` / `OfflineBanner`.
- **Account:** `useAuth()` (lib/account/auth.ts) for who is signed in; `account/parts.tsx` (`AccountHeading`, `ACCOUNT_CONTENT`, `PasswordChecklist`, `AccountAlert`); `GuestGate`.
- **DS atoms** (`components/ideeza/*`): Button (sizes up to `xl` = 44), IconButton, TextInput (`size="xl"`, `prefixText`), Textarea, Radio / Checkbox (an `sr-only` input inside a `relative` label, the atom `decorative`), Tag (`onClick`, `selected`, `onDismiss`), Avatar, Badge, ProgressBar, Spinner, Skeleton, TestnetDemoBadge. Form fields: `Field`, `PasswordInput`, `errorProps`, `useFieldIds` from `components/auth/auth-parts.tsx`. Icons: `Icon` + `@hugeicons/core-free-icons` (the Figma's `icon/<name>` is `<Name>Icon`).

## Tokens at phone width

Inside /m the page is always phone-width (the desktop shows it in a 375 px iframe), so tokens take their phone values. Pick the token whose **phone** value is the Figma's pixel value:

| Figma px | spacing class | font |
|---|---|---|
| 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 | `1 · 2 · 3 · 4 · 5 · 6 · 7 · 8` | 11 `text-xs` · 12 `text-sm` · 14 `text-md` · 16 `text-lg` |
| 20 | `12` | 18 `text-2xl` · 20 `text-3xl` (H4) |
| 24 | `16` | 24 `text-4xl` (H3) · 28 `text-5xl` |
| 32 · 40 · 56 · 64 | `20 · 24 · 32 · 40` | pair each size with its `leading-*` |

Radius: name the Figma's variable (`rounded-xl` for radius/xl; it renders 14 on a phone). Colours: only token classes or `var(--color-…)`. No hex, no new `--` variables, no `style={{}}` except for data (a measured offset, a progress width). A raw `h-[44px]` for a Figma component's fixed size is fine.

## Rules every screen keeps

- Real logic behind every control — the web's stores and API routes (`src/lib/*`, `/api/*`). A control with nothing behind it yet is disabled with its reason, never a dead button.
- Every state the Figma draws: loading (bones after the shell), empty, error, offline, the disabled and busy states of each action.
- Text over a photo or video is white (`data-theme="dark"` on the overlay, `status="media"`).
- Money is Testnet demo: the `TestnetDemoBadge` once per screen by the first money figure.
- Tabs need an account; the way-in screens are `ENTRY_PATH` in `lib/account/phone.ts`; `account/mobile-gate.tsx` decides who may open what.
- Phone-only logic goes in `src/lib/<area>/` with relative imports and a `tests/projects/*.test.mjs`.
- Prototype-only things (a Demo sheet standing in for a provider, a demo email) say "Demo" on screen.

## Checking a screen

1. `npx tsc --noEmit -p tsconfig.json`, `npx eslint <your files>`, and `npm run test:projects` when `src/lib` changed.
2. Run the worktree's dev server and drive the screen headless at phone size:
   `node scripts/mobile-shot.mjs --url http://localhost:<port>/m/<screen> --out /tmp/<name>.png --signin --steps steps.js` (`--dark` for dark mode, `--profile <dir>` to keep the browser's data between runs). Open the PNG and compare it with the Figma frame's screenshot (`get_screenshot`).
3. Check every control does what it says (steps can click, type and read the DOM).
