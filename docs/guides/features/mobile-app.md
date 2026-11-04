# Mobile app prototype

The coded mobile prototype at `/m`, built from the mobile Figma (`fKXxJ25dXvxWWa0kCKeSF4`): the 2026 update pages where they exist, else the owner's "Design - Light Mode (Current)" page. It shares the web's stores and API routes; its screens are its own (`src/components/mobile/`). Back to [README.md](README.md).

## Shell (M0)

- **One page, two ways to see it.** On a phone `/m` fills the screen (edge to edge, safe-area insets, Add to Home Screen as "IDEEZA"). On a desktop it draws a 375 × 812 phone and runs the same page inside it in an iframe, so the desktop shows exactly what a phone shows; the address bar follows the screen inside, so a reload or a copied link opens the same screen.
- **Phone chrome in the frame only:** the Figma status bar (live clock, cellular, wifi, battery) and home indicator; on a phone the OS draws them.
- **Tab bar** (Figma Navbar Container `3070:11343`): Home · Earn Coin · AI (the orb) · Message · Profile, the current tab marked by the border/focus line above it; it stays mounted while you move between tabs. Each tab shows a placeholder naming the phase that builds it (prototype only).
- **Top bar** (Mobile / Top bar): Back (the previous screen, Home when there is none), a centred title, up to 44 px actions on the right.

## Account (M1)

From "Account · 2026 update" (AU-01…33); the accounts are the web's (`lib/account/auth.ts`), and the phone's own rules and memory are `lib/account/phone.ts`.

- **Splash** while the app works out where to open, then **Welcome** (first launch and after sign-out): a three-slide showcase (auto-advance, still with reduced motion, swipe), Continue with Apple · Google · Facebook · email (Apple first on iOS, Google first on Android), the Terms viewer, Explore first. Offline and a provider's error show as alerts.
- **Guest**: Explore first opens Home as a guest; Earn Coin, AI, Message and Profile ask them in with the guest gate sheet, and signing in comes back to that tab.
- **Apple, Google, Facebook**: a Demo sheet stands in for each provider's own (name and email; Apple's Hide my email gives a relay address; Facebook can share none → Add your email). Signing you in, then: a new account goes to Name and handle; an email that already has an account without that provider goes to Link accounts (its password, or the way it signed in before).
- **Sign in**: field errors on leaving a field or on submit, one alert for wrong details, five wrong tries lock that email for 5 minutes (countdown), unverified → Send code, offline keeps the input. Suspended and session-expired have no cause in the demo; the Shared kit opens them.
- **Create account**: email, password with the phone's four-rule live checklist, re-type (mismatch on leaving), consent with the minimum age; Create account stays off until valid; an email already used offers Sign in instead.
- **Codes** (Verify email, Reset): six cells, sent on by the 6th digit, Checking the code…, wrong, expired (10 minutes), five wrong lock it for 10 minutes, Resend after 30 s, offline keeps the code. Open email app shows the Demo email with the code and Use this code.
- **Name and handle**: any-script name; the handle follows the name until edited, with the web's rules: Checking…, Available, taken with three free suggestions, the format error. Saved to the account and the profile.
- **Your profile** (4 optional steps, Continue and Skip): photo (Take photo / Choose from library / Remove, the camera and photos pre-prompts once), Latin name, headline; About, location, languages (pick sheet), Open to; skills (Return adds) and top 3 specialities with years (a 4th is refused); 5 links and 4 social profiles. Saved to the web profile; a failed save keeps the text.
- **Welcome map**, then Look around first (where they were going) or Start with my idea (AI tab). The Face ID offer comes once per phone after the first sign-in.
- **Reset password**: email (prefilled from Sign in) → code in neutral words → new password (not the current one, checklist, Sign out of other devices) → signed in where they were, with "Password reset".

## Shared kit (M0)

`/m/kit` (prototype only) opens every pattern of the Figma "Shared kit · 2026 update" page:

- **Sheets** (M09): handle, title + description + ✕, scrolling content, stacked XL actions, home indicator; one scrim; Escape, the scrim and dragging the handle down close it; focus stays inside and the app behind is inert. A tall sheet stops 61 px under the top.
- **Menus** (M12 action sheet): a centred title, 40 px rows with a 16 px icon, the one red destructive row last, Cancel.
- **Confirms**: neutral (KIT-CF-01, "Keep editing"), destructive (Block, KIT-RB-20), typed delete (KIT-CF-03: the action stays off until the name matches; the mismatch shows on leaving the field), can't-yet (KIT-CF-04: sends you where to fix it).
- **Report sheet** (KIT-RB-10…19b): a reason list per target, a 500-character note, Also block; Send report stays off until a reason is picked; Sending…, couldn't send (note kept, Try again), offline (kept until back online), Report sent (and "You blocked … too").
- **Toasts** (M02): one at a time, 8 px above whatever is at the foot (tab bar, bottom bar or home indicator), 4 s, 6 s with an action; success, error and no-icon leads. "Back online" shows when the connection returns.
- **States**: list-row bones (KIT-SK-01), empty and error cards (M48 / M49), the offline banner (M01).
- **Also in the kit**: code cells, a pick-one sheet select (A06 on a phone), the Bottom action bar; links to the account states the demo can't cause, and (prototype only) Sign out until Profile has it.
