#!/bin/bash
# Docker Development & Production Aliases
# Source this file to add convenient docker-compose aliases
# Usage: source DOCKER_ALIASES.sh

# Development aliases
alias dev-up="docker-compose -f docker-compose.dev.yml up --build"
alias dev-down="docker-compose -f docker-compose.dev.yml down"
alias dev-logs="docker-compose -f docker-compose.dev.yml logs -f"
alias dev-logs-backend="docker-compose -f docker-compose.dev.yml logs -f backend"
alias dev-logs-frontend="docker-compose -f docker-compose.dev.yml logs -f frontend"
alias dev-ps="docker-compose -f docker-compose.dev.yml ps"
alias dev-stop="docker-compose -f docker-compose.dev.yml stop"
alias dev-bash-backend="docker exec -it ezynotes-backend-dev sh"
alias dev-bash-frontend="docker exec -it ezynotes-frontend-dev sh"
alias dev-build="docker-compose -f docker-compose.dev.yml build --no-cache"

# Production aliases
alias prod-up="docker-compose -f docker-compose.prod.yml up --build"
alias prod-down="docker-compose -f docker-compose.prod.yml down"
alias prod-logs="docker-compose -f docker-compose.prod.yml logs -f"
alias prod-logs-backend="docker-compose -f docker-compose.prod.yml logs -f backend"
alias prod-logs-frontend="docker-compose -f docker-compose.prod.yml logs -f frontend"
alias prod-ps="docker-compose -f docker-compose.prod.yml ps"
alias prod-stop="docker-compose -f docker-compose.prod.yml stop"
alias prod-bash-backend="docker exec -it ezynotes-backend-prod sh"
alias prod-bash-frontend="docker exec -it ezynotes-frontend-prod sh"
alias prod-build="docker-compose -f docker-compose.prod.yml build --no-cache"

# General aliases
alias docker-cleanup="docker volume prune --force && docker image prune --force"
alias docker-stats="docker stats"

echo "Docker aliases loaded! Use 'dev-*' for development and 'prod-*' for production commands."
echo ""
echo "Development commands:"
echo "  dev-up              - Start development environment"
echo "  dev-down            - Stop development environment"
echo "  dev-logs            - View all development logs"
echo "  dev-logs-backend    - View backend logs"
echo "  dev-logs-frontend   - View frontend logs"
echo "  dev-bash-backend    - Access backend container shell"
echo "  dev-bash-frontend   - Access frontend container shell"
echo ""
echo "Production commands:"
echo "  prod-up             - Start production environment"
echo "  prod-down           - Stop production environment"
echo "  prod-logs           - View all production logs"
echo "  prod-logs-backend   - View backend logs"
echo "  prod-logs-frontend  - View frontend logs"
echo ""
