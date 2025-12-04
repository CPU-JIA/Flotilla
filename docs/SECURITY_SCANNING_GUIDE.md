# 安全扫描集成指南 (SAST/DAST)

**Phase 4 P4.5**: 自动化安全扫描 - 企业级 CI/CD 安全集成

## 概述

本文档说明如何使用 Flotilla 项目的自动化安全扫描系统，包括：

- **SAST (Static Application Security Testing)**: 静态代码分析
- **DAST (Dynamic Application Security Testing)**: 动态运行时测试
- **依赖漏洞扫描**: 第三方包安全检查
- **容器安全扫描**: Docker 镜像漏洞检测
- **秘密泄露检测**: 凭证和 API key 扫描

---

## 扫描工具概览

| 工具 | 类型 | 扫描内容 | 触发时机 | 失败条件 |
|-----|------|---------|---------|---------|
| **npm audit** | SAST | 依赖漏洞 | 每次 PR/Push | Critical > 0 |
| **SonarCloud** | SAST | 代码质量/安全 | 每次 PR/Push | Quality Gate 未通过 |
| **CodeQL** | SAST | 代码漏洞 | 每次 PR/Push | 发现高危漏洞 |
| **Gitleaks** | SAST | 秘密泄露 | 每次 PR/Push | 发现秘密 |
| **TruffleHog** | SAST | 凭证扫描 | 每次 PR/Push | 发现凭证 |
| **Trivy** | SAST | Docker 镜像 | Push 到 main | Critical > 0 |
| **OWASP ZAP** | DAST | 运行时漏洞 | 定时/手动 | 发现高危漏洞 |

---

## 快速开始

### 1. 启用 GitHub Actions

确保仓库的 GitHub Actions 已启用：
1. 进入仓库 **Settings** → **Actions** → **General**
2. 选择 **Allow all actions and reusable workflows**
3. 点击 **Save**

### 2. 配置 Secrets

在 GitHub 仓库设置中添加以下 Secrets：

```
Settings → Secrets and variables → Actions → New repository secret
```

**必需的 Secrets**:

| Secret Name | 用途 | 如何获取 |
|------------|------|---------|
| `SONAR_TOKEN` | SonarCloud 扫描 | https://sonarcloud.io/account/security |
| `GITLEAKS_LICENSE` | Gitleaks Pro（可选） | https://gitleaks.io/ |

**可选的 Secrets**:
- `SNYK_TOKEN`: Snyk 依赖扫描
- `GITHUB_TOKEN`: 自动提供，无需配置

### 3. 配置 SonarCloud

1. 访问 https://sonarcloud.io/
2. 使用 GitHub 账号登录
3. 点击 **+** → **Analyze new project**
4. 选择 **flotilla** 仓库
5. 复制 **Organization Key** 和 **Project Key**
6. 更新 `.github/workflows/security-scanning.yml`:

```yaml
-Dsonar.projectKey=your-project-key
-Dsonar.organization=your-org-key
```

7. 更新 `sonar-project.properties`:

```properties
sonar.projectKey=your-project-key
sonar.organization=your-org-key
```

### 4. 手动触发扫描

```bash
# 方式 1: 通过 GitHub UI
仓库页面 → Actions → Security Scanning (SAST/DAST) → Run workflow

# 方式 2: 通过 CLI
gh workflow run security-scanning.yml
```

---

## 扫描详解

### Job 1: 依赖漏洞扫描

**工具**: npm audit (pnpm)

**检查内容**:
- 直接依赖漏洞
- 间接依赖漏洞
- 已知 CVE 漏洞

**失败条件**:
```bash
Critical vulnerabilities > 0   # 立即失败
High vulnerabilities > 5        # 失败
```

**查看报告**:
```bash
# 本地运行
cd apps/backend
pnpm audit

# 查看详细信息
pnpm audit --json | jq

# 修复漏洞
pnpm audit --fix
```

**常见问题**:

**Q: 如何忽略某个漏洞？**
A: 创建 `.npmrc` 文件：
```
audit-level=high
```

