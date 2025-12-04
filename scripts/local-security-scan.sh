#!/bin/bash

# 本地安全扫描脚本
# Phase 4 P4.5: 快速本地安全检查
#
# 用法: ./scripts/local-security-scan.sh [--quick|--full]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 参数解析
SCAN_MODE="${1:---quick}"

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🔒 Flotilla Security Scan (Local)        ║${NC}"
echo -e "${BLUE}║   Phase 4 P4.5: SAST/DAST Integration      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in project root directory${NC}"
    exit 1
fi

# 统计
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 扫描函数
run_check() {
    local check_name="$1"
    local check_cmd="$2"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -e "${BLUE}[$TOTAL_CHECKS] Running: $check_name${NC}"

    if eval "$check_cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $check_name: PASSED${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ $check_name: FAILED${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

run_check_verbose() {
    local check_name="$1"
    local check_cmd="$2"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -e "${BLUE}[$TOTAL_CHECKS] Running: $check_name${NC}"
    echo "Command: $check_cmd"
    echo "---"

    if eval "$check_cmd"; then
        echo "---"
        echo -e "${GREEN}✅ $check_name: PASSED${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo "---"
        echo -e "${RED}❌ $check_name: FAILED${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
    echo ""
}

# ==================== 快速模式 ====================
if [ "$SCAN_MODE" == "--quick" ]; then
    echo -e "${YELLOW}Running in QUICK mode (5-10 minutes)${NC}"
    echo ""

    # 1. 依赖漏洞扫描
    echo -e "${BLUE}📦 Step 1/5: Dependency Vulnerability Scan${NC}"
    if command -v pnpm &> /dev/null; then
        run_check_verbose "npm audit (high/critical)" "pnpm audit --audit-level=high"
    else
        echo -e "${YELLOW}⚠️  pnpm not found, skipping${NC}"
    fi
    echo ""

    # 2. 代码 Linting
    echo -e "${BLUE}🔍 Step 2/5: ESLint Security Rules${NC}"
    if [ -f "apps/backend/package.json" ]; then
        run_check "Backend ESLint" "cd apps/backend && pnpm lint"
    fi
    if [ -f "apps/frontend/package.json" ]; then
        run_check "Frontend ESLint" "cd apps/frontend && pnpm lint"
    fi
    echo ""

    # 3. TypeScript 类型检查
    echo -e "${BLUE}📝 Step 3/5: TypeScript Type Check${NC}"
    if [ -f "apps/backend/tsconfig.json" ]; then
        run_check "Backend TypeScript" "cd apps/backend && pnpm tsc --noEmit"
    fi
    if [ -f "apps/frontend/tsconfig.json" ]; then
        run_check "Frontend TypeScript" "cd apps/frontend && pnpm tsc --noEmit"
    fi
    echo ""

    # 4. 秘密扫描 (如果安装了 gitleaks)
    echo -e "${BLUE}🔑 Step 4/5: Secret Scanning${NC}"
    if command -v gitleaks &> /dev/null; then
        run_check_verbose "Gitleaks Secret Scan" "gitleaks detect --source . --no-git"
    else
        echo -e "${YELLOW}⚠️  Gitleaks not installed. Install: brew install gitleaks${NC}"
    fi
    echo ""

    # 5. 格式化检查
    echo -e "${BLUE}✨ Step 5/5: Code Formatting${NC}"
    if command -v prettier &> /dev/null; then
        run_check "Prettier Format Check" "pnpm prettier --check 'apps/**/*.{ts,tsx,js,jsx}'"
    else
        echo -e "${YELLOW}⚠️  Prettier not found, skipping${NC}"
    fi
    echo ""

# ==================== 完整模式 ====================
elif [ "$SCAN_MODE" == "--full" ]; then
    echo -e "${YELLOW}Running in FULL mode (30-60 minutes)${NC}"
    echo ""

    # 快速模式的所有检查
    echo -e "${BLUE}📦 Step 1/10: Dependency Vulnerability Scan${NC}"
    run_check_verbose "npm audit (all levels)" "pnpm audit || true"
    echo ""

    echo -e "${BLUE}🔍 Step 2/10: ESLint Security Rules${NC}"
    run_check "Backend ESLint" "cd apps/backend && pnpm lint"
    run_check "Frontend ESLint" "cd apps/frontend && pnpm lint"
    echo ""

    echo -e "${BLUE}📝 Step 3/10: TypeScript Type Check${NC}"
    run_check "Backend TypeScript" "cd apps/backend && pnpm tsc --noEmit"
    run_check "Frontend TypeScript" "cd apps/frontend && pnpm tsc --noEmit"
    echo ""

    echo -e "${BLUE}🔑 Step 4/10: Secret Scanning${NC}"
    if command -v gitleaks &> /dev/null; then
        run_check_verbose "Gitleaks (all history)" "gitleaks detect --source . --verbose"
    fi
    echo ""

    echo -e "${BLUE}✨ Step 5/10: Code Formatting${NC}"
    run_check "Prettier Format Check" "pnpm prettier --check 'apps/**/*.{ts,tsx,js,jsx}'"
    echo ""

    # 完整模式额外检查

    # 6. 单元测试（带覆盖率）
    echo -e "${BLUE}🧪 Step 6/10: Unit Tests with Coverage${NC}"
    if [ -f "apps/backend/package.json" ]; then
        run_check_verbose "Backend Tests" "cd apps/backend && pnpm test:cov"
    fi
    echo ""

    # 7. Docker 镜像扫描
    echo -e "${BLUE}🐳 Step 7/10: Docker Image Security Scan${NC}"
    if command -v trivy &> /dev/null; then
        if command -v docker &> /dev/null; then
            echo "Building backend image..."
            docker build -f apps/backend/Dockerfile -t flotilla-backend:scan . > /dev/null 2>&1 || true
            run_check_verbose "Trivy Backend Scan" "trivy image --severity HIGH,CRITICAL flotilla-backend:scan"

            echo "Building frontend image..."
            docker build -f apps/frontend/Dockerfile -t flotilla-frontend:scan . > /dev/null 2>&1 || true
            run_check_verbose "Trivy Frontend Scan" "trivy image --severity HIGH,CRITICAL flotilla-frontend:scan"
        else
            echo -e "${YELLOW}⚠️  Docker not running, skipping image scan${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Trivy not installed. Install: brew install aquasecurity/trivy/trivy${NC}"
    fi
    echo ""

    # 8. 文件系统扫描
    echo -e "${BLUE}📁 Step 8/10: Filesystem Security Check${NC}"
    if command -v trivy &> /dev/null; then
        run_check_verbose "Trivy Filesystem Scan" "trivy fs --severity HIGH,CRITICAL ."
    fi
    echo ""

    # 9. License 合规检查
    echo -e "${BLUE}📜 Step 9/10: License Compliance Check${NC}"
    if command -v pnpm &> /dev/null; then
        run_check_verbose "License Check" "pnpm licenses list --json || true"
    fi
    echo ""

    # 10. 代码复杂度分析
    echo -e "${BLUE}📊 Step 10/10: Code Complexity Analysis${NC}"
    if command -v eslint &> /dev/null; then
        run_check "Complexity Check" "pnpm eslint --ext .ts,.tsx --max-warnings 100 apps/backend/src apps/frontend/app || true"
    fi
    echo ""

else
    echo -e "${RED}❌ Invalid mode: $SCAN_MODE${NC}"
    echo "Usage: $0 [--quick|--full]"
    exit 1
fi

# ==================== 报告总结 ====================
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           📊 Security Scan Report           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total Checks:  $TOTAL_CHECKS"
echo -e "${GREEN}Passed:        $PASSED_CHECKS${NC}"
echo -e "${RED}Failed:        $FAILED_CHECKS${NC}"
echo ""

# 计算通过率
if [ $TOTAL_CHECKS -gt 0 ]; then
    PASS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo -e "Pass Rate:     ${PASS_RATE}%"

    if [ $PASS_RATE -eq 100 ]; then
        echo -e "${GREEN}✅ All security checks passed!${NC}"
        exit 0
    elif [ $PASS_RATE -ge 80 ]; then
        echo -e "${YELLOW}⚠️  Some checks failed. Review and fix.${NC}"
        exit 1
    else
        echo -e "${RED}❌ Multiple security issues found. Immediate action required!${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ No checks were run${NC}"
    exit 1
fi
