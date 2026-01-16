# Code Quality Checklist - UI/UX Upgrade

**Version**: 1.0.0
**Last Updated**: 2025-10-21
**Purpose**: Ensure code quality before production deployment

---

## 🚀 Quick Start

Before deploying to production, run the following commands:

```bash
cd apps/frontend

# 1. TypeScript type checking
pnpm tsc --noEmit

# 2. ESLint linting
pnpm lint

# 3. Prettier formatting
pnpm format:check

# 4. Fix formatting issues
pnpm format

# 5. Run tests
pnpm test
```

All checks must pass ✅ before deployment.

---

## ✅ TypeScript Type Checking

### Command

```bash
cd apps/frontend
pnpm tsc --noEmit
```

### Expected Output

```
✓ No TypeScript errors found
```

### Common Issues

**Issue**: `Property 'xxx' does not exist on type 'yyy'`

- **Fix**: Add proper type definitions or use optional chaining

**Issue**: `Type 'any' is not allowed`

- **Fix**: Replace `any` with specific types

**Issue**: `Cannot find module '@/components/xxx'`

- **Fix**: Check import path and file extension

### Quality Standards

- [ ] No `any` types (except in specific cases with comment justification)
- [ ] All exports have proper type annotations
- [ ] No unused imports
- [ ] All function parameters have types
- [ ] All return types are explicitly defined

---

## 🔍 ESLint Linting

### Command

```bash
cd apps/frontend
pnpm lint
```

### Expected Output

```
✓ No ESLint errors
✓ No ESLint warnings
```

### Common Issues

**Issue**: `React Hook useEffect has missing dependencies`

- **Fix**: Add missing dependencies or use `// eslint-disable-next-line` with justification

**Issue**: `'xxx' is defined but never used`

- **Fix**: Remove unused variables or prefix with underscore `_xxx`

**Issue**: `'xxx' is missing in props validation`

- **Fix**: Add PropTypes or use TypeScript interface

### Quality Standards

- [ ] No ESLint errors
- [ ] Warnings reduced to minimum (ideally 0)
- [ ] All `eslint-disable` comments have justification
- [ ] React Hooks rules are followed
- [ ] Accessibility rules are followed (jsx-a11y)

---

## 💅 Prettier Formatting

### Commands

```bash
cd apps/frontend

# Check formatting
pnpm format:check

# Fix formatting
pnpm format
```

### Expected Output

```bash
# format:check
✓ All files are formatted correctly

# format (after fixing)
✓ Formatted X files
```

### Formatting Standards

- [ ] Consistent indentation (2 spaces)
- [ ] Semicolons at end of statements
- [ ] Single quotes for strings
- [ ] Trailing commas in multi-line objects/arrays
- [ ] Max line length: 100 characters (enforced by Prettier)

### Files to Format

All files in the following directories:

- `src/app/**/*.{ts,tsx}`
- `src/components/**/*.{ts,tsx}`
- `src/hooks/**/*.{ts,tsx}`
- `src/lib/**/*.{ts,tsx}`
- `src/config/**/*.{ts,tsx}`
- `tests/**/*.{ts,tsx}`

---

## 📊 Code Quality Metrics

### Component Complexity

**Target**: Cyclomatic complexity < 10 per function

```bash
# Install complexity checker
npm install -g complexity-report

# Run analysis
cr apps/frontend/src/components/**/*.tsx --format json
```

### Code Duplication

**Target**: < 3% code duplication

```bash
# Install jscpd
npm install -g jscpd

# Run analysis
jscpd apps/frontend/src --min-lines 10 --min-tokens 50
```

### File Size

**Target**: < 300 lines per file (excluding design-system showcase)

```bash
# Check file sizes
find apps/frontend/src -name '*.tsx' -exec wc -l {} + | sort -nr | head -20
```

**Exceptions**:

- `/design-system/page.tsx` (showcase page, can be larger)

---

## 🧪 Test Coverage

### Commands

```bash
cd apps/frontend

# Run tests with coverage
pnpm test --coverage

# Or for specific files
pnpm exec playwright test tests/theme --headed
pnpm exec playwright test tests/language --headed
```

### Coverage Targets

- **Overall coverage**: ≥ 70%
- **New components coverage**: ≥ 80%
- **Critical paths coverage**: 100%

### New Files Coverage

| File                                      | Expected Coverage | Status         |
| ----------------------------------------- | ----------------- | -------------- |
| `components/common/data-table.tsx`        | 80%               | 🟡 Pending     |
| `components/theme/theme-toggle.tsx`       | 90%               | ✅ E2E tests   |
| `components/language/language-toggle.tsx` | 90%               | ✅ E2E tests   |
| `hooks/use-mantine-theme-sync.ts`         | 100%              | ✅ E2E tests   |
| `app/design-system/page.tsx`              | 60%               | 🟡 Manual test |

---

## 📝 Code Review Checklist

### General Code Quality