**Q: 如何查看漏洞详情？**
A: 访问 https://github.com/advisories/GHSA-XXXX

---

### Job 2: SonarCloud 代码质量扫描

**工具**: SonarCloud

**检查内容**:
- 代码异味 (Code Smells)
- 安全漏洞 (Vulnerabilities)
- 安全热点 (Security Hotspots)
- 代码覆盖率
- 代码重复率
- 代码复杂度

**失败条件**:
- Quality Gate: 未通过
- 新代码覆盖率 < 80%
- 新代码有 blocker/critical 问题

**查看报告**:
1. 访问 https://sonarcloud.io/project/overview?id=your-project-key
2. 查看 **Issues** 标签页
3. 按严重性排序修复

**质量门禁设置**:

```yaml
# 在 SonarCloud UI 中配置
Quality Gates → Create → Flotilla Gate

条件:
- Coverage on New Code >= 80%
- Duplicated Lines on New Code <= 3%
- Maintainability Rating on New Code >= A
- Reliability Rating on New Code >= A
- Security Rating on New Code >= A
```

**本地预扫描**:
```bash
# 安装 SonarScanner
npm install -g sonarqube-scanner

# 运行扫描
sonar-scanner \
  -Dsonar.projectKey=flotilla \
  -Dsonar.sources=. \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.login=YOUR_TOKEN
```

---

### Job 3: CodeQL 安全分析

**工具**: GitHub CodeQL (GitHub Advanced Security)

**检查内容**:
- SQL 注入
- XSS (跨站脚本)
- 路径遍历
- 命令注入
- 不安全的反序列化
- CSRF (跨站请求伪造)
- 敏感数据暴露

**查询套件**:
- `security-extended`: 扩展安全查询
- `security-and-quality`: 安全 + 质量检查

**查看报告**:
```
仓库 → Security → Code scanning alerts
```

**自定义查询**（可选）:

创建 `.github/codeql/custom-queries/sql-injection.ql`:

```ql
/**
 * @name Custom SQL Injection Detection
 * @description Detects potential SQL injection vulnerabilities
 * @kind path-problem
 * @problem.severity error
 * @security-severity 9.0
 * @id js/custom-sql-injection
 */

import javascript

from DataFlow::Node source, DataFlow::Node sink
where
  source instanceof RemoteFlowSource and
  sink instanceof SqlInjectionSink and
  DataFlow::flowPath(source, sink)
select sink, source, "Potential SQL injection from $@.", source, "user input"
```

**禁用某个规则**:

在代码中添加注释：
```typescript
// codeql[js/sql-injection] - 使用 Prisma ORM，已参数化
const result = await prisma.user.findMany({ where: { name } });
```

---

### Job 4: 秘密泄露扫描

**工具**: Gitleaks + TruffleHog

**检查内容**:
- API Keys (AWS, Azure, GCP, etc.)
- 数据库凭证
- JWT Secrets
- OAuth Tokens
- 私钥 (.pem, .key)
- 密码

**Gitleaks 配置**（可选）:

创建 `.gitleaks.toml`:

```toml
title = "Flotilla Gitleaks Config"

[allowlist]
description = "Allowlist for Flotilla"
paths = [
  '''.env.example''',
  '''.*test.*''',
  '''.*mock.*'''
]

[[rules]]
id = "generic-api-key"
description = "Generic API Key"
regex = '''(?i)(api[_-]?key|apikey)['":\s]+([a-zA-Z0-9]{32,})'''
tags = ["api", "key"]
```

**排除误报**:

在文件中添加注释：
```bash
# .env.example
API_KEY=your-api-key-here  # gitleaks:allow
```

**扫描历史提交**:
```bash
# 本地运行 Gitleaks
docker run -v $(pwd):/path zricethezav/gitleaks:latest \
  detect --source="/path" --verbose

# 扫描特定分支
gitleaks detect --source . --branch main

# 生成报告
gitleaks detect --report-path gitleaks-report.json
```

**发现泄露后的处理**:

1. **立即撤销凭证**
2. **从 Git 历史中移除**:
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/secret/file" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```
3. **更新所有环境变量**
4. **通知团队成员**

