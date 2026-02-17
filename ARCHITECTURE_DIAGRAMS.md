# Architecture Diagrams - Create Workspace Feature

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  /workspaces (List Page)                                                  │
│  - Display all workspaces                                                 │
│  - Search functionality                                                   │
│  - "Create Workspace" button                                              │
│                                                                           │
│  CreateWorkspaceModal (Popup)                                             │
│  - Name input (required)                                                  │
│  - Description input (optional)                                           │
│  - Aura color picker (8 colors)                                           │
│  - Create button                                                          │
│                                                                           │
│  /workspaces/[slug] (Detail Page)                                         │
│  - Workspace details                                                      │
│  - Navigation to features                                                 │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │
                       │ HTTP Requests
                       │ (axios)
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXPRESS SERVER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  API Routes                                                               │
│  ├─ POST   /api/workspaces           → createWorkspaceHandler            │
│  ├─ GET    /api/workspaces           → getWorkspacesHandler              │
│  └─ GET    /api/workspaces/:slug     → getWorkspaceBySlugHandler         │
│                                                                           │
│  Controllers                                                              │
│  └─ workspace.controller.ts                                               │
│     ├─ Validate request                                                   │
│     ├─ Extract user from token                                            │
│     └─ Call service layer                                                 │
│                                                                           │
│  Services                                                                 │
│  └─ workspace.service.ts                                                  │
│     ├─ generateSlug(name)                                                 │
│     ├─ checkSlugExists(slug)                                              │
│     ├─ createWorkspace()                                                  │
│     ├─ getUserWorkspaces()                                                │
│     └─ getWorkspaceBySlug()                                               │
│                                                                           │
│  Utilities                                                                │
│  └─ utils/slugGenerator.ts                                                │
│     ├─ generateSlug()                                                     │
│     └─ generateUniqueSlug()                                               │
│                                                                           │
│  Middleware                                                               │
│  └─ auth.middleware.ts                                                    │
│     └─ Validate JWT token                                                │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │
                       │ SQL Queries
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE POSTGRESQL DATABASE                             │
├─────────────────────────────────────────────────────────────────────────┤
│  Table: workspaces                                                        │
│  ├─ id (UUID, PK)                                                        │
│  ├─ user_id (UUID, FK → auth.users)                                      │
│  ├─ name (TEXT)                                                          │
│  ├─ slug (TEXT) - UNIQUE per user                                        │
│  ├─ description (TEXT, nullable)                                         │
│  ├─ aura (TEXT) - Color hex                                              │
│  └─ created_at (TIMESTAMP)                                               │
│                                                                           │
│  Indexes                                                                  │
│  ├─ idx_workspaces_user_id                                               │
│  └─ idx_workspaces_slug                                                  │
│                                                                           │
│  Constraints                                                              │
│  └─ unique_slug_per_user (user_id, slug)                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Create Workspace

```
┌─────────────────┐
│  User Interface │
│  (Modal Form)   │
└────────┬────────┘
         │ User fills:
         │ - Name: "React 101"
         │ - Description: "Basics"
         │ - Aura: "#45B7D1"
         │
         ▼
┌─────────────────────────────┐
│  Validation (Client-side)   │
│  - Name not empty?          │
│  - Color selected?          │
│  → Enable Create button      │
└────────┬────────────────────┘
         │ User clicks Create
         │
         ▼
┌─────────────────────────────────────────┐
│  API Call (Frontend)                     │
│  POST /api/workspaces                    │
│  {                                       │
│    name: "React 101",                    │
│    description: "Basics",                │
│    aura: "#45B7D1"                       │
│  }                                       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Authentication Middleware              │
│  - Extract token from header/cookie     │
│  - Validate token with Supabase         │
│  - Extract user_id                      │
│  - Attach to req.user                   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Controller Handler                      │
│  - Get user_id from req.user             │
│  - Extract name, description, aura      │
│  - Validate inputs                      │
│  - Call service.createWorkspace()       │
└────────┬────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Service Layer                            │
│                                          │
│  1. generateSlug("React 101")             │
│     → "react-101"                        │
│                                          │
│  2. generateUniqueSlug("react-101", fn)   │
│     → Check if exists                    │
│     → Return unique slug                 │
│                                          │
│  3. supabase.from("workspaces").insert({  │
│       user_id,                           │
│       name: "React 101",                 │
│       slug: "react-101",                 │
│       description: "Basics",             │
│       aura: "#45B7D1"                    │
│     })                                   │
└────────┬────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Database Insert                          │
│  workspaces table                        │
│                                          │
│  INSERT INTO workspaces (...)            │
│  VALUES (uuid, user_id, "React 101",     │
│          "react-101", "Basics",          │
│          "#45B7D1", now())               │
│                                          │
│  Constraint check:                       │
│  UNIQUE (user_id, slug)                  │
│  ✓ OK                                    │
└────────┬────────────────────────────────┘
         │ Returns created record
         │
         ▼
┌──────────────────────────────────────────┐
│  API Response (201 Created)               │
│  {                                       │
│    status: "success",                    │
│    data: {                               │
│      id: "uuid-1234",                    │
│      user_id: "uuid-user",               │
│      name: "React 101",                  │
│      slug: "react-101",                  │
│      description: "Basics",              │
│      aura: "#45B7D1",                    │
│      created_at: "2026-02-17..."         │
│    }                                     │
│  }                                       │
└────────┬────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Frontend Processing                     │
│                                          │
│  1. Receive response with slug            │
│  2. Reset form                           │
│  3. Close modal                          │
│  4. Call router.push("/workspaces/      │
│     react-101")                          │
└────────┬────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Navigate to Detail Page                  │
│  /workspaces/[slug]/page.tsx              │
│                                          │
│  1. Extract slug from URL                │
│  2. Call getWorkspaceBySlugApi(slug)     │
│  3. Fetch from backend                   │
│  4. Render workspace details             │
└──────────────────────────────────────────┘
```

