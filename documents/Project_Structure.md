# EZY Notez Project Structure

## 📁 Root Directory
**Configuration & Setup**
- `CLAUDE.md` - Agent instruction file
- `docker-compose.dev.yml` - Docker compose file for local development
- `docker-compose.prod.yml` - Docker compose file for production
- `package.json` & `package-lock.json` - Root dependency management
- `requirements.txt` - Python dependencies for scripts
- `README.md` - Project documentation
- `.env` & `.env.example` - Environment variables
- `.mcp.json` / `.vscode/mcp.json` - Configuration files
- `.husky/` - Git hooks configuration

---

## 🟢 Backend (`/backend`)
*Node.js / Express backend application handling APIs.*

**Root Backend Files**
- `Dockerfile`
- `package.json` & `package-lock.json`
- `tsconfig.json`
- `.env` & `.env.example`

**Source Code (`/backend/src`)**
- `index.ts` - Entry point
- `server.ts` - Express app setup and middleware wrapping
- `uploadthing.ts` - File upload utility configuration
- **`/config`**
  - `env.ts` - Environment variable validation
  - `supabase.ts` - Supabase client setup
- **`/controllers`** - Request/Response logic
  - `auth.controller.ts`
  - `resource.controller.ts`
  - `workspace.controller.ts`
- **`/middleware`**
  - `auth.middleware.ts` - Authentication guarding
- **`/routes`** - API Endpoint definitions
  - `auth.routes.ts`
  - `resource.routes.ts`
  - `workspace.routes.ts`
- **`/services`** - Core business logic
  - `profile.service.ts`
  - `resource.service.ts`
  - `workspace.service.ts`
- **`/types`**
  - `express.d.ts` - Custom types for Express requests
- **`/utils`** - Helper utilities
  - `nameGenerator.ts`
  - `slugGenerator.ts`

**Scripts (`/backend/scripts`)**
- `whisper_transcribe.py` - Audio transcription script

---

## 🔵 Frontend (`/frontend`)
*Next.js 15 application with React.*

**Root Frontend Files**
- `Dockerfile`
- `package.json` & `package-lock.json`
- `components.json` - shadcn/ui configuration
- `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` - Build configs
- `middleware.ts` - Next.js routing middleware
- `README.md`
- `.env.local` & `.env.example`

**Public Assets (`/frontend/public`)**
- `/images/landing/` - Contains `hero.svg` and `hero-2.svg`
- `/images/logo/logo.svg`
- `/images/icons/`

**Source Code (`/frontend/src`)**
- **`/app`** - Next.js App Router
  - `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico`
  - **`/(dashboard)`** - Authenticated application area
    - `layout.tsx`, `page.tsx`
    - `/profile/page.tsx`
    - `/workspaces/page.tsx`
    - `/workspaces/[slug]/page.tsx`
    - `/workspaces/[slug]/flashcards/`
    - `/workspaces/[slug]/quiz/`
    - `/workspaces/[slug]/study-room/`
    - `/workspaces/[slug]/summarization/`
  - **`/api`** - API Routes
    - `/webhooks/clerk/`
  - **`/auth`** - Custom Authentication Flow
    - `layout.tsx`
    - `/callback/route.ts`
    - `/login/page.tsx`
    - `/signup/page.tsx`
  - **`/sign-in/[[...sign-in]]`**
  - **`/sign-up/[[...sign-up]]`**

- **`/components`** - React Components
  - `index.ts`, `FeatureCard.tsx`, `Footer.tsx`, `HeroSection.tsx`, `LiquidEther.tsx`, `Navbar.tsx`
  - **`/profile`**: `ProfileDrawer.tsx`
  - **`/ui`**: Core UI elements (`button.tsx`, `tooltip.tsx`)
  - **`/workspace`**: `Chattie.tsx`, `WorkspaceHome.tsx`
  - **`/workspace-hub`**: `CreateWorkspaceCard.tsx`, `CreateWorkspaceModal.tsx`, `DailyBriefing.tsx`, `StudyInvites.tsx`, `UpcomingActivities.tsx`, `WorkspaceCard.tsx`, `WorkspaceGrid.tsx`
  - **`/workspaces`**: `CreateWorkspaceModal.tsx`

- **`/lib`** - Libraries, Hooks, and Utility Functions
  - **Root libs**: `api.ts`, `resources.ts`, `supabase.ts`, `uploadthing.ts`, `uploadthing-hook.ts`, `utils.ts`
  - **`/api`**: `axios-config.ts`, `endpoints.ts`, `workspace.api.ts`
  - **`/hooks`**: `useDebounce.ts`, `useProfile.ts`
  - **`/mock`**: JSON mock data arrays
  - **`/services`**: `workspace.service.ts`
  - **`/utils`**: `format.ts`
  - **`/store`**: State management

- **`/types`** - TypeScript Definitions
  - `index.ts`, `activity.ts`, `invite.ts`, `user.ts`, `workspace.ts`

---

## 📂 Other Resources
**`/documents`**
- `/audio-extraction/AUDIO_EXTRACTION.md` - Documentation and specs around audio handling.

**`/scripts`**
- `whisper_transcribe.py` - Transcription script (accessible from root).

**`/supabase`**
- `create_profile_trigger.sql` - Database SQL script to insert users upon creation.