---

### Job 5: Docker 镜像扫描

**工具**: Trivy

**检查内容**:
- OS 包漏洞 (Alpine, Debian, etc.)
- 应用依赖漏洞 (package.json)
- 镜像配置问题
- 已知 CVE

**本地运行**:
```bash
# 安装 Trivy
brew install aquasecurity/trivy/trivy

# 扫描后端镜像
docker build -f apps/backend/Dockerfile -t flotilla-backend:test .
trivy image flotilla-backend:test

# 扫描前端镜像
docker build -f apps/frontend/Dockerfile -t flotilla-frontend:test .
trivy image flotilla-frontend:test

# 生成 SARIF 报告（GitHub Security 格式）
trivy image --format sarif --output trivy-results.sarif flotilla-backend:test
```

**严重性过滤**:
```bash
# 仅显示 HIGH 和 CRITICAL
trivy image --severity HIGH,CRITICAL flotilla-backend:test

# 忽略未修复的漏洞
trivy image --ignore-unfixed flotilla-backend:test
```

**修复建议**:

1. **更新基础镜像**:
```dockerfile
# Before
FROM node:20-alpine

# After (使用最新 patch 版本)
FROM node:20.11.1-alpine3.19
```

2. **多阶段构建清理**:
```dockerfile
# 确保不包含构建工具
RUN apk del build-dependencies
```

3. **最小化权限**:
```dockerfile
USER nodejs:nodejs
```

---

### Job 6: OWASP ZAP 动态扫描

**工具**: OWASP ZAP

**扫描模式**:

1. **Baseline Scan** (快速扫描，5-10 分钟):
   - 被动扫描
   - 不发送攻击载荷
   - 适合 PR 检查

2. **Full Scan** (完整扫描，30-60 分钟):
   - 主动扫描
   - 发送攻击载荷
   - 适合定时扫描（每天/每周）

**检查内容**:
- SQL 注入
- XSS
- CSRF
- 不安全的直接对象引用
- 安全配置错误
- 敏感数据暴露
- XML 外部实体 (XXE)
- 失败的访问控制

**配置规则** (`.zap/rules.tsv`):

```tsv
# 格式: <rule_id> <action> <url_pattern> <parameter> <comment>

# 忽略健康检查端点
0	IGNORE	http://localhost:4000/health	health	Health endpoint

# SQL 注入必须失败
40018	FAIL	http://localhost:4000	sql	SQL Injection

# XSS 必须失败
40012	FAIL	http://localhost:4000	xss	Cross Site Scripting
```

**查看报告**:
```bash
# 下载 ZAP 报告（GitHub Actions Artifacts）
gh run download <run-id> -n zap-scan-results

# 打开 HTML 报告
open zap-baseline-report.html
open zap-full-scan-report.html
```

**本地运行 ZAP**:

```bash
# 使用 Docker 运行 ZAP
docker run -v $(pwd):/zap/wrk:rw \
  -t owasp/zap2docker-stable \
  zap-baseline.py \
  -t http://host.docker.internal:4000 \
  -r zap-report.html

# 使用 ZAP Desktop (GUI)
# 1. 下载: https://www.zaproxy.org/download/
# 2. 启动 ZAP
# 3. Automated Scan → URL: http://localhost:4000
```

**自定义脚本扫描**:

```python
# zap-custom-scan.py
from zapv2 import ZAPv2

zap = ZAPv2(apikey='your-api-key', proxies={'http': 'http://127.0.0.1:8080'})

# 认证后扫描
zap.authentication.set_authentication_method(contextId=1, authMethodName='formBasedAuthentication')
zap.authentication.set_logged_in_indicator(contextId=1, loggedInIndicatorRegex='\\QLogout\\E')

# 开始扫描
zap.spider.scan('http://localhost:4000')
zap.ascan.scan('http://localhost:4000')

# 生成报告
with open('zap-custom-report.html', 'w') as f:
    f.write(zap.core.htmlreport())
```

---

## CI/CD 集成

### 触发条件

扫描会在以下情况自动触发：

