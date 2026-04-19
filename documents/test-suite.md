# EZY Notez — Backend Test Suite

## Overview

This document describes the automated test suite for the EZY Notez backend. Tests cover the Express.js API server. No frontend or ML-service code is tested here — HTTP calls to the unified ML service (`services/ml/`) are mocked at the axios layer.

---

## Technology Stack

| Layer | Tool |
|---|---|
| Express unit tests | Jest + ts-jest |
| Express integration tests | Jest + Supertest |
| TypeScript compilation | ts-jest (inline tsconfig, no emit) |

---

## Directory Structure

```
backend/
├── .env.test                          # Safe dummy env vars for tests
├── jest.config.ts                     # Jest configuration
└── src/
    └── __tests__/
        ├── setup.ts                   # Global setup: load .env.test, clearMocks afterEach
        ├── helpers/
        │   ├── createTestApp.ts       # Express app for integration tests (no listen())
        │   ├── queryChain.ts          # Supabase chainable mock builder
        │   └── mockProcess.ts         # child_process mock (EventEmitter-based)
        ├── unit/
        │   ├── auth.middleware.unit.test.ts
        │   ├── resource.service.unit.test.ts
        │   ├── summary.service.unit.test.ts
        │   ├── flashcard.service.unit.test.ts
        │   └── quiz.service.unit.test.ts
        └── integration/
            ├── resources.integration.test.ts
            ├── summary.integration.test.ts
            ├── flashcards.integration.test.ts
            └── quiz.integration.test.ts
```

---

## Running Tests

### Express (Jest)

```bash
cd backend

# Install dependencies (first time)
npm install

# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage report
npm run test:coverage
```

---

## Mock Strategy

### Express Tests

All external I/O is mocked. **No real network calls are made in any test.**

| Dependency | Mock approach |
|---|---|
| `supabaseAdmin` | `jest.mock('../../config/supabase')` — chainable query builder via `makeQueryChain()` |
| `axios` (ML service) | `jest.mock('axios')` — `axios.post` returns configurable data |
| `child_process.spawn` | `jest.mock('child_process')` — `createMockProcess()` emits events via EventEmitter |
| `uploadthing/server` | `jest.mock('uploadthing/server')` — UTApi.deleteFiles is a no-op jest.fn() |
| `pdf-parse` | `jest.mock('pdf-parse')` — PDFParse.getText returns deterministic text |
| `authenticateUser` | Mock replaces middleware, injects `req.user = { id: 'test-user-id' }` |

---

## Test Scope

### What IS tested

- Auth middleware: token extraction, cookie fallback, refresh rotation, 401/500 paths
- Resource service: insert, list, status update, delete (with UploadThing cleanup), PDF/audio/PPTX extraction pipelines
- Summary service: generate general/custom summaries, get/delete, regenerate with new format
- Flashcard service: generate (card count clamping, background pipeline), CRUD, status update
- Quiz service: generate, list with attempt data, get with/without correct answers, attempt lifecycle (create, submit answer, complete), topic breakdown calculation

### What is NOT tested (future work)

- Unified ML service (`services/ml/`) — no pytest suite; covered indirectly via axios-mocked Express tests
- Study Rooms routes — `describe.skip` placeholder in `flashcards.integration.test.ts`
- Chatie routes — `describe.skip` placeholder in `flashcards.integration.test.ts`
- Auth controller (OTP flow requires Supabase auth endpoint)
- Workspace controller (follows same patterns as resource — straightforward extension)
- UploadThing webhook route (third-party handler)

---

## Adding New Tests

### New Express feature

1. Add a service unit test file: `src/__tests__/unit/<feature>.service.unit.test.ts`
2. Add an integration test file: `src/__tests__/integration/<feature>.integration.test.ts`
3. Follow the existing mock pattern: `jest.mock('../../config/supabase', ...)` at the top of each file, configure `mockFrom` per test with `makeQueryChain()`.

---

## Environment Variables

The `backend/.env.test` file contains safe dummy values used by all Jest tests. No production credentials are referenced. The file must **not** be committed with real secrets.

Key variables:

| Variable | Test value |
|---|---|
| `SUPABASE_URL` | `https://test-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `test-service-role-key-xxx` |
| `PYTHON_ML_URL` | `http://localhost:8000` (mocked by axios mock) |
| `UPLOADTHING_TOKEN` | `test-uploadthing-token-xxx` |
| `PORT` | `3099` (avoids collision with dev server on 3001) |
