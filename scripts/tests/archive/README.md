# Test Archive

This directory contains archived test scripts, logs, and test data from the Flotilla project development process.

## 📁 Directory Structure

```
archive/
├── logs/                          # Test execution logs
│   ├── git-test-final-success.log
│   ├── git-test-output-final.log
│   └── git-test-output.log
├── test-data/                     # Test data and outputs
│   ├── branch-delete-test-output.txt
│   ├── branch-protection.json
│   ├── current-token.txt
│   ├── force-push-test-output.txt
│   ├── git-test-clone/           # Cloned test repository
│   ├── push-test-output.txt
│   ├── push-test-output-2.txt
│   ├── README.md
│   └── test-user.json
├── test-avatar-upload.sh          # Avatar upload test script
├── test-complete-workflow.sh      # Complete workflow test script
├── test-create-project.json       # Project creation test data
├── test-git-complete.sh           # Git integration test script
├── test-git-init-retry.sh         # Git initialization retry test
├── test-git-init.sh               # Git initialization test
├── test-login.json                # Login test data
├── test-register.json             # Registration test data
└── test-upload.txt                # File upload test data
```

## 📝 Archive Purpose

These test files were created during manual testing of the following features:

### Git Integration Tests (Oct 23-28, 2025)
- **test-git-*.sh**: Shell scripts for testing Git HTTP Smart Protocol
- **git-test-*.log**: Test execution logs from Git protocol testing
- **test-data/git-test-clone/**: Cloned repository for Git operations testing

### User Authentication Tests (Oct 23, 2025)
- **test-register.json**: User registration test payload
- **test-login.json**: User login test payload

### File Upload Tests (Oct 12-23, 2025)
- **test-upload.txt**: File upload test data
- **test-avatar-upload.sh**: Avatar upload workflow test

### Branch Protection Tests (Oct 26, 2025)
- **test-data/branch-protection.json**: Branch protection rules test data
- **test-data/branch-delete-test-output.txt**: Branch deletion test results
- **test-data/force-push-test-output.txt**: Force push test results

## 🔍 Why Archive?

These manual test files are archived because:

1. **Superseded by Automated Tests**: All functionality is now covered by:
   - Backend Jest unit tests (`apps/backend/src/**/*.spec.ts`)
   - Frontend Playwright E2E tests (`apps/frontend/tests/**/*.spec.ts`)

2. **Historical Reference**: Provide insight into early testing approaches and debugging processes

3. **Manual Test Examples**: Can serve as examples for future manual testing if needed

## 🧪 Current Testing Strategy

For current testing practices, please refer to:

- **Backend Testing**: `cd apps/backend && pnpm test`
- **Frontend E2E Testing**: `cd apps/frontend && pnpm test`
- **Testing Guide**: `/apps/frontend/TESTING_GUIDE.md`
- **Test Coverage**: Maintained at ≥70% for backend unit tests

### Active Test Scripts

The following test scripts remain active in `/scripts`:
- `test-git-integration.sh` - Active Git integration test script
- `init-db.sql` - Database initialization script

---

**Archive Created**: 2025-10-31
**Archived From**: Project root directory (E:\Flotilla)
**Reason**: Cleanup for production deployment preparation (Phase 1.5)
