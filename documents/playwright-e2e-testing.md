# Playwright E2E System Testing

## Overview

End-to-end system tests for **EZY Notez** drive the real Next.js frontend
against the live Express + FastAPI backend and Supabase project. Tests cover
the eight feature areas of the workspace: auth, workspace hub, resources,
summarization, quiz, flashcards, Chattie, and study room.

All test code lives inside the `frontend/` package — Playwright is wired up
as a frontend devDependency so tests share TypeScript config with the app
they exercise.

## Stack

- **Test runner:** Playwright (`@playwright/test`)
- **Browsers:** Chromium (headless) + Firefox
- **Auth:** Supabase admin SDK seeds a dedicated `e2e-test@ezy.test` user
  before the run; `auth.setup.ts` signs in once and saves a `storageState`
  file the spec projects reuse.
- **Data isolation:** A workspace named `E2E Test Workspace` is seeded for
  the test user. The teardown step deletes the workspace and the user.

## Folder layout

```
frontend/
├── playwright.config.ts
└── tests/
    └── e2e/
        ├── .env.test.example
        ├── setup/
        │   ├── global-setup.ts        # seeds user + workspace via Supabase
        │   ├── global-teardown.ts     # cleans up seed data
        │   └── auth.setup.ts          # logs in once, writes storageState
        ├── fixtures/
        │   └── base.ts                # `test` extended with page objects
        ├── pages/
        │   ├── auth.page.ts
        │   ├── workspace.page.ts
        │   ├── resources.page.ts
        │   ├── summarization.page.ts
        │   ├── quiz.page.ts
        │   ├── flashcards.page.ts
        │   ├── chattie.page.ts
        │   └── study-room.page.ts
        └── specs/
            ├── 01-auth.spec.ts
            ├── 02-workspace.spec.ts
            ├── 03-resources.spec.ts
            ├── 04-summarization.spec.ts
            ├── 05-quiz.spec.ts
            ├── 06-flashcards.spec.ts
            ├── 07-chattie.spec.ts
            └── 08-study-room.spec.ts
```

## Setup

1. From `frontend/`, install dev deps (`@playwright/test`, `dotenv`):

    ```bash
    npm install
    npx playwright install
    ```

2. Copy the env example and fill it in:

    ```bash
    cp tests/e2e/.env.test.example tests/e2e/.env.test
    ```

   The Supabase service-role key is required so the global setup can create
   and delete the test user. Treat this file like a secret — it is excluded
   from git via the repo `.gitignore`.

3. In a separate terminal, start the frontend on port 3000 (the default base
   URL):

    ```bash
    npm run dev
    ```

   Override with `PLAYWRIGHT_BASE_URL` if you run on a different port.

## Running

```bash
# All projects, all browsers
npm run test:e2e

# Only Chromium
npx playwright test --project=chromium

# Single spec
npx playwright test specs/03-resources.spec.ts

# Headed (visible browser)
npm run test:e2e:headed

# UI mode (best for development)
npm run test:e2e:ui

# Open the last HTML report
npm run test:e2e:report
```

## Test ID coverage

| File | Cases |
| --- | --- |
| 01-auth | TC-AUTH-01..07 |
| 02-workspace | TC-WS-01..06 |
| 03-resources | TC-RES-01..09 |
| 04-summarization | TC-SUM-01..05 |
| 05-quiz | TC-QUIZ-01..07 |
| 06-flashcards | TC-FLASH-01..06 |
| 07-chattie | TC-CHAT-01..06 |
| 08-study-room | TC-SR-01..10 |

## Notes & limitations

- **AI features run live.** Specs that exercise summarization, quiz,
  flashcard, or Chattie generation wait up to 60 s for real responses from
  the FastAPI ML service. Failure of those specs in environments where the
  ML service is offline is expected and is signalled by a `test.skip()`
  when the prerequisite (ready resources) is absent.
- **Selectors avoid `data-testid`.** Per the constraint that source files
  must not be modified, page objects rely on roles, placeholders, and
  visible text. If the design changes substantially the selectors should
  be the first place to update.
- **Two-context study-room tests.** TC-SR-04 through TC-SR-08 spin up an
  additional `browser.newContext()` that loads the same auth state. Because
  the host and joiner share a single seeded account, some backend
  validations (host-self-join, leaderboard de-dup) may treat both contexts
  as the same identity; the tests assert the lobby/error contract rather
  than a multi-user visual diff.
- **OTP expiry test (TC-SR-09).** Real timestamp mocking requires backend
  hooks that don't exist yet. The spec submits a non-issued OTP and asserts
  the rejection path, which exercises the same validation branch.

## CI

`process.env.CI` switches workers to `1` and retries to `1`. A typical CI
job should:

1. Boot Postgres / Supabase emulator (or point at a staging project).
2. Start the frontend (`npm run start` after a build) and backend services.
3. `npx playwright install --with-deps`.
4. `npm run test:e2e`.

The HTML report is written to `tests/e2e/results/`; archive that folder as
a CI artifact for failure triage.
