@echo off
chcp 65001 > nul
setlocal EnableDelayedExpansion

REM ============================================
REM Flotilla Docker 部署脚本 (Windows)
REM ============================================
REM 用法: deploy.bat [command]
REM 命令:
REM   start   - 启动所有服务 (默认)
REM   stop    - 停止所有服务
REM   restart - 重启所有服务
REM   build   - 重新构建并启动
REM   logs    - 查看日志
REM   status  - 查看服务状态
REM   clean   - 停止并清除所有数据
REM ============================================

cd /d "%~dp0.."

REM 检查 .env.docker 文件
if not exist ".env.docker" (
    echo [错误] .env.docker 文件不存在！
    echo [提示] 请先创建 .env.docker 文件
    exit /b 1
)
echo [OK] 找到 .env.docker 配置文件

REM 检查 Docker 是否运行
docker info > nul 2>&1
if errorlevel 1 (
    echo [错误] Docker 未运行！
    echo [提示] 请先启动 Docker Desktop
    exit /b 1
)
echo [OK] Docker 正在运行

REM 处理命令
set "CMD=%~1"
if "%CMD%"=="" set "CMD=start"

if "%CMD%"=="start" goto :start
if "%CMD%"=="stop" goto :stop
if "%CMD%"=="restart" goto :restart
if "%CMD%"=="build" goto :build
if "%CMD%"=="logs" goto :logs
if "%CMD%"=="status" goto :status
if "%CMD%"=="clean" goto :clean

echo 用法: %0 {start^|stop^|restart^|build^|logs^|status^|clean}
exit /b 1

:start
echo.
echo 正在启动 Flotilla 服务...
docker-compose --env-file .env.docker up -d
echo.
echo ============================================
echo [OK] Flotilla 服务已启动！
echo ============================================
echo.
echo 前端应用:     http://localhost:3000
echo 后端API:      http://localhost:4000
echo API文档:      http://localhost:4000/api/docs
echo 官网:         http://localhost:3003
echo MinIO控制台:  http://localhost:9001
echo MeiliSearch:  http://localhost:7700
echo.
echo [提示] 首次启动可能需要几分钟来构建镜像和初始化数据库
echo [提示] 使用 'deploy.bat logs' 查看启动日志
goto :eof

:stop
echo 正在停止 Flotilla 服务...
docker-compose --env-file .env.docker down
echo [OK] 所有服务已停止
goto :eof

:restart
call :stop
call :start
goto :eof

:build
echo 正在重新构建 Flotilla 服务...
docker-compose --env-file .env.docker build --no-cache
call :start
goto :eof

:logs
docker-compose --env-file .env.docker logs -f
goto :eof

:status
echo Flotilla 服务状态:
docker-compose --env-file .env.docker ps
goto :eof

:clean
echo [警告] 这将停止所有服务并删除所有数据！
set /p CONFIRM="确定要继续吗？(y/N) "
if /i "%CONFIRM%"=="y" (
    echo 正在清除所有数据...
    docker-compose --env-file .env.docker down -v --remove-orphans
    echo [OK] 所有服务和数据已清除
) else (
    echo 操作已取消
)
goto :eof
