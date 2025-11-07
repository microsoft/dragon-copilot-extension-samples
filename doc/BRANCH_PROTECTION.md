# Branch Protection Setup Guide

This guide explains how to configure GitHub branch protection rules to require pull request reviews before merging to the `main` branch.

## Overview

Branch protection rules help you enforce certain workflows and requirements before code can be merged into protected branches. This is essential for maintaining code quality and security in your repository.

## Prerequisites

- You must have **admin** access to the repository
- The repository must have at least one branch (typically `main`)

## Step-by-Step Setup

### 1. Navigate to Branch Protection Settings

1. Go to your repository on GitHub
2. Click on **Settings** (top navigation bar)
3. In the left sidebar, click **Branches** (under "Code and automation")

### 2. Add Branch Protection Rule

1. Click the **Add rule** button (or **Add branch protection rule**)
2. In the **Branch name pattern** field, enter: `main`
   - This applies the rule to the main branch
   - You can also use wildcards like `release/*` to protect multiple branches

### 3. Configure Required Settings

Configure the following options to require pull request reviews:

#### Required Options:

✅ **Require a pull request before merging**
   - Check this box to ensure all changes go through a pull request
   - This prevents direct pushes to the main branch

   Under this option, configure:
   - ✅ **Require approvals**: Set the number to **1** (or more if you want multiple reviewers)
   - ✅ **Dismiss stale pull request approvals when new commits are pushed**: Recommended for security
   - ⬜ **Require review from Code Owners**: Optional, but recommended since you have a CODEOWNERS file
     - When enabled, at least one code owner (you, as defined in `.github/CODEOWNERS`) must approve

✅ **Require status checks to pass before merging** (Recommended)
   - This ensures CI/CD checks pass before merging
   - Search for and add the following checks:
     - `build-and-test` (from CI workflow)
     - `nodejs-tools` (from CI workflow)
     - `security-scan` (from Security workflow)
     - `codeql-analysis` (from Security workflow)
   - ✅ **Require branches to be up to date before merging**: Ensures the branch is current with main

#### Additional Recommended Options:

✅ **Require conversation resolution before merging**
   - Ensures all review comments are addressed before merging

✅ **Do not allow bypassing the above settings**
   - Prevents even admins from bypassing these rules
   - ⚠️ Note: Unchecking this allows admins (you) to bypass if needed in emergencies

✅ **Restrict who can push to matching branches** (Optional)
   - Can restrict push access to specific people, teams, or apps
   - If you're the sole maintainer, this might not be necessary

### 4. Save Changes

1. Scroll to the bottom of the page
2. Click **Create** (or **Save changes** if editing an existing rule)

## What This Accomplishes

Once configured, the following will happen:

1. ✅ **No direct pushes to main**: All changes must go through a pull request
2. ✅ **Review required**: You (or designated reviewers) must approve PRs before merging
3. ✅ **CI checks required**: All workflow checks must pass (build, test, security scans)
4. ✅ **Automatic reviewer assignment**: The CODEOWNERS file automatically assigns you as a reviewer
5. ✅ **Conversations resolved**: All review comments must be addressed

## Testing the Setup

To verify the branch protection is working:

1. Create a new branch: `git checkout -b test-branch-protection`
2. Make a small change (e.g., update README.md)
3. Commit and push: `git add . && git commit -m "Test" && git push -u origin test-branch-protection`
4. Go to GitHub and create a pull request
5. Try to merge without approval → Should be blocked
6. Approve the PR → Should now be able to merge

## CODEOWNERS File

The `.github/CODEOWNERS` file in this repository automatically assigns you (`@mfrongillo35`) as a reviewer for all pull requests. This works in conjunction with branch protection rules.

To modify who gets automatically assigned:
1. Edit `.github/CODEOWNERS`
2. Add or modify patterns and owners
3. Commit and push changes

Example patterns:
```
# All files
* @mfrongillo35

# Specific directories
/docs/ @mfrongillo35 @docs-team
/samples/ @mfrongillo35 @samples-team

# Specific file types
*.md @mfrongillo35 @documentation-team
*.yml @mfrongillo35 @devops-team
```

## Alternative: Repository Rulesets (Beta)

GitHub also offers Repository Rulesets, a newer feature that provides more flexibility:

1. Go to **Settings** → **Rules** → **Rulesets**
2. Click **New ruleset** → **New branch ruleset**
3. Name it (e.g., "Protect main branch")
4. Set **Target branches**: Add `main`
5. Configure rules similar to branch protection above
6. Set **Bypass list** if needed (to allow certain users/teams to bypass)
7. Click **Create**

Rulesets offer advantages like:
- Better insights and rule evaluation
- More granular control
- Ability to target multiple branches with one ruleset

## Troubleshooting

### "I can't push to main"
✅ **Expected behavior** - Create a pull request instead

### "I can't merge my own PRs"
- As a repository admin, you can approve your own PRs by default
- If you want to require review from another user, you can:
  - Add more collaborators to the repository
  - Enable "Require review from Code Owners" and ensure CODEOWNERS includes other users
  - Or create a second GitHub account for testing purposes
- Note: Branch protection can be configured to prevent self-approval with additional organization-level settings

### "Status checks won't complete"
- Verify the workflow names match exactly
- Ensure workflows are enabled in Actions settings
- Check workflow runs for errors

### "I need to make an emergency fix"
- If you enabled "Do not allow bypassing", you'll need to temporarily modify the rule
- Make the fix via PR, then re-enable strict rules

## Additional Resources

- [GitHub: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub: Managing a branch protection rule](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)
- [GitHub: About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub: About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)

## Summary

By following this guide, you'll have:
1. ✅ Created a CODEOWNERS file (already in this repo)
2. ✅ Configured branch protection rules via GitHub Settings
3. ✅ Ensured all PRs require your review before merging
4. ✅ Protected your main branch from direct pushes
5. ✅ Required CI/CD checks to pass before merging

Your repository is now secure, and you maintain control over all changes to the main branch! 🔒
