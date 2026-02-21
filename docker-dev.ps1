# Docker Management Script for Windows PowerShell
# Usage: .\docker-dev.ps1 [command]
# Commands: up, down, logs, shell-backend, shell-frontend, build, restart

param(
    [string]$command = "help",
    [string]$service = "all"
)

$env_file = ".env.local"
$compose_dev = "docker-compose.dev.yml"
$compose_prod = "docker-compose.prod.yml"

function Show-Help {
    Write-Host "`n========== Ezy-Notez Docker Management ==========" -ForegroundColor Cyan
    Write-Host "`nUsage: .\docker-dev.ps1 [command] [service]" -ForegroundColor Yellow
    Write-Host "`nCommands:" -ForegroundColor Green
    Write-Host "  up                    - Start development environment"
    Write-Host "  down                  - Stop development environment"
    Write-Host "  logs                  - View all development logs"
    Write-Host "  shell-backend         - Access backend container shell"
    Write-Host "  shell-frontend        - Access frontend container shell"
    Write-Host "  build                 - Rebuild development containers"
    Write-Host "  restart               - Restart development environment"
    Write-Host "  ps                    - Show running containers"
    Write-Host "  clean                 - Clean up Docker resources"
    Write-Host "  prod-up               - Start production environment"
    Write-Host "  prod-down             - Stop production environment"
    Write-Host "  prod-logs             - View production logs"
    Write-Host "  help                  - Show this help message"
    Write-Host "`nExamples:" -ForegroundColor Green
    Write-Host "  .\docker-dev.ps1 up"
    Write-Host "  .\docker-dev.ps1 logs"
    Write-Host "  .\docker-dev.ps1 shell-backend"
    Write-Host "  .\docker-dev.ps1 prod-up"
    Write-Host "`n"
}

function Check-Prerequisites {
    Write-Host "[*] Checking prerequisites..." -ForegroundColor Yellow
    
    $docker = docker --version 2>$null
    if ($docker) {
        Write-Host "[OK] Docker is installed: $docker" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Docker is not installed or not in PATH" -ForegroundColor Red
        exit 1
    }
    
    $compose = docker-compose --version 2>$null
    if ($compose) {
        Write-Host "[OK] Docker Compose is installed: $compose" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Docker Compose is not installed" -ForegroundColor Red
        exit 1
    }
    
    if (Test-Path $env_file) {
        Write-Host "[OK] Environment file exists: $env_file" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Environment file not found: $env_file" -ForegroundColor Yellow
        Write-Host "Please create .env.local with Supabase credentials" -ForegroundColor Yellow
    }
}

function Dev-Up {
    Write-Host "[*] Starting development environment..." -ForegroundColor Yellow
    docker-compose -f $compose_dev up --build
}

function Dev-Down {
    Write-Host "[*] Stopping development environment..." -ForegroundColor Yellow
    docker-compose -f $compose_dev down
    Write-Host "[OK] Development environment stopped" -ForegroundColor Green
}

function Dev-Logs {
    Write-Host "[*] Showing development logs (Ctrl+C to exit)..." -ForegroundColor Yellow
    docker-compose -f $compose_dev logs -f
}

function Dev-ShellBackend {
    Write-Host "[*] Connecting to backend container..." -ForegroundColor Yellow
    docker exec -it ezynotes-backend-dev sh
}

function Dev-ShellFrontend {
    Write-Host "[*] Connecting to frontend container..." -ForegroundColor Yellow
    docker exec -it ezynotes-frontend-dev sh
}

function Dev-Build {
    Write-Host "[*] Building development containers..." -ForegroundColor Yellow
    docker-compose -f $compose_dev build --no-cache
    Write-Host "[OK] Build complete" -ForegroundColor Green
}

function Dev-Restart {
    Write-Host "[*] Restarting development environment..." -ForegroundColor Yellow
    Dev-Down
    Start-Sleep -Seconds 2
    Dev-Up
}

function Dev-PS {
    Write-Host "[*] Development containers:" -ForegroundColor Yellow
    docker-compose -f $compose_dev ps
}

function Dev-Clean {
    Write-Host "[*] Cleaning up Docker resources..." -ForegroundColor Yellow
    Write-Host "  - Removing unused volumes..." -ForegroundColor Gray
    docker volume prune --force | Out-Null
    Write-Host "  - Removing unused images..." -ForegroundColor Gray
    docker image prune --force | Out-Null
    Write-Host "[OK] Cleanup complete" -ForegroundColor Green
}

function Prod-Up {
    Write-Host "[*] Starting production environment..." -ForegroundColor Yellow
    docker-compose -f $compose_prod up --build -d
    Write-Host "[OK] Production environment started" -ForegroundColor Green
    Prod-PS
}

function Prod-Down {
    Write-Host "[*] Stopping production environment..." -ForegroundColor Yellow
    docker-compose -f $compose_prod down
    Write-Host "[OK] Production environment stopped" -ForegroundColor Green
}

function Prod-Logs {
    Write-Host "[*] Showing production logs (Ctrl+C to exit)..." -ForegroundColor Yellow
    docker-compose -f $compose_prod logs -f
}

function Prod-PS {
    Write-Host "[*] Production containers:" -ForegroundColor Yellow
    docker-compose -f $compose_prod ps
}

# Main script logic
Check-Prerequisites

switch ($command.ToLower()) {
    "up" { Dev-Up }
    "down" { Dev-Down }
    "logs" { Dev-Logs }
    "shell-backend" { Dev-ShellBackend }
    "shell-frontend" { Dev-ShellFrontend }
    "build" { Dev-Build }
    "restart" { Dev-Restart }
    "ps" { Dev-PS }
    "clean" { Dev-Clean }
    "prod-up" { Prod-Up }
    "prod-down" { Prod-Down }
    "prod-logs" { Prod-Logs }
    "prod-ps" { Prod-PS }
    "help" { Show-Help }
    default {
        Write-Host "[ERROR] Unknown command: $command" -ForegroundColor Red
        Show-Help
        exit 1
    }
}
