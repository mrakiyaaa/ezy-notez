# Docker Setup for EzyNotes

This guide explains how to run both the frontend and backend services using Docker.

## Prerequisites

- [Docker](https://www.docker.com/get-started) installed on your machine
- [Docker Compose](https://docs.docker.com/compose/) (usually included with Docker Desktop)

## Quick Start

### 1. Configure Environment Variables

Create a `.env` file in the root directory by copying the example:

```bash
cp .env.example .env
```

Then edit `.env` and add your Supabase credentials:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_DB_URL=your_supabase_database_connection_string
```

### 2. Run with Docker Compose

Start both frontend and backend services:

```bash
docker-compose up
```

Or run in detached mode (background):

```bash
docker-compose up -d
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Backend Health Check**: http://localhost:3001/health

## Docker Commands

### Build and Start Services

```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# Start specific service
docker-compose up frontend
docker-compose up backend
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### View Logs

```bash
# View logs from all services
docker-compose logs

# View logs from specific service
docker-compose logs frontend
docker-compose logs backend

# Follow logs (real-time)
docker-compose logs -f
```

### Rebuild Services

```bash
# Rebuild after code changes
docker-compose up --build

# Rebuild specific service
docker-compose up --build frontend
```

## Service Configuration

### Backend Service
- **Port**: 3001
- **Container Name**: ezynotes-backend
- **Health Check**: Runs every 30 seconds on `/health` endpoint

### Frontend Service
- **Port**: 3000
- **Container Name**: ezynotes-frontend
- **Depends On**: Backend (waits for backend to be healthy before starting)

## Development vs Production

### Development
For local development, it's recommended to run services without Docker:

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Production
For production deployment, use Docker Compose:

```bash
docker-compose up -d
```

## Troubleshooting

### Port Already in Use

If you see "port is already allocated" errors:

```bash
# Stop the conflicting process or change ports in docker-compose.yml
docker-compose down
```

### Build Failures

If builds fail, try cleaning Docker cache:

```bash
# Remove old containers and images
docker-compose down --rmi all
docker system prune -a

# Rebuild from scratch
docker-compose up --build
```

### Container Logs

Check container logs for errors:

```bash
docker-compose logs backend
docker-compose logs frontend
```

### Environment Variables Not Loading

Ensure `.env` file exists in the root directory and contains all required variables.

## Network

Services communicate through a Docker bridge network called `ezynotes-network`. This allows the frontend to communicate with the backend using service names.

## Health Checks

The backend service includes a health check that runs every 30 seconds. The frontend service depends on the backend being healthy before starting.

## Updating Dependencies

After updating dependencies in `package.json`:

```bash
# Rebuild the affected service
docker-compose up --build frontend
# or
docker-compose up --build backend
```

## Stopping and Cleaning Up

```bash
# Stop all services
docker-compose down

# Remove containers, networks, and volumes
docker-compose down -v

# Remove all Docker images for this project
docker-compose down --rmi all
```
