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

## Home · Feed, Search, Notifications (M5)

From "Feed · 2026 update" and the master page's Global Search and Notification. Clips are the web's Innovations posts (`lib/innovations/clips.ts`); the phone's own choices live in `lib/innovations/{feed-prefs,search}.ts` and `lib/notifications/phone.ts`.

- **Feed (Home)**: full-screen clips of what is shared on the marketplace — each post a Project clip, each further product with its own video a Product clip. The clip on screen plays muted and looping; tap pauses or plays. The title and description open the project or product details, the creator their profile, Follow is the web's follow. Feed | Following (`?tab=following`; nobody followed → Search People). Text over the clip is white.
- **Side nav**: 3D (the item's render; samples have no 3D file), AR/VR mode (checks WebXR, says why there is nothing to place), appreciate with its count, comments with their count, Share to your Feed, ⋯. **Offers** on the clip: Main · Physical · Virtual NFT cards, Testnet demo, Buy → the item's marketplace.
- **Comments** (DS M100 in the tall sheet): Top / Newest / Oldest, threads with "View n more replies", Reply · ♥ · ⋯ (yours: Edit, Copy link, Delete; others': Copy link, Report), the pinned composer with Link, Image, @mention and Replying to @Name; written to the web's comment store.
- **⋯ menu**: Interested / Not interested (reorders the Feed, Undo), Hide video (Undo), Save video, Copy link, Playback speed (0.5–2), Video quality (Auto or the clip's own height; Data saver waits for a tap), Report (the kit's sheet with the web's post reasons; Tell us more under Something else).
- **Share to your Feed**: Post audience (Public / Only me), a caption, Share now. **Saved** (`/m/saved`): saved clips with Saved on and ⋯ (View original post, Copy link, Unsave with Undo). **Marketplace activity** (`/m/market-activity`): weekly average price and volume (demo dollars), sales per day over 7 · 30 · 90 days, the sales list.
- **Queue pill**: while a build of yours waits, "Please wait. Your build is next in line" (or n ahead) opens the AI tab. **One clip** (`/m/clip/<id>`, `?comment=` opens its comments; a missing clip says so).
- **Global Search** (`/m/search`): Recent searches (Clear all, ✕ each); typing suggests People, Projects and Blogs with the match highlighted; results under People · Post · Projects · Parts & Agile Module · Marketplace · Blog (View all or one kind), People with Follow; `?q=` / `&kind=` kept in the address; a blog opens in the phone's reader (`/m/blog/<slug>`).
- **Notification** (`/m/notifications`): the web bell's notices under All / Unread, grouped New · Today · Yesterday · by date; each with its button (opens its phone screen, marks it read) and ⋮ (Turn off notifications like this with Undo, Mute this project, Delete); the header ⋮ has Mark all as read, Notification settings, Clear all (asks first; clears this phone's list only).
- **Guests** browse Home after Explore first; appreciating, following, commenting, saving, sharing, reporting, buying, and opening details, search, notifications or activity ask them in (the guest gate).

## Earn Coin tab (M8)

From the owner's master page (Wallet Balance, Stacking, Refer & Earn, Buy IDEEZA Coin) on the web's IDZ balance, ledger, presale and demo wallet (`lib/wallet/`); staking and referrals are demo logic in `lib/wallet/{staking,referral}.ts`, recorded in the same demo wallet, so every balance agrees.

- **Earn Coin** (`/m/earn`): Buy $IDZ Coin, Stake IDZ, Refer and Earn Coin, each opening its tab (Buy $IDZ · Stake · Refer & Earn); ⋯ holds Wallet balance and the Demo wallet (connect, demo account 1–3, network).
- **Balance card**: the network chip, the IDZ figure with "= $…" at the one IDZ price, Available · Staked · Ready to claim · Pending, the demo IDZ token address to copy; not connected: "No data found" with Connect Wallet.
- **Buy $IDZ**: each presale purchase as a card (Txn ID and wallet copy, You paid, date) filtered by Chain Type and Status; "Unlocks in" counts down, then Claim through the wallet sheet, then Claimed.
- **Buy IDEEZA Coin** (`/m/earn/presale`): the round countdown, Until price increase, Total USD raised (demo), the one price; Buy With Crypto → Connect Wallet (Demo wallet first, the four real wallets Soon, "I don't have a wallet" → Need a wallet?); You get ⇅ You pay, the coin sheet (ETH/USDT/USDC), whitelist discount, gas line, Max and the web's checks; Buy $IDZ through the wallet sheet, then Purchase successful counting down to the claim.
- **Wallet signing** (KIT-WS-01…05): connect and switch-network sheets, review with the request rows, network fee and risk line (a shortfall disables Confirm with the reason), waiting, confirming; "You cancelled in your wallet" / "That didn't go through" say "Nothing changed." with Try again or Close.
- **Stake**: each stake as a card with Withdraw (in the grace time and after the lock-up; locked between, with the reason), Staked and Reward, lock-up progress, TXN ID and Claim / Claim in … / Claimed, filtered by Month and Year; paused and blocked contracts show their own states (Get support). A staking day lasts a minute in the demo. "Demo: contract states" in ⋯ sets paused / blocked (prototype only).
- **Stake List** (`/m/earn/stake/contracts`) searches contracts by name or address; a **contract** (`/m/earn/contract/[id]`) lists its options (Est. APR, lock-up, reward token; closed ones off with the reason); the Stake sheet checks balance, wallet limit, gas and the contract's state, shows the reward over the lock-up and stakes through the wallet. **Stake detail** (`/m/earn/staked/[tx]`) lists each reward share (Claim in … / Ready / Claimed) with Claim All.
- **Refer & Earn**: Generate Link asks for the wallet first; the campaign card shows the link to copy, Referred Users · $IDZ Earned · Points, the lock-up countdown, then admin approval, Claim all points as IDZ (1 point = 1 IDZ) through the wallet, then Join the next campaign; activity filters by campaign and searches by name. "Simulate a referral" plays a demo creator using the link (prototype only). **Campaign History** (`/m/earn/history`) with a Date Range.
- **Wallet Balance** (`/m/earn/wallet`): Buy IDZ · Stake IDZ · Import IDZ, every IDZ movement (rewards, mints, credits, presale buy and claim, stake, withdraw) filtered by Chain Type and Transfer Type, 10 at a time with Show more; Import IDZ token shows the contract address, symbol and decimals to copy.

## Shared kit (M0)

`/m/kit` (prototype only) opens every pattern of the Figma "Shared kit · 2026 update" page:

- **Sheets** (M09): handle, title + description + ✕, scrolling content, stacked XL actions, home indicator; one scrim; Escape, the scrim and dragging the handle down close it; focus stays inside and the app behind is inert. A tall sheet stops 61 px under the top.
- **Menus** (M12 action sheet): a centred title, 40 px rows with a 16 px icon, the one red destructive row last, Cancel.
- **Confirms**: neutral (KIT-CF-01, "Keep editing"), destructive (Block, KIT-RB-20), typed delete (KIT-CF-03: the action stays off until the name matches; the mismatch shows on leaving the field), can't-yet (KIT-CF-04: sends you where to fix it).
- **Report sheet** (KIT-RB-10…19b): a reason list per target, a 500-character note, Also block; Send report stays off until a reason is picked; Sending…, couldn't send (note kept, Try again), offline (kept until back online), Report sent (and "You blocked … too").
- **Toasts** (M02): one at a time, 8 px above whatever is at the foot (tab bar, bottom bar or home indicator), 4 s, 6 s with an action; success, error and no-icon leads. "Back online" shows when the connection returns.
- **States**: list-row bones (KIT-SK-01), empty and error cards (M48 / M49), the offline banner (M01).
- **Also in the kit**: code cells, a pick-one sheet select (A06 on a phone), the Bottom action bar; links to the account states the demo can't cause, and (prototype only) Sign out until Profile has it.
