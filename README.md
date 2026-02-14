# EZY-NOTEZ

AI-powered note-taking and study collaboration platform built with Next.js and Express.

## 🏗️ Project Structure

```
EZY-NOTEZ/
├── backend/          # Express.js API with TypeScript
├── frontend/         # Next.js application
└── .husky/          # Git hooks
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB
- Redis (optional, for caching)
- OpenAI API key

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

The backend will run on `http://localhost:3000`

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

The frontend will run on `http://localhost:3001`

## 📁 Backend Structure

- `src/config/` - Configuration files (database, env, etc.)
- `src/models/` - Mongoose database models
- `src/controllers/` - Route handlers
- `src/services/` - Business logic layer
  - `ai/` - AI services (summarization, chat, quiz generation)
  - `processing/` - File processing services
  - `study-room/` - Study room related services
- `src/routes/` - API route definitions
- `src/middleware/` - Express middleware
- `src/validators/` - Request validation schemas
- `src/websocket/` - Socket.io handlers
- `src/utils/` - Utility functions
- `src/types/` - TypeScript type definitions

## 📁 Frontend Structure

- `src/app/` - Next.js App Router
  - `(auth)/` - Authentication pages
  - `(dashboard)/` - Protected dashboard routes
- `src/components/` - React components
  - `ui/` - Basic UI components
  - `layouts/` - Layout components
  - `auth/` - Authentication components
  - `workspace/` - Workspace components
  - `resources/` - Resource management
  - `ai/` - AI features (summarization, chat, quiz)
  - `study-room/` - Study room components
  - `common/` - Common reusable components
- `src/lib/` - Utilities and configurations
  - `api/` - API client and endpoints
  - `hooks/` - Custom React hooks
  - `store/` - Zustand state management
  - `utils/` - Helper functions
- `src/types/` - TypeScript type definitions

## 🎯 Features

- **Workspace Management** - Organize resources by workspaces
- **AI Summarization** - Generate summaries from documents
- **Chatie** - AI-powered chat assistant
- **Quiz Generation** - Auto-generate quizzes from content
- **Flashcards** - Create and study flashcards
- **Study Rooms** - Collaborative live quiz sessions
- **File Processing** - Support for PDF, DOCX, PPTX, audio, YouTube

## 🔧 Available Scripts

### Backend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 📝 License

ISC
