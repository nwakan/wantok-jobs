# WantokJobs Semantic Search - Quick Reference

## 🚀 Getting Started

### 1. Index All Jobs and Profiles

```bash
# Full initial indexing
cd /data/.openclaw/workspace
node system/agents/job-indexer.js --full

# Incremental updates (only new/changed)
node system/agents/job-indexer.js

# Index only jobs
node system/agents/job-indexer.js --jobs-only --limit 100

# Index only profiles
node system/agents/job-indexer.js --profiles-only
```

### 2. API Endpoints

#### Semantic Job Search
```
GET /api/search/semantic?q=<query>&limit=20&min_score=0.5
```

**Example:**
```bash
curl "https://wantokjobs.com/api/search/semantic?q=painim%20wok%20long%20mining&limit=5"
```

**Response:**
```json
{
  "jobs": [...],
  "scores": [
    { "entity_id": 123, "score": 0.87 }
  ],
  "query_expanded": "painim wok long mining find job search employment mine miner",
  "method": "semantic",
  "total": 5
}
```

#### Match Jobs to User Profile
```
GET /api/search/match-jobs/:userId
```

**Requires:** Authentication (jobseeker or admin)

**Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://wantokjobs.com/api/search/match-jobs/123?limit=10"
```

#### Match Candidates to Job
```
GET /api/search/match-candidates/:jobId
```

**Requires:** Authentication (employer or admin)

**Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  "https://wantokjobs.com/api/search/match-candidates/456?limit=20"
```

#### Find Similar Jobs
```
GET /api/search/similar/:jobId?limit=10
```

**Example:**
```bash
curl "https://wantokjobs.com/api/search/similar/789?limit=5"
```

---

## 🔧 Programmatic Usage

### Embedding Engine

```javascript
const embeddingEngine = require('./server/lib/embedding-engine');

// Generate embeddings
const result = await embeddingEngine.embed('job description text', 'search_document');
// Returns: { vectors: [[...]], model, dimensions, provider }

// Batch embed
const results = await embeddingEngine.batchEmbed(['text1', 'text2', 'text3'], 'search_document');

// Cosine similarity
const similarity = embeddingEngine.cosineSimilarity(vectorA, vectorB);
// Returns: 0.0 to 1.0

// Usage stats
const stats = embeddingEngine.getUsageStats();
```

### Vector Store

```javascript
const vectorStore = require('./server/lib/vector-store');

// Index a job
await vectorStore.upsert('job', jobId, jobText);

// Index a profile
await vectorStore.upsert('profile', userId, profileText);

// Semantic search
const results = await vectorStore.search(queryText, 'job', limit, minScore);
// Returns: [{ entity_id, score, model }]

// Find similar entities
const similar = vectorStore.findSimilar('job', jobId, limit, minScore);

// Get vector
const vector = vectorStore.getVector('job', jobId);

// Delete
vectorStore.deleteVector('job', jobId);

// Stats
const stats = vectorStore.getStats();
```

### Tok Pisin Expander

```javascript
const { expand, containsTokPisin, extractTokPisinTerms } = require('./server/lib/tok-pisin');

// Expand Tok Pisin terms
const expanded = expand('painim wok long POM');
// Returns: "painim wok long POM find job search employment law legal lawyer Port Moresby NCD National Capital District"

// Check if text contains Tok Pisin
const hasTokPisin = containsTokPisin('mi laik painim wok');
// Returns: true

// Extract terms
const terms = extractTokPisinTerms('painim wok long haus sik');
// Returns: [
//   { term: 'painim wok', expansion: 'find job search employment' },
//   { term: 'haus sik', expansion: 'healthcare hospital medical nurse doctor' }
// ]
```

---

## 📊 Monitoring

### Check Embedding Usage

```javascript
const embeddingEngine = require('./server/lib/embedding-engine');
const stats = embeddingEngine.getUsageStats();
console.log(stats);
```

### Check Vector Store Stats

```javascript
const vectorStore = require('./server/lib/vector-store');
const stats = vectorStore.getStats();
console.log('Total:', stats.total);
console.log('By type:', stats.byType);
```

### Database Queries

```sql
-- Count embeddings
SELECT COUNT(*) FROM embeddings;

-- By entity type
SELECT entity_type, COUNT(*) as count, model
FROM embeddings
GROUP BY entity_type, model;

-- Recent embeddings
SELECT entity_type, entity_id, model, created_at
FROM embeddings
ORDER BY created_at DESC
LIMIT 10;

-- Storage size
SELECT 
  entity_type,
  COUNT(*) as count,
  SUM(LENGTH(vector)) / 1024.0 as size_kb
FROM embeddings
GROUP BY entity_type;
```

---

## 🔄 Maintenance

### Daily Re-indexing (Cron)

Add to crontab or marketing orchestrator:

```bash
# Every day at 2 AM - incremental indexing
0 2 * * * cd /data/.openclaw/workspace && node system/agents/job-indexer.js >> /var/log/job-indexer.log 2>&1
```

### Weekly Full Re-index

```bash
# Every Sunday at 3 AM - full re-index
0 3 * * 0 cd /data/.openclaw/workspace && node system/agents/job-indexer.js --full >> /var/log/job-indexer-full.log 2>&1
```

### Monitor API Usage

```bash
# Check Cohere usage
tail -f /data/.openclaw/workspace/data/wantok/app/server/data/embedding-usage.json
```

---

## 🐛 Troubleshooting

### Issue: "Cohere API failed or exceeded limits"

**Solution:**
1. Check API key is set in `.env`
2. Check daily usage: `cat server/data/embedding-usage.json`
3. Wait for daily reset (midnight UTC)
4. Check Cohere dashboard for account status

### Issue: No search results

**Solution:**
1. Check if entities are indexed: `SELECT COUNT(*) FROM embeddings`
2. Run indexer: `node system/agents/job-indexer.js --limit 10`
3. Lower `min_score` parameter (default 0.5 → try 0.3)
4. Check FTS fallback is working

### Issue: Slow indexing

**Solution:**
1. Use `--limit` to process in batches
2. Check Cohere API response times
3. Increase delay between batches (edit job-indexer.js)
4. Run during low-traffic hours

### Issue: High API usage

**Solution:**
1. Enable caching (automatic via text_hash)
2. Use incremental mode (default)
3. Reduce re-indexing frequency
4. Implement query-level caching in routes

---

## 🎯 Best Practices

### Indexing
- ✅ Run incremental indexing daily
- ✅ Run full re-index weekly
- ✅ Index new jobs immediately after posting
- ✅ Re-index profiles when updated

### Search
- ✅ Use semantic search for natural language queries
- ✅ Fall back to FTS for specific terms
- ✅ Combine with filters (location, category, type)
- ✅ Adjust `min_score` based on use case (0.5 for strict, 0.3 for broad)

### Monitoring
- ✅ Check API usage daily
- ✅ Monitor search quality metrics
- ✅ Track embedding storage growth
- ✅ Log failed indexing attempts

### Performance
- ✅ Cache search results (5-10 minutes)
- ✅ Use pagination (limit 20-50)
- ✅ Pre-compute popular searches
- ✅ Index during off-peak hours

---

## 📞 Support

**Issues or questions?**
- Check logs: `/var/log/job-indexer*.log`
- Database: `/data/.openclaw/workspace/data/wantok/app/server/data/wantokjobs.db`
- Config: `/data/.openclaw/workspace/data/wantok/app/.env`

**Cohere API:**
- Dashboard: https://dashboard.cohere.com
- Docs: https://docs.cohere.com/reference/embed
- Support: support@cohere.com
