@echo off
REM Flotilla Production Deployment Script for Windows
REM Domain: 571732.xyz

echo ====================================
echo     Flotilla Production Deploy
echo     Domain: 571732.xyz
echo ====================================
echo.

REM Check Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Stop development environment
echo [1/5] Stopping development environment...
docker-compose down
echo.

REM Start production environment
echo [2/5] Starting production environment...
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
if errorlevel 1 (
    echo [ERROR] Failed to start services!
    pause
    exit /b 1
)
echo.

REM Wait for services to start
echo [3/5] Waiting for services to start (30 seconds)...
timeout /t 30 /nobreak >nul
echo.

REM Check services
echo [4/5] Checking service status...
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
echo.

REM Display access information
echo [5/5] Deployment complete!
echo.
echo ========================================
echo     Access Information
echo ========================================
echo.
echo Before SSL Setup (HTTP only):
echo   - Official Website: http://flotilla.571732.xyz
echo   - Application:      http://app.571732.xyz
echo   - API Docs:         http://api.571732.xyz/api/docs
echo.
echo ========================================
echo     Next Steps
echo ========================================
echo.
echo 1. Configure DNS A records for:
echo    - flotilla.571732.xyz
echo    - app.571732.xyz
echo    - api.571732.xyz
echo.
echo 2. Wait for DNS propagation (5-30 minutes)
echo.
echo 3. Run SSL setup script:
echo    bash scripts/setup-ssl.sh
echo.
echo 4. After SSL setup, access via HTTPS:
echo    - https://flotilla.571732.xyz
echo    - https://app.571732.xyz
echo    - https://api.571732.xyz
echo.
echo See docs/生产部署指南-571732.xyz.md for details
echo.
pause
