# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web Monitor is a web scraping and job notification system built on [Playwright](https://playwright.dev/). It scrapes job listing websites, filters results by configured keywords, and emails matching jobs to specified recipients. The current implementation monitors Te Papa (Wellington, NZ) job listings on a weekday schedule via GitHub Actions.

## Commands

```bash
npm ci                                  # Install dependencies
npx playwright install --with-deps chromium   # Install browser (required first time / CI)
npx playwright test                     # Run all tests
npx playwright test tests/test-cases/  # Run only E2E monitoring tests
npx playwright test tests/unit/        # Run only unit tests
npx playwright test --reporter=html    # Run with HTML report
```

No custom npm scripts are defined — invoke Playwright directly.

## Architecture

The system uses Playwright as the runtime but is not a conventional test suite — the "tests" are the actual monitoring jobs.

### Data Flow

```
Global Setup (record session start)
  → Test Workers (each spec):
      Load web-site.json config → navigate site → keyword-match jobs → NotifyBuffer.add()
      On worker teardown: NotifyBuffer.saveToFile() → .notify-temp/<worker-id>.json
  → Global Teardown (single process):
      Merge all temp files → NotificationSender.send() (one email per recipient) → cleanup temp files
```

### Key Components

| File | Role |
|------|------|
| `tests/models/web-site.model.ts` | Loads `web-site.json`; exposes site configs (URL, keywords, recipient emails) |
| `tests/models/notify-buffer.ts` | In-memory notification accumulator; serialises/merges across workers via `.notify-temp/` |
| `tests/models/notification-sender.ts` | Sends aggregated HTML+text email via nodemailer SMTP |
| `tests/fixtures.ts` | Playwright fixture that injects `webSiteConfig` into every test |
| `tests/global-setup.ts` | Records session start time |
| `tests/global-teardown.ts` | Orchestrates email send after all workers finish |
| `tests/test-cases/tepapa-host.spec.ts` | E2E scraper for Te Papa jobs |
| `tests/data/web-site.json` | Site monitoring config (URLs, keywords, recipients) |

### Inter-Worker Communication

Playwright runs test files in parallel workers. Each worker writes its `NotifyBuffer` to a temp JSON file at teardown (`.notify-temp/<hash>.json`). Global teardown merges all temp files before sending a single email per recipient.

### Adding a New Site to Monitor

1. Add an entry to `tests/data/web-site.json` with `code`, `url`, `keywords`, and `recipientEmails`.
2. Create a new spec file in `tests/test-cases/` using the `webSiteConfig` fixture to load the config and `notifyBuffer` to accumulate results.

## Environment Variables

Required at runtime (set as GitHub Secrets for CI):

| Variable | Purpose |
|----------|---------|
| `SMTP_USER` | SMTP login username |
| `SMTP_PASS` | SMTP login password |

SMTP host/port/secure settings are hardcoded in `.github/workflows/scan-website.yml`. If credentials are absent, the email step is skipped with a warning (no test failure).

## CI/CD

GitHub Actions (`.github/workflows/scan-website.yml`) runs on:
- Push to `main`
- Cron: `0 20 * * 0-4` UTC (Mon–Fri 8am NZST)
- Manual `workflow_dispatch`

Only Chromium is used. HTML test reports are uploaded as artifacts (30-day retention).


## Project Structure
src/
workflows/      # High-level browse/scrape workflows
pages/          # Page object models (one per page/screen)
utils/          # Shared helpers (selectors, waits, parsing)
config/         # Environment + runtime config
types/          # Shared TypeScript types
tests/            # Playwright tests
workflows/        # Markdown specs for browse workflows (read on demand)
data/             # Output / scraped data (gitignored)
.env              # Secrets (gitignored)
.github/          # GitHub Actions config

## Commands
- `npm run dev` — run main script in dev mode
- `npm run build` — compile TypeScript to `dist/`
- `npm test` — run Playwright tests
- `npm run lint` — lint and typecheck
- `npx playwright install` — install browser binaries (first-time setup)
- `npx playwright codegen [url]` — record interactions to generate selectors

## Conventions

### Code style
- Use **async/await**, never `.then()` chains.
- Prefer **page object models** in `src/pages/` over inline selectors in workflows.
- Selectors: prefer `getByRole`, `getByLabel`, `getByTestId` over CSS/XPath. Fall back to CSS only when needed.
- Always `await` Playwright actions — no floating promises.
- Use `expect(locator).toBeVisible()` etc. for assertions, not manual `if` checks.

### Waits
- **Never** use `page.waitForTimeout(ms)` in production code (only acceptable while debugging).
- Use `waitForSelector`, `waitForLoadState`, `waitForResponse`, or auto-waiting locators.

### Error handling
- Wrap browser launches and workflow runs in try/finally to ensure `browser.close()`.
- Log errors with context (URL, step name) — don't swallow.
- Take a screenshot on failure: `page.screenshot({ path: \`./debug/fail-${Date.now()}.png\` })`.

### TypeScript
- `strict: true` in tsconfig.
- No `any` unless justified with a comment.
- Export shared types from `src/types/`.

## Workflow specs
Step-by-step browse workflows live in `./workflows/*.md`.
When implementing a workflow, read the relevant spec file first and follow it exactly. Ask before deviating.

## What NOT to do
- Don't commit `.env`, `data/`, `debug/`, or `playwright-report/`.
- Don't add `waitForTimeout` calls to "fix" flaky tests — find the real signal to wait on.
- Don't hardcode credentials or URLs in source — use config/env.
- Don't bypass the page object pattern by putting raw selectors in workflow files.