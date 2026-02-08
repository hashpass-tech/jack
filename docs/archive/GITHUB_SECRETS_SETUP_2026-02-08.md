# GitHub Secrets Setup for SDK Publishing

## NPM_KEY Secret Configuration

To enable the GitHub Actions workflow to publish the SDK to npm, you need to add the NPM authentication token as a GitHub secret.

### Step 1: Get Your NPM Token

Your NPM publish token is configured locally in `~/.npmrc`:

```
//registry.npmjs.org/:_authToken=npm_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

This is your authentication token for publishing to npm. You can find it by running:

```bash
cat ~/.npmrc | grep authToken
```

### Step 2: Add NPM_KEY Secret to GitHub

Follow these steps to add the secret to your GitHub repository:

1. **Go to GitHub Repository Settings**
   - Navigate to: `https://github.com/hashpass-tech/JACK/settings/secrets/actions`
   - Or: Repository → Settings → Secrets and variables → Actions

2. **Create New Repository Secret**
   - Click "New repository secret"
   - Name: `NPM_KEY`
   - Value: `npm_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` (your token from ~/.npmrc)
   - Click "Add secret"

### Step 3: Verify Secret is Set

Once added, you should see `NPM_KEY` listed under "Repository secrets" with a green checkmark.

### Step 4: Trigger the Workflow

The GitHub Actions workflow will automatically use this secret when you push a tag:

```bash
# Create and push a tag to trigger the workflow
git tag sdk-v1.0.0
git push origin sdk-v1.0.0
```

The workflow will:
1. Checkout the code
2. Build the SDK (ESM, CommonJS, TypeScript declarations)
3. Run all 338 tests
4. Generate SBOM (Software Bill of Materials)
5. Create build attestation
6. Publish to npm with provenance using the NPM_KEY secret
7. Create a GitHub release

### Workflow File Location

The workflow is configured in: `.github/workflows/publish-sdk.yml`

### Environment Variables Used

- `NODE_AUTH_TOKEN`: Set to `${{ secrets.NPM_KEY }}` in the publish step
- This allows npm to authenticate with the registry

### Security Notes

- The NPM_KEY secret is only available to GitHub Actions workflows
- It's never exposed in logs or output
- The token is scoped to your npm account
- Consider rotating the token periodically for security

### Troubleshooting

If the workflow fails with "Access token expired or revoked":
1. Generate a new NPM token at https://www.npmjs.com/settings/~/tokens
2. Update the NPM_KEY secret in GitHub with the new token
3. Retry the workflow

### Manual Publishing (Alternative)

If you need to publish manually from local:

```bash
cd packages/sdk
npm publish --access public
```

This uses your local `~/.npmrc` token for authentication.

## Workflow Permissions

The GitHub Actions workflow requires these permissions:

```yaml
permissions:
  contents: read
  packages: write
  id-token: write  # For OIDC token signing (provenance)
```

These are already configured in `.github/workflows/publish-sdk.yml`.
