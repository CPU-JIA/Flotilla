# Testing Guide - UI/UX Upgrade

**Version**: 1.0.0
**Last Updated**: 2025-10-21
**Status**: ✅ Test files created, ready for execution

---

## 📋 Test Coverage

已创建的E2E测试文件：

### 1. Theme Toggle Tests (`tests/theme/theme-toggle.spec.ts`)
- ✅ Light/Dark模式切换
- ✅ 主题持久化（localStorage）
- ✅ 按钮图标更新
- ✅ Mantine组件主题同步
- ✅ 切换动画流畅性
- ✅ 键盘访问性
- ✅ ThemeSelector组件功能

### 2. Language Toggle Tests (`tests/language/language-toggle.spec.ts`)
- ✅ 中文/英文切换
- ✅ 语言持久化（localStorage）
- ✅ 全局UI文字更新
- ✅ 按钮标签更新
- ✅ 语言缩写显示
- ✅ 键盘访问性
- ✅ LanguageSelector组件功能

---

## 🚀 如何运行测试

### 前置条件

1. **启动后端服务**：
```bash
cd apps/backend
pnpm start:dev
```

2. **启动前端服务**：
```bash
cd apps/frontend
pnpm dev
```

3. **确保数据库运行**：
```bash
docker-compose up -d
```

### 运行所有新增测试

```bash
cd apps/frontend

# 运行主题切换测试
pnpm exec playwright test tests/theme/theme-toggle.spec.ts

# 运行语言切换测试
pnpm exec playwright test tests/language/language-toggle.spec.ts

# 运行所有UI/UX相关测试
pnpm exec playwright test tests/theme tests/language
```

### 调试模式

```bash
# 带UI界面的调试模式
pnpm exec playwright test tests/theme/theme-toggle.spec.ts --debug

# Headed模式（看到浏览器）
pnpm exec playwright test tests/theme/theme-toggle.spec.ts --headed

# 单个测试用例
pnpm exec playwright test tests/theme/theme-toggle.spec.ts -g "should toggle between light and dark mode"
```

### 查看测试报告

```bash
# 生成HTML报告
pnpm exec playwright test --reporter=html

# 打开报告
pnpm exec playwright show-report
```

---

## ✅ 验收标准

### 功能完整性
- [ ] 主题切换无闪烁，动画流畅（<200ms）
- [ ] 语言切换立即生效，所有文字更新
- [ ] 刷新页面后主题和语言保持
- [ ] Mantine组件与Tailwind主题同步
- [ ] 所有交互组件支持键盘访问

### 性能指标
- [ ] 主题切换延迟 < 50ms
- [ ] CSS包体积增量 < 15KB
- [ ] 首屏加载时间无明显增加
- [ ] Lighthouse Performance Score ≥ 90

### 视觉质量
- [ ] 深色模式无刺眼元素
- [ ] 颜色对比度符合WCAG 2.1 AA标准
- [ ] 所有组件在两种主题下都美观
- [ ] 响应式设计在移动/平板/桌面都正常

### 代码质量
- [ ] TypeScript类型完整，无any
- [ ] ESLint无错误，无警告
- [ ] Prettier格式化通过
- [ ] 组件有清晰的JSDoc注释

---

## 🔍 手动测试检查清单

### 主题切换
- [ ] 点击主题切换按钮，页面主题立即改变
- [ ] 切换后图标更新正确（太阳 ↔ 月亮）
- [ ] 所有页面元素颜色正确更新
- [ ] Mantine组件（DataTable、Notifications）主题同步
- [ ] 刷新页面后主题保持
- [ ] 在/design-system页面测试ThemeSelector

### 语言切换
- [ ] 点击语言切换按钮，所有文字立即更新
- [ ] 导航栏、按钮、标签等全部切换
- [ ] 切换后按钮文字更新（中文 ↔ English）
- [ ] 刷新页面后语言保持
- [ ] 在/design-system页面测试LanguageSelector

### 组件展示页面 (/design-system)
- [ ] 5个标签页都能正常切换
- [ ] 色彩系统展示正确
- [ ] 字体排版清晰可读
- [ ] 所有组件示例可交互
- [ ] DataTable分页功能正常
- [ ] Notifications通知可以触发

### 响应式测试
- [ ] 手机尺寸（375px）布局正常
- [ ] 平板尺寸（768px）布局正常
- [ ] 桌面尺寸（1920px）布局正常
- [ ] 组件在不同尺寸下不溢出

---

## 📊 性能测试命令

### CSS包体积检查

```bash
cd apps/frontend

# 构建生产版本
pnpm build

# 检查CSS文件大小
ls -lh .next/static/css/

# 目标: 单个CSS文件 < 50KB (gzipped < 15KB)
```

### Lighthouse性能测试

```bash
# 安装lighthouse (如果未安装)
npm install -g @lhci/cli

# 运行Lighthouse
lhci autorun --url=http://localhost:3000/dashboard
lhci autorun --url=http://localhost:3000/design-system

# 目标:
# - Performance: ≥ 90
# - Accessibility: ≥ 95
# - Best Practices: ≥ 90
```

### 主题切换性能测试

在浏览器DevTools中：
1. 打开Performance面板
2. 开始录制
3. 点击主题切换按钮
4. 停止录制
5. 检查: 总耗时应 < 50ms，无layout shift

---

## 🐛 常见问题排查

### 主题切换不生效
```bash
# 检查localStorage
localStorage.getItem('theme')

# 清除缓存重试
localStorage.clear()
location.reload()
```

### Mantine主题不同步
```bash
# 确认useMantineThemeSync被调用
# 检查AppLayout.tsx中是否有:
useMantineThemeSync()
```

### 语言切换无响应
```bash
# 检查localStorage
localStorage.getItem('flotilla-language')

# 确认translation文件存在
ls apps/frontend/src/locales/
```

### 测试失败
```bash
# 清理test-results
rm -rf apps/frontend/test-results

# 更新Playwright浏览器
pnpm exec playwright install

# 重新运行
pnpm exec playwright test --workers=1
```

---

## 📝 测试报告模板

测试完成后，请填写以下报告：

```markdown
## UI/UX Upgrade Test Report

**Date**: YYYY-MM-DD
**Tester**: [Your Name]
**Environment**: Development / Staging / Production

### Test Results

#### E2E Tests
- Theme Toggle: ✅ / ❌
- Language Toggle: ✅ / ❌

#### Performance
- CSS Bundle Size: [X]KB (Target: <15KB)
- Theme Switch Latency: [X]ms (Target: <50ms)
- Lighthouse Score: [X]/100 (Target: ≥90)

#### Visual Quality
- Dark Mode: ✅ / ❌
- Light Mode: ✅ / ❌
- Responsive Design: ✅ / ❌

#### Issues Found
1. [Issue description]
2. [Issue description]

#### Screenshots
- [Attach screenshots if needed]

### Conclusion
✅ Ready for Production / ❌ Needs Fixes
```

---

**下一步行动**：

1. 启动服务器（backend + frontend）
2. 运行E2E测试套件
3. 执行性能测试
4. 完成手动测试检查清单
5. 填写测试报告
6. 如有问题，修复后重新测试

**Document Version**: 1.0.0
**Status**: 📄 Documentation Complete - Ready for Testing