| 事件 | 触发的扫描 |
|-----|-----------|
| **Push to main/develop** | Dependency, SonarCloud, CodeQL, Secret, Docker |
| **Pull Request** | Dependency, SonarCloud, CodeQL, Secret |
| **定时任务（每天 2am UTC）** | 所有扫描 + DAST (ZAP) |
| **手动触发** | 所有扫描 |

### GitHub Actions 工作流

```yaml
# .github/workflows/security-scanning.yml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *'  # 每天 2am UTC
  workflow_dispatch:       # 手动触发

jobs:
  dependency-scan:
    # ... 依赖扫描

  sonarcloud-scan:
    # ... SonarCloud 扫描

  codeql-analysis:
    # ... CodeQL 分析
```

### 失败处理

**扫描失败后的流程**:

1. **CI 构建失败**（如果配置为 blocking）
2. **GitHub 发送通知**（邮件 + UI）
3. **创建 Security Alert**（Security 标签页）
4. **自动分配给团队**（根据 CODEOWNERS）

**配置为非阻塞**（可选）:

```yaml
- name: Run npm audit
  run: pnpm audit
  continue-on-error: true  # 不阻塞 CI
```

**设置 Quality Gate**:

```yaml
# sonar-project.properties
sonar.qualitygate.wait=true   # 等待 Quality Gate 结果
sonar.qualitygate.timeout=300  # 超时 5 分钟
```

---

## 本地开发集成

### 预提交钩子 (Husky)

安装 Husky 和 lint-staged:

```bash
pnpm add -D husky lint-staged

# 初始化 Husky
pnpm husky init

# 创建 pre-commit 钩子
echo "pnpm lint-staged" > .husky/pre-commit
```

配置 `.lintstagedrc.json`:

```json
{
  "*.{ts,tsx,js,jsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "package.json": [
    "pnpm audit"
  ]
}
```

### VSCode 集成

安装扩展：
- **SonarLint**: 实时代码质量检查
- **GitLens**: Git 历史和安全提示
- **ESLint**: JavaScript/TypeScript linting

配置 `.vscode/settings.json`:

```json
{
  "sonarlint.connectedMode.connections.sonarcloud": [
    {
      "organizationKey": "your-org",
      "token": "${SONAR_TOKEN}"
    }
  ],
  "sonarlint.connectedMode.project": {
    "projectKey": "flotilla"
  }
}
```

### 命令行工具

```bash
# 安装全局工具
npm install -g \
  @sonarqube/scanner \
  gitleaks \
  trivy

# 快速本地扫描
./scripts/local-security-scan.sh
```

创建 `scripts/local-security-scan.sh`:

```bash
#!/bin/bash
echo "🔒 Running local security scans..."

echo "1️⃣ Dependency audit..."
pnpm audit --audit-level=high

echo "2️⃣ Secret scanning..."
gitleaks detect --source . --verbose

echo "3️⃣ ESLint security..."
pnpm lint

echo "✅ Local security scan complete!"
```

---

## 安全报告

### GitHub Security 标签页

查看所有安全警报：

```
仓库 → Security → Overview
```

**警报类型**:
- **Dependabot alerts**: 依赖漏洞
- **Code scanning alerts**: CodeQL 发现的漏洞
- **Secret scanning alerts**: 泄露的秘密

### 生成合规报告

```bash
# 生成 SOC2/ISO27001 合规报告
gh api /repos/:owner/:repo/code-scanning/alerts \
  --jq '.[] | {number, state, severity, rule}' \
  > security-compliance-report.json

# 生成 CSV 报告
gh api /repos/:owner/:repo/code-scanning/alerts \
  --jq '.[] | [.number, .state, .rule.severity, .rule.description] | @csv' \
  > security-report.csv
```

### Slack 通知集成

在 GitHub Actions 中添加 Slack 通知：

```yaml
- name: Notify Slack on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: '🚨 Security scan failed!'
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 性能优化

### 加速扫描

1. **并行运行 Jobs**（默认已配置）
2. **缓存依赖**:

```yaml
- name: Cache pnpm dependencies
  uses: actions/cache@v4
  with:
    path: ~/.pnpm-store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
