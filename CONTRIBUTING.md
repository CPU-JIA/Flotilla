# Contributing to Flotilla

Thank you for your interest in contributing to Flotilla! We welcome contributions from the community.

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 10.0.0
- **Docker** & Docker Compose

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/CPU-JIA/Flotilla.git
   cd Cloud-Dev-Platform
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start infrastructure**
   ```bash
   docker-compose up -d
   ```

4. **Initialize Database**
   ```bash
   cd apps/backend
   pnpm prisma migrate dev
   ```

5. **Start Development Servers**
   ```bash
   pnpm dev
   ```

## Development Workflow

### 1. Branching Strategy
- Main branch: `main` (Production-ready)
- Feature branches: `feature/your-feature-name`
- Fix branches: `fix/issue-number-description`

### 2. Commit Convention
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### 3. Testing
- **Backend**: Jest for unit/integration tests
  ```bash
  cd apps/backend
  pnpm test
  ```
- **Frontend**: Playwright for E2E tests
  ```bash
  cd apps/frontend
  pnpm test
  ```
- **Coverage Requirement**: Maintain ≥70% unit test coverage.

### 4. Code Style
- **Formatting**: Run `pnpm format` before committing.
- **Linting**: Run `pnpm lint` to check for issues.

## Engineering Principles (ECP)

- **SOLID Principles**: Primary design philosophy
- **High Cohesion, Low Coupling**: Modular architecture
- **DRY**: Eliminate code duplication
- **KISS**: Simplest implementation
- **Defensive Programming**: Validate all external inputs

## Pull Request Process

1. Ensure all tests pass.
2. Update documentation if necessary.
3. Submit a Pull Request with a clear description of changes.
4. Link related issues (e.g., "Closes #123").

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
