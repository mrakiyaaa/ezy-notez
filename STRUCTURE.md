# File Structure Reference - Create Workspace Feature

## Backend Files Created/Modified

### Created Files

#### `backend/src/utils/slugGenerator.ts`
Purpose: Generate URL-friendly slugs and ensure uniqueness
- `generateSlug(text)` - Creates base slug from text
- `generateUniqueSlug(baseSlug, checkFn)` - Handles slug collisions

#### `backend/src/services/workspace.service.ts`
Purpose: Business logic for workspace operations
- `createWorkspace(userId, input)` - Create new workspace
- `getUserWorkspaces(userId)` - List user's workspaces
- `getWorkspaceBySlug(userId, slug)` - Fetch workspace by slug
Exports types: `CreateWorkspaceInput`, `WorkspaceResponse`

#### `backend/src/controllers/workspace.controller.ts`
Purpose: HTTP request handlers
- `createWorkspaceHandler()` - POST /workspaces
- `getWorkspacesHandler()` - GET /workspaces
- `getWorkspaceBySlugHandler()` - GET /workspaces/:slug

### Modified Files

#### `backend/src/routes/workspace.routes.ts`
Changes:
- Removed inline route handler
- Added import for controller functions
- Added import for authenticateUser middleware
- Implemented three routes:
  - `GET /` → getWorkspacesHandler
  - `POST /` → createWorkspaceHandler
  - `GET /:slug` → getWorkspaceBySlugHandler

---

## Frontend Files Created/Modified

### Created Files

#### `frontend/src/components/workspaces/CreateWorkspaceModal.tsx`
Purpose: Modal form for creating workspaces
Features:
- Name input (required)
- Description textarea (optional)
- Aura color picker (8 colors)
- Loading/error states
- Form validation

Props:
```typescript
{
  isOpen: boolean
  onClose: () => void
  onSuccess: (slug: string) => void
}
```

#### `frontend/src/app/(dashboard)/workspaces/[slug]/page.tsx`
Purpose: Dynamic workspace detail page
Features:
- Fetch workspace by slug
- Display workspace info
- Navigation cards to sub-features
- Error handling
- Loading state

URL Pattern: `/workspaces/[slug]`

### Modified Files

#### `frontend/src/types/workspace.ts`
Changes:
- Added `slug: string` field to Workspace interface
- Made `description` optional (was required)
- Added `user_id?: string` field
- `aura` type remains `string` (hex codes)

New interface:
```typescript
interface Workspace {
  id: string
  name: string
  slug: string        // ← NEW
  description?: string // ← NOW OPTIONAL
  aura: string
  createdAt: string
  user_id?: string    // ← NEW
}
```

#### `frontend/src/lib/api/workspace.api.ts`
Changes:
- Updated to use `apiClient` from axios-config
- Added three new functions:
  - `getWorkspacesApi()` - List workspaces
  - `getWorkspaceBySlugApi(slug)` - Get single workspace
  - `createWorkspaceApi(data)` - Create workspace
- Updated `workspaceApi` object with new methods

#### `frontend/src/app/(dashboard)/workspaces/page.tsx`
Changes:
- Updated import path: `workspace-hub` → `workspaces/CreateWorkspaceModal`
- Changed function name from `DashboardPage` to `WorkspacesPage`
- Replaced mock workspace service with API calls to `getWorkspacesApi()`
- Updated `onClickCreate` handler to pass slug to `router.push()`
- Added loading state indicator
- Updated empty state UI
- Changed button action from ID-based to slug-based navigation

#### `frontend/src/components/workspace-hub/WorkspaceCard.tsx`
Changes:
- Updated `onOpen` callback signature:
  - From: `(workspaceId: string) => void`
  - To: `(slug: string) => void`
- Updated onClick: `workspace.id` → `workspace.slug`
- Removed `sourcesCount` display (not in DB)
- Made description display conditional

---

## Database Schema

### Required Table Setup

Run in Supabase SQL Editor:

