# OpenClaw Improvement Proposals

**Real-world experience from building [WantokJobs](https://wantokjobs.io/) — a job platform with agent-driven personalization, semantic search, and multi-agent orchestration.**

These are feature requests contributed back to the OpenClaw project. Each issue includes a problem statement, working examples from WantokJobs, current workarounds, and proposed solutions.

---

## Critical Priority (P0)

### Issue 1: Configurable Exec Timeout / Long-Running Task Support

**Title:** Allow infinite or configurable exec timeout for long-running processes

**Problem:**
The `exec` tool kills processes after approximately 2 minutes. For data-intensive tasks, this is a blocker:
- WantokJobs scraped 3,400 job URLs for semantic indexing → SIGKILL'd after 2 min
- Embedding generation for 5,000+ job descriptions killed mid-process
- Database migration scripts for complex schema changes interrupted

Example failure:
```
Long-running process [ 30% complete after 90 sec ]
... 
SIGKILL at 120 seconds
Error: Process terminated unexpectedly
```

**Current Workaround:**
- Bash wrapper with exponential backoff loop
- Split work into batches of 50-100 items
- Manual checkpointing to resume from last successful batch
- Doubled execution time due to overhead

**Proposed Solution:**
1. Add `timeout: 0` option (no timeout) or `timeout: 3600` (1 hour max)
2. OR introduce a `exec-background` tool that spawns persistent tasks and returns `taskId`
3. Implement status polling: `exec-status taskId` returns progress + logs
4. Add output streaming for long tasks (reduce context bloat by returning summary every 30 sec)

**Impact:**
- Unlocks full data pipeline automation (scraping, indexing, migrations)
- Enables batch processing without manual intervention
- Reduces engineering overhead for data engineers using OpenClaw

**Priority:** P0 (blocking production automation)

---

### Issue 2: Sub-Agent Timeout Extension (Checkpoint/Resume)

**Title:** Extend sub-agent max runtime or add checkpoint/resume capability

**Problem:**
Sub-agents have a 10-minute hard limit (`runTimeoutSeconds: 600`). Complex builds barely finish:
- WantokJobs personalization suite: 10 source files, 3 sub-agents, 2 DB migrations, schema generation
  - Agent 1: Vector embeddings + model training (5 min)
  - Agent 2: Resume parsing + skill extraction (4 min)
  - Agent 3: Matching algorithm + tests (4 min)
  - Result: All 3 agents hit timeout trying to coordinate
- CI/CD pipeline to build Docker image for QR code service (~8 min, usually fails at 9:30)

**Current Workaround:**
- Manual task decomposition into smaller sub-agents
- Careful timing of each step
- Sacrificed test coverage to fit within 10-minute window
- Risk of incomplete builds pushing to production

**Proposed Solution:**
1. Increase limit to 15-20 minutes for complex multi-agent builds
2. OR add checkpoint system: sub-agent calls `checkpoint('state.json', data)` at completion
3. Add resume: pass `resume: 'previous-task-id'` to continue from last checkpoint
4. Implement persistent sub-agent session state that survives timeouts

**Impact:**
- Enables full-stack CI/CD automation (build + test + deploy)
- Reduces manual human intervention in complex orchestration workflows
- Makes multi-agent collaboration viable for real production systems

**Priority:** P0 (blocking multi-agent production systems)

---

### Issue 3: Default Cron Model Configuration

**Title:** Add `defaultCronModel` config to openclaw.json

**Problem:**
New cron jobs inherit the primary agent's model (Opus 4.6, ~expensive). WantokJobs has 14 cron jobs:
- Personalized digest generation (daily) — doesn't need Opus, uses Haiku templates
- Job alert matching — straightforward vector search, Haiku-grade logic
- Weekly trending skill analysis — batch processing, high latency tolerance
- Each job using Opus costs 8-10x more than necessary

Cost example:
- Opus: ~$0.015/1K input tokens
- Haiku: ~$0.0008/1K input tokens
- 14 jobs × 2 days × 50K tokens/job = 1.4M tokens/day
- Monthly difference: Opus $21/day vs Haiku $1.12/day → **$600+ annual savings with Haiku**

**Current Workaround:**
- Manually edit each cron job JSON in openclaw.json
- Track which cron jobs should use Haiku vs Opus separately
- Risk of accidentally using expensive model on new cron jobs

**Proposed Solution:**
```json
{
  "crons": [
    {
      "name": "daily-digest",
      "model": "haiku"  // override default
    },
    {
      "name": "alert-matching",
      // uses defaultCronModel
    }
  ],
  "defaultCronModel": "anthropic/claude-haiku-4-5"
}
```

**Impact:**
- Immediate 80%+ cost reduction on non-critical automation
- Eliminates manual per-cron model config
- Makes cost management predictable and transparent

**Priority:** P0 (financial impact on sustained operations)

---

### Issue 4: Heartbeat Cost Optimization

**Title:** Add silent heartbeat mode / local state checking

**Problem:**
Heartbeats every 5 minutes invoke LLM just to return `HEARTBEAT_OK`. For always-on agents:
- Every heartbeat calls the configured model (default Opus)
- Most heartbeats result in no action (~HEARTBEAT_OK)
- WantokJobs runs ~8-10 agents, ~5 min heartbeat = 1,440 heartbeats/day per agent
- Cost: 1,440 heartbeats × 50K tokens (avg system message) × $0.015/1K = **~$1.08/agent/day**
- 10 agents × 30 days = **$324/month just on heartbeat no-ops**

**Current Workaround:**
- Disable heartbeats (dangerous — misses critical events)
- Extend heartbeat interval to 30 min (slow response to real events)
- Accept the cost as unavoidable

**Proposed Solution:**
1. Add silent heartbeat mode: if `HEARTBEAT.md` hasn't changed in 5 min AND no system alerts, skip LLM
2. Implement local state hash: OpenClaw checksums HEARTBEAT.md + system state, skips LLM if unchanged
3. OR allow configurable heartbeat model: `"heartbeatModel": "anthropic/claude-haiku-4-5"` (96%+ cheaper)
4. Add `/cost estimate` command to show heartbeat burn rate

**Impact:**
- Reduces cost per always-on agent by ~80%
- Makes 24/7 deployments financially sustainable
- Maintains responsiveness for actual events

**Priority:** P0 (financial sustainability)

---

## High Priority (P1)

### Issue 5: Remote Exec / SSH Proxy for VPS Access

**Title:** Add SSH proxy / remote host execution capability

**Problem:**
Can't execute commands on remote servers from sandbox. WantokJobs needed VPS access for:
- QR code service restart (generate new codes every 6 hours)
- Redis cache invalidation
- Log rotation on production DB server
- Certificate renewal automation

**Current Workaround:**
- Ask human user to SSH into VPS manually and run commands
- Breaks automation; requires human in the loop
- Introduces 24-48h latency (user might not be available)
- Example: New domain added → QR codes need regeneration → human has to SSH in manually

**Proposed Solution:**
```javascript
// Add `exec` option for remote hosts
exec({
  command: "systemctl restart qr-service",
  host: "vps.wantokjobs.io",  // NEW
  user: "deploy",              // NEW
  key: "/home/deploy/.ssh/id_rsa",  // or auth: "oauth2-token"
  timeout: 300
})
```

Requirements:
1. Public key authentication (private key stored securely in vault)
2. Allowlist of approved hosts in openclaw.json
3. Audit log all remote commands
4. Optional: OpenClaw SSH agent that tunnels through gateway

**Impact:**
- Fully autonomous infrastructure automation
- Reduces manual ops work by 90%
- Enables 24/7 self-healing systems

**Priority:** P1 (blocks production ops automation)

---

### Issue 6: Webhook Receiver / Inbound Event Mapping

**Title:** Add webhook receiver to trigger agent actions on external events

**Problem:**
App events can't trigger OpenClaw agents. WantokJobs built a clunky workaround:
- New job application arrives → stored in DB
- Cron job polls every 5 min for new applications
- 5-minute latency for notifications, assessments, matching
- Cron job generates noise in logs even when there are zero new applications

**Current Workaround:**
- Poll-based event detection (5 min latency)
- No real-time event processing
- Wasted cron executions on empty checks

**Proposed Solution:**
```javascript
// In openclaw.json
{
  "webhooks": {
    "endpoint": "/.openclaw/webhook",  // auto-exposed
    "events": {
      "job-application": {
        "agent": "main",
        "action": "process-new-application",
        "payload": "application_data"
      },
      "job-created": {
        "agent": "personalization-agent",
        "action": "index-job",
        "payload": "job_data"
      }
    }
  }
}
```

// From WantokJobs app:
```javascript
fetch('https://openclaw-deployment.local/.openclaw/webhook', {
  method: 'POST',
  headers: { 'X-Webhook-Secret': 'shared-secret' },
  body: JSON.stringify({
    event: 'job-application',
    data: { applicationId: 123, jobId: 456 }
  })
})
```

Requirements:
1. HMAC-SHA256 verification of webhook payload
2. Automatic retry with exponential backoff
3. Webhook delivery logs in system
4. Event mapping to agent actions

**Impact:**
- Real-time event-driven automation
- Eliminates polling overhead
- Enables responsive systems (alerts, notifications, matching)

**Priority:** P1 (enables real-time features)

---

### Issue 7: Native Database Tool

**Title:** Add built-in `db_query` tool for SQL execution

**Problem:**
Querying databases requires node one-liners that waste tokens. WantokJobs typical pattern:
```javascript
// Current method: wastes ~80 tokens per query
exec({
  command: `node -e "
    const db = require('better-sqlite3')('./wantokjobs.db');
    const result = db.prepare('SELECT COUNT(*) as cnt FROM jobs WHERE status=?').get('published');
    console.log(JSON.stringify(result));
  "`
})
```

Used 50+ times across WantokJobs agents, costing ~4,000+ tokens daily in boilerplate.

**Current Workaround:**
- Write long node/bash one-liners
- Complex JSON parsing of output
- No connection pooling between queries
- Slow (spawn new node process per query)

**Proposed Solution:**
```javascript
db_query({
  type: "sqlite",  // or "postgres", "mysql"
  path: "/data/wantokjobs.db",
  sql: "SELECT COUNT(*) as cnt FROM jobs WHERE status=?",
  params: ["published"]
})
// Returns: { cnt: 3847 }
```

Requirements:
1. Support SQLite, PostgreSQL, MySQL
2. Connection string / path validation
3. Parameterized queries (SQL injection protection)
4. Result pagination for large datasets
5. Transaction support for writes

**Impact:**
- Saves ~80 tokens per database query
- 10x faster than shell spawning
- Enables real-time data access from agents
- Database-driven decision making

**Priority:** P1 (affects all data-driven agents)

---

### Issue 8: Sub-Agent Environment Inheritance

**Title:** Secure .env / secrets inheritance for sub-agents

**Problem:**
Sub-agents can't read parent workspace .env files. WantokJobs sub-agents needed API keys:
- Embedding model API key (Anthropic, Cohere)
- Database connection strings (private VPS)
- JWT secrets for job board integrations
- OpenAI API for resume parsing

**Current Workaround:**
- Pass secrets in task descriptions (tokenizes them, logs them)
- Manual environment setup for each sub-agent
- Store secrets in code (security risk)
- Duplicate secrets across agents

**Proposed Solution:**
```javascript
// In openclaw.json
{
  "subagents": {
    "envInheritance": "secure",  // inherit parent .env
    "allowedSecrets": [
      "EMBEDDING_API_KEY",
      "DATABASE_URL",
      "JWT_SECRET"
    ]
  }
}
```

// Or via vault:
```javascript
await subagent({
  task: "...",
  env: ["DATABASE_URL", "API_KEY"],  // pulls from parent .env securely
  timeout: 600
})
```

Requirements:
1. Inherit .env from parent workspace (not logged)
2. Allowlist of secret names for security
3. No secrets in task descriptions
4. Audit log on secret access

**Impact:**
- Enables secure multi-agent systems
- Eliminates credential exposure in logs
- Simplifies secret management

**Priority:** P1 (security + usability)

---

## Medium Priority (P2)

### Issue 9: File/Media Streaming from Workspace

**Title:** Send binary files (images, PDFs) from workspace to chat

**Problem:**
Can't send workspace files to chat. WantokJobs needed to share:
- QR codes generated for dynamic job links (PNG files)
- Job analytics charts (PNG/SVG)
- Exported candidate resume PDFs
- Admin dashboards as screenshots

**Current Workaround:**
- Base64 encode file → embed in message (wastes tokens)
- Screenshot via browser tool (slow, requires X11)
- Host file on external server and link (security risk, slow)
- Save to workspace, tell user to download manually (breaks automation)

**Proposed Solution:**
```javascript
// Simple: send file from workspace
send_file({
  path: "/data/.openclaw/workspace/data/wantok/qr-codes/job-123.png",
  caption: "New QR code for job #123",
  channel: "whatsapp"  // or channel_id
})

