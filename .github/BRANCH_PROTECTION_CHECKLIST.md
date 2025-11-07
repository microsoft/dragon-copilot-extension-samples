# Branch Protection Quick Setup Checklist

Use this checklist when configuring branch protection for the first time.

## ✅ Pre-Setup (Already Complete)

- [x] CODEOWNERS file created (`.github/CODEOWNERS`)
- [x] CI/CD workflows configured (`ci.yml`, `security.yml`)
- [x] Documentation available (`doc/BRANCH_PROTECTION.md`)

## 🔧 GitHub Settings Configuration

Navigate to: **Repository Settings → Branches → Add rule**

### Branch Pattern
- [ ] Branch name pattern: `main`

### Pull Request Requirements
- [ ] ✅ Require a pull request before merging
  - [ ] Required approvals: **1** (minimum)
  - [ ] ✅ Dismiss stale pull request approvals when new commits are pushed
  - [ ] ✅ Require review from Code Owners (recommended)

### Status Check Requirements
- [ ] ✅ Require status checks to pass before merging
  - [ ] Search and add: `build-and-test`
  - [ ] Search and add: `nodejs-tools`
  - [ ] Search and add: `security-scan`
  - [ ] Search and add: `codeql-analysis`
  - [ ] ✅ Require branches to be up to date before merging

### Additional Protections
- [ ] ✅ Require conversation resolution before merging
- [ ] ⬜ Do not allow bypassing the above settings (optional - prevents admin bypass)

### Save
- [ ] Click **Create** to save the branch protection rule

## 🧪 Testing

After setup, test that it works:

1. [ ] Create a test branch
2. [ ] Make a small change
3. [ ] Push and create a PR
4. [ ] Verify you're automatically assigned as reviewer
5. [ ] Try to merge without approval (should be blocked)
6. [ ] Approve the PR
7. [ ] Merge successfully

## 📚 Reference

For detailed instructions, see: [doc/BRANCH_PROTECTION.md](../doc/BRANCH_PROTECTION.md)

## 🆘 Need Help?

- **Can't find the settings?** Make sure you have admin access to the repository
- **Status checks not appearing?** Run the workflows at least once first
- **Need to bypass temporarily?** Uncheck "Do not allow bypassing" in the rule settings

## What Happens After Setup?

✅ All changes to `main` require a pull request
✅ Pull requests require your approval before merging
✅ CI/CD checks must pass before merging
✅ You're automatically assigned as reviewer on all PRs
✅ Direct pushes to `main` are blocked
