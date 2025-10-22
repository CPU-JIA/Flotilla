import { TestTube, CheckCircle, Play, FileCode, ArrowRight } from 'lucide-react'
import { CodeBlock } from '@/components/ui/code-block'
import Link from 'next/link'

export const metadata = {
  title: 'Testing Guide - Flotilla Documentation',
  description: 'Learn how to test Flotilla with Playwright E2E tests, Jest unit tests, and CI/CD integration.',
}

export default function TestingPage() {
  const playwrightExample = `// Playwright E2E Test Example
import { test, expect } from '@playwright/test'

test.describe('Organization CRUD', () => {
  test('should create new organization', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Navigate to create organization
    await page.goto('http://localhost:3000/organizations/new')

    // Fill form
    await page.fill('input[name="name"]', 'Test Org')
    await page.fill('input[name="slug"]', 'test-org')
    await page.click('button[type="submit"]')

    // Verify success
    await expect(page).toHaveURL(/\\/organizations\\//)
    await expect(page.locator('h1')).toContainText('Test Org')
  })
})`

  const runTestsCommands = `# Frontend E2E Tests (Playwright)
cd apps/frontend

# Run all tests
pnpm test

# Run specific test file
pnpm exec playwright test tests/organizations/organization-crud.spec.ts

# Run in UI mode (interactive)
pnpm test:ui

# Run in debug mode
pnpm test:debug

# View test report
pnpm test:report

# Backend Unit Tests (Jest)
cd apps/backend

# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:cov

# Run E2E tests
pnpm test:e2e`

  const cicdExample = `# GitHub Actions CI/CD Example
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: testpassword
        ports:
          - 5432:5432

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Run backend tests
        run: |
          cd apps/backend
          pnpm test:cov

      - name: Run frontend tests
        run: |
          cd apps/frontend
          pnpm exec playwright install --with-deps
          pnpm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3`

  return (
    <div className="py-12 px-8 max-w-4xl">
      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-sm text-green-400 mb-6">
          <TestTube className="h-4 w-4" />
          <span>80%+ Test Coverage</span>
        </div>
        <h1 className="text-5xl font-bold mb-4">
          Testing Guide
        </h1>
        <p className="text-xl text-foreground/60 max-w-2xl">
          Flotilla maintains high code quality with comprehensive test coverage. Learn how to run,
          write, and debug tests for both frontend and backend.
        </p>
      </div>

      {/* Test Suite Overview */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Test Suite Overview</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Frontend */}
          <div className="p-6 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <div className="flex items-center gap-3 mb-4">
              <FileCode className="h-8 w-8 text-cyan-400" />
              <h3 className="text-2xl font-semibold">Frontend (Playwright)</h3>
            </div>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>• <strong className="text-foreground">9 test suites</strong> covering all features</li>
              <li>• <strong className="text-foreground">50+ test cases</strong> for E2E scenarios</li>
              <li>• Tests: Auth, Organizations, Teams, Projects, Files, Admin, Dashboard, Theme</li>
              <li>• Interactive UI mode for debugging</li>
              <li>• Auto-screenshots on failure</li>
            </ul>
          </div>

          {/* Backend */}
          <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-3 mb-4">
              <TestTube className="h-8 w-8 text-red-400" />
              <h3 className="text-2xl font-semibold">Backend (Jest)</h3>
            </div>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li>• <strong className="text-foreground">Unit tests</strong> for services and controllers</li>
              <li>• <strong className="text-foreground">Integration tests</strong> with test database</li>
              <li>• Raft consensus algorithm tests</li>
              <li>• API endpoint tests with supertest</li>
              <li>• 80%+ code coverage target</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Running Tests */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Running Tests</h2>
        <CodeBlock
          code={runTestsCommands}
          language="bash"
          filename="Test Commands"
        />
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-sm">
            <strong>💡 Pro Tip:</strong> Use <code className="px-2 py-1 rounded bg-secondary">pnpm test:ui</code> for
            interactive debugging. You can pause, step through, and inspect element states.
          </div>
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 text-sm">
            <strong>⚡ Fast Feedback:</strong> Run <code className="px-2 py-1 rounded bg-secondary">pnpm test:watch</code> for
            instant feedback during development. Tests re-run on file changes.
          </div>
        </div>
      </section>

      {/* Writing E2E Tests */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Writing E2E Tests</h2>
        <div className="space-y-6">
          <p className="text-foreground/70">
            Playwright E2E tests simulate real user interactions. Follow these patterns for consistent test structure:
          </p>
          <CodeBlock
            code={playwrightExample}
            language="typescript"
            filename="apps/frontend/tests/example.spec.ts"
          />

          {/* Best Practices */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold">Best Practices</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-card border border-border/40">
                <CheckCircle className="h-6 w-6 text-green-400 mb-3" />
                <h4 className="font-semibold mb-2">✓ Do</h4>
                <ul className="text-sm space-y-1 text-foreground/70">
                  <li>• Use role-based selectors: <code className="px-1 rounded bg-secondary">role=&quot;button&quot;</code></li>
                  <li>• Test user flows, not implementation</li>
                  <li>• Clean up test data after each test</li>
                  <li>• Use descriptive test names</li>
                  <li>• Add retries for flaky network calls</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border/40">
                <div className="h-6 w-6 text-red-400 mb-3 flex items-center justify-center text-2xl">✗</div>
                <h4 className="font-semibold mb-2">✗ Avoid</h4>
                <ul className="text-sm space-y-1 text-foreground/70">
                  <li>• Using CSS class selectors (brittle)</li>
                  <li>• Testing implementation details</li>
                  <li>• Relying on fixed wait times</li>
                  <li>• Sharing state between tests</li>
                  <li>• Testing internal APIs directly</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Test Organization */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Test Organization</h2>
        <div className="p-6 rounded-xl bg-secondary/20 border border-border/40">
          <h4 className="font-semibold mb-4">Frontend Test Structure</h4>
          <div className="space-y-2 text-sm font-mono">
            <div className="text-foreground/70">apps/frontend/tests/</div>
            <div className="pl-4 text-foreground/70">├── auth/ <span className="text-foreground/50">(login, register)</span></div>
            <div className="pl-4 text-foreground/70">├── organizations/ <span className="text-foreground/50">(CRUD, members, teams)</span></div>
            <div className="pl-4 text-foreground/70">├── teams/ <span className="text-foreground/50">(CRUD, members, permissions)</span></div>
            <div className="pl-4 text-foreground/70">├── projects/ <span className="text-foreground/50">(project operations)</span></div>
            <div className="pl-4 text-foreground/70">├── files/ <span className="text-foreground/50">(file management)</span></div>
            <div className="pl-4 text-foreground/70">├── admin/ <span className="text-foreground/50">(admin panel)</span></div>
            <div className="pl-4 text-foreground/70">├── dashboard/ <span className="text-foreground/50">(dashboard features)</span></div>
            <div className="pl-4 text-foreground/70">└── theme-language/ <span className="text-foreground/50">(theme & i18n)</span></div>
          </div>
        </div>
      </section>

      {/* CI/CD Integration */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">CI/CD Integration</h2>
        <div className="space-y-6">
          <p className="text-foreground/70">
            Flotilla uses GitHub Actions for continuous integration. All tests must pass before merging to main.
          </p>
          <CodeBlock
            code={cicdExample}
            language="yaml"
            filename=".github/workflows/test.yml"
          />
          <div className="p-6 rounded-xl bg-primary/10 border border-primary/20">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              CI/CD Pipeline
            </h4>
            <p className="text-sm text-foreground/70 leading-relaxed mb-4">
              Our CI pipeline runs on every push and pull request:
            </p>
            <ol className="text-sm space-y-2 text-foreground/70">
              <li>1. Spin up PostgreSQL and Redis services</li>
              <li>2. Install dependencies with pnpm</li>
              <li>3. Run backend unit tests with coverage</li>
              <li>4. Run frontend E2E tests with Playwright</li>
              <li>5. Upload coverage reports to Codecov</li>
              <li>6. Generate test reports and artifacts</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Debugging Tests */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Debugging Failed Tests</h2>
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-border/40">
            <h4 className="font-semibold mb-2">1. Check Test Report</h4>
            <code className="text-sm">pnpm test:report</code>
            <p className="text-sm text-foreground/70 mt-2">
              Opens interactive HTML report with screenshots and traces.
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border/40">
            <h4 className="font-semibold mb-2">2. Run in Debug Mode</h4>
            <code className="text-sm">pnpm test:debug</code>
            <p className="text-sm text-foreground/70 mt-2">
              Launches Playwright Inspector for step-by-step debugging.
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border/40">
            <h4 className="font-semibold mb-2">3. View Screenshots</h4>
            <p className="text-sm text-foreground/70">
              Failed tests automatically capture screenshots in <code className="px-2 py-1 rounded bg-secondary">test-results/</code> directory.
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border/40">
            <h4 className="font-semibold mb-2">4. Check Database State</h4>
            <code className="text-sm">docker exec flotilla-postgres psql -U devplatform -d cloud_dev_platform</code>
            <p className="text-sm text-foreground/70 mt-2">
              Inspect database for test data cleanup issues.
            </p>
          </div>
        </div>
      </section>

      {/* Further Reading */}
      <section>
        <h2 className="text-3xl font-bold mb-6">Further Reading</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <a
            href="https://playwright.dev/docs/intro"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-secondary/30 transition-all group"
          >
            <div>
              <div className="font-semibold group-hover:text-primary transition-colors">
                Playwright Docs
              </div>
              <div className="text-sm text-foreground/60">
                Official Playwright documentation
              </div>
            </div>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <Link
            href="/docs/contributing"
            className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-secondary/30 transition-all group"
          >
            <div>
              <div className="font-semibold group-hover:text-primary transition-colors">
                Contributing Guide
              </div>
              <div className="text-sm text-foreground/60">
                Learn how to contribute to Flotilla
              </div>
            </div>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  )
}
