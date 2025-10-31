# SMTP邮件服务配置指南

> **文档版本**: v1.0.0
> **更新日期**: 2025-10-31
> **适用范围**: Flotilla Backend邮件功能配置

---

## 📖 概述

Flotilla使用SMTP协议发送系统邮件，包括：
- 忘记密码重置邮件
- 邮箱验证邮件
- 通知提醒邮件

本文档提供三种SMTP配置方案：
1. **Brevo SMTP**（推荐用于生产环境）
2. **Gmail SMTP**（适合个人开发测试）
3. **自托管SMTP服务器**（适合企业内部部署）

---

## ⚙️ 环境变量配置

所有SMTP配置通过环境变量注入，编辑 `apps/backend/.env` 文件：

```bash
# SMTP基础配置
SMTP_HOST=smtp-relay.brevo.com    # SMTP服务器地址
SMTP_PORT=587                      # SMTP端口（587=STARTTLS, 465=SSL）
SMTP_USER=your-smtp-username       # SMTP用户名
SMTP_PASS=your-smtp-password       # SMTP密码

# 发件人信息
SMTP_FROM_EMAIL=noreply@example.com  # 发件人邮箱地址
SMTP_FROM_NAME=Flotilla Team         # 发件人显示名称
```

### 🔒 端口与安全模式

系统会根据端口号**自动检测**安全模式（无需配置`SMTP_SECURE`）：

| 端口 | 安全模式 | 说明 |
|------|---------|------|
| **587** | STARTTLS | 显式TLS加密（推荐） |
| **465** | SSL/TLS | 隐式SSL加密（旧标准） |
| **25** | 无加密 | 明文传输（不推荐） |

**实现位置**：`apps/backend/src/email/email.module.ts:26-28`

```typescript
const port = configService.get<number>('SMTP_PORT') || 587;
const secure = port === 465; // 465端口使用SSL，其他端口使用STARTTLS
```

---

## 📦 方案一：Brevo SMTP（推荐）

### 特点
✅ 免费额度：每日300封邮件
✅ 高送达率：企业级邮件服务
✅ 简单配置：无需域名验证（测试环境）
✅ 统计报表：邮件发送追踪

### 配置步骤

