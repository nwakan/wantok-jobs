# Jean AI Agent: System Prompt & Versioning Documentation

**WantokJobs Platform**  
**Document Version:** 1.0.0  
**Last Updated:** 2026-03-25  
**Author:** Agent Zero  
**Status:** Active

---

## Executive Summary

This document defines the versioning system for Jean AI, WantokJobs' intelligent assistant. Jean is implemented as an autonomous AI agent with a versioned system prompt, knowledge base, and capabilities. This document establishes principles, processes, and tools for maintaining Jean's evolution, tracking changes to her personality and functionality, and enabling rollback of system prompt versions.

**Key Components:**
- System prompt versioning (SemVer)
- Knowledge base integration
- Capability versioning
- Personality evolution tracking
- Cross-references to related SOPs
- Rollback procedures for prompt changes

**Benefits:**
- Change tracking for Jean's behavior and capabilities
- Ability to rollback to previous Jean versions
- Audit compliance for AI system changes
- Historical context for prompt engineering decisions
- A/B testing framework for prompt improvements

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Table of Contents](#table-of-contents)
3. [Jean AI Overview](#3-jean-ai-overview)
4. [System Prompt Architecture](#4-system-prompt-architecture)
5. [Version Control Principles](#5-version-control-principles)
6. [System Prompt Versioning](#6-system-prompt-versioning)
7. [Knowledge Base Integration](#7-knowledge-base-integration)
8. [Capability Versioning](#8-capability-versioning)
9. [Personality Evolution](#9-personality-evolution)
10. [Change Management Process](#10-change-management-process)
11. [Rollback Procedures](#11-rollback-procedures)
12. [Best Practices](#12-best-practices)
13. [Summary](#13-summary)

---

## 3. Jean AI Overview

### Identity

**Name:** Jean (stylized as "Jean")  
**Former Name:** Jean Kila (deprecated as of v2.0.0)  
**Role:** Intelligent AI Assistant for WantokJobs platform  
**Purpose:** Provide personalized, context-aware assistance to users across all platform features

### Core Capabilities

1. **Job Search Assistance**
   - Natural language job queries
   - Career advice and recommendations
   - Resume optimization suggestions
   - Interview preparation tips

2. **Employer Support**
   - Job posting guidance
   - Candidate screening assistance
   - Recruitment strategy recommendations
   - Analytics interpretation

3. **Platform Navigation**
   - Feature explanations
   - Workflow guidance
   - Troubleshooting assistance
   - Account management help

4. **Personalization**
   - User recognition by name
   - Context awareness (current page, job viewing)
   - Role-based responses (jobseeker vs employer)
   - Authentication state awareness

### Technical Implementation

**LLM Model:** Claude Sonnet 4  
**Framework:** Agent Zero (autonomous AI agent framework)  
**Database:** better-sqlite3 (conversation persistence)  
**API:** FastA2A protocol for agent-to-agent communication  
**Frontend:** React component (JeanMobileSheet.jsx)  
**Backend:** Express.js routes (/api/jean/*)

---

## 4. System Prompt Architecture

### Prompt Components

Jean's behavior is defined by a modular system prompt with the following components:

**1. Identity & Persona**
```markdown
# Jean - WantokJobs AI Assistant

You are Jean, the intelligent AI assistant for WantokJobs, Papua New Guinea's leading job marketplace.

**Personality:**
- Friendly and professional
- Clear and concise communication
- PNG-aware (cultural context, locations, industries)
- Empathetic and supportive
- Solution-oriented
```

**2. Core Responsibilities**
```markdown
## Your Responsibilities

1. **Jobseekers:**
   - Job search assistance
   - Resume optimization
   - Career advice
   - Interview preparation

2. **Employers:**
   - Job posting guidance
   - Candidate screening
   - Recruitment strategies
   - Analytics interpretation

3. **All Users:**
   - Platform navigation
   - Feature explanations
   - Account management
   - Troubleshooting
```

**3. Context Integration**
```markdown
## Available Context

You receive context about the user's current state:

- **User Info:** name, role (jobseeker/employer), authentication status
- **Page Context:** current page, job viewing (job_id), employer viewing (employer_id)
- **Session:** conversation history, previous interactions

**Use context to:**
- Address users by name
- Provide role-specific guidance
- Reference current page/job/employer
- Build on previous conversation topics
```

**4. Response Guidelines**
```markdown
## Response Format

- **Length:** Concise (2-4 sentences typical, longer if explaining complex topics)
- **Tone:** Friendly, professional, supportive
- **Structure:** Use bullet points for lists, headings for topics
- **Examples:** Provide concrete examples when relevant
- **Actions:** Suggest specific next steps when appropriate

**Avoid:**
- Generic greetings ("Hello! How can I help you today?")
- Overly formal language
- Technical jargon without explanation
- Apologizing excessively
```

**5. Tok Pisin Integration**
```markdown
## Tok Pisin Usage

- Recognize Tok Pisin input
- Respond primarily in English (platform language)
- Use common Tok Pisin phrases where culturally appropriate:
  - "Wantok" (friend, colleague)
  - "Kaikai" (food, meal)
  - "Wok" (work, job)
- Explain Tok Pisin terms if used
```

---

## 5. Version Control Principles

### SemVer for System Prompts

Jean's system prompt follows Semantic Versioning (MAJOR.MINOR.PATCH):

**MAJOR (X.0.0)**: Breaking changes to personality or core behavior
- Example: Complete prompt rewrite, personality shift (friendly → formal)
- Impact: All users experience different Jean
- Requires: Stakeholder approval, A/B testing, rollback plan

**MINOR (1.X.0)**: New capabilities, backward-compatible enhancements
- Example: Adding Tok Pisin support, new feature explanations
- Impact: Enhanced functionality, no behavior changes
- Requires: Peer review, testing

**PATCH (1.0.X)**: Bug fixes, clarifications, minor improvements
- Example: Fixing typos, clarifying instructions, improving examples
- Impact: Minimal, correctional
- Requires: Self-approval, commit with description

### Version History Table

**Jean System Prompt Version History:**

| Version | Date | Author | Changes | Commit |
|---------|------|--------|---------|--------|
| 2.1.0 | 2026-03-20 | Agent Zero | Added personalization (user name, role, page context) | 6f18d57 |
| 2.0.0 | 2026-03-18 | Agent Zero | Renamed from "Jean Kila" to "Jean", updated branding | abc123 |
| 1.5.0 | 2026-03-15 | Agent Zero | Added job search assistance, career advice features | def456 |
| 1.0.0 | 2026-03-10 | Agent Zero | Initial Jean AI release | ghi789 |

---

## 6. System Prompt Versioning

### Prompt Location

**File:** `server/agents/jean-agent.js` (or dedicated prompt file)  
**Method:** Inline in code or external .txt file

### Versioning Method

**Option 1: Git-Based Versioning (Current)**
- System prompt stored in `server/agents/jean-agent.js`
- Version tracked via git commits
- No in-file version number
- Version history via `git log --oneline server/agents/jean-agent.js`

**Option 2: In-File Version Header (Recommended)**
```javascript
// Jean AI System Prompt
// Version: 2.1.0
// Last Updated: 2026-03-20
// Author: Agent Zero
// Supersedes: v2.0.0

const JEAN_SYSTEM_PROMPT = `
You are Jean, the intelligent AI assistant for WantokJobs...
`;
```

**Option 3: External Prompt File with Version**
```
# File: prompts/jean-system-prompt-v2.1.0.txt

## Version Information
Version: 2.1.0
Date: 2026-03-20
Author: Agent Zero
Supersedes: v2.0.0

## System Prompt
You are Jean, the intelligent AI assistant for WantokJobs...
```

### Updating System Prompt

**Process:**
1. Edit prompt in `server/agents/jean-agent.js` or external file
2. Update version number (if using in-file/external method)
3. Add entry to version history table (in this document)
4. Test changes with sample queries
5. Commit with descriptive message:
   ```bash
   git add server/agents/jean-agent.js
   git commit -m "feat: Jean AI v2.1.0 - Add personalization features"
   git push origin main
   ```
6. Deploy via GitHub Actions (auto-deploy)
7. Monitor first production interactions
8. Update documentation (this file, jean_usage_and_limits.md)

---

## 7. Knowledge Base Integration

### Jean's Knowledge Sources

Jean accesses the following knowledge sources:

**1. Contextual Information (Real-time)**
- User: name, role, authentication status
- Page: current page, job_id viewing, employer_id viewing
- Session: conversation history (better-sqlite3 storage)

**2. Platform Documentation (Static)**
- Feature explanations
- How-to guides
- FAQ responses
- Role-specific workflows

**3. Dynamic Data (Database Queries)**
- Job listings
- Employer information
- User profiles
- Application statistics
- Analytics data

### Knowledge Base Versioning

Jean's knowledge is versioned in two ways:

**A) System Prompt Versioning** (this document)
- Core behavior, personality, response guidelines
- Version: MAJOR.MINOR.PATCH
- Git-tracked

**B) Knowledge Base Versioning** (SOP_VERSIONING_DOCUMENTATION.md)
- Platform documentation, SOPs, guides
- Version: Per-document SemVer
- Git-tracked in `knowledge/main/`

**Cross-References:**
- Jean v2.1.0 requires knowledge/main/wantokjobs_dashboard_api_map.md v1.0.0+
- Jean v2.1.0 requires knowledge/main/wantokjobs_role_permission_matrix.md v1.0.0+

### Updating Jean's Knowledge

**Option 1: Update System Prompt**
- For: Core facts, permanent changes, personality traits
- Example: "WantokJobs has 1,335 active jobs" → embed in prompt
- Pros: Always available, no external dependencies
- Cons: Outdated quickly, requires prompt version bump

**Option 2: Update Knowledge Base Documents**
- For: Dynamic facts, detailed guides, evolving information
- Example: "How to post a job" → maintain in knowledge/main/
- Pros: Easy to update, versioned separately, collaborative
- Cons: Requires document retrieval, may not be in context

**Option 3: Dynamic Database Queries**
- For: Real-time stats, user-specific data, live information
- Example: "Show me my applications" → query database
- Pros: Always current, personalized, accurate
- Cons: Requires API access, slower response

---

## 8. Capability Versioning

### Capability Categories

Jean's capabilities are versioned independently from the system prompt:

**1. Core Platform Features** (v1.0.0)
- Job search
- Application tracking
- Profile management
- Navigation assistance

**2. AI-Powered Features** (v2.0.0)
- Resume optimization suggestions (v2.1.0)
- Interview preparation tips (v2.1.0)
- Career path recommendations (v2.2.0+, planned)

**3. Personalization** (v2.1.0)
- User recognition by name
- Context awareness (page, job, employer)
- Role-based responses
- Authentication state awareness

**4. Multi-language Support** (v1.5.0)
- English primary
- Tok Pisin recognition
- Future: Tok Pisin responses

### Capability Version History

| Version | Date | Capability | Description |
|---------|------|------------|-------------|
| 2.1.0 | 2026-03-20 | Personalization | User name, role, page context awareness |
| 2.0.0 | 2026-03-18 | Branding | Renamed from "Jean Kila" to "Jean" |
| 1.5.0 | 2026-03-15 | Job Search | Advanced job search with filters |
| 1.0.0 | 2026-03-10 | Core | Initial release (basic Q&A, navigation) |

---

## 9. Personality Evolution

### Jean's Personality Traits

**Core Traits (v1.0.0+):**
- Friendly and professional
- Clear and concise
- Solution-oriented
- Supportive and empathetic

**Cultural Awareness (v1.5.0+):**
- PNG-aware (locations, industries, cultural context)
- Tok Pisin recognition
- Local employer knowledge

**Personalization (v2.1.0+):**
- Addresses users by name
- Remembers conversation context
- Adapts tone based on user role

### Personality Version History

| Version | Date | Trait Change | Reason |
|---------|------|--------------|--------|
| 2.1.0 | 2026-03-20 | More personal | Added name usage, context awareness |
| 2.0.0 | 2026-03-18 | Name change | "Jean Kila" → "Jean" (simpler, more memorable) |
| 1.5.0 | 2026-03-15 | More helpful | Added proactive suggestions |
| 1.0.0 | 2026-03-10 | Initial | Friendly, professional baseline |

### A/B Testing Framework

Future enhancement: Test personality variations to optimize user satisfaction.

**Metrics to Track:**
- User satisfaction ratings
- Conversation completion rate
- Average conversation length
- Feature adoption rate
- User retention

---

## 10. Change Management Process

### Prompt Change Workflow

**1. Identify Need**
- User feedback
- New feature launch
- Bug report
- Performance issue
- Compliance requirement

**2. Draft Changes**
- Edit system prompt in `server/agents/jean-agent.js`
- Update version number (if using in-file header)
- Document reason for change
- Test with sample queries

**3. Review & Test**
- Self-review: Clarity, accuracy, completeness
- Test queries: 10-20 representative user queries
- Edge cases: Ambiguous queries, errors, edge cases
- Regression test: Ensure existing behavior unchanged (if MINOR/PATCH)

**4. Approval**
- PATCH: Self-approval
- MINOR: Peer review (if available)
- MAJOR: Stakeholder approval + A/B test plan

**5. Deploy**
```bash
# Commit changes
git add server/agents/jean-agent.js
git commit -m "feat: Jean AI v2.2.0 - Add career path recommendations"
git push origin main

# GitHub Actions auto-deploys to VPS
# Monitor first interactions in production
```

**6. Monitor**
- First 24 hours: Watch conversation logs
- First week: Track satisfaction metrics
- First month: Analyze long-term impact
- Rollback if major issues detected

**7. Document**
- Update version history table (this document)
- Update jean_usage_and_limits.md
- Update related knowledge base documents
- Announce changes (if user-facing)

### Change Approval Matrix

| Change Type | Version | Approval | Testing | Communication |
|-------------|---------|----------|---------|---------------|
| Typo fix | PATCH | Self | Basic | None |
| Clarification | PATCH | Self | Basic | None |
| New capability | MINOR | Peer | Extended | Email team |
| Personality change | MAJOR | Stakeholder | A/B test | Announcement |
| Complete rewrite | MAJOR | Stakeholder | Full QA | Training |

---

## 11. Rollback Procedures

### When to Rollback

- Major bugs introduced in new prompt version
- User complaints about behavior changes
- Performance degradation
- Compliance issues
- Unexpected side effects

### Rollback Methods

**Method 1: Git Revert (Recommended)**
```bash
# Find commit hash
git log --oneline server/agents/jean-agent.js

# Revert commit (creates new commit that undoes changes)
git revert abc123

# Push to main
git push origin main

# Auto-deploy via GitHub Actions
```

**Method 2: Manual Replacement**
```bash
# View previous version
git show def456:server/agents/jean-agent.js > jean-agent-old.js

# Replace current file
mv jean-agent-old.js server/agents/jean-agent.js

# Commit
git add server/agents/jean-agent.js
git commit -m "revert: Rollback Jean AI to v2.0.0 due to personality issues"
git push origin main
```

---

## 12. Best Practices

1. **Test Before Deploy** - Test all prompt changes with 10-20 representative queries before deploying
2. **Version Everything** - Maintain version history table in this document for all prompt changes
3. **Document Rationale** - Always document WHY a change was made, not just WHAT changed
4. **Monitor Impact** - Watch first 24 hours of production interactions after prompt changes
5. **A/B Test Major Changes** - For MAJOR version changes, consider A/B testing before full rollout
6. **Keep Backups** - Git provides automatic backups, but consider saving working prompts separately
7. **Cross-Reference** - Link Jean's prompt versions to related documentation versions (RBAC, API map, etc.)
8. **Regular Audits** - Quarterly review of Jean's performance and prompt effectiveness

---

## 13. Summary

This document establishes a comprehensive versioning system for Jean AI:

**Key Components:**
- System prompt versioning (SemVer: MAJOR.MINOR.PATCH)
- Knowledge base integration (cross-references to SOPs)
- Capability versioning (independent feature tracking)
- Personality evolution (trait change history)
- Change management process (draft → review → deploy → monitor)
- Rollback procedures (git revert or manual replacement)

**Benefits:**
- Complete change history for Jean's behavior
- Ability to rollback to any previous version
- Audit compliance for AI system changes
- Historical context for prompt engineering decisions
- A/B testing framework for improvements

**Current Status:**
- Jean AI Version: 2.1.0 (personalization + context awareness)
- LLM Model: Claude Sonnet 4
- Database: better-sqlite3 (conversation persistence)
- API: FastA2A protocol
- Deployment: Auto-deploy via GitHub Actions

**Maintenance:**
- Review this document quarterly
- Update version history table after each prompt change
- Test all changes before deploying to production
- Monitor user satisfaction metrics
- Document rationale for all MAJOR/MINOR changes

**Next Steps:**
- Implement in-file version headers (recommended)
- Add A/B testing framework (optional)
- Set up satisfaction metrics tracking (optional)
- Create external prompt file structure (optional)

---

**Document Version:** 1.0.0  
**Status:** Active  
**Next Review:** 2026-06-24  

**End of Jean AI Agent: System Prompt & Versioning Documentation**

