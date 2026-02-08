# Requirements Document

## Introduction

The JACK project has reached a stable initial version and requires a reorganization of its documentation structure. Currently, the Docusaurus site contains a mix of end-user documentation and internal development/operations documentation. This spec defines the requirements for separating these concerns: Docusaurus should contain only end-user documentation and system architecture, while internal development documentation should be moved to the root `/docs` directory.

## Glossary

- **Docusaurus**: The documentation site located at `apps/docs/` that serves end-user facing documentation
- **End_User_Documentation**: Documentation intended for external users who want to understand and use JACK (architecture, SDK, integrations, whitepaper)
- **Internal_Documentation**: Documentation intended for developers and operators working on JACK (setup guides, runbooks, release flows, agent configuration)
- **Operations_Content**: Internal runbooks and procedures for releasing, monitoring, and coordinating work
- **Root_Docs_Directory**: The `/docs` directory at the repository root for internal documentation
- **Mock_Content**: Non-production content such as demo scripts and preparation materials

## Requirements

### Requirement 1: Separate End-User and Internal Documentation

**User Story:** As a documentation maintainer, I want to separate end-user documentation from internal documentation, so that external users see only relevant content and internal processes remain organized.

#### Acceptance Criteria

1. THE Documentation_System SHALL maintain end-user documentation in the Docusaurus directory (`apps/docs/docs/`)
2. THE Documentation_System SHALL maintain internal documentation in the Root_Docs_Directory (`/docs`)
3. WHEN documentation is categorized, THE Documentation_System SHALL classify operations runbooks as Internal_Documentation
4. WHEN documentation is categorized, THE Documentation_System SHALL classify setup guides as Internal_Documentation
5. WHEN documentation is categorized, THE Documentation_System SHALL classify architecture and SDK content as End_User_Documentation

### Requirement 2: Move Operations Content to Root Docs

**User Story:** As a developer, I want operations runbooks in the root docs directory, so that I can find internal procedures without navigating through end-user documentation.

#### Acceptance Criteria

1. WHEN moving operations content, THE Documentation_System SHALL relocate all files from `apps/docs/docs/operations/` to `/docs/operations/`
2. WHEN moving operations content, THE Documentation_System SHALL preserve the directory structure within operations
3. WHEN moving operations content, THE Documentation_System SHALL relocate agent orchestration documentation to `/docs/operations/agent-orchestration/`
4. WHEN operations content is moved, THE Documentation_System SHALL update all internal cross-references to reflect new paths

### Requirement 3: Move Development Setup Documentation

**User Story:** As a new developer, I want setup documentation in the root docs directory, so that I can find onboarding instructions in a standard location.

#### Acceptance Criteria

1. WHEN moving setup documentation, THE Documentation_System SHALL relocate `apps/docs/docs/setup.md` to `/docs/SETUP.md`
2. WHEN setup documentation is moved, THE Documentation_System SHALL update any references to the setup guide
3. THE Documentation_System SHALL remove setup documentation from the Docusaurus site

### Requirement 4: Remove Mock and Internal Preparation Content

**User Story:** As an end user, I want to see only production-ready documentation, so that I am not confused by internal preparation materials.

#### Acceptance Criteria

1. WHEN removing mock content, THE Documentation_System SHALL relocate `apps/docs/docs/demo-script.md` to `/docs/demo-script.md`
2. THE Documentation_System SHALL remove demo scripts from the Docusaurus site
3. WHEN mock content is identified, THE Documentation_System SHALL move it to the Root_Docs_Directory

### Requirement 5: Preserve End-User Documentation in Docusaurus

**User Story:** As an end user, I want to access architecture, SDK, and integration documentation through Docusaurus, so that I can understand and use JACK effectively.

#### Acceptance Criteria

1. THE Documentation_System SHALL retain `apps/docs/docs/overview.md` in Docusaurus
2. THE Documentation_System SHALL retain `apps/docs/docs/architecture.md` in Docusaurus
3. THE Documentation_System SHALL retain all content in `apps/docs/docs/sdk/` in Docusaurus
4. THE Documentation_System SHALL retain all content in `apps/docs/docs/contracts/` in Docusaurus
5. THE Documentation_System SHALL retain all content in `apps/docs/docs/integrations/` in Docusaurus
6. THE Documentation_System SHALL retain all content in `apps/docs/docs/whitepaper/` in Docusaurus

### Requirement 6: Update Docusaurus Configuration

**User Story:** As a documentation maintainer, I want the Docusaurus sidebar to reflect only end-user content, so that the navigation is clean and focused.

#### Acceptance Criteria

1. WHEN operations content is removed, THE Documentation_System SHALL update the Docusaurus sidebar configuration to remove operations entries
2. WHEN setup documentation is removed, THE Documentation_System SHALL update the Docusaurus sidebar configuration to remove setup entries
3. WHEN demo scripts are removed, THE Documentation_System SHALL update the Docusaurus sidebar configuration to remove demo script entries
4. THE Documentation_System SHALL ensure the sidebar contains only end-user facing sections

### Requirement 7: Maintain Documentation Integrity

**User Story:** As a documentation user, I want all cross-references to work correctly after reorganization, so that I can navigate documentation without encountering broken links.

#### Acceptance Criteria

1. WHEN documentation is moved, THE Documentation_System SHALL identify all cross-references in moved files
2. WHEN documentation is moved, THE Documentation_System SHALL update cross-references to reflect new file locations
3. WHEN documentation is moved, THE Documentation_System SHALL verify that no broken links are introduced
4. THE Documentation_System SHALL preserve all content during the move operation
