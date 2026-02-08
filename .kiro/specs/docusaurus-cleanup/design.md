# Design Document: Docusaurus Documentation Cleanup

## Overview

This design describes the approach for reorganizing the JACK project's documentation structure. The goal is to separate end-user documentation (which remains in Docusaurus at `apps/docs/docs/`) from internal development and operations documentation (which moves to `/docs` at the repository root).

The reorganization involves:
1. Moving operations runbooks and agent orchestration docs to `/docs/operations/`
2. Moving setup documentation to `/docs/SETUP.md`
3. Moving demo scripts to `/docs/demo-script.md`
4. Updating Docusaurus sidebar configuration to remove internal content
5. Updating cross-references in moved documentation
6. Preserving all end-user content (architecture, SDK, contracts, integrations, whitepaper)

This is primarily a file organization and configuration task with minimal code changes.

## Architecture

The documentation system has two distinct audiences:

```
Documentation Structure
├── apps/docs/docs/          (Docusaurus - End Users)
│   ├── overview.md
│   ├── architecture.md
│   ├── sdk/
│   ├── contracts/
│   ├── integrations/
│   └── whitepaper/
│
└── docs/                    (Root - Internal)
    ├── SETUP.md
    ├── demo-script.md
    ├── operations/
    │   ├── release-flow.md
    │   ├── spec-system.md
    │   ├── multi-agent-config.md
    │   └── agent-orchestration/
    └── [existing internal docs]
```

### Separation of Concerns

**End-User Documentation (Docusaurus):**
- System overview and mission
- Architecture and design patterns
- SDK installation and usage
- Contract documentation for integrators
- Integration guides (Yellow Network, Uniswap V4)
- Whitepaper content

**Internal Documentation (Root /docs):**
- Local development setup
- Operations runbooks and procedures
- Release flows and deployment
- Agent configuration and orchestration
- Spec system documentation
- GitHub project management
- Demo preparation scripts

## Components and Interfaces

### File Move Operations

The reorganization requires moving files from Docusaurus to the root docs directory:

**Operations Content:**
```
Source: apps/docs/docs/operations/
Target: docs/operations/

Files to move:
- index.md
- release-flow.md
- spec-system.md
- spec-quickstart.md
- multi-agent-config.md
- contracts-deployment.md
- docs-pages-deployment.md
- documentation-governance.md
- documentation-changelog.md
- mvp-critical-roadmap.md
- agent-orchestration/ (entire directory)
```

**Setup Documentation:**
```
Source: apps/docs/docs/setup.md
Target: docs/SETUP.md
```

**Demo Script:**
```
Source: apps/docs/docs/demo-script.md
Target: docs/demo-script.md
```

### Docusaurus Configuration

The Docusaurus sidebar configuration needs to be updated to remove references to moved content. The sidebar is typically configured in `apps/docs/sidebars.js` or `apps/docs/sidebars.ts`.

**Current sidebar structure (to be modified):**
```javascript
{
  docs: [
    'overview',
    'setup',              // REMOVE
    'architecture',
    'demo-script',        // REMOVE
    {
      type: 'category',
      label: 'Operations', // REMOVE entire category
      items: [...]
    },
    // ... other sections
  ]
}
```

**Target sidebar structure:**
```javascript
{
  docs: [
    'overview',
    'architecture',
    {
      type: 'category',
      label: 'SDK',
      items: [...]
    },
    {
      type: 'category',
      label: 'Contracts',
      items: [...]
    },
    {
      type: 'category',
      label: 'Integrations',
      items: [...]
    },
    {
      type: 'category',
      label: 'Whitepaper',
      items: [...]
    }
  ]
}
```

## Data Models

### File Move Specification

```typescript
interface FileMoveSpec {
  source: string;        // Source path relative to repo root
  target: string;        // Target path relative to repo root
  type: 'file' | 'directory';
}

const moveOperations: FileMoveSpec[] = [
  // Operations directory
  {
    source: 'apps/docs/docs/operations/',
    target: 'docs/operations/',
    type: 'directory'
  },
  // Setup documentation
  {
    source: 'apps/docs/docs/setup.md',
    target: 'docs/SETUP.md',
    type: 'file'
  },
  // Demo script
  {
    source: 'apps/docs/docs/demo-script.md',
    target: 'docs/demo-script.md',
    type: 'file'
  }
];
```

### Cross-Reference Update Pattern

When moving files, cross-references need to be updated:

