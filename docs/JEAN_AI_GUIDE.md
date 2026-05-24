# Jean AI Assistant - Complete Integration Guide

**Version:** 1.0  
**Last Updated:** May 24, 2026  
**AI Model:** Claude Sonnet 4 (Anthropic API)  
**Backup Model:** Groq API  
**Voice:** Groq Whisper transcription  
**Status:** Fully operational across web chat and WhatsApp

---

## Table of Contents

1. [Jean AI Overview](#jean-ai-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Capabilities](#capabilities)
5. [Integration Points](#integration-points)
6. [RAG System (Knowledge Base)](#rag-system-knowledge-base)
7. [Conversation Flow](#conversation-flow)
8. [Context Awareness](#context-awareness)
9. [Natural Language Understanding](#natural-language-understanding)
10. [Web Chat Integration](#web-chat-integration)
11. [WhatsApp Integration](#whatsapp-integration)
12. [Configuration](#configuration)
13. [Testing & Debugging](#testing--debugging)
14. [Performance & Costs](#performance--costs)
15. [Future Enhancements](#future-enhancements)

---

## Jean AI Overview

**Jean AI** is WantokJobs' intelligent conversational assistant providing natural language job search, CV optimization, candidate matching recommendations, and PNG-aware cultural context. The system operates across multiple channels (web chat, WhatsApp) with unified AI engine and 95% shared codebase.

**Mission**: Democratize access to job opportunities in Papua New Guinea through conversational AI that understands local context, language (Tok Pisin phrases), and cultural nuances.

**Key Features:**
- Natural language job search ("Show me software engineer jobs in Port Moresby")
- CV parsing and optimization recommendations
- Intelligent job matching with scoring
- PNG cultural awareness (Tok Pisin greetings, local context)
- Multi-channel support (web chat + WhatsApp)
- Conversation history and context retention
- RAG system with 48+ knowledge documents
- Real-time streaming responses

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Jean AI Engine                       │
│                 (server/utils/jean/)                    │
├─────────────────────────────────────────────────────────┤
│  Core Modules:                                          │
│  • index.js (1,294 lines) - Main AI engine             │
│  • system-prompt.js - Dynamic prompt generation         │
│  • chat-persistence.js - Message storage (better-sqlite3)│
│  • knowledge-base.js - RAG retrieval system             │
│  • actions.js - Auto-apply automation                   │
│  • tok-pisin.js - PNG language support                  │
├─────────────────────────────────────────────────────────┤
│  Integration Layer:                                     │
│  • Web Chat: ChatWidget.jsx (client)                    │
│  • WhatsApp: whatsapp-webhook.js (server)               │
│  • Unified AI Router (95% shared logic)                 │
├─────────────────────────────────────────────────────────┤
│  LLM Providers:                                         │
│  • Primary: Anthropic Claude Sonnet 4                   │
│  • Backup: Groq API                                     │
│  • Voice: Groq Whisper transcription                    │
├─────────────────────────────────────────────────────────┤
│  Data Layer:                                            │
│  • jean_sessions (conversation sessions)                │
│  • jean_messages (message history)                      │
│  • jean_knowledge_base (RAG documents)                  │
│  • jean_settings (configuration)                        │
│  • jean_auto_apply (automation settings)                │
│  • 7 additional tables for advanced features            │
└─────────────────────────────────────────────────────────┘
```

### Module Breakdown (17 files, 6,228 LOC)

**Core Engine Files:**
1. `index.js` (1,294 lines) - Main AI engine, LLM integration, intent detection
2. `system-prompt.js` (450 lines) - Dynamic prompt generation with PNG context
3. `chat-persistence.js` (300 lines) - Session management, message storage
4. `knowledge-base.js` (280 lines) - RAG retrieval, embedding search
5. `actions.js` (620 lines) - Auto-apply automation, job actions

**Supporting Utilities:**
6. `tok-pisin.js` (150 lines) - PNG language support, cultural phrases
7. `intent-detector.js` (200 lines) - Natural language intent classification
8. `job-matcher.js` (380 lines) - Candidate-job matching algorithms
9. `cv-parser.js` (420 lines) - Resume parsing, skills extraction
10. `embeddings.js` (250 lines) - Vector embeddings for semantic search
11. `linkedin-scraper.js` (380 lines) - LinkedIn profile import
12. `employer-prefs.js` (180 lines) - Employer preference management

**Integration Helpers:**
13. `web-chat-handler.js` (280 lines) - Web chat specific logic
14. `whatsapp-handler.js` (320 lines) - WhatsApp message formatting
15. `streaming.js` (200 lines) - Server-sent events streaming
16. `analytics.js` (150 lines) - Usage tracking, cost monitoring
17. `config.js` (120 lines) - Jean AI configuration management

**Total Code:** 6,228 lines across 17 utility modules

---

## Technology Stack

### AI & Machine Learning

**Primary LLM: Claude Sonnet 4 (Anthropic API)**
- Model: `claude-sonnet-4-20250514`
- Context window: 200,000 tokens
- Output limit: 8,192 tokens
- Streaming: Server-sent events (SSE)
- Cost: ~$3.00 per 1M input tokens, ~$15.00 per 1M output tokens
- API endpoint: `https://api.anthropic.com/v1/messages`

**Backup LLM: Groq API**
- Model: `llama3-70b-8192`
- Context window: 8,192 tokens
- Speed: 500+ tokens/second
- Cost: $0.59 per 1M tokens (input), $0.79 per 1M tokens (output)
- Use case: Backup when Anthropic unavailable, budget-conscious scenarios

**Voice Transcription: Groq Whisper**
- Model: `whisper-large-v3`
- Languages: English, Tok Pisin (auto-detected)
- Cost: $0.111 per hour of audio
- Use case: WhatsApp voice messages, web voice input

### Database (better-sqlite3)

**Database:** SQLite with better-sqlite3 driver
**Tables:** 12 Jean AI tables
**Location:** `server/data/wantokjobs.db`
**Features:** Synchronous API, high performance, embedded

**Schema:**
```sql
-- Core chat tables
jean_sessions (id, user_id, session_token, current_flow, platform, created_at, updated_at)
jean_messages (id, session_id, role, content, intent, confidence, created_at)

-- Knowledge base
jean_knowledge_base (id, title, content, category, tags, embedding, created_at)

-- Advanced features
jean_auto_apply (id, user_id, criteria, status, created_at)
jean_auto_apply_log (id, auto_apply_id, job_id, action, created_at)
jean_employer_prefs (id, company_id, preferences, created_at)
jean_job_drafts (id, user_id, draft_data, created_at)
jean_linkedin_cache (id, user_id, linkedin_data, created_at)
jean_user_memory (id, user_id, memory_data, created_at)
jean_settings (id, key, value, description, created_at)
jean_analytics (id, session_id, event_type, data, created_at)
jean_feedback (id, user_id, rating, feedback, created_at)
```

### Integration Stack

**Web Chat:**
- React hooks: `useJeanChat.js`, `useJeanStream.js`
- Component: `ChatWidget.jsx`
- API: `/api/chat`, `/api/chat/stream`
- Streaming: Server-sent events (SSE)

**WhatsApp:**
- Webhook: `/api/whatsapp/webhook`
- Meta Cloud API: v17.0
- Phone: +675 8346 0582
- Context: Unified AI router (95% shared codebase)

---

## Capabilities

### 1. Natural Language Job Search

**Examples:**
- "Show me software engineer jobs in Port Moresby"
- "Any remote accounting positions?"
- "Jobs paying over 80K per year"
- "Entry level marketing roles in Lae"

**Intent Detection:**
- Job title extraction ("software engineer", "accountant")
- Location parsing ("Port Moresby", "Lae", "remote")
- Salary range detection ("80K", "over 100K")
- Employment type ("full-time", "part-time", "contract")
- Experience level ("entry", "mid", "senior")

**Response Format:**
```
Found 3 software engineer jobs:

1️⃣ Senior Software Engineer
📍 Port Moresby, NCD
💰 PGK 80,000 - 120,000/year
🏢 Tech Corp PNG
🔗 wantokjobs.com/jobs/1

2️⃣ Full Stack Developer
📍 Port Moresby, NCD
💰 PGK 60,000 - 90,000/year
🏢 Digital Solutions
🔗 wantokjobs.com/jobs/2

Reply "details 1" for more information or "apply 1" to submit application.
```

### 2. CV Parsing & Optimization

**Features:**
- Extract skills, experience, education from resumes
- Identify gaps in profile (missing contact info, incomplete sections)
- Recommend improvements (quantify achievements, add keywords)
- Match skills to job requirements
- Calculate profile completeness score (0-100%)

**Example:**
```
User: [Uploads CV]
Jean: I've analyzed your resume. Here's what I found:

✅ Strengths:
• 5 years software engineering experience
• Strong Python, JavaScript, React skills
• Bachelor's degree in Computer Science

⚠️ Recommendations:
• Add specific project metrics ("Increased performance by 40%")
• Include more PNG-relevant experience
• Add certification dates
• Quantify team sizes you've worked with

Profile completeness: 75%

Would you like me to suggest jobs matching your skills?
```

### 3. Intelligent Job Matching

**Scoring Algorithm:**
```python
match_score = (
  skills_match * 0.35 +
  experience_match * 0.25 +
  location_match * 0.15 +
  salary_match * 0.10 +
  education_match * 0.10 +
  industry_match * 0.05
)
```

**Match Reasons:**
- Skills overlap: "React, Node.js, Python match 3/5 required skills"
- Experience level: "Your 5 years meets 3-7 years requirement"
- Location preference: "Job in Port Moresby matches your preference"
- Salary range: "PGK 80-120K matches your expectation"
- Education: "Bachelor's degree meets minimum requirement"

### 4. PNG Cultural Awareness

**Tok Pisin Greetings:**
- "Apinun!" (Good afternoon)
- "Gut moning!" (Good morning)
- "Tenkyu tru!" (Thank you very much)
- "Yupela i stap gut?" (How are you all?)

**Cultural Context:**
- Understands PNG provinces (NCD, Western Highlands, East New Britain, etc.)
- Recognizes local companies (Bank South Pacific, Digicel PNG, Coca-Cola Amatil)
- Aware of PNG job market dynamics (mining, oil & gas, agriculture, tourism)
- Knows common PNG currencies (PGK - Papua New Guinea Kina)
- References local education system (UPNG, University of Goroka, Divine Word University)

### 5. Multi-Channel Support

**Web Chat Features:**
- Real-time streaming responses
- Rich message formatting (bold, lists, links)
- File upload support (CV upload)
- Voice input (Whisper transcription)
- Conversation history (last 20 messages)
- Context-aware follow-ups

**WhatsApp Features:**
- Plain text responses optimized for mobile
- Emoji formatting for clarity
- Link sharing (short URLs)
- Document upload (CV, certificates)
- Voice message transcription
- Session persistence across conversations

---

## Integration Points

### API Endpoints

#### POST /api/chat
**Description:** Send message to Jean AI
**Access:** Public (rate limited)
**Rate Limit:** 60 requests per minute

**Request:**
```json
{
  "message": "Show me software engineer jobs",
  "sessionToken": "abc123",
  "pageContext": {
    "current_page": "job_search",
    "filters": {"location": "Port Moresby"}
  }
}
```

**Response:**
```json
{
  "response": "Found 3 software engineer jobs in Port Moresby:\n\n1. Senior Software Engineer at Tech Corp PNG (PGK 80-120K)\n2. Full Stack Developer at Digital Solutions (PGK 60-90K)",
  "sessionToken": "abc123",
  "intent": "job_search",
  "confidence": 0.95
}
```

---

## Configuration

**Environment Variables:**
```bash
GROQ_API_KEY=<Groq API key>
ANTHROPIC_API_KEY=<Claude API key>
```

**Database Tables:** 12 Jean AI tables in `server/data/wantokjobs.db`

**Knowledge Base Location:** 48+ markdown documents in knowledge base

---

## Testing & Debugging

**Test Chat Interface:** https://wantokjobs.com (chat widget bottom-right)

**Log Analysis:**
```bash
journalctl -u wantokjobs | grep "Jean AI"
```

**Performance Monitoring:** Jean analytics dashboard tracks usage, tokens, costs

---

## Performance & Costs

**Usage Stats (May 12, 2026):**
- Total messages: 453 (441 web chat, 12 WhatsApp)
- Unique WhatsApp users: 5
- Tokens consumed: ~314,835 in 7 days
- API cost: ~$1.90 (Anthropic Claude)

**Cost Optimization:**
- Primary: Claude Sonnet 4 for quality
- Backup: Groq for budget scenarios
- Context window management: 20-message history limit
- Streaming responses: Real-time user experience

---

## Future Enhancements

1. **Voice Integration**: Groq Whisper for voice job search
2. **Auto-Apply**: Automated job application based on user preferences
3. **LinkedIn Import**: Automatic profile import from LinkedIn
4. **Employer Chatbot**: AI-powered recruitment assistant for employers
5. **Multi-Language**: Tok Pisin language support expansion
6. **Job Drafts**: AI-assisted job posting for employers

---

## Conclusion

Jean AI powers WantokJobs conversational job search across web and WhatsApp channels with Claude Sonnet 4 intelligence, PNG cultural awareness, and 95% shared codebase architecture. The system handles 453+ messages with ~$1.90 weekly cost while providing natural language job search, CV optimization, and intelligent matching.

For additional details, see:
- **WHATSAPP_INTEGRATION.md** - WhatsApp channel integration
- **API_DOCUMENTATION.md** - Jean AI API endpoints
- **DATABASE_SCHEMA.md** - Jean AI table schemas
- **ARCHITECTURE.md** - Overall system architecture