```sql
-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  aura TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: slug must be unique per user
ALTER TABLE public.workspaces 
  ADD CONSTRAINT unique_slug_per_user UNIQUE (user_id, slug);

-- Indexes for performance
CREATE INDEX idx_workspaces_user_id ON public.workspaces(user_id);
CREATE INDEX idx_workspaces_slug ON public.workspaces(slug);

-- Column comments
COMMENT ON TABLE public.workspaces IS 'User workspaces with slug-based routing';
COMMENT ON COLUMN public.workspaces.slug IS 'URL-friendly identifier (unique per user)';
COMMENT ON COLUMN public.workspaces.aura IS 'Hex color code for workspace branding';
```

---

## Routing Summary

### API Endpoints
| Method | Endpoint | Handler | Purpose |
|--------|----------|---------|---------|
| GET | `/api/workspaces` | `getWorkspacesHandler` | List user workspaces |
| POST | `/api/workspaces` | `createWorkspaceHandler` | Create workspace |
| GET | `/api/workspaces/:slug` | `getWorkspaceBySlugHandler` | Get workspace detail |

### Frontend Routes
| Path | Component | Purpose |
|------|-----------|---------|
| `/workspaces` | `page.tsx` (list) | List all workspaces |
| `/workspaces/[slug]` | `page.tsx` (detail) | Workspace detail view |
| `/workspaces/[slug]/study-room` | Future | Study collaboration |
| `/workspaces/[slug]/resources` | Future | Resource management |
| `/workspaces/[slug]/quiz` | Future | Quiz features |
| `/workspaces/[slug]/flashcards` | Future | Flashcard features |

---

## Component Hierarchy

```
App
└── (dashboard)
    └── workspaces
        ├── page.tsx (List)
        │   ├── CreateWorkspaceModal
        │   ├── WorkspaceGrid
        │   │   ├── CreateWorkspaceCard
        │   │   └── WorkspaceCard (updated)
        │   ├── StudyInvites
        │   ├── UpcomingActivities
        │   └── DailyBriefing
        │
        └── [slug]
            └── page.tsx (Detail)
                └── NavigationCard (x4)
```

---

## Key Implementation Details

### Slug Generation Algorithm
1. Convert to lowercase
2. Trim whitespace
3. Replace spaces with hyphens
4. Remove special characters (keep alphanumeric + hyphens)
5. Replace consecutive hyphens with single hyphen
6. Trim hyphens from start/end
7. If slug exists for user, append `-2`, `-3`, etc.

### Authentication Flow
1. User provides JWT token (in header or cookie)
2. `authenticateUser` middleware validates token
3. `req.user` populated with Supabase user data
4. Service layer receives `userId` from request
5. All operations scoped to authenticated user

### Error Handling Strategy
- Backend: Descriptive error messages with HTTP status codes
- Frontend: User-friendly error display in modal
- Validation: Client-side disables buttons + server-side validation
- Network: Try/catch with error state management

---

## Testing Endpoints with cURL

### Create Workspace
```bash
curl -X POST http://localhost:3001/api/workspaces \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Spring 2026 Study",
    "description": "Comprehensive study materials",
    "aura": "#4ECDC4"
  }'
```

### List Workspaces
```bash
curl -X GET http://localhost:3001/api/workspaces \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Workspace by Slug
```bash
curl -X GET http://localhost:3001/api/workspaces/spring-2026-study \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Environment Variables

### Backend (.env)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_ENV=development
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## File Deletion

Files/folders that can be deleted (no longer needed):
```
frontend/src/app/(dashboard)/workspace/     ← OLD (empty now)
frontend/src/components/workspace-hub/CreateWorkspaceCard.tsx  ← OLD (replaced by modal)
```

---

## Quick Start Checklist

- [x] Create `slugGenerator.ts` utility
- [x] Create `workspace.service.ts` with business logic
- [x] Create `workspace.controller.ts` with handlers
- [x] Update `workspace.routes.ts` with endpoints
- [x] Update `workspace.ts` types on frontend
- [x] Update `workspace.api.ts` API client
- [x] Create `CreateWorkspaceModal.tsx` component
- [x] Create `[slug]/page.tsx` dynamic route
- [x] Update workspaces list page
- [x] Update `WorkspaceCard.tsx` component
- [ ] Run backend: `npm run dev`
- [ ] Run frontend: `npm run dev`
- [ ] Test workspace creation
- [ ] Test slug generation
- [ ] Test navigation to workspace detail