#### 1. 注册Brevo账号
访问 [https://www.brevo.com/](https://www.brevo.com/) 并注册免费账号。

#### 2. 获取SMTP凭据
1. 登录Brevo控制台
2. 导航到：**Settings → SMTP & API → SMTP**
3. 复制以下信息：
   - **SMTP Server**: `smtp-relay.brevo.com`
   - **Port**: `587`
   - **Login**: 类似 `9a610b001@smtp-brevo.com`
   - **Master Password**: 生成新的SMTP密钥

#### 3. 配置环境变量
编辑 `apps/backend/.env`：

```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=9a610b001@smtp-brevo.com  # 替换为你的Login
SMTP_PASS=xsmtpsib-********************************  # 替换为你的Master Password
SMTP_FROM_EMAIL=your-email@gmail.com  # 可以使用任何邮箱（未验证域名时）
SMTP_FROM_NAME=Flotilla Team
```

#### 4. 域名验证（生产环境推荐）

**为什么需要验证？**
- 未验证域名：可以发送邮件，但会显示"via brevo.com"
- 已验证域名：直接使用你的域名发送，提升信任度

**验证步骤**：
1. Brevo控制台 → **Senders & Domains**
2. 添加你的域名（如 `flotilla.com`）
3. 添加以下DNS记录到域名服务商：

```dns
# SPF记录（TXT类型）
@ TXT "v=spf1 include:spf.brevo.com ~all"

# DKIM记录（TXT类型）
mail._domainkey TXT "v=DKIM1; k=rsa; p=MIGfMA0GCS..." # Brevo提供的公钥

# DMARC记录（TXT类型，可选）
_dmarc TXT "v=DMARC1; p=none; rua=mailto:dmarc@flotilla.com"
```

4. 等待DNS生效（最多48小时）
5. 在Brevo控制台点击"Verify"按钮

---

## 📧 方案二：Gmail SMTP（开发测试）

### 特点
✅ 免费使用
✅ 稳定可靠
⚠️ 每日限额：500封邮件
⚠️ 需要应用专用密码

### 配置步骤

#### 1. 启用两步验证
1. 访问 [Google账号安全设置](https://myaccount.google.com/security)
2. 启用"两步验证"

#### 2. 生成应用专用密码
1. 访问 [应用专用密码页面](https://myaccount.google.com/apppasswords)
2. 选择"邮件"和"其他（自定义名称）"
3. 输入"Flotilla SMTP"
4. 复制生成的16位密码（**注意**：无空格）

#### 3. 配置环境变量
编辑 `apps/backend/.env`：

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com     # 你的Gmail地址
SMTP_PASS=abcd efgh ijkl mnop      # 应用专用密码（16位）
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Flotilla Team
```

### ⚠️ 注意事项
- Gmail会在发件人中显示你的真实邮箱地址
- 可能触发"不够安全的应用"警告（使用应用密码可避免）
- 不推荐用于生产环境（发送限额低）

---

## 🏢 方案三：自托管SMTP服务器

### 方案对比

| 方案 | 适用场景 | 复杂度 | 成本 |
|------|---------|--------|------|
| **Postfix** | Linux服务器 | ⭐⭐⭐ | 免费 |
| **hMailServer** | Windows服务器 | ⭐⭐ | 免费 |
| **MailHog** | 开发测试 | ⭐ | 免费 |

### 方案A：Postfix（Ubuntu/Debian）

#### 安装Postfix
```bash
sudo apt update
sudo apt install postfix mailutils -y
```

安装过程中选择：
- **General type**: Internet Site
- **System mail name**: your-domain.com

#### 配置Postfix
编辑 `/etc/postfix/main.cf`：

```conf
# 基础配置
myhostname = mail.your-domain.com
mydomain = your-domain.com
myorigin = $mydomain

# 网络配置
inet_interfaces = all
inet_protocols = ipv4

# 邮件转发
relayhost =
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain

# 安全配置（可选：启用SASL认证）
smtpd_sasl_auth_enable = yes
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_security_options = noanonymous
smtpd_tls_security_level = may
```

#### 启动服务
```bash
sudo systemctl restart postfix
sudo systemctl enable postfix

# 检查服务状态
sudo systemctl status postfix
```

#### 配置环境变量
```bash
SMTP_HOST=localhost     # 或服务器IP
SMTP_PORT=25            # Postfix默认端口
SMTP_USER=              # 如果配置了SASL认证则填写
SMTP_PASS=              # 如果配置了SASL认证则填写
SMTP_FROM_EMAIL=noreply@your-domain.com
SMTP_FROM_NAME=Flotilla Team
```

#### DNS配置（必需）
添加以下DNS记录以提高送达率：

```dns
# MX记录（邮件服务器）
@ MX 10 mail.your-domain.com

# A记录（邮件服务器IP）
mail A 123.45.67.89

# SPF记录（防止伪造）
@ TXT "v=spf1 mx ~all"

# 反向DNS（PTR记录，联系ISP配置）
89.67.45.123.in-addr.arpa PTR mail.your-domain.com
```

### 方案B：MailHog（开发环境推荐）

**特点**：本地邮件捕获工具，所有邮件不真实发送，仅供测试查看。

#### Docker快速启动
```bash
docker run -d \
  --name mailhog \
  -p 1025:1025 \
  -p 8025:8025 \
  mailhog/mailhog
```

#### 配置环境变量
```bash
SMTP_HOST=localhost
SMTP_PORT=1025          # MailHog SMTP端口
SMTP_USER=              # 留空
SMTP_PASS=              # 留空
SMTP_FROM_EMAIL=test@flotilla.local
SMTP_FROM_NAME=Flotilla Dev
```

#### 查看邮件
访问 [http://localhost:8025](http://localhost:8025) 查看所有捕获的邮件。

---

## 🧪 测试SMTP配置

### 方法1：使用Backend API测试

启动Backend服务：
```bash
cd apps/backend
pnpm start:dev
```

发送测试邮件：
```bash
curl -X POST http://localhost:4000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### 方法2：运行单元测试

执行EmailService单元测试：
```bash
cd apps/backend
pnpm test -- email.service.spec.ts
```

### 方法3：运行E2E测试

执行前端E2E测试（自动测试邮件发送流程）：
```bash
cd apps/frontend
pnpm exec playwright test tests/auth/email-verification.spec.ts
```

### 方法3：手动测试SMTP连接

使用`swaks`工具手动测试（Linux/Mac）：
```bash
# 安装swaks
sudo apt install swaks  # Ubuntu/Debian
brew install swaks      # macOS

# 测试SMTP连接
swaks \
  --to recipient@example.com \
  --from sender@example.com \
  --server smtp-relay.brevo.com \
  --port 587 \
  --auth LOGIN \
  --auth-user 9a610b001@smtp-brevo.com \
  --auth-password "your-smtp-password" \
  --tls
```

---

## 🛠️ 故障排查

### 问题1：连接超时（Connection timeout）

**症状**：
```
Error: Connection timeout
```

**可能原因**：
1. SMTP_HOST 或 SMTP_PORT 配置错误
2. 防火墙阻止出站连接（端口587/465）
3. VPS提供商限制SMTP端口

**解决方案**：
```bash
# 测试端口连通性
telnet smtp-relay.brevo.com 587

# 如果无法连接，尝试使用VPN或联系VPS提供商
```

### 问题2：SSL/TLS握手失败

**症状**：
```
F0670000:error:0A00010B:SSL routines:tls_validate_record_header:wrong version number
```

**原因**：端口587使用了SSL模式（应该使用STARTTLS）

**解决方案**：
检查 `email.module.ts` 确保端口587的`secure`为`false`：
```typescript
const port = 587;
const secure = port === 465; // false for 587
```

### 问题3：认证失败（Authentication failed）

**症状**：
```
Error: Invalid login: 535 Authentication failed
```

**可能原因**：
1. SMTP_USER 或 SMTP_PASS 错误
2. 密码包含特殊字符未正确转义
3. Gmail未开启两步验证或应用密码

**解决方案**：
```bash
# 验证凭据正确性
echo $SMTP_USER
echo $SMTP_PASS

# 如果密码包含特殊字符，使用引号包裹
SMTP_PASS="your-password-with-special@chars"
```

### 问题4：邮件被标记为垃圾邮件

**原因**：
1. 未配置SPF/DKIM/DMARC记录
2. 发件人域名信誉度低
3. 邮件内容触发垃圾邮件过滤器

**解决方案**：
1. 配置DNS记录（见上文Brevo域名验证）
2. 使用专业SMTP服务（如Brevo）
3. 检查邮件模板内容，避免垃圾邮件关键词

### 问题5：Backend日志显示配置错误

**查看日志**：
```bash
cd apps/backend
pnpm start:dev | grep EmailModule
```

**预期输出**：
```
[EmailModule] SMTP Configuration: host=smtp-relay.brevo.com, port=587, secure=false
```

**异常情况**：
- `host=undefined`：SMTP_HOST未配置
- `port=25`：SMTP_PORT未配置（默认25端口）
- `secure=true`（当port=587时）：端口检测逻辑错误

---

## 📊 性能与限额

### 各服务商发送限额

| 服务商 | 免费额度 | 付费方案 | 月成本 |
|--------|---------|---------|--------|
| **Brevo** | 300封/天 | 20,000封/月 | $25 |
| **SendGrid** | 100封/天 | 100,000封/月 | $19.95 |
| **Mailgun** | 5,000封/月 | 50,000封/月 | $35 |
| **Gmail** | 500封/天 | N/A | 免费 |
| **自托管** | 无限制* | N/A | 服务器成本 |

*自托管需考虑服务器带宽和IP信誉度

### 性能优化建议

1. **异步发送**：已实现（EmailService使用async/await）
2. **批量发送**：如需批量邮件，使用队列（Redis + Bull）
3. **失败重试**：Nodemailer自动重试3次
4. **模板缓存**：Handlebars模板已编译缓存

---

## 🔐 安全最佳实践

### 1. 保护SMTP凭据
```bash
# ❌ 不要硬编码密码
const password = 'my-smtp-password';

# ✅ 使用环境变量
const password = process.env.SMTP_PASS;
```

### 2. 限制发件人地址
```typescript
// 在AuthService中验证邮箱域名
if (!email.endsWith('@your-domain.com')) {
  throw new BadRequestException('Invalid email domain');
}
```

### 3. 防止邮件滥用
- 实现发送频率限制（Rate Limiting）
- 记录所有发送日志
- 监控异常发送行为

### 4. 加密传输
- 始终使用TLS/SSL（端口587或465）
- 不要使用明文端口25（除非内网）

---

## 📚 参考资源

### 官方文档
- [Brevo SMTP文档](https://developers.brevo.com/docs/send-emails-through-smtp)
- [Gmail SMTP设置](https://support.google.com/mail/answer/7126229)
- [Postfix官方文档](http://www.postfix.org/documentation.html)
- [Nodemailer文档](https://nodemailer.com/about/)

### 代码位置
- **SMTP配置**：`apps/backend/src/email/email.module.ts`
- **邮件服务**：`apps/backend/src/email/email.service.ts`
- **SMTP提供商**：`apps/backend/src/email/providers/smtp.provider.ts`
- **邮件模板**：`apps/backend/src/email/templates/`

### 测试文件
- **单元测试**：`apps/backend/src/email/email.service.spec.ts`
- **E2E测试**：`apps/frontend/tests/auth/email-verification.spec.ts`

---

## 🆘 获取帮助

遇到问题？请按以下步骤操作：

1. **检查Backend日志**：查看`[EmailModule]`相关输出
2. **运行测试**：`pnpm test -- email.service.spec.ts`
3. **查看本文档**：特别是"故障排查"章节
4. **提交Issue**：[GitHub Issues](https://github.com/flotilla/flotilla/issues)

---

**文档维护者**：Flotilla团队
**最后更新**：2025-10-31
**版权声明**：MIT License