// Or return from agent action:
return {
  message: "Generated new QR codes",
  file: "/data/wantok/qr-codes/job-123.png",
  mimeType: "image/png"
}
```

Requirements:
1. Auto-detect file type (MIME type)
2. Compress images if needed
3. Support all channel plugins (WhatsApp, Discord, Telegram)
4. Generate public temporary URLs if needed

**Impact:**
- Enables visual feedback in automation
- Improves user experience for agent outputs
- Eliminates manual file transfer steps

**Priority:** P2 (nice-to-have, workarounds exist)

---

### Issue 10: Context Window Management / Silent Crons

**Title:** Aggressive context compaction + truly silent cron results

**Problem:**
Context fills up fast with cron announcements, system messages, heartbeats. WantokJobs:
- 14 daily crons = 14 system messages/day in context
- Heartbeats every 5 min = 288 messages/day
- Each message even with `delivery: "none"` still appears in context
- Context fills from 10K → 130K tokens in 3 days (8 agents × 14 crons × 3 days)

**Current Workaround:**
- Manually summarize old context (loses information)
- Reduce heartbeat frequency (slow to detect issues)
- Turn off crons (reduces automation)
- Restart agents daily (loses state)

**Proposed Solution:**
1. **Truly silent crons:** `delivery: "none"` = **not stored in context at all**
   - Option: `storeInContext: false` to exclude from message history
2. **Pinned context:** Critical system instructions that never get compacted
   ```json
   {
     "pinnedContext": [
       "You are WantokJobs personalization agent...",
       "Current date: ...",
       "Active configuration: ..."
     ],
     "contextCompaction": {
       "strategy": "aggressive",  // auto-summarize old messages
       "keepNMessages": 20,
       "summarizeAfter": 50
     }
   }
   ```
3. **System message aggregation:** Combine routine system messages
   - Instead of 14 separate cron messages, one daily summary

**Impact:**
- Reduces token burn by 30-50% for always-on agents
- Keeps context focused on important information
- Maintains long-term context without bloat

**Priority:** P2 (improves efficiency, workarounds exist)

---

### Issue 11: Cost Dashboard / Per-Session Spending Visibility

**Title:** Add `/cost` command with daily/weekly breakdown

**Problem:**
No visibility into spending. WantokJobs couldn't answer:
- Which cron job is most expensive?
- Did the personalization suite cost more this week?
- Is Haiku cheaper than Opus for a specific task?
- How much does each agent's daily routine cost?

**Current Workaround:**
- Manually count tokens in logs (tedious, inaccurate)
- Estimate based on model + task (guessing)
- No optimization possible without data

**Proposed Solution:**
```
/cost  
→ Today: $2.47 (1.2M input, 0.3M output tokens)
  - personalization-agent: $1.80 (14.5 tasks)
  - main: $0.45 (22 tasks)
  - search-agent: $0.22 (8 tasks)