```typescript
interface CrossReferenceUpdate {
  filePattern: string;           // Files to search for references
  oldPattern: RegExp;            // Pattern to find old references
  newReplacement: string;        // Replacement for new location
}

// Example: Update references to operations docs
const referenceUpdates: CrossReferenceUpdate[] = [
  {
    filePattern: 'docs/operations/**/*.md',
    oldPattern: /\.\.\/\.\.\/operations\//g,
    newReplacement: '../operations/'
  },
  {
    filePattern: 'docs/**/*.md',
    oldPattern: /apps\/docs\/docs\/operations\//g,
    newReplacement: 'docs/operations/'
  }
];
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, most of the acceptance criteria are specific examples of the final documentation structure (e.g., "file X should be in location Y"). These are best verified through unit tests that check specific file locations.

However, there are two universal properties that should hold across the entire documentation system:

### Property 1: Link Resolution

*For any* markdown file in the documentation system (both Docusaurus and root /docs), all relative links to other documentation files should resolve to existing files.

**Validates: Requirements 2.4, 3.2, 7.2, 7.3**

**Rationale:** When documentation is reorganized, cross-references must be updated to prevent broken links. This property ensures that after the reorganization, all internal documentation links work correctly. This is a universal property because it applies to all markdown files, not just specific ones.

**Testing approach:** Parse all markdown files, extract relative links (e.g., `[text](../path/to/file.md)`), resolve them relative to the file's location, and verify the target file exists.

### Property 2: Sidebar Configuration Validity

*For any* entry in the Docusaurus sidebar configuration, the referenced file path should correspond to an existing file in the `apps/docs/docs/` directory.

**Validates: Requirements 6.1, 6.2, 6.3**

**Rationale:** The Docusaurus sidebar must only reference files that exist in the Docusaurus docs directory. After moving operations, setup, and demo content out of Docusaurus, the sidebar configuration must be updated to remove those references. This property ensures the sidebar configuration is consistent with the actual file structure.

**Testing approach:** Parse the sidebar configuration file (JavaScript/TypeScript), extract all file references, and verify each referenced file exists in the Docusaurus docs directory.

## Error Handling

### File Move Errors

**Missing source files:**
- Before moving files, verify that all source files exist
- If a source file is missing, log a warning and continue with other moves
- Report all missing files at the end of the operation

**Target directory conflicts:**
- If target directory already exists, merge contents rather than overwriting
- If a target file already exists with different content, prompt for resolution
- Preserve existing files in target directory that aren't being overwritten

**Permission errors:**
- If file operations fail due to permissions, report the error clearly
- Provide guidance on how to resolve permission issues
- Do not continue with partial moves that could leave the system in an inconsistent state

### Cross-Reference Update Errors

**Ambiguous references:**
- If a link could resolve to multiple files, log a warning
- Prefer the closest match in the directory hierarchy
- Document any ambiguous resolutions for manual review

**External links:**
- Do not modify external URLs (http://, https://)
- Do not modify anchor links within the same file (#section)
- Only update relative file paths

### Configuration Update Errors

**Sidebar configuration parsing:**
- If sidebar configuration cannot be parsed, report error and exit
- Do not attempt to modify unparseable configuration
- Provide clear error message about syntax issues

**Invalid sidebar structure:**
- If sidebar structure doesn't match expected format, report warning
- Attempt to update recognizable patterns
- Log any unrecognized patterns for manual review

## Testing Strategy

This feature requires both unit tests and property-based tests to ensure correctness.

### Unit Tests

Unit tests will verify specific examples of the reorganization:

**File location tests:**
- Verify operations directory moved to `/docs/operations/`
- Verify setup.md moved to `/docs/SETUP.md`
- Verify demo-script.md moved to `/docs/demo-script.md`
- Verify agent-orchestration subdirectory preserved in new location
- Verify end-user content remains in Docusaurus (overview.md, architecture.md, sdk/, contracts/, integrations/, whitepaper/)

**Sidebar configuration tests:**
- Verify sidebar no longer references 'setup'
- Verify sidebar no longer references 'demo-script'
- Verify sidebar no longer contains 'Operations' category
- Verify sidebar contains expected end-user sections (SDK, Contracts, Integrations, Whitepaper)

**Edge cases:**
- Empty directories are handled correctly
- Files with special characters in names are moved correctly
- Nested directory structures are preserved

### Property-Based Tests

Property tests will verify universal correctness across all documentation:

**Property 1: Link Resolution**
- Test: For all markdown files in the documentation system, parse and resolve all relative links
- Verify: Each relative link resolves to an existing file
- Configuration: Minimum 100 iterations (though this is deterministic, not randomized)
- Tag: **Feature: docusaurus-cleanup, Property 1: For any markdown file in the documentation system, all relative links to other documentation files should resolve to existing files**

**Property 2: Sidebar Configuration Validity**
- Test: Parse the Docusaurus sidebar configuration and extract all file references
- Verify: Each referenced file exists in `apps/docs/docs/`
- Configuration: Single test (deterministic validation)
- Tag: **Feature: docusaurus-cleanup, Property 2: For any entry in the Docusaurus sidebar configuration, the referenced file path should correspond to an existing file in the apps/docs/docs/ directory**

### Testing Library

For this TypeScript/JavaScript project, we will use:
- **Jest** for unit tests
- **fast-check** for property-based testing (if needed for future extensions)

However, since this is primarily a file reorganization task, most tests will be deterministic unit tests that verify the final state of the file system and configuration.

### Test Execution

Tests should be run:
1. After completing the file moves
2. After updating the sidebar configuration
3. After updating cross-references
4. As part of CI/CD to prevent future regressions

### Manual Verification

In addition to automated tests, manual verification should include:
- Visual inspection of the Docusaurus site to ensure navigation works
- Spot-checking several documentation pages to verify content renders correctly
- Verifying that the root `/docs` directory is well-organized and accessible to developers
