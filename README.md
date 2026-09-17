# TrackMe

A personal study workspace with a daily planner, tasks, a focus timer, calendar, journal, study analytics, coaching, achievements, and session history. No accounts or backend are required.

TrackMe was previously named StudyTrack. Existing browser data and JSON backups continue to work; the storage namespace stays unchanged for compatibility.

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

## Daily study workflow

1. Capture tasks with deadlines, a Pomodoro count, and minutes per Pomodoro (1–180). Tasks opens on today. Use the date picker, previous/next arrows, or Today/Tomorrow to view each day in board or list form. New tasks inherit the viewed study date, and summaries reflect that date. Unscheduled holds tasks without a study date; All tasks shows the full backlog. Study dates stay separate from deadlines.
2. Open **Daily plan** to choose a date and add tasks to an ordered queue. The plan estimates remaining focus time and shows that day's events. Completing, reordering, removing, or carrying tasks forward keeps deadlines and session history intact. One task belongs to one planned day at a time.
3. Start a task's focus block. Selecting a task sets the timer to its own duration, including after breaks. Completing the required number of full focus blocks automatically marks it done and leaves the next break ready without starting another block. Paused/unfinished blocks do not earn credit; deleting a credited session reopens a task that was completed automatically. Existing tasks without a saved duration use the workspace default. **Focus mode** reduces the interface to the timer and a scratchpad. Notes survive navigation and reloads and attach to the session on completion or early finish. Escape leaves focus mode without stopping the timer. Reset keeps scratch notes for your next attempt; workspace reset clears them.
4. If you studied away from the timer, use **History → Log study**. Enter the real start time, duration, subject, optional task, and notes. Future and overlapping records are rejected. Manual logs count as completed focus blocks and are identified in History and CSV exports.
5. Review your progress and write a short journal reflection. Adjust tomorrow's plan to the time you have.

On **Calendar**, select a day and use **Add task** to open the same full task form as Tasks, with that study date already filled in. Editing also uses the shared task editor. Tasks appear on their planned day; older unscheduled tasks remain visible on their deadlines and are labeled accordingly. Dragging a task to another calendar day moves its study plan without changing its deadline.

**History** supports Today/7D/30D/90D, inclusive custom dates, subject, outcome, timer/manual, and notes-only filters. Search also finds linked task titles and notes; choose oldest/newest ordering and open tasks directly from a session. Daily focus totals cover all matching sessions for that day, including entries on other pages. CSV exports include the entire filtered result with task names, rather than only the visible page.

The timer heatmap covers the last 365 days. Its five colors show progress toward the current daily goal; hover, tap, or use arrow keys for a day’s focus time and block count.

Command search (`Ctrl/Cmd + K`) can find every active task, including those beyond the first ten.

## Keep your study data

Data is stored in your browser's local storage, including tasks, events, journal entries, settings, and session history. It survives normal reloads and browser restarts. It does not sync between browsers, devices, or domains. Clearing site data or using private browsing can remove it.

Before switching from localhost to Vercel, open **Settings** on localhost and export a JSON backup. On your deployed site, import that file from Settings. Imports are validated before confirmation and replace the destination workspace. Keep regular backups outside your browser, especially before resets or switching devices. CSV and chart exports are useful reports; use the JSON backup to restore the full workspace. Custom timer categories and daily task plans are included. Older backups without these fields still work.

**Settings → Recovery points** keeps the latest three local snapshots. Create one manually or let the app create one before importing, loading demo data, clearing all tasks/sessions, or resetting the workspace. Restoring also saves the current workspace first. If a checkpoint cannot be written, the destructive operation is stopped. Individual item deletions and ordinary edits do not create checkpoints. Recovery points are separate from JSON backups and do not survive clearing browser site data. Export any checkpoint you want to keep.

Focus timers recover their remaining time after reload. Browser suspension can delay the completion sound or notification; the timer reconciles elapsed time when the app resumes. Notifications require browser permission. This is a static web app, without guaranteed background alarms or an offline service worker.

## Verify changes

```sh
npm test
npm run build
npm audit
```

Browser regression checks run against a running dev server or production preview, in a separate browser context that does not touch your normal study data:

```sh
TRACKME_URL=http://127.0.0.1:4173 npm run test:browser
TRACKME_URL=http://127.0.0.1:4173 npm run test:workflows
TRACKME_URL=http://127.0.0.1:4173 npm run test:pomodoro
TRACKME_URL=http://127.0.0.1:4173 npm run test:task-days
TRACKME_URL=http://127.0.0.1:4173 npm run test:calendar-tasks
TRACKME_URL=http://127.0.0.1:4173 npm run test:history
```

Install Google Chrome first, or supply `CHROME_PATH` pointing to a Chromium executable. Screenshots are written to `/tmp/studytrack-verification` by default; override with `STUDYTRACK_SCREENSHOTS`. The added workflow suite writes screenshots to `/tmp/studytrack-final` and covers daily planning, manual logs, focus notes, checkpoint recovery, and storage failures. The History suite writes screenshots to `/tmp/trackme-history` and verifies existing data, date and subject filters, notes, full-result export, pagination, task links, and mobile layouts. `STUDYTRACK_URL` remains accepted by the browser suites for existing scripts. The original suite covers study workflows, all 12 routes, desktop and mobile layouts, empty and populated workspaces, and browser errors.

## Structure

- `src/design-system.css`: shared visual system and responsive refinements.
- `src/components`: application shell, reusable controls, dialogs, and recovery UI.
- `src/pages`: the 12 study pages.
- `src/store`: workspace persistence and timer lifecycle.
- `src/utils/backup.ts`: backup validation.
- `tests`: data regression tests and browser workflow checks.
- `FINAL_IMPLEMENTATION_PLAN.md`: final-release scope and verification record (`IMPLEMENTATION_PLAN.md` preserves the earlier redesign).
