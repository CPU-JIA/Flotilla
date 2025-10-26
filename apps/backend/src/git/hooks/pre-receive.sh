#!/bin/bash
#
# Git pre-receive hook for branch protection
#
# This hook validates push operations against branch protection rules
#
# Environment variables:
# - PROJECT_ID: Project ID for API calls
# - API_BASE_URL: Backend API base URL (default: http://localhost:4000/api)
#
# ECP-C2: Systematic Error Handling - Clear error messages to user
# ECP-C1: Defensive Programming - Validate all inputs

set -e

PROJECT_ID="${PROJECT_ID:-}"
API_BASE_URL="${API_BASE_URL:-http://localhost:4000/api}"

# ANSI color codes for better UX
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Helper function to print colored messages
error() {
    echo -e "${RED}[BRANCH PROTECTION]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[BRANCH PROTECTION]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[BRANCH PROTECTION]${NC} $1" >&2
}

# Validate required environment variables
if [ -z "$PROJECT_ID" ]; then
    error "PROJECT_ID environment variable not set"
    exit 1
fi

# Read ref updates from stdin
# Format: <old-sha> <new-sha> <ref-name>
while read oldrev newrev refname; do
    # Extract branch name from ref (refs/heads/main -> main)
    branch_name=$(echo "$refname" | sed 's#^refs/heads/##')

    # Skip non-branch refs (tags, etc.)
    if [[ ! "$refname" =~ ^refs/heads/ ]]; then
        continue
    fi

    # Check if this is a branch deletion
    if [ "$newrev" = "0000000000000000000000000000000000000000" ]; then
        # Branch deletion - check if branch allows deletions
        warning "Checking branch deletion permission for: $branch_name"

        # Query branch protection API
        RESPONSE=$(curl -s -w "\n%{http_code}" \
            "$API_BASE_URL/projects/$PROJECT_ID/branch-protection" 2>/dev/null || echo "000")

        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | sed '$d')

        if [ "$HTTP_CODE" != "200" ]; then
            # Cannot fetch rules, allow by default (fail-open for backward compatibility)
            warning "Cannot fetch branch protection rules (HTTP $HTTP_CODE), allowing push"
            continue
        fi

        # Parse JSON response to find matching rule
        # Using jq if available, fallback to grep
        if command -v jq &> /dev/null; then
            RULE=$(echo "$BODY" | jq -r ".[] | select(.branchPattern == \"$branch_name\")")

            if [ -n "$RULE" ]; then
                ALLOW_DELETIONS=$(echo "$RULE" | jq -r '.allowDeletions')

                if [ "$ALLOW_DELETIONS" != "true" ]; then
                    error "Branch '$branch_name' is protected against deletion"
                    error "To delete this branch, update branch protection rules first"
                    exit 1
                fi
            fi
        else
            # Fallback: simple grep check
            if echo "$BODY" | grep -q "\"branchPattern\":\"$branch_name\""; then
                if ! echo "$BODY" | grep -q "\"allowDeletions\":true"; then
                    error "Branch '$branch_name' is protected against deletion"
                    error "Install 'jq' for better protection rule parsing"
                    exit 1
                fi
            fi
        fi

        success "Branch deletion allowed for: $branch_name"
        continue
    fi

    # Check if this is a force push (non-fast-forward update)
    is_force_push=false
    if [ "$oldrev" != "0000000000000000000000000000000000000000" ]; then
        # Check if old commit is ancestor of new commit
        if ! git merge-base --is-ancestor "$oldrev" "$newrev" 2>/dev/null; then
            is_force_push=true
        fi
    fi

    if [ "$is_force_push" = true ]; then
        warning "Detected force push to: $branch_name"

        # Query branch protection API
        RESPONSE=$(curl -s -w "\n%{http_code}" \
            "$API_BASE_URL/projects/$PROJECT_ID/branch-protection" 2>/dev/null || echo "000")

        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | sed '$d')

        if [ "$HTTP_CODE" != "200" ]; then
            warning "Cannot fetch branch protection rules (HTTP $HTTP_CODE), allowing push"
            continue
        fi

        # Check if force push is allowed
        if command -v jq &> /dev/null; then
            RULE=$(echo "$BODY" | jq -r ".[] | select(.branchPattern == \"$branch_name\")")

            if [ -n "$RULE" ]; then
                ALLOW_FORCE=$(echo "$RULE" | jq -r '.allowForcePushes')

                if [ "$ALLOW_FORCE" != "true" ]; then
                    error "Force push to '$branch_name' is not allowed"
                    error "Branch protection rule prevents force push operations"
                    error ""
                    error "To force push, either:"
                    error "  1. Update branch protection rules to allow force pushes"
                    error "  2. Use a regular (fast-forward) push"
                    exit 1
                fi
            fi
        else
            if echo "$BODY" | grep -q "\"branchPattern\":\"$branch_name\""; then
                if ! echo "$BODY" | grep -q "\"allowForcePushes\":true"; then
                    error "Force push to '$branch_name' is not allowed"
                    error "Install 'jq' for better protection rule parsing"
                    exit 1
                fi
            fi
        fi

        success "Force push allowed for: $branch_name"
    fi

    # Normal push - check if branch requires pull request
    warning "Checking push permission for: $branch_name"

    # Query branch protection API
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        "$API_BASE_URL/projects/$PROJECT_ID/branch-protection" 2>/dev/null || echo "000")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" != "200" ]; then
        warning "Cannot fetch branch protection rules (HTTP $HTTP_CODE), allowing push"
        continue
    fi

    # Check if direct push is allowed (requirePullRequest)
    if command -v jq &> /dev/null; then
        RULE=$(echo "$BODY" | jq -r ".[] | select(.branchPattern == \"$branch_name\")")

        if [ -n "$RULE" ]; then
            REQUIRE_PR=$(echo "$RULE" | jq -r '.requirePullRequest')

            if [ "$REQUIRE_PR" = "true" ]; then
                error "Direct push to '$branch_name' is not allowed"
                error "This branch is protected and requires pull requests"
                error ""
                error "To update this branch:"
                error "  1. Create a feature branch: git checkout -b feature/my-changes"
                error "  2. Push your changes: git push origin feature/my-changes"
                error "  3. Create a Pull Request through the web interface"
                error "  4. Wait for approval and merge via PR"
                exit 1
            fi
        fi
    else
        if echo "$BODY" | grep -q "\"branchPattern\":\"$branch_name\""; then
            if echo "$BODY" | grep -q "\"requirePullRequest\":true"; then
                error "Direct push to '$branch_name' is not allowed (requires PR)"
                error "Install 'jq' for better error messages"
                exit 1
            fi
        fi
    fi

    success "Push allowed for: $branch_name"
done

# All checks passed
success "All branch protection checks passed"
exit 0
