# SOP/Skill/SOP Versioning Documentation

**WantokJobs Platform**  
**Document Version:** 1.0  
**Last Updated:** 2026-03-25  
**Author:** Agent Zero  
**Status:** Production

---

## Executive Summary

This document defines the version control system for Standard Operating Procedures (SOPs), Skills, and Knowledge Base documentation in the WantokJobs platform. It establishes principles, processes, and tools for maintaining version history, tracking changes, and enabling rollback of documentation artifacts.

**Key Components:**
- Git-based version control for Knowledge Base (`knowledge/main/`)
- JSON-based version tracking for Skills (`skills.json`)
- Change management process for SOPs
- Version history table format
- Rollback procedures
- Audit trail requirements

**Benefits:**
- Change tracking and accountability
- Ability to rollback to previous versions
- Audit compliance for documentation changes
- Cross-referencing between related documents
- Historical context for decision-making

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Table of Contents](#table-of-contents)
3. [Version Control Principles](#3-version-control-principles)
4. [Git-Based Versioning (Knowledge Base)](#4-git-based-versioning-knowledge-base)
5. [Skill Versioning (skills.json)](#5-skill-versioning-skillsjson)
6. [SOP Version Management](#6-sop-version-management)
7. [Version History Table Format](#7-version-history-table-format)
8. [Change Management Process](#8-change-management-process)
9. [Rollback Procedures](#9-rollback-procedures)
10. [Branch Strategy](#10-branch-strategy)
11. [Release Management](#11-release-management)
12. [Documentation Standards](#12-documentation-standards)
13. [Audit Trail](#13-audit-trail)
14. [Best Practices](#14-best-practices)
15. [Summary](#15-summary)

---

## 3. Version Control Principles

### Core Principles

**1. All Changes Must Be Tracked**
- Every modification to SOPs, Skills, or Knowledge Base documentation must be versioned
- Version numbers follow Semantic Versioning (SemVer): MAJOR.MINOR.PATCH
- Change metadata includes: author, timestamp, reason, affected sections

**2. Version History Must Be Immutable**
- Previous versions remain accessible indefinitely
- Versions can be viewed but not modified retroactively
- Audit trail provides accountability and compliance

**3. Rollback Must Be Possible**
- System must support reverting to any previous version
- Rollback process documented and tested
- Critical for incident recovery and error correction

**4. Cross-References Must Be Maintained**
- Related documents link to specific versions
- Version dependencies documented ("Feature X requires SOP Y v2.3+")
- Breaking changes flagged and communicated

**5. Version Naming Convention**
```
MAJOR.MINOR.PATCH
- MAJOR: Breaking changes, significant restructuring
- MINOR: New sections, backward-compatible additions
- PATCH: Typo fixes, clarifications, minor updates

Examples:
- 1.0.0: Initial release
- 1.1.0: Added new section on MFA
- 1.1.1: Fixed typo in section 4
- 2.0.0: Complete restructure of authentication flow
```

---

## 4. Git-Based Versioning (Knowledge Base)

### Overview

The WantokJobs Knowledge Base (`/a0/usr/projects/project_1_-_wantokjobs/.a0proj/knowledge/`) uses Git as the primary version control system.

**Structure:**
```
knowledge/
├── main/                          # Core documentation
│   ├── STATUS-2026-03-20.md
│   ├── operatorless-workflow.md
│   ├── wantokjobs_onboarding_gap_audit.md
│   ├── wantokjobs_dashboard_api_map.md
│   ├── wantokjobs_role_permission_matrix.md
│   ├── wantokjobs_audit_action_items.md
│   ├── DEPLOYMENT-CHECKLIST.md
│   ├── wantokjobs_rbac_auth_audit.md
│   └── DEPLOYMENT-FIXES.md
├── fragments/                     # Reusable snippets
│   ├── scripts_automations_summary.md
│   └── jean_usage_and_limits.md
├── solutions/                     # Problem-solution pairs
│   └── dev_onboarding_and_agent_audit_sop.md
└── linkedin_oauth_integration.md
```

### Git Workflow

**1. Viewing Version History**
```bash
cd /a0/usr/projects/project_1_-_wantokjobs/.a0proj/knowledge/main
git log --oneline wantokjobs_audit_action_items.md
# Output: List of all commits affecting this file
```

**2. Viewing Specific Version**
```bash
# View file at specific commit
git show abc123:main/wantokjobs_audit_action_items.md

# View diff between versions
git diff abc123 def456 main/wantokjobs_audit_action_items.md
```

**3. Creating New Version**
```bash
# Edit file
vim main/wantokjobs_audit_action_items.md

# Stage changes
git add main/wantokjobs_audit_action_items.md

# Commit with descriptive message
git commit -m "docs: Update audit action items - Add MFA documentation requirement (v1.2.0)"
```

**4. Tagging Releases**
```bash
# Tag major versions
git tag -a knowledge-v1.0.0 -m "Initial Knowledge Base release"
git push origin knowledge-v1.0.0

# List all tags
git tag -l "knowledge-*"
```

### Commit Message Convention

**Format:** `<type>: <subject> (v<version>)`

**Types:**
- `docs`: Documentation changes
- `feat`: New documentation section
- `fix`: Corrections or clarifications
- `refactor`: Restructuring without content changes
- `chore`: Maintenance tasks

**Examples:**
```
docs: Add RBAC role permission matrix (v1.1.0)
fix: Correct API endpoint in deployment checklist (v1.0.1)
feat: Add feature gap audit documentation (v1.2.0)
refactor: Reorganize knowledge/main structure (v2.0.0)
```

---

## 5. Skill Versioning (skills.json)

### Overview

WantokJobs Skills (`/a0/usr/projects/project_1_-_wantokjobs/.a0proj/skills/`) use a JSON-based version tracking system.

**Structure:**
```json
{
  "skills": [
    {
      "id": "wantokjobs_core",
      "title": "WantokJobs Core Operations",
      "description": "Core platform operations and knowledge",
      "version": "2.1.0",
      "last_updated": "2026-03-24T10:00:00Z",
      "author": "Agent Zero",
      "path": "wantokjobs_core/SKILL.md",
      "changelog": [
        {
          "version": "2.1.0",
          "date": "2026-03-24",
          "changes": "Added Task 18 Smart Matching System documentation",
          "author": "Agent Zero"
        },
        {
          "version": "2.0.0",
          "date": "2026-03-20",
          "changes": "Major restructure - separated discovery and SES skills",
          "author": "Agent Zero"
        }
      ]
    }
  ]
}
```

### Version Management

**1. Updating Skill Version**
```bash
# Edit skill content
vim skills/wantokjobs_core/SKILL.md

# Update skills.json with new version
vim skills/skills.json
# - Increment version number (SemVer)
# - Update last_updated timestamp
# - Add changelog entry

# Commit changes
git add skills/
git commit -m "feat: Update wantokjobs_core skill - Add smart matching (v2.1.0)"
```

**2. Creating New Skill**
```bash
# Create skill directory and SKILL.md
mkdir -p skills/new_skill_name
cat > skills/new_skill_name/SKILL.md << 'SKILL'
# Skill: New Skill Name
...
SKILL

# Add to skills.json
vim skills/skills.json
# Add new skill entry with version 1.0.0

# Commit
git add skills/
git commit -m "feat: Add new_skill_name skill (v1.0.0)"
```

**3. Skill Dependencies**

Skills can reference specific versions of other skills:

```markdown
# Skill: WantokJobs Discovery

## Dependencies
- wantokjobs_core v2.0.0+
- wantokjobs_ses_deliverability v1.1.0+
```

---

## 6. SOP Version Management

### Overview

Standard Operating Procedures (SOPs) are versioned using:
1. Git commits (immutable history)
2. In-document version headers
3. Cross-reference tables

### SOP Document Header

**Template:**
```markdown
# SOP: Title

**Document ID:** SOP-001  
**Version:** 2.1.0  
**Last Updated:** 2026-03-24  
**Author:** Agent Zero  
**Status:** Active  
**Supersedes:** SOP-001 v2.0.0  

---

## Version History

| Version | Date | Author | Changes | Commit |
|---------|------|--------|---------|--------|
| 2.1.0 | 2026-03-24 | Agent Zero | Added MFA section | abc123 |
| 2.0.0 | 2026-03-20 | Agent Zero | Complete restructure | def456 |
| 1.1.0 | 2026-03-15 | Agent Zero | Added OAuth flows | ghi789 |
| 1.0.0 | 2026-03-10 | Agent Zero | Initial release | jkl012 |
```

### SOP Lifecycle States

**Status Values:**
- **Draft**: Under development, not yet reviewed
- **Review**: Under review by stakeholders
- **Active**: Approved and in use
- **Deprecated**: Replaced by newer version, kept for reference
- **Archived**: No longer relevant, kept for historical purposes

**State Transitions:**
```
Draft → Review → Active → Deprecated → Archived
              ↑     ↓
              └─────┘ (Updates)
```

### Updating SOPs

**Minor Updates (v1.1.x → v1.2.x):**
1. Edit SOP document
2. Update version header (increment MINOR)
3. Add entry to Version History table
4. Update "Last Updated" date
5. Commit with descriptive message

**Major Updates (v1.x.x → v2.0.0):**
1. Consider creating new SOP document (SOP-002)
2. If updating in place:
   - Update version header (increment MAJOR)
   - Set "Supersedes" to previous version
   - Update "Status" of old version to "Deprecated"
   - Document breaking changes in Version History
3. Communicate changes to all stakeholders
4. Update cross-references in related documents

---

## 7. Version History Table Format

### Standard Table Format

All SOPs and Skills should include a version history table in their headers.

**Template:**
```markdown
| Version | Date | Author | Changes | Commit |
|---------|------|--------|---------|--------|
| 2.1.0 | 2026-03-24 | Agent Zero | Added MFA section | abc123 |
| 2.0.0 | 2026-03-20 | Agent Zero | Complete restructure | def456 |
| 1.1.0 | 2026-03-15 | Agent Zero | Added OAuth flows | ghi789 |
| 1.0.0 | 2026-03-10 | Agent Zero | Initial release | jkl012 |
```

**Column Descriptions:**
- **Version**: SemVer format (MAJOR.MINOR.PATCH)
- **Date**: YYYY-MM-DD format
- **Author**: Name of person who made changes
- **Changes**: Brief summary (1-2 sentences max)
- **Commit**: Git commit hash (short, 6-8 characters)

### Cross-Reference Format

When referencing other versioned documents:

**Format:** `[Document Name] v[Version]`

**Examples:**
- "See RBAC_ROLE_PERMISSION_MATRIX.md v1.0.0 for role definitions"
- "Requires wantokjobs_core skill v2.0.0+"
- "Supersedes Authentication Flows SOP v1.5.0"

---

## 8. Change Management Process

### Overview

All changes to SOPs, Skills, and Knowledge Base documentation follow a structured process.

### Change Request Workflow

**1. Identify Need for Change**
- New feature requires documentation
- Existing documentation outdated
- Error or ambiguity discovered
- Compliance requirement

**2. Draft Changes**
- Create feature branch: `git checkout -b docs/update-sop-001`
- Edit document(s)
- Update version number in header
- Add entry to Version History table
- Update "Last Updated" date
- Document cross-references if affected

**3. Review Changes**
- Self-review: Check for clarity, accuracy, completeness
- Peer review (if available): Technical accuracy, compliance
- Stakeholder review (if major change): Business impact, user experience

**4. Approve Changes**
- Minor changes (PATCH): Self-approval
- Medium changes (MINOR): Peer approval
- Major changes (MAJOR): Stakeholder approval

**5. Commit & Deploy**
```bash
# Stage changes
git add docs/

# Commit with conventional commit message
git commit -m "docs: Update SOP-001 - Add MFA section (v2.1.0)"

# Push to main
git push origin docs/update-sop-001

# Merge to main (or create PR for review)
git checkout main
git merge docs/update-sop-001
git push origin main
```

**6. Communicate Changes**
- Email stakeholders (major changes)
- Update related documents
- Post announcement (if user-facing)
- Update training materials (if applicable)

### Change Types & Approval Matrix

| Change Type | Version Increment | Approval Required | Communication |
|-------------|-------------------|-------------------|---------------|
| Typo fix | PATCH (1.0.0 → 1.0.1) | Self | None |
| Clarification | PATCH (1.0.0 → 1.0.1) | Self | None |
| New section | MINOR (1.0.0 → 1.1.0) | Peer | Email team |
| Breaking change | MAJOR (1.0.0 → 2.0.0) | Stakeholder | Announcement |
| Complete rewrite | MAJOR (1.0.0 → 2.0.0) | Stakeholder | Training |

---

## 9. Rollback Procedures

### Overview

Rollback allows reverting to a previous version of documentation when:
- New version contains errors
- Breaking changes cause issues
- Compliance requirements change
- Stakeholder decision reversal

### Git-Based Rollback

**Method 1: Revert Single Commit**
```bash
# Find commit hash
git log --oneline main/wantokjobs_audit_action_items.md

# Revert commit (creates new commit that undoes changes)
git revert abc123

# Push
git push origin main
```

**Method 2: Hard Reset (Use with caution)**
```bash
# Reset to previous commit
git reset --hard def456

# Force push (overwrites remote)
git push origin main --force

# WARNING: This rewrites history, use only if no one else has pulled changes
```

**Method 3: Cherry-Pick Previous Version**
```bash
# View file at previous commit
git show def456:main/wantokjobs_audit_action_items.md > temp.md

# Replace current file
mv temp.md main/wantokjobs_audit_action_items.md

# Commit
git add main/wantokjobs_audit_action_items.md
git commit -m "docs: Rollback to v1.5.0 due to errors in v1.6.0"
git push origin main
```

### Skill Versioning Rollback

**Steps:**
1. Edit `skills/skills.json` to revert version number and changelog
2. Replace skill SKILL.md file with previous version from git
3. Commit changes with rollback message
4. Update any dependent skills to reference rolled-back version

**Example:**
```bash
# Get previous version of skill
git show abc123:skills/wantokjobs_core/SKILL.md > skills/wantokjobs_core/SKILL.md

# Edit skills.json to revert version (2.1.0 → 2.0.0)
vim skills/skills.json

# Commit
git add skills/
git commit -m "revert: Rollback wantokjobs_core skill to v2.0.0"
git push origin main
```

### Rollback Communication

**Template:**
```markdown
# Rollback Notice: [Document Name] v[New Version] → v[Old Version]

**Date:** 2026-03-24
**Author:** Agent Zero
**Reason:** [Brief explanation]

**Changes Reverted:**
- [Change 1]
- [Change 2]

**Action Required:**
- Update any references to v[New Version]
- Review dependent documents
- Contact [stakeholder] if questions
```

---

## 10. Branch Strategy

### Main Branch
- Primary branch: `main`
- Always production-ready
- Direct commits allowed for minor changes (PATCH)
- Protected branch for major changes (MAJOR)

### Feature Branches
- Naming: `docs/feature-name` or `docs/update-sop-001`
- Created for major documentation changes
- Merged to main after review
- Deleted after merge

---

## 11. Release Management

### Release Process
1. Tag major versions: `git tag -a knowledge-v2.0.0 -m "Major release"`
2. Push tags: `git push origin --tags`
3. Create GitHub release with changelog
4. Communicate to stakeholders

### Release Notes Template
```markdown
# Release Notes: Knowledge Base v2.0.0

**Release Date:** 2026-03-24
**Author:** Agent Zero

## Changes
- [Major] Restructured authentication documentation
- [Minor] Added MFA section
- [Patch] Fixed typos in deployment checklist

## Breaking Changes
- Authentication flow completely redesigned
- Old references to v1.x are deprecated

## Migration Guide
- Update references to authentication SOP
- Review dependent documents
```

---

## 12. Documentation Standards

### File Naming
- Lowercase with hyphens: `wantokjobs-audit-action-items.md`
- Descriptive names: `authentication-flows-documentation.md`
- Version suffix optional: `sop-001-v2.0.0.md`

### Markdown Formatting
- H1: Document title
- H2: Major sections
- H3: Subsections
- Code blocks: Use triple backticks with language
- Tables: Use markdown tables for structured data
- Links: Use descriptive text, not URLs

### Version Header
```markdown
# Document Title

**Version:** 1.0.0  
**Last Updated:** 2026-03-24  
**Author:** Agent Zero  
**Status:** Active  
```

---

## 13. Audit Trail

### Git Commit Log
All changes tracked in Git commit history:
```bash
git log --oneline --all -- knowledge/main/
```

### Version History Table
Each document maintains internal version history table showing:
- Version number
- Date
- Author
- Changes summary
- Git commit hash

### Metadata
- Document ID (SOP-001, SKILL-002, etc.)
- Creation date
- Last updated date
- Author
- Status (Draft/Review/Active/Deprecated/Archived)
- Supersedes field (references previous version)

---

## 14. Best Practices

1. **Commit Often** - Small, atomic commits are easier to review and rollback
2. **Descriptive Messages** - Use conventional commit format with clear descriptions
3. **Review Before Commit** - Self-review for clarity, accuracy, completeness
4. **Update Cross-References** - When versioning a document, update all references in related documents
5. **Test Documentation** - Follow documented procedures to verify accuracy
6. **Archive, Don't Delete** - Mark as Archived instead of deleting outdated documentation
7. **Version Dependencies** - Document which versions of related documents are required
8. **Regular Audits** - Quarterly review of all Active documentation for accuracy

---

## 15. Summary

This document establishes a comprehensive versioning system for WantokJobs documentation:

**Key Components:**
- Git-based version control for Knowledge Base
- JSON-based version tracking for Skills
- In-document version headers for SOPs
- Change management process with approval matrix
- Rollback procedures (3 methods)
- Audit trail with git commit log + version history tables

**Benefits:**
- Complete change history and accountability
- Ability to rollback to any previous version
- Cross-referencing between related document versions
- Compliance with audit requirements
- Historical context for decision-making

**Adoption:**
- All new documentation must follow this versioning system
- Existing documentation should be migrated gradually
- Training materials updated to reflect versioning practices
- Regular audits to ensure compliance

**Maintenance:**
- Review this document annually
- Update as new tools or practices emerge
- Collect feedback from documentation authors
- Continuous improvement of versioning processes

---

**Document Version:** 1.0.0  
**Status:** Active  
**Next Review:** 2027-03-24  

**End of SOP/Skill/SOP Versioning Documentation**

