# 🎓 EZY-NOTEZ - AI-Powered Study Platform

An AI-powered note-taking and study collaboration platform built with **Next.js 16**, **Express.js**, **TypeScript**, and **Supabase**.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Features](#features)
4. [Docker Setup](#docker-setup)
5. [Development Guide](#development-guide)
6. [Workspace Feature](#workspace-feature)
7. [Backend API](#backend-api)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **Docker Desktop** (for containerized development)
- **Git**
- **Supabase Account** with API keys

### 1. Clone Repository

```bash
git clone <repository-url>
cd ezy-notez
```

### 2. Setup Environment Variables

Create `.env.local` in root directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_DB_URL=postgresql://user:password@db.supabase.co:5432/postgres
```

### 3. Choose Your Setup Method

#### Option A: Docker (Recommended)

**Development Mode (with hot reload):**
```bash
docker compose -f docker-compose.dev.yml up --build
```

**Production Mode:**
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

#### Option B: Local Development

**Backend:**
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:3001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## 📁 Project Structure

```
ezy-notez/
├── backend/                          # Express.js API
│   ├── src/
│   │   ├── config/                   # Configuration (Supabase, env)
│   │   ├── controllers/              # Request handlers
│   │   ├── routes/                   # API routes
│   │   ├── services/                 # Business logic
│   │   ├── middleware/               # Express middleware
│   │   ├── types/                    # TypeScript definitions
│   │   ├── utils/                    # Helper functions
│   │   ├── index.ts                  # Entry point
│   │   └── server.ts                 # Server setup
│   ├── Dockerfile                    # Multi-stage: dev + prod
│   └── package.json
│
├── frontend/                         # Next.js Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/              # Authentication pages
│   │   │   ├── (dashboard)/         # Protected dashboard
│   │   │   │   └── workspaces/      # Workspace management
│   │   │   ├── globals.css          # Global styles
│   │   │   └── layout.tsx           # Root layout
│   │   ├── components/              # React components
│   │   │   ├── ui/                  # Basic UI components
│   │   │   ├── workspaces/          # Workspace components
│   │   │   └── workspace-hub/       # Workspace hub components
│   │   ├── lib/
│   │   │   ├── api/                 # API clients
│   │   │   ├── hooks/               # Custom React hooks
│   │   │   ├── store/               # Zustand state management
│   │   │   └── utils/               # Helper functions
│   │   ├── types/                   # TypeScript types
│   │   └── mock/                    # Mock data
│   ├── Dockerfile                   # Multi-stage: dev + prod
│   ├── next.config.ts
│   ├── tailwind.config.mjs
│   ├── tsconfig.json
│   └── package.json
│
├── docker-compose.dev.yml           # Development environment
├── docker-compose.prod.yml          # Production environment
├── .env.example                     # Environment variables template
└── README.md                        # This file
```

---

## ✨ Features

### 🏢 Workspace Management
- Create workspaces with unique slug-based routing
- Automatic slug generation and collision handling
- Aura color customization (8 colors)
- Workspace organization by user

### 🤖 AI Features
- Document summarization
- AI-powered chat assistant (Chatie)
- Quiz generation from content
- Smart note organization

### 📚 Study Tools
- Flashcard creation and management
- Live study room sessions
- Collaborative features
- Resource management

### 📄 File Support
- PDF, DOCX, PPTX processing
- Audio file support
- YouTube video integration

---

## 🐳 Docker Setup

### Development Environment

**Start Development:**
```bash
docker compose -f docker-compose.dev.yml up --build
```

**Features:**
- ✅ Live code reloading via volume mounts
- ✅ Backend auto-restart (ts-node-dev)
- ✅ Frontend HMR (Next.js hot reload)
- ✅ Source code bind-mounted
- ✅ node_modules preserved in container

**Stop Development:**
```bash
docker compose -f docker-compose.dev.yml down
```

**View Logs:**
```bash
docker compose -f docker-compose.dev.yml logs -f
```

**Access Container Shell:**
```bash
# Backend
docker compose -f docker-compose.dev.yml exec backend sh

# Frontend
docker compose -f docker-compose.dev.yml exec frontend sh
```

### Production Environment

**Start Production:**
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

**Features:**
- ✅ Multi-stage optimized builds
- ✅ Minimal image size
- ✅ Pre-compiled TypeScript (backend)
- ✅ Next.js standalone output (frontend)
- ✅ Health checks enabled
- ✅ No development dependencies
- ✅ Auto-restart on failure

**Stop Production:**
```bash
docker compose -f docker-compose.prod.yml down
```

**View Production Logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Docker Management Commands

| Command | Description |
|---------|-------------|
| `docker compose -f docker-compose.dev.yml up --build` | Start development with hot reload |
| `docker compose -f docker-compose.dev.yml down` | Stop development containers |
| `docker compose -f docker-compose.prod.yml up --build -d` | Start production (detached) |
| `docker compose -f docker-compose.prod.yml down` | Stop production containers |
| `docker compose -f docker-compose.dev.yml logs -f` | View live logs (dev) |
| `docker compose -f docker-compose.dev.yml exec backend sh` | Access backend shell (dev) |
| `docker compose -f docker-compose.dev.yml exec frontend sh` | Access frontend shell (dev) |
| `docker compose -f docker-compose.dev.yml restart` | Restart all services |
| Clean | `.\docker-dev.ps1 clean` | `./docker-dev.sh clean` | Clean Docker resources |

---

## 🔧 Development Guide

### Backend Stack
- **Framework:** Express.js 5
- **Language:** TypeScript 5.7
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Development:** ts-node-dev (auto-restart)

### Frontend Stack
- **Framework:** Next.js 16
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **State:** Zustand
- **UI Components:** Shadcn/ui
- **HTTP Client:** Axios

### Available Scripts

**Backend:**
```bash
cd backend

npm run dev        # Start development server (ts-node-dev)
npm run build      # Build TypeScript
npm start          # Start production server
npm test           # Run tests
```

**Frontend:**
```bash
cd frontend

npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
```

### Making Changes

1. **Frontend Changes:** Edit files in `frontend/src/` → See changes instantly via HMR
2. **Backend Changes:** Edit files in `backend/src/` → Server auto-restarts via ts-node-dev
3. **No manual restart needed** in development mode!

---

## 🏗️ Workspace Feature

### Overview
The Create Workspace feature provides users with a way to organize their study materials into separate workspaces. Each workspace has:
- Unique slug-based URL routing
- Custom aura colors (8 options)
- Optional description
- User-specific isolation

### Database

**Workspaces Table:**
```sql
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  aura TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.workspaces 
  ADD CONSTRAINT unique_slug_per_user UNIQUE (user_id, slug);

CREATE INDEX idx_workspaces_user_id ON public.workspaces(user_id);
CREATE INDEX idx_workspaces_slug ON public.workspaces(slug);
```

### Backend Implementation

#### Slug Generator (`backend/src/utils/slugGenerator.ts`)
```typescript
generateSlug(text)           // "My Workspace" → "my-workspace"
generateUniqueSlug(baseSlug) // Appends -2, -3, etc. if slug exists
```

#### Workspace Service (`backend/src/services/workspace.service.ts`)
```typescript
createWorkspace(userId, input)    // Create new workspace
getUserWorkspaces(userId)         // List all workspaces
getWorkspaceBySlug(userId, slug)  // Fetch workspace details
```

#### Workspace Controller (`backend/src/controllers/workspace.controller.ts`)
```
POST   /api/workspaces           // Create workspace
GET    /api/workspaces           // List user workspaces
GET    /api/workspaces/:slug     // Get workspace details
```

### Frontend Implementation

#### Create Workspace Modal
- Name input (required)
- Description textarea (optional)
- 8-color aura picker
- Form validation
- Loading/error states

#### Workspace Pages
- **List Page:** `/workspaces` - Show all workspaces
- **Detail Page:** `/workspaces/[slug]` - Workspace info + navigation
- **Sub-sections:** Study Room, Resources, Quiz, Flashcards

### Usage Flow

```
1. User visits /workspaces
2. Clicks "Create Workspace" button
3. Modal opens with form
4. Fills Name, Description (optional), selects Color
5. Clicks "Create"
6. Backend validates and creates workspace
7. Generates unique slug if needed
8. User redirected to /workspaces/my-workspace
9. Workspace appears in list
```

---

## 📡 Backend API

### Authentication
All endpoints (except auth routes) require authentication via Bearer token.

### Workspace Endpoints

#### Create Workspace
```http
POST /api/workspaces
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Spring 2026",
  "description": "Study materials for spring semester",
  "aura": "#4ECDC4"
}

Response (201):
{
  "id": "uuid",
  "name": "Spring 2026",
  "slug": "spring-2026",
  "description": "Study materials for spring semester",
  "aura": "#4ECDC4",
  "user_id": "uuid",
  "created_at": "2026-02-21T10:30:00Z"
}
```

#### List Workspaces
```http
GET /api/workspaces
Authorization: Bearer {token}

Response (200):
[
  {
    "id": "uuid",
    "name": "Spring 2026",
    "slug": "spring-2026",
    ...
  }
]
```

#### Get Workspace by Slug
```http
GET /api/workspaces/spring-2026
Authorization: Bearer {token}

Response (200):
{
  "id": "uuid",
  "name": "Spring 2026",
  "slug": "spring-2026",
  ...
}
```

---

## 🐛 Troubleshooting

### Port Already in Use

**Windows:**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Linux/macOS:**
```bash
lsof -i :3000
kill -9 <PID>
```

### Changes Not Reflecting

1. Check logs: `docker-compose -f docker-compose.dev.yml logs -f`
2. Restart service: `docker-compose -f docker-compose.dev.yml restart backend`
3. Clear Docker cache: `docker volume prune --force`

### Memory Issues

Increase Docker Desktop memory in Settings > Resources > Memory

### Build Errors

1. Clean volumes: `docker volume prune --force`
2. Rebuild: `docker-compose -f docker-compose.dev.yml build --no-cache`
3. Check `.env.local` exists with valid Supabase credentials

### Volume Mount Issues (Windows)

- Ensure Docker Desktop uses WSL 2 backend
- Use forward slashes in paths: `/app/src`
- Check file permissions in shared folders

---

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces` - List workspaces
- `GET /api/workspaces/:slug` - Get workspace detail

---

## 🔐 Security

### Authentication
- Supabase Auth with JWT tokens
- Protected routes with authentication middleware
- Row-level security on Supabase tables

### User Isolation
- Workspaces scoped to authenticated user
- Slug uniqueness enforced per user
- No cross-user data access

---

## 📦 Deployment

### Production Build

**Backend:**
```bash
cd backend
npm run build
docker build -f Dockerfile -t ezy-notez-backend:latest .
```

**Frontend:**
```bash
cd frontend
npm run build
docker build -f Dockerfile -t ezy-notez-frontend:latest .
```

### Using Production Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Make changes with live reload in Docker
3. Test thoroughly
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin feature/name`
6. Create Pull Request

---

## 📝 Environment Variables

See `.env.example` for all available configuration options.

**Required for Development:**
```env
SUPABASE_URL              # Supabase project URL
SUPABASE_ANON_KEY         # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY # Supabase service role key
SUPABASE_DB_URL           # Database connection string (optional)
```

---

## 🆘 Support & Resources

- **Documentation:** See individual component docs
- **Issues:** Check GitHub issues or create new one
- **Discussions:** Join community discussions

---

## 📄 License

ISC

---

## 🎯 Quick Commands Summary

### Docker Development
```bash
# Start
docker-compose -f docker-compose.dev.yml up --build

# Stop
docker-compose -f docker-compose.dev.yml down

# Logs
docker-compose -f docker-compose.dev.yml logs -f

# Backend shell
docker exec -it ezynotes-backend-dev sh

# Frontend shell
docker exec -it ezynotes-frontend-dev sh
```

### Local Development
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

---

**Last Updated:** February 21, 2026  
**Status:** ✅ Production Ready
