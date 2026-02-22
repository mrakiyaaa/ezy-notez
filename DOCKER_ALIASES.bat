@echo off
REM Docker Development & Production Aliases for Windows
REM Usage: Run this batch file or add to your environment variables
REM Or use the commands directly from PowerShell

doskey dev-up=docker-compose -f docker-compose.dev.yml up --build
doskey dev-down=docker-compose -f docker-compose.dev.yml down
doskey dev-logs=docker-compose -f docker-compose.dev.yml logs -f
doskey dev-logs-backend=docker-compose -f docker-compose.dev.yml logs -f backend
doskey dev-logs-frontend=docker-compose -f docker-compose.dev.yml logs -f frontend
doskey dev-ps=docker-compose -f docker-compose.dev.yml ps
doskey dev-stop=docker-compose -f docker-compose.dev.yml stop
doskey dev-shell-backend=docker exec -it ezynotes-backend-dev sh
doskey dev-shell-frontend=docker exec -it ezynotes-frontend-dev sh
doskey dev-build=docker-compose -f docker-compose.dev.yml build --no-cache

doskey prod-up=docker-compose -f docker-compose.prod.yml up --build
doskey prod-down=docker-compose -f docker-compose.prod.yml down
doskey prod-logs=docker-compose -f docker-compose.prod.yml logs -f
doskey prod-logs-backend=docker-compose -f docker-compose.prod.yml logs -f backend
doskey prod-logs-frontend=docker-compose -f docker-compose.prod.yml logs -f frontend
doskey prod-ps=docker-compose -f docker-compose.prod.yml ps
doskey prod-stop=docker-compose -f docker-compose.prod.yml stop
doskey prod-shell-backend=docker exec -it ezynotes-backend-prod sh
doskey prod-shell-frontend=docker exec -it ezynotes-frontend-prod sh
doskey prod-build=docker-compose -f docker-compose.prod.yml build --no-cache

doskey docker-cleanup=docker volume prune --force ^& docker image prune --force
doskey docker-stats=docker stats

echo.
echo Docker aliases loaded!
echo.
echo Development commands:
echo   dev-up              - Start development environment
echo   dev-down            - Stop development environment
echo   dev-logs            - View all development logs
echo   dev-logs-backend    - View backend logs
echo   dev-logs-frontend   - View frontend logs
echo   dev-shell-backend   - Access backend container shell
echo   dev-shell-frontend  - Access frontend container shell
echo.
echo Production commands:
echo   prod-up             - Start production environment
echo   prod-down           - Stop production environment
echo   prod-logs           - View all production logs
echo   prod-logs-backend   - View backend logs
echo   prod-logs-frontend  - View frontend logs
echo   prod-shell-backend  - Access backend container shell
echo   prod-shell-frontend - Access frontend container shell
echo.
