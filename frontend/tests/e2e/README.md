# EZY Notez — E2E Test Suite

Playwright end-to-end tests covering all major surfaces of the EZY Notez platform.
Tests run against real deployed services — no mocking.

---

## Folder structure

```
frontend/
├── playwright.config.ts          # Playwright configuration (reporters, projects, timeouts)
└── tests/e2e/
    ├── fixtures/
    │   ├── base.ts               # Extended test fixture that injects all POMs
    │   └── files/                # Auto-created fixture files used in upload tests
    ├── pages/                    # Page Object Models (one per major surface)
    │   ├── auth.page.ts
    │   ├── workspace.page.ts
    │   ├── resources.page.ts
    │   ├── summarization.page.ts
    │   ├── quiz.page.ts
    │   ├── flashcards.page.ts
    │   ├── chattie.page.ts
    │   └── study-room.page.ts
    ├── setup/
    │   ├── global-setup.ts       # Seeds test user + workspace via Supabase Admin API
    │   ├── global-teardown.ts    # Removes seeded data after the run
    │   └── auth.setup.ts         # Signs in and persists storageState to .auth-state.json
    ├── specs/                    # Test files (one per feature)
    │   ├── 01-auth.spec.ts
    │   ├── 02-workspace.spec.ts
    │   ├── 03-resources.spec.ts
    │   ├── 04-summarization.spec.ts
    │   ├── 05-quiz.spec.ts
    │   ├── 06-flashcards.spec.ts
    │   ├── 07-chattie.spec.ts
    │   └── 08-study-room.spec.ts
    ├── .env.test.example         # Copy → .env.test and fill in real values
    └── README.md                 # This file
```

---

## Required environment variables

Copy `tests/e2e/.env.test.example` to `tests/e2e/.env.test` and fill in all values.

| Variable | Description |
|---|---|
| `PLAYWRIGHT_BASE_URL` | Frontend URL Playwright drives. `http://localhost:3000` for local. |
| `EXPRESS_URL` | Express backend URL. Used by CI health checks. `http://localhost:3001` for local. |
| `FASTAPI_URL` | FastAPI ML service URL. `http://localhost:8000` for local. |
| `SUPABASE_URL` | Supabase project URL (use a dedicated test project to isolate E2E data). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — only ever used in `global-setup` / `global-teardown`, never sent to the browser. |
| `SUPABASE_TEST_ANON_KEY` | Public anon key for the test Supabase project. |
| `E2E_TEST_EMAIL` | Email for the seeded E2E user (default: `e2e-test@ezy.test`). |
| `E2E_TEST_PASSWORD` | Password for the seeded E2E user (default: `Test@12345`). |

---

## Running locally

### Prerequisites

```bash
# Install frontend dependencies (includes @playwright/test)
cd frontend
npm install

# Install Playwright browser binaries
npx playwright install chromium
```

### Start the full local stack

```bash
# From repo root — runs frontend (3000), backend (3001), ML (8000) concurrently
npm run dev
```

### Configure `.env.test`

```bash
cp frontend/tests/e2e/.env.test.example frontend/tests/e2e/.env.test
# Edit .env.test and fill in your Supabase credentials
```

### Run tests

```bash
# From repo root (runs chromium only, all tests including @slow)
npm run test:e2e:local

# From repo root (same as CI — excludes @slow AI-generation tests)
npm run test:e2e

# Open Playwright UI mode (visual test runner, great for debugging)
npm run test:e2e:ui

# Open the last HTML report
npm run test:e2e:report

# From the frontend directory for more control
cd frontend
npx playwright test                          # all tests, all projects
npx playwright test --project=chromium       # chromium only
npx playwright test specs/01-auth.spec.ts    # single file
npx playwright test --grep "TC-AUTH-03"      # single test by ID
npx playwright test --grep-invert @slow      # skip AI-generation tests
npx playwright test --headed                 # run with visible browser
npx playwright test --debug                  # step-by-step debug mode
```

