# Final personal-study release

## Intent
Preserve the established graphite/sage design. Make the daily loop complete: choose realistic work, focus, record study done away from the app, review progress, and recover data. No accounts, collaboration, backend, or live deployment.

## Implementation
- [x] Daily plan: a dedicated route with date navigation, ordered task queue, remaining-time estimate, daily capacity, events, completed work, and carry-forward of unfinished plans. Planning dates must never change deadlines.
- [x] Tasks: board/list switch, deadline filters, daily-plan scheduling in editors, reliable task deep links and complete command search.
- [x] Manual study: accessible history dialog for date/time/duration, category, optional task and notes; reject future or overlapping logs, label manual records and include them in exports.
- [x] Focus mode: distraction-free timer overlay with pause/resume, safe exit and persistent scratch notes attached to the resulting session.
- [x] Data reliability: custom categories in workspace/backup, validated legacy migration, local checkpoints before replacing/clearing data, manual checkpoint/export/restore controls, visible failure states.
- [x] Performance/accessibility: avoid rewriting unchanged storage sections, stable timer persistence, keyboard/focus interactions, responsive new views and honest empty states.
- [x] Verification: data regression tests, production build, existing browser regressions, new workflow coverage, screenshots on desktop/mobile, dependency audit.
- [x] Document final features, backup/recovery semantics, deployment steps and verified limitations.

## Design and data decisions
- Daily plans reference existing tasks. One task has one planned date; moving it forward retains its due date, history, and subtasks.
- Manual entries record completed focus blocks and count toward study totals; the interface identifies their source.
- Local recovery points complement external JSON backups. They share the browser's storage and cannot protect against clearing site data.
- Existing backups remain importable. New task/session/category properties are optional for migration.
- All destructive confirmations continue to use the shared in-app modal.

## Verification record
Release 1.1.0 — September 17, 2026.

- `npm test`: 13 passing tests covering dates, streaks, task credit, backup validation, queue order/carry-forward, estimates, manual-session overlap checks, category compatibility, and checkpoint retention/storage failure.
- `npm run build`: TypeScript and Vite production build pass. New pages and workflows remain split into route chunks; initial JS is approximately 219 KB / 72 KB gzip.
- `npm run test:browser` against production preview: original CRUD, timer lifecycle, journal, settings, calendar, keyboard and navigation regressions pass. All 12 routes pass at 1440px and 390px with both empty and populated data (48 combinations), with one primary heading and no horizontal page overflow.
- `npm run test:workflows`: planner add/reorder/complete/carry-forward, deadline preservation, task list/deep links, command results beyond ten tasks, manual logs and rejection states, focus-note persistence/completion, reduced timer storage writes, category JSON export, checkpoint cancellation/restore and storage-full protection all pass.
- No browser JavaScript errors or native confirmation dialogs in either suite.
- Screenshots reviewed for the new planner, list view, manual log dialog, focus room and recovery controls on desktop/mobile. Remaining toolbar sizing and hidden-label styling corrected before the final run.
- `npm audit`: 0 known vulnerabilities reported. `git diff --check`: clean.
- Tests use isolated Chromium contexts and synthetic fixtures, separate from the user's normal browser data.

## Practical limits
- Prepared and tested as a static app using a local production preview; no live Vercel deployment was performed.
- Workspace and recovery points remain browser/origin-local. External JSON backups are still needed for domain/device changes or browser data loss. There is no cloud synchronization or coordination between simultaneous editing tabs.
- Background suspension can delay sounds and completion handling. Elapsed time reconciles when the app resumes; guaranteed background alarms and offline launch are not provided.
- Manual logs reject any overlap with recorded session intervals, including the span of a paused timer, to avoid double-counting.
- Mobile verification uses Chromium viewport emulation, not physical iOS/Android devices or a full screen-reader audit.