---

## Slug Generation Algorithm

```
Input: "React 101!!!"

Step 1: Convert to lowercase
└─ "react 101!!!"

Step 2: Trim whitespace
└─ "react 101!!!"

Step 3: Replace spaces with hyphens
└─ "react-101!!!"

Step 4: Remove special characters
└─ "react-101"

Step 5: Replace consecutive hyphens
└─ "react-101"

Step 6: Trim hyphens from edges
└─ "react-101"

Step 7: Check uniqueness (per user)
└─ Exists? No
└─ ✓ Return: "react-101"

---

If slug exists:
└─ Try "react-101-2"? No
└─ Try "react-101-3"? No
└─ Try "react-101-4"? Yes (exists)
└─ Try "react-101-5"? No
└─ ✓ Return: "react-101-5"
```

---

## Component Hierarchy

```
WorkspacesPage (/workspaces)
├── Header
│   ├── Title
│   ├── Search Input
│   └── "Create Workspace" Button
├── WorkspaceGrid
│   ├── CreateWorkspaceCard
│   └── WorkspaceCard[] (maps workspaces)
│       ├── Card Header (aura color)
│       ├── Workspace Name
│       ├── Description (conditional)
│       └── Created Date
├── Sidebar
│   ├── StudyInvites
│   ├── UpcomingActivities
│   └── DailyBriefing
│
└── CreateWorkspaceModal (Popup)
    ├── Close Button (X)
    ├── Form
    │   ├── Name Input (required)
    │   ├── Description Input (optional)
    │   ├── Aura Color Picker
    │   │   ├── Color Button[] (8 colors)
    │   │   └── Selected Indicator (checkmark)
    │   └── Button Group
    │       ├── Cancel Button
    │       └── Create Button (disabled if empty)
    └── Error Message (conditional)

WorkspaceDetailPage (/workspaces/[slug])
├── Header
│   ├── Aura Color Bar
│   ├── Workspace Title
│   ├── Description
│   └── Created Date
├── Main Content
│   ├── NavigationCard (Study Room)
│   ├── NavigationCard (Resources)
│   ├── NavigationCard (Quiz)
│   ├── NavigationCard (Flashcards)
│   └── Overview Section
│       ├── Dark background
│       ├── Introduction text
│       └── Feature list
└── Footer Links (to sub-pages)
```

---