```

3. **增量扫描**（SonarCloud）:

```yaml
# 仅扫描变更的代码
sonar.scm.provider=git
```

4. **跳过低优先级扫描**（非 main 分支）:

```yaml
if: github.ref == 'refs/heads/main'
```

### 成本优化

**GitHub Actions 使用时间**:

| 扫描 | 预计时间 | 成本（免费额度后） |
|-----|---------|------------------|
| Dependency Scan | 2 分钟 | $0.008 |
| SonarCloud | 5 分钟 | Free（开源） |
| CodeQL | 10 分钟 | Free（公开仓库） |
| Secret Scan | 3 分钟 | $0.012 |
| Docker Scan | 5 分钟 | $0.020 |
| DAST (ZAP) | 30 分钟 | $0.120 |
| **总计** | ~55 分钟 | ~$0.16/run |

**优化建议**:
- DAST 仅在定时任务运行（不在 PR 中）
- 使用 self-hosted runners（免费）
- 开源项目使用免费额度

---

## 故障排查

### 常见问题

**Q1: SonarCloud 扫描失败 - "Invalid token"**

A: 检查 `SONAR_TOKEN` secret 是否正确配置：
```bash
# 测试 token
curl -u YOUR_TOKEN: https://sonarcloud.io/api/authentication/validate
```

---

**Q2: CodeQL 超时**

A: 增加超时时间：
```yaml
- name: Perform CodeQL Analysis
  uses: github/codeql-action/analyze@v3
  timeout-minutes: 30  # 默认 20 分钟
```

---

**Q3: ZAP 扫描报告过多误报**

A: 调整 `.zap/rules.tsv` 规则，添加 IGNORE 或 WARN：
```tsv
10202	IGNORE	http://localhost:4000	header	Dev environment
```

---

**Q4: Trivy 扫描发现无法修复的漏洞**

A: 使用 `.trivyignore` 文件：
```
# 忽略特定 CVE
CVE-2023-12345

# 忽略特定包
pkg:npm/example-package@1.0.0
```

---

**Q5: npm audit 发现大量漏洞**

A: 分析严重性并逐步修复：
```bash
# 仅修复高危和严重漏洞
pnpm audit --fix --audit-level=high

# 查看详细路径
pnpm audit --json | jq '.advisories'
```

---

## 最佳实践

### 1. 安全扫描清单

- [ ] 每次 PR 都运行 SAST 扫描
- [ ] 每天运行完整安全扫描
- [ ] 每周运行 DAST 扫描
- [ ] Critical/High 漏洞必须在 7 天内修复
- [ ] Medium 漏洞必须在 30 天内修复
- [ ] 定期审查安全报告（每月）

### 2. 团队协作

- **分配责任**: 指定安全负责人
- **定期培训**: 每季度安全培训
- **漏洞响应流程**: 明确修复优先级
- **文档化**: 记录所有安全决策

### 3. 持续改进

- **监控趋势**: 跟踪漏洞数量变化
- **更新工具**: 保持扫描工具最新
- **优化规则**: 减少误报
- **自动化**: 自动修复低风险漏洞

---

## 相关资源

### 官方文档
- [SonarCloud Docs](https://docs.sonarcloud.io/)
- [CodeQL Docs](https://codeql.github.com/docs/)
- [OWASP ZAP Docs](https://www.zaproxy.org/docs/)
- [Trivy Docs](https://aquasecurity.github.io/trivy/)

### 安全标准
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [SANS Top 25](https://www.sans.org/top25-software-errors/)

### GitHub 资源
- [GitHub Advanced Security](https://docs.github.com/en/code-security)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)
- [Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)

---

**创建时间**: 2025-12-04
**Phase**: 4 P4.5
**维护者**: Claude (Sonnet 4.5)
**相关文件**:
- `.github/workflows/security-scanning.yml`
- `sonar-project.properties`
- `.zap/rules.tsv`
- `.github/codeql/codeql-config.yml`
- `.github/dependabot.yml`