## Task timing and dashboard follow-up
- [x] Fix the dashboard banner touching the cards below by giving all top-level sections a consistent gap.
- [x] Add a saved minutes-per-Pomodoro field to task creation/editing, total-time previews, and duration-aware daily-plan estimates.
- [x] Make task selection set the timer duration through a single provider-owned calculation; preserve it through reloads and focus/break cycles.
- [x] Complete a task automatically at its required number of full focus blocks. Do not credit skipped/interrupted sessions or breaks; stop automatically starting new blocks once the task finishes.
- [x] Protect live task progress from stale editor drafts. Undo automatic completion when a credited session is deleted, while preserving manual completion.
- [x] Replace the timer heatmap with exactly 365 days, a consistent five-color legend, unclipped day details, keyboard navigation and tap support.

Verification: 19 data tests and production build pass. `npm run test:pomodoro` exercises task create/edit duration, task selection, paused timer reload, the full focus-break-focus completion cycle, dashboard gaps at 1440/1100/390px, matching heatmap/legend colors, and mouse/keyboard/touch day details. Existing browser regressions pass on all 12 routes in empty/populated desktop/mobile states (48 combinations), with no JavaScript errors. Screenshots inspected in `/tmp/studytrack-pomodoro`.

## Day-wise Tasks follow-up
- [x] Default Tasks to today's study-plan date; add date picker, previous/next arrows, and Today/Tomorrow shortcuts.
- [x] Scope both board/list views and summary cards to the selected date, including completed tasks.
- [x] Preserve the viewed date in the URL for refresh/back navigation; deep links open a task on its actual study day.
- [x] Default new tasks to the viewed day, and retain the selected day when creating from Daily Plan.
- [x] Keep older undated tasks accessible through Unscheduled and All tasks. Bulk scheduling uses the chosen day and selection is cleared across dates.
- [x] Verify past/future creation, date navigation, reload, list view, daily totals, bulk scheduling, rescheduling without deadline changes, Daily Plan links, invalid URL handling, and mobile overflow in isolated Chrome.

Data tests: 20 pass. Production build passes. Targeted screenshots reviewed at 1440px and 390px in `/tmp/studytrack-task-days`.

## Calendar task consistency follow-up
- [x] Extract the Tasks creation and detail dialogs into shared components and use both on Calendar.
- [x] Default calendar-created tasks to the selected study date, including Pomodoro count/duration and the full task fields.
- [x] Display planned tasks on their study date; keep legacy unscheduled deadlines visible and clearly labeled. Make dragging reschedule the study date without changing the deadline.
- [x] Verify future/past day creation, independent deadlines, editing, drag scheduling, keyboard dismissal, mobile layout, and cross-page persistence. Run data tests and production build.

Verification: production build and all 20 data tests pass. `npm run test:calendar-tasks` passes creation/editing, independent study/deadline dates, Tasks/Daily Plan persistence, calendar drag scheduling, legacy deadlines, week view, Escape/dropdown handling, focus restoration, cancellation, and mobile creation/list editing. No browser errors; desktop/mobile screenshots in `/tmp/studytrack-calendar-tasks`.
Existing browser regression suite also passes all study workflows and all 12 routes in populated/empty desktop/mobile layouts (48 combinations), including task-editor Escape after adding a subtask, calendar event CRUD, and no JavaScript errors.

## TrackMe and History follow-up
- [x] Rename all product-facing branding, metadata, notifications, and downloads to TrackMe while preserving storage keys and old backups.
- [x] Add inclusive calendar-day presets/custom dates, subject/outcome/source filters, notes-only search, sorting, and clear filters to History.
- [x] Clarify statuses, show note previews and linked-task details, preserve complete day totals across pagination, and export the complete filtered result.
- [x] Verify filter boundaries, grouping, existing-data compatibility, notes and deletion, export, desktop/mobile layout, and production build.

Verification: all 24 data tests and the production build pass. The existing browser regression suite passes all workflows and all 12 pages in empty/populated desktop/mobile states. `npm run test:history` verifies retained browser data, inclusive dates, combined filters, ordering, full-day totals across pagination, CSV task names and full filtered exports, searchable notes, delete confirmation, task links, TrackMe metadata/downloads, and import of an older StudyTrack backup. Final screenshots reviewed at 1440px and 390px in `/tmp/trackme-history`; no browser JavaScript errors.
