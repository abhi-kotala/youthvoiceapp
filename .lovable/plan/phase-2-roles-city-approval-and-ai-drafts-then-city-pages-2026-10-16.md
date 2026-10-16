# Phase 2: Roles, City Approval, and AI Drafts (then City Pages)

Built on your four decisions. Everything is added alongside what exists. No current data or features are removed.

## One change you should know about first

Today, AI writes new topics for Fargo, West Fargo, and Moorhead and **publishes them right away** when old ones close. Your new rule ("off by default, drafts only, never auto-publish") means this will change:
- AI topics are switched **off** for every city, including your current three. You turn them on city by city.
- When they're on, AI saves **draft suggestions** to a review list. Nothing goes live until you approve it.
- Closing topics, giving extra time when votes are low, and sending results emails all keep working as they do now.

## Database changes (explained before I apply them)

1. **Roles.** A protected roles list (platform admin, city admin, partner, official), where each role is tied to specific cities. It's checked on the server with security-checked helper functions, and it's never stored on a profile. You become the first platform admin, linked to your account email.
2. **City status.** Cities can be `draft`, `pending`, `pilot`, `official`, or `paused`.
   - Only **official** and **pilot** cities are shown to the public.
   - Pilot cities always carry a "Pilot – not an official partnership" label.
   - A city becomes **official** only when you approve it, and the system records who approved it and when.
   - Your 3 current cities become **pilot**, since there's no verified government partnership yet. Tell me if any of them has one.
3. **City requests.** Anyone can submit a "bring YouthVoice to my city" request. It's saved as pending and is visible only to admins.
4. **Per-city settings.** AI topics on/off (off by default), the minimum vote count before officials see results, and how long topics stay open.
5. **AI draft queue and usage log.** Each AI run records its city, number of drafts, and an estimated cost. Drafts wait for an approval.
6. **City isolation rules.** A city admin can see and manage only their own cities' topics, comments, drafts, and recipients. Officials see totals only, and only above the minimum vote count.
7. **Account age.** Signup asks people to confirm they are 13 or older, and stores only a yes or no, never a birthdate. Accounts can't be created without it. Anonymous voting stays open to everyone.

## Screens

- **Admin → Cities:** approve, pilot, pause, or reject cities and requests. Turn AI on or off per city. See AI usage and estimated cost.
- **Admin → AI drafts:** review, edit, approve (publish), or discard each draft.
- **Admin → Roles:** give someone a role for specific cities (prepared for delegated admins later).
- **Request a city** page (public), with honest wording and no partnership claims.
- The existing passcode admin keeps working during the switch, then gets replaced by your signed-in platform admin role.

## Phase 2B (after 2A is tested)

City pages at `/c/state/city`, a state-then-city picker saved on the device, a national Explore page showing real counts only, and old links redirecting.

## Tests before moving on

- A city admin for city A cannot read or change city B's data.
- Signed-out users and officials cannot read individual votes, drafts, requests, or roles.
- Draft and pending cities never appear publicly. Pilot cities always show the label.
- AI topic runs do nothing for cities with AI off, and only create drafts for cities with it on.
- Signup is refused without the 13+ confirmation.
- The current home page, voting, and results emails still work.
