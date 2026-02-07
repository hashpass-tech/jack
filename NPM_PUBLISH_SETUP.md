# NPM Publishing Setup - Quick Reference

## Your NPM Token

Your NPM publish token is stored in `~/.npmrc`. To retrieve it:

```bash
cat ~/.npmrc | grep authToken
```

Output format:
```
//registry.npmjs.org/:_authToken=npm_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Use the token value (starting with `npm_`) for the GitHub secret.

## GitHub Actions Setup Required

### 1. Add NPM_KEY Secret to GitHub

**URL:** https://github.com/hashpass-tech/JACK/settings/secrets/actions

**Steps:**
1. Click "New repository secret"
2. Name: `NPM_KEY`
3. Value: `npm_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` (your token from ~/.npmrc)
4. Click "Add secret"

### 2. Verify Workflow File

The workflow is already configured at: `.github/workflows/publish-sdk.yml`

It includes:
- ✅ Build steps (ESM, CommonJS, TypeScript)
- ✅ Test execution (338 tests)
- ✅ SBOM generation
- ✅ Build attestation
- ✅ npm publish with provenance
- ✅ Uses NPM_KEY secret for authentication

### 3. Trigger Publishing

Once the secret is added, publish by creating a tag:

```bash
git tag sdk-v1.0.0
git push origin sdk-v1.0.0
```

The workflow will automatically:
1. Build the SDK
2. Run all tests
3. Generate SBOM
4. Create build attestation
5. Publish to npm with provenance
6. Create GitHub release

## Current Status

- ✅ SDK built and tested locally (338 tests passing)
- ✅ GitHub Actions workflow created
- ✅ Provenance and SBOM generation configured
- ⏳ **PENDING:** Add NPM_KEY secret to GitHub
- ⏳ **PENDING:** Push tag to trigger workflow

## Package Details

- **Name:** `@jack-kernel/sdk`
- **Version:** `1.0.0`
- **Registry:** https://registry.npmjs.org/
- **Access:** Public
- **Formats:** ESM, CommonJS, TypeScript declarations

## Files Modified

- `.github/workflows/publish-sdk.yml` - GitHub Actions workflow
- `packages/sdk/package.json` - Updated to @jack-kernel/sdk
- `packages/sdk/src/index.ts` - Fixed ESM imports with .js extensions

## Next Steps

1. **Add NPM_KEY secret to GitHub** (see URL above)
2. **Push tag:** `git tag sdk-v1.0.0 && git push origin sdk-v1.0.0`
3. **Monitor workflow:** Check GitHub Actions for successful publish
4. **Verify on npm:** https://www.npmjs.com/package/@jack-kernel/sdk
