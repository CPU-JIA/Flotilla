import { GitBranch, Heart, Code, MessageSquare, BookOpen, ArrowRight, Github } from 'lucide-react'
import { CodeBlock } from '@/components/ui/code-block'
import Link from 'next/link'

export const metadata = {
  title: 'Contributing Guide - Flotilla Documentation',
  description:
    'Learn how to contribute to Flotilla. From reporting bugs to submitting pull requests.',
}

export default function ContributingPage() {
  const contributionWorkflow = `# Fork and Clone
git clone https://github.com/YOUR_USERNAME/Cloud-Dev-Platform.git
cd Cloud-Dev-Platform

# Add upstream remote
git remote add upstream https://github.com/CPU-JIA/Cloud-Dev-Platform.git

# Create feature branch
git checkout -b feature/your-feature-name

# Make your changes...

# Commit with conventional commits
git commit -m "feat: add new feature"

# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub`

  const commitConvention = `# Commit Message Format
<type>(<scope>): <subject>

# Types:
feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Code formatting (no logic change)
refactor: Code refactoring
test:     Adding or updating tests
chore:    Build process or auxiliary tool changes

# Examples:
feat(auth): add OAuth2 login support
fix(raft): correct leader election timeout
docs(api): update authentication endpoints
test(frontend): add organization CRUD tests
refactor(backend): extract common validators`

  const codeStandards = `// ECP (Engineering & Code Principles)

// 1. SOLID Principles
class UserService {
  // Single Responsibility: only handles user operations
  async createUser(data: CreateUserDto) { ... }
}

// 2. DRY (Don't Repeat Yourself)
// ❌ Bad
const user1 = await prisma.user.findUnique({ where: { id: id1 } })
const user2 = await prisma.user.findUnique({ where: { id: id2 } })

// ✅ Good
const findUserById = (id: string) =>
  prisma.user.findUnique({ where: { id } })
const user1 = await findUserById(id1)
const user2 = await findUserById(id2)

// 3. KISS (Keep It Simple, Stupid)
// ✅ Simple and clear
function isEven(num: number): boolean {
  return num % 2 === 0
}

// 4. Defensive Programming
async function getUser(id: string) {
  // Validate input
  if (!id) throw new Error('User ID is required')

  const user = await prisma.user.findUnique({ where: { id } })

  // Check existence
  if (!user) throw new NotFoundException('User not found')

  return user
}

// 5. Type Safety
// ✅ Always define interfaces
interface CreateProjectDto {
  name: string
  description?: string
  organizationId: string
}`

  const prChecklist = `Before submitting your pull request, ensure:

Code Quality:
☐ Code follows ECP principles (SOLID, DRY, KISS)
☐ All functions have TypeScript types
☐ No 'any' types used without justification
☐ Code is properly formatted (run \`pnpm format\`)
☐ No ESLint warnings (run \`pnpm lint\`)

Testing:
☐ All existing tests pass (run \`pnpm test\`)
☐ New features have test coverage
☐ Test coverage is ≥70% for new code
☐ E2E tests added for user-facing features

Documentation:
☐ README updated if needed
☐ API endpoints documented with Swagger decorators
☐ Complex logic has explanatory comments
☐ CHANGELOG.md updated

Git:
☐ Commits follow conventional commit format
☐ Branch is up-to-date with main
☐ No merge conflicts
☐ Commit history is clean (squash if needed)`

  return (
    <div className="py-12 px-8 max-w-4xl">
      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 text-sm text-pink-400 mb-6">
          <Heart className="h-4 w-4" />
          <span>Open Source Community</span>
        </div>
        <h1 className="text-5xl font-bold mb-4">Contributing Guide</h1>
        <p className="text-xl text-foreground/60 max-w-2xl">
          We welcome contributions from everyone! Whether you are fixing bugs, adding features, or
          improving documentation, your help makes Flotilla better.
        </p>
      </div>

      {/* Ways to Contribute */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Ways to Contribute</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              icon: MessageSquare,
              title: 'Report Bugs',
              description:
                'Found a bug? Open an issue on GitHub with reproduction steps and screenshots.',
              color: 'text-red-500',
              action: 'Report Issue',
              href: 'https://github.com/CPU-JIA/Cloud-Dev-Platform/issues/new',
            },
            {
              icon: Code,
              title: 'Submit Code',
              description:
                'Fix bugs, add features, or improve performance by submitting pull requests.',
              color: 'text-green-500',
              action: 'Start Coding',
              href: '#contribution-workflow',
            },
            {
              icon: BookOpen,
              title: 'Improve Docs',
              description:
                'Help others by improving documentation, fixing typos, or adding examples.',
              color: 'text-blue-500',
              action: 'Edit Docs',
              href: 'https://github.com/CPU-JIA/Cloud-Dev-Platform/tree/main/docs',
            },
            {
              icon: GitBranch,
              title: 'Review PRs',
              description:
                'Review pull requests from other contributors and provide constructive feedback.',
              color: 'text-purple-500',
              action: 'View PRs',
              href: 'https://github.com/CPU-JIA/Cloud-Dev-Platform/pulls',
            },
          ].map((way) => {
            const Icon = way.icon
            return (
              <div
                key={way.title}
                className="p-6 rounded-xl bg-card border border-border/40 hover:border-border transition-colors"
              >
                <Icon className={`h-8 w-8 ${way.color} mb-4`} />
                <h3 className="text-xl font-semibold mb-2">{way.title}</h3>
                <p className="text-sm text-foreground/70 mb-4 leading-relaxed">{way.description}</p>
                <a
                  href={way.href}
                  target={way.href.startsWith('http') ? '_blank' : undefined}
                  rel={way.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  {way.action}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            )
          })}
        </div>
      </section>

      {/* Contribution Workflow */}
      <section id="contribution-workflow" className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Contribution Workflow</h2>
        <div className="space-y-6">
          <p className="text-foreground/70">Follow these steps to contribute code to Flotilla:</p>

          {/* Step-by-step */}
          <div className="space-y-4">
            {[
              {
                step: 1,
                title: 'Fork & Clone',
                description: 'Fork the repository on GitHub and clone it to your local machine.',
              },
              {
                step: 2,
                title: 'Create Branch',
                description:
                  'Create a feature branch from main. Use descriptive branch names like feature/add-oauth or fix/raft-timeout.',
              },
              {
                step: 3,
                title: 'Make Changes',
                description:
                  'Implement your changes following our code standards and ECP principles.',
              },
              {
                step: 4,
                title: 'Write Tests',
                description: 'Add tests for your changes. Ensure all existing tests still pass.',
              },
              {
                step: 5,
                title: 'Commit & Push',
                description: 'Commit with conventional commit format and push to your fork.',
              },
              {
                step: 6,
                title: 'Create PR',
                description:
                  'Open a pull request on GitHub with a clear description of your changes.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-4 p-4 rounded-lg bg-secondary/20 border border-border/40"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{item.title}</h4>
                  <p className="text-sm text-foreground/70">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <CodeBlock code={contributionWorkflow} language="bash" filename="Contribution Workflow" />
        </div>
      </section>

      {/* Commit Convention */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Commit Convention</h2>
        <div className="space-y-6">
          <p className="text-foreground/70">
            We use <strong className="text-foreground">Conventional Commits</strong> for clear and
            consistent commit history. This enables automatic changelog generation.
          </p>
          <CodeBlock code={commitConvention} language="bash" filename="Commit Message Format" />
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 text-sm">
            <strong>💡 Why Conventional Commits?</strong>
            <ul className="mt-2 space-y-1 text-foreground/70">
              <li>• Automatic CHANGELOG generation</li>
              <li>• Semantic versioning automation</li>
              <li>• Clear project history for contributors</li>
              <li>• Easier to understand what changes do</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Code Standards */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Code Standards (ECP)</h2>
        <div className="space-y-6">
          <p className="text-foreground/70">
            All code in Flotilla follows{' '}
            <strong className="text-foreground">ECP (Engineering & Code Principles)</strong>. These
            principles ensure high code quality and maintainability.
          </p>
          <CodeBlock
            code={codeStandards}
            language="typescript"
            filename="Code Standards Examples"
          />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <h4 className="font-semibold mb-2">Core Principles</h4>
              <ul className="text-sm space-y-1 text-foreground/70">
                <li>• SOLID design patterns</li>
                <li>• DRY (Don not Repeat Yourself)</li>
                <li>• KISS (Keep It Simple)</li>
                <li>• Defensive programming</li>
                <li>• Type safety (no any types)</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <h4 className="font-semibold mb-2">Tooling</h4>
              <ul className="text-sm space-y-1 text-foreground/70">
                <li>• Prettier for formatting</li>
                <li>• ESLint for linting</li>
                <li>• TypeScript strict mode</li>
                <li>• Husky for pre-commit hooks</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PR Checklist */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Pull Request Checklist</h2>
        <CodeBlock code={prChecklist} language="markdown" filename="PR Checklist" />
      </section>

      {/* Code Review Process */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Code Review Process</h2>
        <div className="space-y-4">
          <p className="text-foreground/70">
            All pull requests go through code review before merging:
          </p>
          <div className="space-y-3">
            {[
              {
                title: 'Automated Checks',
                description: 'CI/CD pipeline runs tests, linting, and type checking automatically.',
                status: 'automated',
              },
              {
                title: 'Manual Review',
                description:
                  'A maintainer reviews your code for logic, architecture, and ECP compliance.',
                status: 'manual',
              },
              {
                title: 'Feedback Loop',
                description:
                  'Address review comments and push updates. We iterate until the PR is ready.',
                status: 'iterative',
              },
              {
                title: 'Merge',
                description: 'Once approved and all checks pass, your PR will be merged to main.',
                status: 'final',
              },
            ].map((phase) => (
              <div key={phase.title} className="p-4 rounded-lg border border-border/40">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold mb-1">{phase.title}</h4>
                    <p className="text-sm text-foreground/70">{phase.description}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      phase.status === 'automated'
                        ? 'bg-blue-500/10 text-blue-400'
                        : phase.status === 'manual'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : phase.status === 'iterative'
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'bg-green-500/10 text-green-400'
                    }`}
                  >
                    {phase.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community */}
      <section>
        <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/40">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="h-8 w-8 text-pink-500" />
            <h2 className="text-3xl font-bold">Join the Community</h2>
          </div>
          <p className="text-foreground/70 mb-6">
            Flotilla is built by developers for developers. We believe in collaboration,
            transparency, and building consensus together. Your contributions matter.
          </p>
          <div className="flex gap-4">
            <a
              href="https://github.com/CPU-JIA/Cloud-Dev-Platform"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              <Github className="h-5 w-5" />
              View on GitHub
            </a>
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center gap-2 px-6 h-11 rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
            >
              Getting Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
