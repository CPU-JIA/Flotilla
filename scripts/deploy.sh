#!/bin/bash

# ============================================
# Flotilla Docker 部署脚本
# ============================================
# 用法: ./scripts/deploy.sh [command]
# 命令:
#   start   - 启动所有服务 (默认)
#   stop    - 停止所有服务
#   restart - 重启所有服务
#   build   - 重新构建并启动
#   logs    - 查看日志
#   status  - 查看服务状态
#   clean   - 停止并清除所有数据
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# 检查 .env.docker 文件
check_env_file() {
    if [ ! -f ".env.docker" ]; then
        echo -e "${RED}错误: .env.docker 文件不存在！${NC}"
        echo -e "${YELLOW}请先创建 .env.docker 文件，可以从 .env.docker.example 复制${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ 找到 .env.docker 配置文件${NC}"
}

# 检查 Docker 是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}错误: Docker 未运行！${NC}"
        echo -e "${YELLOW}请先启动 Docker Desktop${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker 正在运行${NC}"
}

# 启动服务
start_services() {
    echo -e "${BLUE}正在启动 Flotilla 服务...${NC}"
    docker-compose --env-file .env.docker up -d
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}✓ Flotilla 服务已启动！${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "前端应用:     ${BLUE}http://localhost:3000${NC}"
    echo -e "后端API:      ${BLUE}http://localhost:4000${NC}"
    echo -e "API文档:      ${BLUE}http://localhost:4000/api/docs${NC}"
    echo -e "官网:         ${BLUE}http://localhost:3003${NC}"
    echo -e "MinIO控制台:  ${BLUE}http://localhost:9001${NC}"
    echo -e "MeiliSearch:  ${BLUE}http://localhost:7700${NC}"
    echo ""
    echo -e "${YELLOW}提示: 首次启动可能需要几分钟来构建镜像和初始化数据库${NC}"
    echo -e "${YELLOW}使用 './scripts/deploy.sh logs' 查看启动日志${NC}"
}

# 停止服务
stop_services() {
    echo -e "${BLUE}正在停止 Flotilla 服务...${NC}"
    docker-compose --env-file .env.docker down
    echo -e "${GREEN}✓ 所有服务已停止${NC}"
}

# 重启服务
restart_services() {
    stop_services
    start_services
}

# 重新构建并启动
build_services() {
    echo -e "${BLUE}正在重新构建 Flotilla 服务...${NC}"
    docker-compose --env-file .env.docker build --no-cache
    start_services
}

# 查看日志
show_logs() {
    docker-compose --env-file .env.docker logs -f
}

# 查看状态
show_status() {
    echo -e "${BLUE}Flotilla 服务状态:${NC}"
    docker-compose --env-file .env.docker ps
}

# 清除所有数据
clean_all() {
    echo -e "${RED}警告: 这将停止所有服务并删除所有数据！${NC}"
    read -p "确定要继续吗？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}正在清除所有数据...${NC}"
        docker-compose --env-file .env.docker down -v --remove-orphans
        echo -e "${GREEN}✓ 所有服务和数据已清除${NC}"
    else
        echo "操作已取消"
    fi
}

# 主逻辑
main() {
    check_docker
    check_env_file

    case "${1:-start}" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        build)
            build_services
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        clean)
            clean_all
            ;;
        *)
            echo "用法: $0 {start|stop|restart|build|logs|status|clean}"
            exit 1
            ;;
    esac
}

main "$@"