/cost week
→ Weekly breakdown by agent + model

/cost model
→ Opus: 47.2M tokens = $708
  Haiku: 15.3M tokens = $12
  Sonnet: 8.1M tokens = $81
```

Implementation:
1. Track tokens per LLM call (already logged)
2. Aggregate by: session, cron, agent, model, time period
3. Cache cost calculation (expensive to recompute)
4. Show estimated monthly projection

**Impact:**
- Enables cost optimization
- Transparent spending for teams
- Helps justify OpenClaw to stakeholders

**Priority:** P2 (nice-to-have, important for larger deployments)

---

### Issue 12: Native Vector Embedding / Semantic Search

**Title:** Built-in `memory_embed` and `memory_semantic_search` tools

**Problem:**
Semantic search requires building from scratch. WantokJobs built:
- Custom embedding engine (tokenization + vector generation)
- Vector store (SQLite with serialized vectors, ~20K LOC)
- Cosine similarity search (index, normalization, ranking)
- Caching layer (avoid re-embedding)

This is duplicated by **every team** building semantic features.

**Current Workaround:**
- Implement embedding + vector store manually (weeks of work)
- Use external API (cost + latency + dependency)
- Limited semantic features due to effort overhead

**Proposed Solution:**
```javascript
// Embed a job description for later search
await memory_embed({
  id: "job-123",
  text: "Looking for Senior Python engineer with 5+ years experience...",
  namespace: "wantok/jobs"  // organize by domain
})

