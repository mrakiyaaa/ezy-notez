#!/bin/bash
# Docker management script for Linux/macOS
# Usage: ./docker-dev.sh [command]
# Commands: up, down, logs, shell-backend, shell-frontend, build, restart

command=${1:-help}
service=${2:-all}

ENV_FILE=".env.local"
COMPOSE_DEV="docker-compose.dev.yml"
COMPOSE_PROD="docker-compose.prod.yml"

print_help() {
    cat << EOF
========== Ezy-Notez Docker Management ==========

Usage: ./docker-dev.sh [command] [service]

DEVELOPMENT COMMANDS:
  up                    - Start development environment
  down                  - Stop development environment
  logs                  - View all development logs
  shell-backend         - Access backend container shell
  shell-frontend        - Access frontend container shell
  build                 - Rebuild development containers
  restart               - Restart development environment
  ps                    - Show running containers
  clean                 - Clean up Docker resources

PRODUCTION COMMANDS:
  prod-up               - Start production environment
  prod-down             - Stop production environment
  prod-logs             - View production logs
  prod-ps               - Show production containers

OTHER:
  help                  - Show this help message

EXAMPLES:
  ./docker-dev.sh up
  ./docker-dev.sh logs
  ./docker-dev.sh shell-backend
  ./docker-dev.sh prod-up

EOF
}

check_prerequisites() {
    echo "[*] Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        echo "[ERROR] Docker is not installed"
        exit 1
    fi
    echo "[OK] Docker is installed"
    
    if ! command -v docker-compose &> /dev/null; then
        echo "[ERROR] Docker Compose is not installed"
        exit 1
    fi
    echo "[OK] Docker Compose is installed"
    
    if [ -f "$ENV_FILE" ]; then
        echo "[OK] Environment file exists: $ENV_FILE"
    else
        echo "[WARNING] Environment file not found: $ENV_FILE"
        echo "Please create .env.local with Supabase credentials"
    fi
}

dev_up() {
    echo "[*] Starting development environment..."
    docker-compose -f $COMPOSE_DEV up --build
}

dev_down() {
    echo "[*] Stopping development environment..."
    docker-compose -f $COMPOSE_DEV down
    echo "[OK] Development environment stopped"
}

dev_logs() {
    echo "[*] Showing development logs (Ctrl+C to exit)..."
    docker-compose -f $COMPOSE_DEV logs -f
}

dev_shell_backend() {
    echo "[*] Connecting to backend container..."
    docker exec -it ezynotes-backend-dev sh
}

dev_shell_frontend() {
    echo "[*] Connecting to frontend container..."
    docker exec -it ezynotes-frontend-dev sh
}

dev_build() {
    echo "[*] Building development containers..."
    docker-compose -f $COMPOSE_DEV build --no-cache
    echo "[OK] Build complete"
}

dev_restart() {
    echo "[*] Restarting development environment..."
    dev_down
    sleep 2
    dev_up
}

dev_ps() {
    echo "[*] Development containers:"
    docker-compose -f $COMPOSE_DEV ps
}

dev_clean() {
    echo "[*] Cleaning up Docker resources..."
    echo "  - Removing unused volumes..."
    docker volume prune --force > /dev/null
    echo "  - Removing unused images..."
    docker image prune --force > /dev/null
    echo "[OK] Cleanup complete"
}

prod_up() {
    echo "[*] Starting production environment..."
    docker-compose -f $COMPOSE_PROD up --build -d
    echo "[OK] Production environment started"
    prod_ps
}

prod_down() {
    echo "[*] Stopping production environment..."
    docker-compose -f $COMPOSE_PROD down
    echo "[OK] Production environment stopped"
}

prod_logs() {
    echo "[*] Showing production logs (Ctrl+C to exit)..."
    docker-compose -f $COMPOSE_PROD logs -f
}

prod_ps() {
    echo "[*] Production containers:"
    docker-compose -f $COMPOSE_PROD ps
}

# Main script logic
check_prerequisites

case "$command" in
    up)
        dev_up
        ;;
    down)
        dev_down
        ;;
    logs)
        dev_logs
        ;;
    shell-backend)
        dev_shell_backend
        ;;
    shell-frontend)
        dev_shell_frontend
        ;;
    build)
        dev_build
        ;;
    restart)
        dev_restart
        ;;
    ps)
        dev_ps
        ;;
    clean)
        dev_clean
        ;;
    prod-up)
        prod_up
        ;;
    prod-down)
        prod_down
        ;;
    prod-logs)
        prod_logs
        ;;
    prod-ps)
        prod_ps
        ;;
    help)
        print_help
        ;;
    *)
        echo "[ERROR] Unknown command: $command"
        print_help
        exit 1
        ;;
esac
