# StudyTrack

A personal study workspace with tasks, a focus timer, calendar, journal, study analytics, coaching, achievements, and session history. No accounts or backend are required.

## Run locally

Use Node.js 22.12 or newer (Node 22 LTS recommended).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. New workspaces start empty. You can optionally load sample data from Settings; doing so replaces the current workspace after confirmation.

## Deploy to Vercel

1. Push this project to your own Git repository and import it into Vercel.
2. Select the Vite framework and Node.js 22.x. Use `npm run build` as the build command and `dist` as the output directory.
3. Deploy. No environment variables, authentication provider, or database are needed.

The included `vercel.json` configures SPA route rewrites so links such as `/tasks` and `/journal` work when opened directly or refreshed. See [Vercel's Vite deployment documentation](https://vercel.com/docs/frameworks/frontend/vite).

For a local production preview:

```sh
npm run build
npm run preview
```

## Keep your study data

Data is stored in your browser's local storage, including tasks, events, journal entries, settings, and session history. It survives normal reloads and browser restarts. It does not sync between browsers, devices, or domains. Clearing site data or using private browsing can remove it.

Before switching from localhost to Vercel, open **Settings** on localhost and export a JSON backup. On your deployed site, import that file from Settings. Imports are validated before confirmation and replace the destination workspace. Keep regular backups outside your browser, especially before resets or switching devices. CSV and chart exports are useful reports; use the JSON backup to restore the full workspace.

Focus timers recover their remaining time after reload. Browser suspension can delay the completion sound or notification; the timer reconciles elapsed time when the app resumes. Notifications require browser permission. This is a static web app, without guaranteed background alarms or an offline service worker.

## Verify changes

```sh
npm test
npm run build
npm audit
```

Browser regression checks run against a running dev server or production preview, in a separate browser context that does not touch your normal study data:

```sh
STUDYTRACK_URL=http://127.0.0.1:4173 npm run test:browser
```

Install Google Chrome first, or supply `CHROME_PATH` pointing to a Chromium executable. Screenshots are written to `/tmp/studytrack-verification` by default; override with `STUDYTRACK_SCREENSHOTS`. The suite covers study workflows, all 11 routes, desktop and mobile layouts, empty and populated workspaces, and browser errors.

## Structure

- `src/design-system.css`: shared visual system and responsive refinements.
- `src/components`: application shell, reusable controls, dialogs, and recovery UI.
- `src/pages`: the 11 study pages.
- `src/store`: workspace persistence and timer lifecycle.
- `src/utils/backup.ts`: backup validation.
- `tests`: data regression tests and browser workflow checks.
- `IMPLEMENTATION_PLAN.md`: completed implementation and verification record.
