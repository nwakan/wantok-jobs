# WantokJobs Semantic Search - Quick Reference Card

## 🚀 Current Status
- ✅ **OPERATIONAL** with rate limiting
- 📦 **295 embeddings** indexed (279 jobs, 15+ profiles)
- 🔑 **Cohere API** working (282/1000 daily requests used)
- ⚠️ **HuggingFace** unavailable (DNS issue)

## ⚡ Quick Commands

### Index All Jobs
```bash
cd /data/.openclaw/workspace
node system/agents/job-indexer.js --jobs-only
```

### Index All Profiles
```bash
node system/agents/job-indexer.js --profiles-only
```

### Incremental Update (Daily)
```bash
node system/agents/job-indexer.js
```

### Full Re-index
```bash
node system/agents/job-indexer.js --full
```

## 🔌 API Endpoints

### Semantic Job Search
```
GET /api/search/semantic?q=painim+wok+long+mining&limit=20
```

### Match Jobs to User
```
GET /api/search/match-jobs/:userId
Requires: Authentication
```

### Match Candidates to Job
```
GET /api/search/match-candidates/:jobId
Requires: Authentication (employer/admin)
```

### Similar Jobs
```
GET /api/search/similar/:jobId
```

## 📊 Rate Limits

| Provider | Per Minute | Per Day | Per Month |
|----------|-----------|---------|-----------|
| Cohere Trial | 100 | N/A | 1,000 requests |
| Cohere (enforced) | ~92 | N/A | 50,000 embeddings |

**Current Implementation**: 650ms minimum delay between calls

## 🧪 Quick Tests

### Test Embedding Engine
```bash
cd /data/.openclaw/workspace/data/wantok/app
node -e "
require('dotenv').config();
const ee = require('./server/lib/embedding-engine');
(async () => {
  const r = await ee.embed('test query', 'search_query');
  console.log('✅', r.provider, r.dimensions, 'dims');
})();
"
```

### Test Semantic Search
```bash
node -e "
require('dotenv').config();
const vs = require('./server/lib/vector-store');
(async () => {
  const r = await vs.search('software engineer', 'job', 5, 0.4);
  console.log('Found', r.length, 'matches');
  r.forEach((m, i) => console.log(i+1, 'Job', m.entity_id, (m.score*100).toFixed(1) + '%'));
})();
"
```

### Check Usage
```bash
node -e "
require('dotenv').config();
const ee = require('./server/lib/embedding-engine');
const stats = ee.getUsageStats();
console.log('Cohere:', stats.providers.cohere.requests, '/', stats.providers.cohere.dailyLimit.requests);
"
```

### Check Vector Store
```bash
node -e "
require('dotenv').config();
const vs = require('./server/lib/vector-store');
const stats = vs.getStats();
console.log('Total embeddings:', stats.total);
console.log('By type:', stats.byType);
"
```

## 🔍 Database Queries

### Count Embeddings
```sql
SELECT COUNT(*) FROM embeddings;
```

### By Entity Type
```sql
SELECT entity_type, COUNT(*) as count, model
FROM embeddings
GROUP BY entity_type, model;
```

### Recent Embeddings
```sql
SELECT entity_type, entity_id, created_at
FROM embeddings
ORDER BY created_at DESC
LIMIT 10;
```

### Storage Size
```sql
SELECT 
  entity_type,
  COUNT(*) as count,
  SUM(LENGTH(vector)) / 1024.0 as size_kb
FROM embeddings
GROUP BY entity_type;
```

## 🐛 Troubleshooting

### "Rate limit exceeded"
- **Wait**: 60 seconds for rate limit to reset
- **Check**: `cat server/data/embedding-usage.json`
- **Solution**: Rate limiting now automatic (650ms delays)

### "All providers failed"
- **Check**: Cohere API key in `.env`
- **Verify**: `echo $COHERE_API_KEY`
- **Test**: `curl https://api.cohere.com` (should resolve)

### "No search results"
- **Check**: Are entities indexed? `SELECT COUNT(*) FROM embeddings`
- **Lower**: `min_score` parameter (0.5 → 0.3)
- **Fallback**: System automatically falls back to FTS

### Slow indexing
- **Expected**: ~650ms per embedding (rate limited)
- **Run**: During off-peak hours
- **Use**: Incremental mode (default)

## 📈 Performance

### Current Throughput
- **Single embedding**: ~600-700ms (with rate limit)
- **Batch (3)**: ~1.6 seconds
- **50 jobs**: ~33 seconds
- **500 jobs**: ~5.5 minutes

### Search Performance
- **Semantic search**: <100ms
- **Vector similarity**: <50ms
- **FTS fallback**: <200ms

## ⚙️ Configuration

### Environment Variables
```bash
COHERE_API_KEY=YOUR_COHERE_API_KEY
HUGGINGFACE_API_KEY=YOUR_HUGGINGFACE_KEY
```

### Rate Limiting
```javascript
// In server/lib/embedding-engine.js
const COHERE_MIN_DELAY_MS = 650; // milliseconds
```

### Vector Dimensions
- **Cohere**: 1024 dimensions
- **Storage**: 4KB per vector
- **Model**: embed-english-v3.0

## 🎯 Best Practices

1. ✅ **Use incremental indexing** (default mode)
2. ✅ **Run batch indexing off-peak**
3. ✅ **Monitor daily usage** (stay under 950 requests/day avg)
4. ✅ **Cache search results** (5-10 minutes)
5. ✅ **Index on create/update** (proactive)
6. ✅ **Set up daily cron** (automatic re-indexing)

## 📞 Support

### Logs
```bash
tail -f /var/log/job-indexer.log
```

### Usage File
```bash
cat /data/.openclaw/workspace/data/wantok/app/server/data/embedding-usage.json
```

### Database
```bash
sqlite3 /data/.openclaw/workspace/data/wantok/app/server/data/wantokjobs.db
```

---

**Last Updated**: 2026-02-18 10:15 GMT+8  
**Status**: ✅ OPERATIONAL
