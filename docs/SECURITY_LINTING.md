# Security Linting Enforcement

This document explains how security linting is enforced in the JACK repository to prevent security vulnerabilities from being introduced into the codebase.

## Overview

Security vulnerabilities such as command injection, SQL injection, and exposed secrets can have serious consequences. To prevent these issues, we enforce multiple layers of security linting:

1. **Pre-commit hooks** - Catch issues before they're committed
2. **CI/CD workflows** - Verify all changes in pull requests
3. **ESLint security rules** - Detect security patterns in JavaScript/TypeScript code
4. **Secret detection** - Prevent accidental commit of credentials

## Security Tools

### 1. ESLint with Security Plugin

We use [`eslint-plugin-security`](https://github.com/eslint-community/eslint-plugin-security) to detect common security issues in JavaScript/TypeScript code.

**Rules enforced:**
- `detect-unsafe-regex` - Prevents ReDoS (Regular Expression Denial of Service)
- `detect-child-process` - Warns about command injection risks
- `detect-eval-with-expression` - Prevents use of eval()
- `detect-non-literal-fs-filename` - Warns about potential path traversal
- `detect-possible-timing-attacks` - Detects timing attack vulnerabilities
- `detect-pseudoRandomBytes` - Ensures cryptographically secure random values
- And more... (see `eslint.config.mjs` for full list)

**Configuration:** Root-level `eslint.config.mjs` applies security rules to all packages.

### 2. Secretlint

[Secretlint](https://github.com/secretlint/secretlint) prevents accidental exposure of secrets like API keys, passwords, and tokens.

**What it detects:**
- AWS credentials
- GitHub tokens
- Private keys
- API keys
- Database passwords
- And 100+ other secret patterns

**Configuration:** `.secretlintrc.json`

### 3. Custom Secret Check Script

Our `scripts/check-secrets.sh` provides additional custom secret detection logic.

## How It Works

### Pre-commit (Local Development)

When you commit code, the following happens automatically:

```bash
1. ./scripts/check-secrets.sh     # Custom secret detection
2. npx lint-staged                # Runs ESLint + secretlint on staged files
3. pnpm clean:docs                # Cleans docs
```

If any security issues are found, the commit is blocked and you must fix them first.

### Pull Request CI

When you open a PR, the `security-lint.yml` workflow runs:

```yaml
1. Install dependencies
2. Run ESLint with security rules on entire codebase
3. Run secret detection checks
4. Generate security summary report
```

The workflow will add warnings if security issues are detected.

### Turbo Build Pipeline

Security linting is integrated into the Turbo build pipeline:

```json
{
  "deploy": {
    "dependsOn": ["build", "test", "lint"]
  }
}
```

This ensures code cannot be deployed without passing security linting.

## Common Security Issues and How to Fix Them

### 1. Command Injection (Incomplete String Escaping)

**Problem:**
```javascript
// ❌ BAD: Only escapes quotes, not backslashes
execSync(`command --text "${input.replace(/"/g, '\\"')}"`);
```

**Solution:**
```javascript
// ✅ GOOD: Use proper shell escaping or avoid shell altogether
import { execFile } from 'child_process';
execFile('command', ['--text', input], (error, stdout, stderr) => {
  // No shell interpretation, input is passed directly as argument
});
```

Or use a proper escaping library:
```javascript
import { shellEscape } from 'shell-escape-tag';
execSync(shellEscape`command --text ${input}`);
```

### 2. Path Traversal

**Problem:**
```javascript
// ❌ BAD: User input directly in file path
const filePath = `/uploads/${req.params.filename}`;
fs.readFile(filePath, callback);
```

**Solution:**
```javascript
// ✅ GOOD: Validate and sanitize file paths
import path from 'path';
const safeFilename = path.basename(req.params.filename);
const filePath = path.join('/uploads', safeFilename);
```

### 3. Exposed Secrets

**Problem:**
```javascript
// ❌ BAD: Hardcoded API key
const API_KEY = "sk_live_abc123xyz789";
```

**Solution:**
```javascript
// ✅ GOOD: Use environment variables
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is required");
}
```

## Bypassing Security Rules (Use with Caution)

Sometimes a security rule may flag a false positive. You can disable rules for specific lines:

```javascript
// eslint-disable-next-line security/detect-non-literal-fs-filename
const content = fs.readFileSync(configPath, 'utf-8');
```

**However:**
- Document WHY you're disabling the rule
- Get code review approval
- Consider if there's a safer alternative

## Running Security Linting Manually

```bash
# Run ESLint with security rules
pnpm run lint

# Run secret detection
npx secretlint "**/*"

# Run custom secret check
./scripts/check-secrets.sh

# Run all security checks
pnpm run lint && npx secretlint "**/*" && ./scripts/check-secrets.sh
```

## For Package Maintainers

If you maintain a package in the monorepo:

1. **Inherit root security config** - The root `eslint.config.mjs` applies to all packages
2. **Add package-specific rules** - Create a local `eslint.config.mjs` if needed
3. **Include lint script** - Add `"lint": "eslint ."` to your `package.json`
4. **Test locally** - Run `pnpm run lint` before pushing

## Resources

- [ESLint Security Plugin](https://github.com/eslint-community/eslint-plugin-security)
- [Secretlint](https://github.com/secretlint/secretlint)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Questions?

If you have questions about security linting or need help fixing security issues, please:

1. Check this documentation first
2. Search existing GitHub issues
3. Open a new issue with the `security` label
4. Tag `@security-team` for urgent security concerns

---

**Remember:** Security linting is not just about passing CI checks—it's about protecting our users and maintaining trust in the JACK platform. When in doubt, err on the side of caution and ask for a security review.
