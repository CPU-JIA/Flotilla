# CSP Nonce Integration Guide

**Phase 4 P4.1**: CSP nonce/hash 机制，替代 `'unsafe-inline'`

## 背景

Phase 3 实施的 CSP 使用 `'unsafe-inline'` 允许所有内联脚本和样式，这降低了 XSS 防护强度。Phase 4 P4.1 引入 **nonce 机制**，只允许带有正确 nonce 值的内联脚本/样式执行。

## 什么是 Nonce？

- **Nonce** = "Number Used Once" (一次性随机数)
- 每次 HTTP 请求生成唯一的随机值
- 只有带有匹配 nonce 的内联脚本/样式才能执行
- 有效防止 XSS 攻击（攻击者无法猜测 nonce 值）

## 后端实现

### Middleware 自动生成 Nonce

`apps/backend/src/common/middleware/security-headers.middleware.ts`:

```typescript
const cspNonce = crypto.randomBytes(16).toString('base64');
res.locals.cspNonce = cspNonce;
res.setHeader('X-CSP-Nonce', cspNonce);
```

### CSP 策略

**前端路由** (非 `/api` 或 `/repo` 路由):

```
script-src 'self' 'nonce-{随机值}' 'strict-dynamic';
style-src 'self' 'nonce-{随机值}';
```

**API 路由** (`/api/*`, `/repo/*`):

```
default-src 'none';
connect-src 'self';
frame-ancestors 'none';
```

## 前端集成（Next.js）

### 方式 1: Next.js 15+ 内置支持

Next.js 15 原生支持 CSP nonce。在 `next.config.js` 中配置：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 其他配置...

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              script-src 'self' 'nonce-${process.env.__NEXT_NONCE__}' 'strict-dynamic';
              style-src 'self' 'nonce-${process.env.__NEXT_NONCE__}';
            `.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

Next.js 会自动：
- 为每个页面生成唯一 nonce
- 将 nonce 注入到 `<script>` 和 `<style>` 标签
- 处理服务端渲染 (SSR) 场景

### 方式 2: 手动注入 Nonce（自定义 Document）

如果需要更多控制，可以创建 `pages/_document.tsx`:

```typescript
import { Html, Head, Main, NextScript } from 'next/document';
import { DocumentContext } from 'next/document';

export default function Document({ nonce }: { nonce: string }) {
  return (
    <Html>
      <Head nonce={nonce}>
        {/* 内联样式需要 nonce */}
        <style nonce={nonce}>
          {`
            body { margin: 0; padding: 0; }
          `}
        </style>
      </Head>
      <body>
        <Main />
        <NextScript nonce={nonce} />
      </body>
    </Html>
  );
}

Document.getInitialProps = async (ctx: DocumentContext) => {
  const initialProps = await ctx.defaultGetInitialProps(ctx);

  // 从后端 API 获取 nonce (如果 Next.js 和 NestJS 分离部署)
  const nonce = ctx.req?.headers['x-csp-nonce'] || '';

  return {
    ...initialProps,
    nonce,
  };
};
```

### 方式 3: API 路由获取 Nonce（前后端分离）

如果前端和后端独立部署，前端可以通过 API 获取 nonce：

```typescript
// app/layout.tsx
import { headers } from 'next/headers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers();
  const nonce = headersList.get('x-csp-nonce') || '';

  return (
    <html>
      <head>
        <script nonce={nonce} src="/analytics.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## 内联脚本/样式使用 Nonce

### React 组件中的内联样式

```typescript
import { useEffect } from 'react';

export default function MyComponent({ nonce }: { nonce: string }) {
  return (
    <div>
      {/* 内联样式 */}
      <style nonce={nonce}>
        {`
          .my-class {
            color: red;
          }
        `}
      </style>

      {/* 内联脚本 */}
      <script nonce={nonce}>
        {`console.log('This script has a valid nonce');`}
      </script>

      <div className="my-class">Hello World</div>
    </div>
  );
}
```

### 动态脚本加载

使用 `'strict-dynamic'` 后，通过已信任脚本动态加载的脚本会自动被信任：

```typescript
// 已有 nonce 的脚本
<script nonce={validNonce}>
  // 这个脚本动态加载的脚本会被信任
  const script = document.createElement('script');
  script.src = 'https://cdn.example.com/library.js';
  document.head.appendChild(script);
</script>
```

## 安全优势

| 机制 | XSS 防护强度 | 攻击者能力 |
|------|-------------|-----------|
| **无 CSP** | ❌ 无防护 | 可注入任意脚本 |
| **`'unsafe-inline'`** | ⚠️ 低 | 可注入任意内联脚本 |
| **`nonce`** | ✅ 高 | 无法注入（不知道 nonce 值） |
| **`hash`** | ✅ 高 | 无法注入（无法伪造哈希） |

## 调试 CSP 违规

浏览器控制台会显示 CSP 违规：

```
Refused to execute inline script because it violates the following
Content Security Policy directive: "script-src 'self' 'nonce-abc123'".
Either the 'unsafe-inline' keyword, a hash ('sha256-...'), or a nonce ('nonce-...') is required to enable inline execution.
```

**解决方法**:
1. 为内联脚本/样式添加正确的 nonce 属性
2. 将内联代码移到外部文件
3. 检查是否有第三方库注入了内联脚本（需要更新库或配置）

## 兼容性

| 浏览器 | CSP Nonce 支持 | 'strict-dynamic' 支持 |
|--------|---------------|---------------------|
| Chrome | ✅ 40+ | ✅ 52+ |
| Firefox | ✅ 31+ | ✅ 52+ |
| Safari | ✅ 10+ | ✅ 15.4+ |
| Edge | ✅ 15+ | ✅ 79+ |

## 性能影响

- **生成 Nonce**: ~0.1ms/请求（crypto.randomBytes）
- **CSP Header 大小**: +50 字节（nonce 值 Base64）
- **浏览器解析**: 可忽略（CSP 解析器原生支持）

## Next Steps

- [ ] 更新 Next.js 配置以使用 nonce
- [ ] 测试所有内联脚本/样式是否正常工作
- [ ] 在浏览器控制台检查 CSP 违规日志
- [ ] 更新第三方库配置（如 Google Analytics）
- [ ] 生产环境部署前进行全面测试

## 相关资源

- [MDN: CSP nonce](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#nonce)
- [Next.js CSP Documentation](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Google Web.dev: CSP](https://web.dev/strict-csp/)

---

**完成时间**: 2025-12-04
**相关任务**: Phase 4 P4.1
**相关文件**: `apps/backend/src/common/middleware/security-headers.middleware.ts`