// Later, semantic search:
const results = await memory_semantic_search({
  query: "What engineering roles are hiring seniors?",
  namespace: "wantok/jobs",
  topK: 5,
  threshold: 0.7  // cosine similarity cutoff
})
// Returns: [
//   { id: "job-123", score: 0.92, text: "Looking for Senior Python..." },
//   { id: "job-456", score: 0.88, text: "Senior backend engineer..." }
// ]

// Batch embed (efficient for large imports)
await memory_embed_batch({
  items: [
    { id: "job-1", text: "..." },
    { id: "job-2", text: "..." }
  ],
  namespace: "wantok/jobs"
})
```

Requirements:
1. Use Anthropic embeddings API (or configurable)
2. Store vectors in encrypted SQLite or vector DB (Pinecone, Weaviate optional)
3. Support multiple namespaces
4. Efficient batch operations
5. TTL / cleanup for old embeddings

**Impact:**
- Unlocks semantic memory for all agents
- Enables RAG without external dependencies
- 80% faster implementation of semantic features

**Priority:** P2 (enables semantic features, manual workaround available)

---

### Issue 13: Native Multi-Agent Coordination

**Title:** Built-in agent-to-agent messaging / task triggering

**Problem:**
Multi-agent coordination requires file-based message bus. WantokJobs built Shadow Kernel A2A:
- Agent 1 writes file `/tmp/queue/agent2-task-12345.json`
- Agent 2 polls for files, processes, writes response
- Agent 1 polls for response (race conditions, stale reads)
- No guaranteed delivery, ordering, or error handling

**Current Workaround:**
- File-based message bus (fragile, slow)
- Cron-based polling (latency + noise)
- Manual coordination in agent logic (complex)

**Proposed Solution:**
```javascript
// Agent A: request action from Agent B
const taskId = await trigger_agent({
  agent: "resume-parser",
  action: "parse-resume",
  payload: {
    resumeId: 123,
    format: "pdf"
  },
  timeout: 300,  // wait up to 5 min
  onTimeout: "continue"  // or "fail"
})

