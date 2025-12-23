# 双因素认证 (2FA/TOTP) 实现说明

## 概述

本模块基于 TOTP (Time-based One-Time Password) 标准实现了双因素认证功能，支持 Google Authenticator、Authy 等 TOTP 应用。

## 核心功能

1. **TOTP 密钥生成**: 生成符合标准的 Base32 编码密钥
2. **二维码生成**: 生成 QR 码供用户扫描
3. **验证码验证**: 支持 6 位数字验证码（±2 个时间窗口容错）
4. **恢复码**: 生成 8 个备用恢复码（一次性使用）
5. **加密存储**: 使用 AES-256-GCM 加密存储密钥和恢复码

## API 端点

### 1. 生成 2FA 密钥和二维码
```
POST /api/v1/auth/2fa/setup
Authorization: Bearer <token>

Response:
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,..."
}
```

### 2. 启用 2FA
```
POST /api/v1/auth/2fa/enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "secret": "JBSWY3DPEHPK3PXP",
  "token": "123456"
}

Response:
{
  "message": "2FA enabled successfully...",
  "recoveryCodes": [
    "1234-5678-9ABC-DEF0",
    "2345-6789-ABCD-EF01",
    ...
  ]
}
```

### 3. 验证 2FA 令牌
```
POST /api/v1/auth/2fa/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}

Response:
{
  "message": "Token verified successfully",
  "verified": true
}
```

### 4. 禁用 2FA
```
DELETE /api/v1/auth/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}

Response:
{
  "message": "2FA disabled successfully"
}
```

### 5. 获取恢复码
```
POST /api/v1/auth/2fa/recovery-codes
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}

Response:
{
  "recoveryCodes": ["...", "..."]
}
```

### 6. 检查 2FA 状态
```
GET /api/v1/auth/2fa/status
Authorization: Bearer <token>

Response:
{
  "enabled": true
}
```

## 登录流程（集成 2FA）

### 方案 A: 两步验证（推荐）

1. **首次登录请求**:
```
POST /api/v1/auth/login
{
  "usernameOrEmail": "user@example.com",
  "password": "password"
}

Response (如果启用了 2FA):
{
  "requiresTwoFactor": true,
  "pendingToken": "abc123...",
  "message": "Two-factor authentication required"
}
```

2. **完成 2FA 验证**:
```
POST /api/v1/auth/login/2fa
{
  "pendingToken": "abc123...",
  "token": "123456"
}

Response:
{
  "user": { ... }
}
// Token 存储在 HttpOnly Cookie 中
```

### 方案 B: 单次登录（可选）

在 `LoginDto` 中添加可选的 `twoFactorToken` 字段：
```
POST /api/v1/auth/login
{
  "usernameOrEmail": "user@example.com",
  "password": "password",
  "twoFactorToken": "123456"  // 可选
}
```

## 环境配置

在 `.env` 文件中添加加密密钥：

```bash
# 生成加密密钥
openssl rand -base64 32

# 添加到 .env
TWO_FACTOR_ENCRYPTION_KEY="your-32-chars-encryption-key"
```

**重要警告**:
- 加密密钥至少 32 个字符
- **永远不要修改**此密钥，否则用户将无法访问已启用的 2FA
- 使用强随机密钥，不要使用弱密码

## 数据库 Migration

运行以下命令应用数据库变更：

```bash
cd apps/backend
pnpm prisma migrate dev
```

## 安全特性

1. **加密存储**: TOTP 密钥和恢复码使用 AES-256-GCM 加密
2. **一次性恢复码**: 每个恢复码仅可使用一次
3. **时间窗口容错**: 支持 ±2 个时间窗口（约 60 秒容错）
4. **防止暴力破解**: 结合现有的登录限流机制
5. **验证码格式检查**: 仅接受 6 位数字格式

## 前端集成示例

### React 组件示例

```tsx
// 1. 设置 2FA
const setup2FA = async () => {
  const response = await api.post('/auth/2fa/setup')
  setSecret(response.data.secret)
  setQrCode(response.data.qrCode)
}

// 2. 启用 2FA
const enable2FA = async (token: string) => {
  const response = await api.post('/auth/2fa/enable', {
    secret,
    token
  })
  setRecoveryCodes(response.data.recoveryCodes)
  alert('Please save your recovery codes!')
}

// 3. 登录时的 2FA 验证
const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', {
    usernameOrEmail: username,
    password
  })

  if (response.data.requiresTwoFactor) {
    // 显示 2FA 输入框
    const token = prompt('Enter 2FA code:')
    await api.post('/auth/login/2fa', {
      pendingToken: response.data.pendingToken,
      token
    })
  }
}
```

## 测试

运行单元测试：

```bash
cd apps/backend
pnpm test two-factor.service.spec.ts
```

## TODO

后续需要实现：

1. **前端页面** (`apps/frontend/src/app/settings/security/`):
   - 2FA 设置页面
   - 二维码显示组件
   - 验证码输入组件
   - 恢复码显示和下载

2. **AuthController 集成**:
   - 在 `auth.controller.ts` 中注入 `TwoFactorService`
   - 修改 `login` 方法检查 2FA 状态
   - 添加 `POST /auth/login/2fa` 端点
   - 参考 `auth-controller-2fa-patch.ts` 文件

3. **增强功能**:
   - 2FA 使用统计
   - 异常登录警报
   - 备份码重新生成
   - 支持硬件密钥（FIDO2/WebAuthn）

## 参考资料

- [RFC 6238 - TOTP: Time-Based One-Time Password Algorithm](https://tools.ietf.org/html/rfc6238)
- [Google Authenticator 规范](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)
- [speakeasy 库文档](https://github.com/speakeasyjs/speakeasy)
