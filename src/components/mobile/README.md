# src/components/mobile — the mobile prototype router

The `/m` prototype's own screens and parts, from the mobile Figma (`fKXxJ25dXvxWWa0kCKeSF4`). Logic comes from `src/lib` like the web's; nothing here is shared with the web shell. What works: [docs/guides/features/mobile-app.md](../../../docs/guides/features/mobile-app.md). Back to [docs/map/PRODUCT.md](../../../docs/map/PRODUCT.md).

| File | What it is |
|---|---|
| `device.tsx` | Phone, desktop or inside the desktop's phone frame (`useDeviceMode`, `useFramed`), and whether a tab bar is at the foot |
| `mobile-root.tsx` | The `/m` root: the desktop's phone frame (an iframe, its address kept in step) or the app itself, with the toast host |
| `screen.tsx` | One screen: status bar, top bar, the scrolling content, a pinned footer, the home indicator |
| `status-bar.tsx`, `home-indicator.tsx` | The phone chrome, drawn only in the frame; the safe-area insets on a phone |
| `top-bar.tsx` | Mobile / Top bar: Back, the title, 44 px actions |
| `tab-bar.tsx` | Navbar Container: Home · Earn Coin · AI · Message · Profile |
| `phase-placeholder.tsx` | Prototype only: a tab until its phase is built |
| `kit/sheet.tsx` | M09 Sheet and M12 ActionSheet: one scrim, Escape, drag to close, focus inside |
| `kit/confirm-sheet.tsx` | Confirms: neutral, destructive, typed |
| `kit/report-sheet.tsx` | The Report sheet and its states |
| `kit/toast.tsx` | M02 toasts (`useToast`) and the foot marker they stand above |
| `kit/states.tsx` | Bones, the offline banner, `useOnline`, the Back online toast |
| `kit/bottom-bar.tsx`, `kit/code-cells.tsx`, `kit/sheet-select.tsx` | The Bottom action bar and its text link, six code cells, A06 Select as a pick-one sheet |
| `account/mobile-gate.tsx` | Where the phone may go (way-in, setup, tabs, guest Home), Splash, the Face ID offer |
| `account/ways-in.tsx`, `account/guest-gate.tsx` | Continue with Apple · Google · Facebook · email, the Demo provider sheet, the guest gate |
| `account/code-step.tsx`, `account/parts.tsx`, `account/terms-sheet.tsx` | The six-digit code step and Demo email; heading, checklist, alert, Splash; the Terms viewer |

Rules: every popup is a bottom sheet in this one style; tokens only, mapped from the Figma variables; text over video is always white (`status="media"`).