// Alternatively, fire-and-forget:
await trigger_agent({
  agent: "indexing-agent",
  action: "index-job",
  payload: { jobId: 456 },
  wait: false  // async
})

// Agent B: receive and respond
// (automatic via openclaw.json routing)
await handle_action('parse-resume', async (payload) => {
  const result = await parseResume(payload.resumeId);
  return { success: true, result };
})
```

Requirements:
1. Message queue (Redis, RabbitMQ, or in-memory)
2. Structured payload schema validation
3. Guaranteed delivery + retries
4. Request/response pattern with timeouts
5. Error handling and dead-letter queues

**Impact:**
- Cleaner multi-agent orchestration
- Real-time agent-to-agent collaboration
- Eliminates file-based message bus hacks

**Priority:** P2 (cleaner code, file-based workaround works)

---

### Issue 14: Plugin/Skill Hot-Reload

**Title:** Hot-reload workspace skills without restarting agent

**Problem:**
Modifying skills requires restarting the agent. For WantokJobs:
- Fixed a bug in resume-parser skill
- Had to restart the agent
- Lost state (pending matches, embeddings, cache)
- 10-15 min downtime to restart + re-initialize

**Current Workaround:**
- Deploy fixes in batches (slow iteration)
- Restart during low-traffic windows
- Lose agent state on restart

**Proposed Solution:**
```javascript
// Add `/skill reload <skill-name>` command
/skill reload resume-parser

