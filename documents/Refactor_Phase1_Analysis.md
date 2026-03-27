# Phase 1: Full Codebase Analysis Report

> **Project:** EzyNotez
> **Date:** 2026-03-25
> **Purpose:** Complete codebase audit before refactoring. No changes made — findings only.

---

## Table of Contents

1. [Current Folder Tree](#1-current-folder-tree)
2. [Hard-Coded Color Values](#2-hard-coded-color-values)
3. [Duplicate Components / Files](#3-duplicate-components--files)
4. [Dead Code / Unused Files](#4-dead-code--unused-files)
5. [Clerk Remnants (Previous Auth Provider)](#5-clerk-remnants-previous-auth-provider)
6. [Files Using `any` Types](#6-files-using-any-types)
7. [Inconsistent Naming Patterns](#7-inconsistent-naming-patterns)
8. [Misplaced Files](#8-misplaced-files)
9. [Additional Issues](#9-additional-issues)

---

## 1. Current Folder Tree

```
ezy-notez/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   └── supabase.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── resource.controller.ts
│   │   │   └── workspace.controller.ts
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── resource.routes.ts
│   │   │   └── workspace.routes.ts
│   │   ├── services/
│   │   │   ├── profile.service.ts
│   │   │   ├── resource.service.ts
│   │   │   └── workspace.service.ts
│   │   ├── types/
│   │   │   └── express.d.ts
│   │   ├── utils/
│   │   │   ├── nameGenerator.ts
│   │   │   └── slugGenerator.ts
│   │   ├── index.ts
│   │   ├── server.ts
│   │   └── uploadthing.ts
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/
│   │   └── images/
│   │       ├── icons/.gitkeep
│   │       ├── landing/hero.svg, hero-2.svg
│   │       └── logo/logo.svg
│   ├── src/
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── profile/page.tsx
│   │   │   │   ├── workspaces/
│   │   │   │   │   ├── [slug]/page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── auth/
│   │   │   │   ├── callback/route.ts
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── signup/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── favicon.ico
│   │   ├── components/
│   │   │   ├── profile/
│   │   │   │   └── ProfileDrawer.tsx
│   │   │   ├── ui/
│   │   │   │   ├── button.tsx
│   │   │   │   └── tooltip.tsx
│   │   │   ├── workspace/
│   │   │   │   ├── Chattie.tsx
│   │   │   │   └── WorkspaceHome.tsx
│   │   │   ├── workspace-hub/
│   │   │   │   ├── CreateWorkspaceCard.tsx
│   │   │   │   ├── CreateWorkspaceModal.tsx    ← DUPLICATE (DEAD)
│   │   │   │   ├── DailyBriefing.tsx
│   │   │   │   ├── StudyInvites.tsx
│   │   │   │   ├── UpcomingActivities.tsx
│   │   │   │   ├── WorkspaceCard.tsx
│   │   │   │   └── WorkspaceGrid.tsx
│   │   │   ├── workspaces/
│   │   │   │   └── CreateWorkspaceModal.tsx    ← DUPLICATE (ACTIVE)
│   │   │   ├── FeatureCard.tsx       ← UNUSED
│   │   │   ├── Footer.tsx            ← UNUSED
│   │   │   ├── HeroSection.tsx       ← UNUSED
│   │   │   ├── index.ts             ← UNUSED BARREL
│   │   │   ├── LiquidEther.tsx       ← UNUSED
│   │   │   └── Navbar.tsx            ← UNUSED
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   ├── axios-config.ts
│   │   │   │   ├── endpoints.ts      ← UNUSED
│   │   │   │   └── workspace.api.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useDebounce.ts    ← EMPTY
│   │   │   │   └── useProfile.ts
│   │   │   ├── mock/
│   │   │   │   ├── activities.json
│   │   │   │   ├── invites.json
│   │   │   │   └── workspaces.json
│   │   │   ├── services/
│   │   │   │   └── workspace.service.ts
│   │   │   ├── utils/
│   │   │   │   └── format.ts         ← EMPTY
│   │   │   ├── api.ts               ← DUPLICATE (UNUSED)
│   │   │   ├── resources.ts
│   │   │   ├── supabase.ts
│   │   │   ├── uploadthing-hook.ts
│   │   │   ├── uploadthing.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       ├── activity.ts
│   │       ├── index.ts              ← EMPTY
│   │       ├── invite.ts
│   │       ├── user.ts
│   │       └── workspace.ts
│   ├── middleware.ts
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   ├── eslint.config.mjs
│   ├── components.json
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.local
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── scripts/
│   └── whisper_transcribe.py
├── supabase/
│   └── create_profile_trigger.sql
├── documents/
│   ├── Project_Structure.md
│   └── audio-extraction/AUDIO_EXTRACTION.md
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── requirements.txt
├── package.json
├── CLAUDE.md
├── README.md
└── .gitignore
```

---

## 2. Hard-Coded Color Values

### Files with raw hex, rgb, rgba, or inline style colors

| File | Hard-Coded Values |
|------|-------------------|
| `frontend/src/app/auth/layout.tsx` | `backgroundColor: "#04080f"`, `backgroundColor: "#0a0d14"`, `stroke="#507DBC"` (x3), `radial-gradient(circle, #507DBC 0%, transparent 70%)`, `radial-gradient(circle, #3a6ba5 0%, transparent 70%)`, `radial-gradient(circle, #6a9fd8 0%, transparent 70%)`, multiple `rgba(255,255,255,...)` inline styles |
| `frontend/src/app/auth/login/page.tsx` | `style={{ backgroundColor: "rgba(255,255,255,0.02)" }}`, Google SVG fills: `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335` |
| `frontend/src/app/auth/signup/page.tsx` | Same as login page — `rgba(255,255,255,0.02)` and Google SVG fills: `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335` |
| `frontend/src/app/page.tsx` | `hover:shadow-[0_0_30px_rgba(80,125,188,0.5)]` (x2) — raw rgba in Tailwind arbitrary value |
| `frontend/src/components/HeroSection.tsx` | `from-[#111721] to-[#263546]` — raw hex in Tailwind arbitrary values |
| `frontend/src/components/Footer.tsx` | `text-blue-400` — uses Tailwind's default blue, not design token |
| `frontend/src/components/FeatureCard.tsx` | `from-blue-400/30 to-purple-400/30` — Tailwind default colors, not design tokens |
| `frontend/src/components/ui/button.tsx` | `bg-[linear-gradient(90deg,rgba(80,125,188,0.35)_0%,rgba(26,39,56,0.35)_100%)]` — raw rgba in hero variant |
| `frontend/src/components/workspace-hub/DailyBriefing.tsx` | `bg-sky-400` — Tailwind default, not design token |
| `frontend/src/components/workspace-hub/CreateWorkspaceModal.tsx` | `focus:border-sky-400/60`, `bg-sky-500/80`, `hover:bg-sky-500`, `text-rose-400` — Tailwind defaults |
| `frontend/src/components/workspaces/CreateWorkspaceModal.tsx` | `focus:border-blue-500`, `focus:ring-blue-500`, `ring-blue-500`, `text-red-500` — Tailwind defaults |
| `frontend/src/components/workspace-hub/WorkspaceCard.tsx` | `getContrastColor()` returns `"#000000"` or `"#ffffff"` |
| `frontend/src/app/(dashboard)/workspaces/[slug]/page.tsx` | `getContrastColor()` returns `"#000000"` / `"#ffffff"`, fallback `"#507DBC"`, `text-[#507DBC]` in statusConfig |
| `frontend/src/components/workspace/WorkspaceHome.tsx` | `color: "#ffffff"` in inline style |
| `frontend/src/app/(dashboard)/profile/page.tsx` | `bg-white` — Tailwind default white, not design token |

### Notes
- `globals.css` contains design token definitions (`#04080f`, `#111721`, `#507DBC`, etc.) — these are **correct** and should remain as-is since they define the design system.
- Google brand colors in SVG (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`) are brand-mandated and should be **excluded** from replacement.
- Dynamic aura colors (`auraHex`, `auraRgb`) used in inline styles are **user-selected** at runtime — these are intentional and cannot be replaced with static Tailwind tokens.

---

## 3. Duplicate Components / Files

| Duplicate Pair | Details |
|----------------|---------|
| **CreateWorkspaceModal** (x2) | `components/workspaces/CreateWorkspaceModal.tsx` — **ACTIVE** (used in workspaces page, uses real API via `createWorkspaceApi`) vs. `components/workspace-hub/CreateWorkspaceModal.tsx` — **DEAD** (uses old mock `workspaceService`, not imported anywhere) |
| **API client** (x2) | `lib/api.ts` — simple axios instance, **UNUSED** (nothing imports it) vs. `lib/api/axios-config.ts` — full-featured with Supabase token injection and 401 refresh, **ACTIVE** |
| **`getContrastColor` helper** (x2) | Identical function duplicated in `components/workspace-hub/WorkspaceCard.tsx` and `app/(dashboard)/workspaces/[slug]/page.tsx` |
| **`workspaceApi` object** | `workspace.api.ts` exports both standalone named functions (`getWorkspacesApi`, `createWorkspaceApi`, etc.) AND a `workspaceApi` object with identical method implementations — the object is never imported |

---

## 4. Dead Code / Unused Files

### Unused Files (can be deleted)

| File | Reason |
|------|--------|
| `components/FeatureCard.tsx` | Not imported anywhere. Landing page (`page.tsx`) builds features inline with its own markup. |
| `components/Footer.tsx` | Not imported anywhere. Landing page has its own inline footer section. |
| `components/HeroSection.tsx` | Not imported anywhere. Landing page has its own inline hero section. |
| `components/Navbar.tsx` | Not imported anywhere. Landing page has its own inline navbar. |
| `components/LiquidEther.tsx` | Not imported anywhere. Was likely used in a previous landing page design (Three.js WebGL fluid simulation — 1000+ lines). |
| `components/index.ts` | Barrel file that re-exports the above 4 unused components. Not imported anywhere. |
| `lib/api.ts` | Duplicate axios instance. Not imported by any file. |
| `lib/api/endpoints.ts` | API endpoint constants. Not imported by any file. |
| `workspace-hub/CreateWorkspaceModal.tsx` | Old version using mock workspace service. Not imported anywhere. |
| `lib/hooks/useDebounce.ts` | Empty file (0 bytes of content). |
| `lib/utils/format.ts` | Empty file (0 bytes of content). |
| `types/index.ts` | Empty file (0 bytes of content). |

### Dead Code Within Files

| Location | Issue |
|----------|-------|
| `[slug]/page.tsx` lines 833-841 | `ChattieView` function — dead placeholder that was replaced by the real `Chattie` component. Never rendered anywhere. |
| `[slug]/page.tsx` line 1 | `@eslint-disable @typescript-eslint/no-unused-vars` — suppresses lint warnings; should be removed after cleanup |
| `[slug]/page.tsx` line 403 | `console.log("Skipping resource load - no workspace ID yet")` — debug log |
| `workspace.api.ts` lines 37-52 | `workspaceApi` object — duplicate of the standalone named exports above it; never imported |
| `globals.css` lines 189-195 | Duplicate `@apply` directives — `border-border outline-ring/50` and `bg-background text-foreground` are each applied **twice** |

---

## 5. Clerk Remnants (Previous Auth Provider)

**None found.** A comprehensive search for `clerk`, `@clerk`, `ClerkProvider`, and related terms across all `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, and `.mjs` files returned zero matches. The migration from Clerk to Supabase Auth is fully complete.

---

## 6. Files Using `any` Types

| File | Count | Details |
|------|-------|---------|
| `components/LiquidEther.tsx` | **25+** uses | `Record<string, { value: any }>`, `props: any`, `constructor(props: any)`, `init(...args: any[])`, `update(...args: any[])`, `constructor(simProps: any)`, `init(simProps: any)`, `fbo_in: any, fbo_out: any`, `p_in: any, p_out: any`, `vel: any`, `this as any` |

**Note:** All `any` usages are confined to the `LiquidEther.tsx` component, which is itself **unused** (not imported anywhere). If deleted as dead code, the `any` problem resolves entirely. If kept, proper Three.js types should replace the `any` annotations.

---

## 7. Inconsistent Naming Patterns

| Issue | Details |
|-------|---------|
| **Component folder naming** | `workspace-hub` (kebab-case) vs. `workspaces` (plural) vs. `workspace` (singular) vs. `profile` (singular) — no consistent convention |
| **Import style** | Mix of barrel imports (`@/components/index.ts` re-exports) and direct file imports — barrel file is unused |
| **Hooks location** | `useProfile` and `useDebounce` live in `lib/hooks/` — not a top-level `hooks/` directory |
| **Services location** | `workspace.service.ts` is nested inside `lib/services/` — not a top-level `services/` directory |
| **API structure** | Three different API patterns coexist: `lib/api.ts` (bare axios), `lib/api/axios-config.ts` (configured axios), `lib/resources.ts` (inline API calls) |
| **Type definitions** | Types are in `src/types/` (good), but resource types (`Resource`, `ResourceType`, `ResourceStatus`, `WorkspaceInfo`) are defined inline in `lib/resources.ts` instead of in the types directory |
| **Hook file naming** | `lib/uploadthing-hook.ts` is a hook file but lives outside the hooks folder and uses kebab-case instead of camelCase |

---

## 8. Misplaced Files

| File | Problem | Recommended Location |
|------|---------|---------------------|
| `lib/resources.ts` | Contains types + API calls + business logic all in one file | Split into `types/resource.ts` + `services/resource.service.ts` |
| `[slug]/page.tsx` (882 lines) | Contains `ResourcesView` (178 lines), `ResourceItem` (110 lines), and 5 placeholder view components — heavy business logic embedded in a page route file | Extract to `components/workspace/ResourcesView.tsx`, `components/workspace/ResourceItem.tsx`, and placeholder components |
| `lib/services/workspace.service.ts` | Service logic nested two levels deep inside `lib/` | Move to top-level `services/` |
| `lib/hooks/useProfile.ts` | Hook nested inside `lib/` | Move to top-level `hooks/` |
| `lib/uploadthing-hook.ts` | A hook file outside the hooks folder | Move to `hooks/useUploadThing.ts` |
| `lib/api/` | API layer nested inside `lib/` | Move to top-level `services/` or `api/` |
| `lib/mock/` | Mock data nested inside `lib/` | Move to top-level `mock/` or `data/` |

---

## 9. Additional Issues

### CSS Issues
- **Duplicate `@apply` rules** in `globals.css` (lines 188-195): Both `border-border outline-ring/50` and `bg-background text-foreground` are applied twice in the `@layer base` block.

### Console Statements
| File | Line | Statement | Action |
|------|------|-----------|--------|
| `[slug]/page.tsx` | 403 | `console.log("Skipping resource load...")` | Remove — debug log |
| `[slug]/page.tsx` | 433 | `console.warn("No pending resource found...")` | Keep as `console.error` — useful error tracking |
| All `console.error(...)` | Various | Error logging in catch blocks | Keep — intentional error handling |
| `backend/src/server.ts` | 55 | `console.log("Backend listening on port...")` | Keep — standard server startup log |
| `backend/src/uploadthing.ts` | 16 | `console.log("Upload complete:", file.name)` | Remove — debug log |

### ESLint Suppressions
| File | Line | Suppression |
|------|------|-------------|
| `[slug]/page.tsx` | 1 | `@eslint-disable @typescript-eslint/no-unused-vars` — file-level suppression |
| `[slug]/page.tsx` | 156 | `eslint-disable-next-line react-hooks/set-state-in-effect` |
| `(dashboard)/layout.tsx` | 56 | `eslint-disable-next-line @next/next/no-img-element` |
| `profile/ProfileDrawer.tsx` | 38 | `eslint-disable-next-line react-hooks/set-state-in-effect` |
| `profile/ProfileDrawer.tsx` | 111 | `eslint-disable-next-line @next/next/no-img-element` |

---

## Summary of Key Findings

| Category | Count |
|----------|-------|
| Files with hard-coded colors | 15 files |
| Duplicate components/files | 4 duplicates |
| Dead/unused files to delete | 12 files |
| Dead code blocks within files | 5 blocks |
| Files with `any` types | 1 file (25+ usages, all in unused `LiquidEther.tsx`) |
| Inconsistent naming issues | 7 patterns |
| Misplaced files | 7 files |
| Clerk remnants | **0** (migration complete) |
| Console logs to remove | 2 debug logs |
| CSS issues | 1 (duplicate `@apply`) |
