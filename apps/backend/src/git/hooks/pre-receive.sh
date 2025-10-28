#!/bin/sh
#
# Minimal Git pre-receive hook for Phase 1
#
# This is a simplified version for Phase 1 Git HTTP Protocol validation.
# It logs push operations and allows all pushes to proceed.
#
# Full branch protection features (requiring PR, force push restrictions, etc.)
# will be implemented in Phase 2 with proper bash/jq dependencies.
#
# ECP-B2: KISS - Keep it simple for Phase 1 core functionality
# ECP-A3: YAGNI - Advanced features deferred to Phase 2

while read oldrev newrev refname; do
    # Extract branch name from ref (refs/heads/main -> main)
    branch_name=$(echo "$refname" | sed 's#^refs/heads/##')

    # Log the push operation
    echo "[GIT HOOK] Accepting push to branch: $branch_name" >&2
    echo "[GIT HOOK] Commit range: $oldrev..$newrev" >&2
done

# Accept all pushes in Phase 1
echo "[GIT HOOK] Push accepted - Phase 1 minimal hook" >&2
exit 0