// Or programmatically:
await reload_skill("resume-parser", {
  preserveState: true,  // keep agent memory
  validate: true        // test new skill before activating
})

// Fallback if new skill fails:
/skill rollback resume-parser  // use previous version
```

Requirements:
1. Skill hot-reload without agent restart
2. Preserve agent state across reload
3. Syntax validation before activation
4. Automatic rollback on errors
5. Version tracking for skills

**Impact:**
- Faster iteration (seconds vs 10 min)
- Safer deployments
- Improves developer experience

**Priority:** P3 (nice-to-have, restarts acceptable)

---

## Summary

| Issue | Title | Priority | Effort | Impact |
|-------|-------|----------|--------|--------|
| 1 | Configurable Exec Timeout | P0 | Medium | Unlocks long-running tasks |
| 2 | Sub-Agent Timeout Extension | P0 | Medium | Multi-agent production systems |
| 3 | Default Cron Model | P0 | Low | $600+/year savings |
| 4 | Heartbeat Cost Optimization | P0 | Low | $300+/year savings per agent |
| 5 | Remote Exec / SSH Proxy | P1 | Medium | Infrastructure automation |
| 6 | Webhook Receiver | P1 | High | Real-time event driven systems |
| 7 | Native Database Tool | P1 | Low | 4K tokens/day saved |
| 8 | Sub-Agent Environment Inheritance | P1 | Low | Security + simplicity |
| 9 | File/Media Streaming | P2 | Low | Visual feedback + UX |
| 10 | Context Window Management | P2 | Medium | 30-50% token savings |
| 11 | Cost Dashboard | P2 | Medium | Transparency + optimization |
| 12 | Vector Embedding / Semantic Search | P2 | High | Unlocks semantic features |
| 13 | Multi-Agent Coordination | P2 | High | Cleaner orchestration |
| 14 | Plugin/Skill Hot-Reload | P3 | Medium | Faster iteration |

---

## Context: WantokJobs

**WantokJobs** is a Papua New Guinean job platform built on OpenClaw for:
- Real-time job recommendations (semantic matching)
- AI-driven resume parsing and skill extraction
- Employer insights and analytics
- Personalized job alerts

The platform uses:
- **14 scheduled agents** for daily digest, alerts, analytics
- **Sub-agent orchestration** for personalization suite (10 modules)
- **Semantic search** on 5,000+ job descriptions
- **Multi-source data pipelines** (scraping, LinkedIn, manual uploads)

All improvements above were requested during production operation and would meaningfully improve automation, cost, and reliability.

---

## Contribution Notes

These issues are offered as constructive feedback from a production user. OpenClaw is an excellent framework; these represent gaps discovered under real-world load. 

For questions or discussion, reach out via:
- GitHub Issues: https://github.com/openclaw/openclaw/issues
- WantokJobs team contact: [team@wantokjobs.io](mailto:team@wantokjobs.io)
