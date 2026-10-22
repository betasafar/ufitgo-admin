# ufitgo-web

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_F7KBVL2GGPEovy6c1R3uhLMJuhRa)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Lima report emails

Analytics > Lima demand insights shows the persistent report-email switch.
Admins with `settings.manage` can change it. Emails default to off before
launch, and disabling blocks scheduled and manual report sending. When enabled,
reports go only to `hello@ufitgo.ng`. Deploy the admin API changes before this UI.

## App launch waitlist

Admins with `marketing.manage` permission can view website app-launch signups at
**Growth & marketing > App waitlist** (`/dashboard/app-waitlist`). The read-only
page supports email search, active/inactive filters, pagination, and refresh.
It does not send launch notifications.

Deploy the user API and admin API changes before the admin web app:

1. User API: `GET /api/intelligence/internal/app-launch-waitlist`, protected by the internal API key.
2. Admin API: `GET /api/admin/app-launch-waitlist`, protected by admin authentication and `marketing.manage`.
3. Admin web app: uses the existing authenticated `/api/admin/*` proxy.

The admin API uses the existing `USER_API_URL` and `INTERNAL_API_KEY` settings.
The existing user API `CreateAppLaunchWaitlist` migration must have run; no new
table or migration is needed for the admin view.

## Home merchandising

**Growth & marketing > Home content** (`/dashboard/home-content`) is restricted
to `marketing.manage` and uses the existing session-authenticated admin proxy.
The Operator API remains the source of truth; this page does not independently
select public packages.

- Set Hajj and Ramadan selling years independently (automatic or manual).
- Show, hide, reorder, and rename Home sections. Choose automatic, manual-only,
  or manual-with-fill selection and order packages with the searchable picker.
  Manual-only selections never silently fill; fallback is an explicit choice.
  Recommendations can constrain manual and automatic candidates to all packages,
  Hajj, Umrah, or Ramadan Umrah, with an optional Hajj/Ramadan season year.
  Seasonal sections use the central season rules; Featured uses campaign filters.
- Add, edit, pause, or remove campaigns with custom local date/times, stored as
  UTC. End-date presets add 1, 3, or 4 calendar months; enabled schedules cannot
  overlap. No artificial discounts or countdowns are generated.
- Preview the unsaved draft to see effective packages and eligibility warnings.
  Per-package badges distinguish pinned/manual, promoted campaign, and automatic
  selections.
  Preview does not save. Saving submits the complete configuration with its
  expected revision; a conflict preserves your draft for review before reloading.
- Review the classification queue and edit package `season` / `seasonYear` on
  the existing create/edit form (package-management permission required).

The admin API requires `OPERATOR_API_URL` and `INTERNAL_API_KEY` and proxies
`/api/admin/home-content` to the Operator API's internal Home-content endpoints.
Deploy the Operator API persistence/resolver and admin proxy before using this
page. Existing automatic defaults remain unchanged until explicitly saved.

Focused helper tests (Node.js 22.18+): `TZ=UTC node --test lib/home-content.test.mjs`.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