---

## Running against a Vercel preview

Set `PLAYWRIGHT_BASE_URL` in `.env.test` to the preview URL, then run:

```bash
cd frontend
PLAYWRIGHT_BASE_URL=https://ezy-notez-pr-42.vercel.app npx playwright test --project=chromium --grep-invert @slow
```

Or use the root shorthand (reads `PLAYWRIGHT_BASE_URL` from your shell environment):

```bash
PLAYWRIGHT_BASE_URL=https://ezy-notez-pr-42.vercel.app npm run test:e2e
```

> **Note for Windows PowerShell:** set env vars before the command:
> ```powershell
> $env:PLAYWRIGHT_BASE_URL = "https://ezy-notez-pr-42.vercel.app"
> npm run test:e2e
> ```

---

## @slow tests — AI-generation latency

Tests that invoke real AI endpoints (summarization, quiz generation, flashcard
generation, Chattie, study-room creation) are tagged `@slow` in their names.
These are excluded from required PR checks to keep merge cycles fast, and run
only in the manual **pre-deploy** workflow (`workflow_dispatch` with
`run_slow: true`).

| Tag | Included in PR check | Included in pre-deploy |
|---|---|---|
| (none / fast) | ✅ | ✅ |
| `@slow` | ❌ | ✅ |

To run only `@slow` tests locally:

```bash
cd frontend
npx playwright test --grep @slow
```

---

## How to add a new test case

1. **Identify the spec file** — pick the file that matches the feature
   (e.g., `05-quiz.spec.ts` for a new Quiz test).

2. **Add a POM method** if the interaction is new — keep POM methods
   single-responsibility (one action per method, no assertions inside).

3. **Write the test** following the existing naming convention:

   ```typescript
   test("TC-QUIZ-08: <description>", async ({ page, quizPage }) => {
     // arrange
     // act
     // assert
   });
   ```

   Tag it `@slow` if it waits for an AI response:

   ```typescript
   test("@slow TC-QUIZ-08: Generating a custom quiz returns questions", async ({ ... }) => {
   ```

4. **Update `TEST_CASES.md`** — add a row in the appropriate table with
   status `[ ] Not Run`.

5. **Run the new test locally** to verify it passes before pushing:

   ```bash
   cd frontend
   npx playwright test --grep "TC-QUIZ-08" --headed
   ```

---

## Troubleshooting flaky tests

| Symptom | Likely cause | Fix |
|---|---|---|
| `getByRole` / `getByText` times out | Locator doesn't match the DOM | Use `--headed --debug`, inspect the element, and update the POM locator |
| Auth state missing | `.auth-state.json` was deleted or is stale | Delete it and re-run; `auth-setup` regenerates it |
| Seed workspace not found | Global setup failed silently | Check `global-setup` output in terminal; verify `SUPABASE_SERVICE_ROLE_KEY` is set |
| `@slow` test times out | AI service cold start on Railway | Increase `timeout` for that test with `test.slow()` or raise `playwright.config.ts` `timeout` |
| Resource never reaches "ready" | FastAPI not reachable from test runner | Check `FASTAPI_URL` and ensure the ML service is running; confirm `/health` returns 200 |
| Two-context study-room tests fail | Both contexts share one Supabase user | The backend may reject self-join; the test already handles this gracefully — verify the error message matches |
| `forbidOnly` blocks CI | `test.only(` left in source | Remove `test.only(` — `forbidOnly: true` is intentional on CI |

### Keeping `.env.test` out of git

`.env.test` is in `.gitignore`. Never commit it. The CI injects secrets via
GitHub Actions environment variables — see [`.github/workflows/e2e.yml`](../../../../.github/workflows/e2e.yml).

### Retaining seed data for debugging

Set `E2E_KEEP_SEED=true` in `.env.test`. Global teardown will skip cleanup,
leaving the seeded user and workspace intact for inspection.