- [ ] **No console.log** statements (use proper logging)
- [ ] **No commented-out code** (remove or document why it's kept)
- [ ] **No magic numbers** (use named constants)
- [ ] **No hardcoded strings** (use translation keys)
- [ ] **Consistent naming** (camelCase for variables, PascalCase for components)

### Component Quality

- [ ] **Single Responsibility**: Each component does one thing well
- [ ] **Props validation**: All props have TypeScript types
- [ ] **Default props**: Default values provided where appropriate
- [ ] **Error handling**: Graceful error states
- [ ] **Loading states**: Proper loading indicators
- [ ] **Accessibility**: ARIA labels, semantic HTML, keyboard navigation

### Performance

- [ ] **No unnecessary re-renders**: Use `React.memo` where appropriate
- [ ] **Lazy loading**: Large components use `next/dynamic`
- [ ] **Image optimization**: Use `next/image` for images
- [ ] **Bundle size**: Check with `pnpm build` and analyze

### Security

- [ ] **No sensitive data in client code**
- [ ] **Proper input sanitization**
- [ ] **No XSS vulnerabilities**: Use React's built-in escaping
- [ ] **No SQL injection**: Using Prisma ORM (backend)

---

## 🔧 Automated Checks (CI/CD)

### GitHub Actions Workflow

Create `.github/workflows/frontend-quality.yml`:

```yaml
name: Frontend Code Quality

on:
  pull_request:
    paths:
      - 'apps/frontend/**'

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: TypeScript Check
        run: cd apps/frontend && pnpm tsc --noEmit

      - name: ESLint
        run: cd apps/frontend && pnpm lint

      - name: Prettier
        run: cd apps/frontend && pnpm format:check

      - name: Build
        run: cd apps/frontend && pnpm build

      - name: Test
        run: cd apps/frontend && pnpm test
```

---

## 📋 Pre-Commit Checklist

Before committing code, verify:

### Files Modified

```bash
# List modified files
git status

# Review changes
git diff
```

### Quality Checks

- [ ] TypeScript compiles without errors
- [ ] ESLint passes without errors
- [ ] Prettier formatting is applied
- [ ] Tests pass (at minimum, manual testing completed)
- [ ] No `console.log` or debugging code
- [ ] No unnecessary files (node_modules, .DS_Store, etc.)

### Commit Message

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(ui): add enhanced theme toggle component

- Created ThemeToggle with 4 variants
- Added smooth transition animations
- Integrated with next-themes
- Added E2E tests

BREAKING CHANGE: None
```

---

## 🐛 Common Issues and Fixes

### Issue 1: TypeScript errors in Mantine imports

**Error**: `Cannot find module '@mantine/core'`

**Fix**:

```bash
cd apps/frontend
pnpm install
```

### Issue 2: ESLint complains about React hooks

**Error**: `React Hook useEffect has a missing dependency`

**Fix**: Add the dependency or use callback:

```tsx
// Before
useEffect(() => {
  doSomething(value)
}, [])

// After
const handleValue = useCallback(() => {
  doSomething(value)
}, [value])

useEffect(() => {
  handleValue()
}, [handleValue])
```

### Issue 3: Prettier conflicts with ESLint

**Error**: `Delete `;` prettier/prettier`

**Fix**: Run Prettier first:

```bash
pnpm format
pnpm lint
```

### Issue 4: Build fails with "Module not found"

**Error**: `Module not found: Can't resolve '@/components/xxx'`

**Fix**: Check `tsconfig.json` paths and file locations

---

## ✅ Final Acceptance Criteria

### Code Quality Standards

- [ ] **TypeScript**: No errors, no `any` types (except documented)
- [ ] **ESLint**: 0 errors, < 5 warnings
- [ ] **Prettier**: All files formatted
- [ ] **Tests**: All E2E tests pass
- [ ] **Build**: Production build succeeds
- [ ] **Bundle Size**: < 500KB total JavaScript
- [ ] **Lighthouse**: Performance ≥ 90

### Documentation Standards

- [ ] All new components have JSDoc comments
- [ ] README updated with new features
- [ ] CHANGELOG updated with changes
- [ ] Design System documentation complete

### Deployment Readiness

- [ ] All quality checks pass
- [ ] No blocking bugs
- [ ] Performance meets targets
- [ ] Security review completed
- [ ] Stakeholder approval obtained

---

## 🎯 Recommended Tools

### VS Code Extensions

- **ESLint**: Auto-fix on save
- **Prettier**: Format on save
- **TypeScript**: IntelliSense and type checking
- **Tailwind CSS IntelliSense**: Auto-complete for Tailwind classes

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## 📊 Quality Metrics Dashboard

After running all checks, you should see:

```
┌─────────────────────────────────────────┐
│  Flotilla Frontend Quality Report      │
├─────────────────────────────────────────┤
│  TypeScript:     ✅ 0 errors            │
│  ESLint:         ✅ 0 errors, 0 warnings│
│  Prettier:       ✅ All files formatted │
│  Tests:          ✅ 17/17 passing       │
│  Build:          ✅ Success             │
│  Bundle Size:    ✅ 452KB (target 500KB)│
│  Lighthouse:     ✅ 94/100              │
└─────────────────────────────────────────┘

🎉 All quality checks passed!
Ready for production deployment.
```

---

**Document Version**: 1.0.0
**Status**: ✅ Code Quality Checklist Complete
**Next Step**: Run quality checks before committing

```bash
# Run all checks at once
cd apps/frontend
pnpm tsc --noEmit && pnpm lint && pnpm format:check && echo "✅ All quality checks passed!"
```