## Request/Response Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ CREATE WORKSPACE REQUEST                                         │
├──────────────────────────────────────────────────────────────────┤
│ Method: POST                                                     │
│ URL: /api/workspaces                                             │
│ Headers:                                                         │
│   Authorization: Bearer <jwt_token>                              │
│   Content-Type: application/json                                 │
│ Body:                                                            │
│   {                                                              │
│     "name": "Spring 2026 Study",                                │
│     "description": "Biology and Chemistry",                     │
│     "aura": "#4ECDC4"                                           │
│   }                                                              │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ VALIDATION                                                       │
├──────────────────────────────────────────────────────────────────┤
│ ✓ Token is valid                                               │
│ ✓ User exists                                                  │
│ ✓ Name is not empty                                            │
│ ✓ Aura is not empty                                            │
│ ✓ Description is optional (OK if empty)                        │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ PROCESSING                                                       │
├──────────────────────────────────────────────────────────────────┤
│ 1. Generate slug from name: "spring-2026-study"                │
│ 2. Check if slug exists for user: NO                           │
│ 3. Insert into database                                         │
│ 4. Return created workspace                                     │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ CREATE WORKSPACE RESPONSE (201)                                  │
├──────────────────────────────────────────────────────────────────┤
│ {                                                                │
│   "status": "success",                                           │
│   "message": "Workspace created successfully",                   │
│   "data": {                                                      │
│     "id": "550e8400-e29b-41d4-a716-446655440000",             │
│     "user_id": "550e8400-e29b-41d4-a716-446655440001",        │
│     "name": "Spring 2026 Study",                               │
│     "slug": "spring-2026-study",                               │
│     "description": "Biology and Chemistry",                    │
│     "aura": "#4ECDC4",                                         │
│     "created_at": "2026-02-17T10:30:00Z"                      │
│   }                                                              │
│ }                                                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
User submits form
   │
   ▼
┌─────────────────┐
│ Client-side     │
│ Validation      │
└────┬────────────┘
     │ Error?
     ├─ Yes → Show error, disable submit
     │
     └─ No → Continue to server
        │
        ▼
    ┌────────────────────┐
    │ Server Validation  │
    │ - Auth check       │
    │ - Input validation │
    └────┬───────────────┘
         │ Error?
         ├─ 401 → Unauthorized
         │   └─ Frontend: "Not logged in"
         │
         ├─ 400 → Bad Request
         │   └─ Frontend: Show error message
         │       (name required, etc)
         │
         └─ 201 → Success
             └─ Frontend: Close modal, redirect
```

---

## Database Query Examples

```sql
-- Create workspace
INSERT INTO workspaces (user_id, name, slug, description, aura)
VALUES (
  'user-uuid-123',
  'React 101',
  'react-101',
  'Frontend basics',
  '#45B7D1'
);

-- Get all workspaces for user
SELECT * FROM workspaces
WHERE user_id = 'user-uuid-123'
ORDER BY created_at DESC;

-- Get workspace by slug (for user)
SELECT * FROM workspaces
WHERE user_id = 'user-uuid-123'
  AND slug = 'react-101';

-- Check if slug exists
SELECT 1 FROM workspaces
WHERE user_id = 'user-uuid-123'
  AND slug = 'my-workspace'
LIMIT 1;

-- Get workspace count for user
SELECT COUNT(*) FROM workspaces
WHERE user_id = 'user-uuid-123';
```

---

## File Dependencies

```
Frontend:
  workspaces/page.tsx
  ├─ CreateWorkspaceModal
  ├─ workspace.api.ts
  │  └─ axios-config.ts
  ├─ WorkspaceGrid
  │  └─ WorkspaceCard
  │     └─ types/workspace.ts
  └─ Various sidebar components

  [slug]/page.tsx
  ├─ workspace.api.ts
  │  └─ axios-config.ts
  ├─ types/workspace.ts
  └─ (components for navigation)

Backend:
  routes/workspace.routes.ts
  ├─ middleware/auth.middleware.ts
  │  └─ config/supabase.ts
  └─ controllers/workspace.controller.ts
     └─ services/workspace.service.ts
        ├─ utils/slugGenerator.ts
        ├─ config/supabase.ts
        └─ types (inline)
```

---

## Slug Uniqueness Example

```
User A:
  ├─ Workspace 1: "My Project" → slug: "my-project"
  ├─ Workspace 2: "My Project" → slug: "my-project-2"
  └─ Workspace 3: "my-project" → slug: "my-project-3"

User B:
  ├─ Workspace 1: "My Project" → slug: "my-project" (different user!)
  └─ Workspace 2: "My Project" → slug: "my-project-2"

Database:
  ├─ (user_a, my-project) - ✓ OK
  ├─ (user_a, my-project-2) - ✓ OK
  ├─ (user_a, my-project-3) - ✓ OK
  ├─ (user_b, my-project) - ✓ OK (different user)
  └─ (user_b, my-project-2) - ✓ OK

Constraint:
  UNIQUE(user_id, slug) ensures no duplicates per user
```

---

**All diagrams saved and documented!** ✨
