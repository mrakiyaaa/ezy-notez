# E2E Testing Pipeline — EZY Notez

## Overview

Playwright end-to-end tests that run against real deployed services (Vercel + Railway) on every PR to `main` and as a manual pre-deploy gate. No mocking.

## Architecture

| Layer | Location | Purpose |
|---|---|---|
| Config | `frontend/playwright.config.ts` | Projects, reporters, retries, timeouts |
| Page Objects | `frontend/tests/e2e/pages/` | Locator abstractions per surface |
| Fixtures | `frontend/tests/e2e/fixtures/base.ts` | Injects all POMs into test context |
| Global setup | `frontend/tests/e2e/setup/global-setup.ts` | Seeds test user + workspace via Supabase Admin API |
| Auth setup | `frontend/tests/e2e/setup/auth.setup.ts` | Signs in and stores `storageState` |
| Teardown | `frontend/tests/e2e/setup/global-teardown.ts` | Deletes seeded data after run |
| Specs | `frontend/tests/e2e/specs/` | Test cases mapping to `TEST_CASES.md` IDs |
| CI workflow | `.github/workflows/e2e.yml` | GitHub Actions pipeline |

## Test case inventory

| Spec file | Test IDs | @slow count |
|---|---|---|
| 01-auth.spec.ts | TC-AUTH-01 → 07 | 0 |
| 02-workspace.spec.ts | TC-WS-01 → 06 | 0 |
| 03-resources.spec.ts | TC-RES-01 → 09 | 0 |
| 04-summarization.spec.ts | TC-SUM-01 → 05 | 2 (SUM-02, SUM-03) |
| 05-quiz.spec.ts | TC-QUIZ-01 → 07 | 2 (QUIZ-02, QUIZ-05) |
| 06-flashcards.spec.ts | TC-FLASH-01 → 06 | 1 (FLASH-02) |
| 07-chattie.spec.ts | TC-CHAT-01 → 06 | 1 (CHAT-02) |
| 08-study-room.spec.ts | TC-SR-01 → 10 | 2 (SR-03, SR-04) |
| **Total** | **51 tests** | **8 @slow** |

## CI workflow triggers

| Trigger | BASE_URL source | @slow tests |
|---|---|---|
| `pull_request` → `main` | Vercel preview URL (via `patrickedqvist/wait-for-vercel-preview`) | Excluded |
| `push` → `main` | `VERCEL_PRODUCTION_URL` secret | Excluded |
| `workflow_dispatch` (`run_slow: false`) | Input or `VERCEL_PRODUCTION_URL` | Excluded |
| `workflow_dispatch` (`run_slow: true`) | Input or `VERCEL_PRODUCTION_URL` | Included |

## Playwright config highlights

| Setting | Value | Reason |
|---|---|---|
| `retries` | 2 on CI, 0 local | Absorbs transient network flakiness on Railway cold starts |
| `workers` | 2 on CI, 50% local | Parallel without overwhelming Railway free-tier concurrency |
| `timeout` | 60 s | AI endpoints legitimately take 30–60 s on cold dynos |
| `trace` | on-first-retry | Captures network + DOM snapshots for flaky test debugging |
| `screenshot` | only-on-failure | Reduces artifact size |
| Reporters | list + html (always), github + junit (CI) | JUnit feeds `dorny/test-reporter` for PR annotations |
| Browsers | chromium, firefox (CI), webkit (local opt-in) | Cross-browser coverage without tripling CI time |

## Required GitHub Actions secrets

| Secret | Where to get it |
|---|---|
| `SUPABASE_TEST_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `SUPABASE_TEST_ANON_KEY` | Supabase dashboard → Project Settings → API → anon key |
| `SUPABASE_TEST_SERVICE_ROLE` | Supabase dashboard → Project Settings → API → service_role key |
| `EXPRESS_URL` | Railway dashboard → Express service → Public URL |
| `FASTAPI_URL` | Railway dashboard → FastAPI service → Public URL |
| `TEST_USER_EMAIL` | Choose any email (e.g. `e2e-test@ezy.test`) |
| `TEST_USER_PASSWORD` | Choose a strong password (e.g. `Test@12345`) |
| `VERCEL_PRODUCTION_URL` | Vercel dashboard → Project → Domains |

## Data isolation strategy

- A dedicated Supabase project (`SUPABASE_TEST_*`) isolates all E2E data.
- `global-setup` uses the Supabase Admin API (service-role key) to `findOrCreate` a test user and workspace — idempotent across retries.
- `global-teardown` deletes all workspaces and the test user after the run.
- Individual tests create uniquely-named resources (`Date.now()` suffix) to avoid cross-test interference.
- Set `E2E_KEEP_SEED=true` to skip teardown for debugging.
