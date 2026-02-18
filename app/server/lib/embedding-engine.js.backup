/**
 * Embedding Engine — Semantic vector embeddings for WantokJobs
 * 
 * Uses Cohere Embed API (primary) with HuggingFace fallback
 * Supports batch embedding, usage tracking, and efficient storage
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Usage tracking
const USAGE_FILE = path.join(__dirname, '../data/embedding-usage.json');

// Rate limiting tracking
let lastCohereCallTime = 0;
const COHERE_MIN_DELAY_MS = 650; // 100 calls/min = ~600ms between calls, add 50ms buffer

// Provider configurations
const PROVIDERS = {
  cohere: {
    name: 'Cohere',
    model: 'embed-english-v3.0',
    dimensions: 1024,
    baseUrl: 'api.cohere.com',
    path: '/v2/embed',
    maxBatch: 96, // Cohere allows up to 96 texts per request
    dailyLimit: { requests: 1000, embeddings: 50000 }, // Free tier limits
    getKey: () => process.env.COHERE_API_KEY,
  },
  
  huggingface: {
    name: 'HuggingFace',
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    dimensions: 384,
    // NOTE: HuggingFace deprecated api-inference.huggingface.co (HTTP 410)
    // New endpoint router.huggingface.co does not resolve (DNS error)
    // Fallback disabled until HuggingFace provides working endpoint
    baseUrl: 'router.huggingface.co', // DNS does not resolve as of 2026-02-18
    path: '/models/sentence-transformers/all-MiniLM-L6-v2',
    maxBatch: 1,
    dailyLimit: { requests: 10000, embeddings: 10000 },
    getKey: () => process.env.HUGGINGFACE_API_KEY,
  }
};

function loadUsage() {
  try {
    const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    const today = new Date().toISOString().slice(0, 10);
    if (data.date !== today) {
      return { date: today, providers: {} };
    }
    return data;
  } catch {
    return { date: new Date().toISOString().slice(0, 10), providers: {} };
  }
}

function saveUsage(usage) {
  try {
    const dir = path.dirname(USAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
  } catch (e) {
    console.error('Embedding Engine: Failed to save usage:', e.message);
  }
}

function trackUsage(provider, embeddings = 0) {
  const usage = loadUsage();
  if (!usage.providers[provider]) {
    usage.providers[provider] = { requests: 0, embeddings: 0, errors: 0, lastUsed: null };
  }
  usage.providers[provider].requests++;
  usage.providers[provider].embeddings += embeddings;
  usage.providers[provider].lastUsed = new Date().toISOString();
  saveUsage(usage);
  return usage.providers[provider];
}

function trackError(provider) {
  const usage = loadUsage();
  if (!usage.providers[provider]) {
    usage.providers[provider] = { requests: 0, embeddings: 0, errors: 0, lastUsed: null };
  }
  usage.providers[provider].errors++;
  saveUsage(usage);
}

/**
 * HTTP helper for POST requests
 */
function httpPost(hostname, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
      },
      timeout: 60000, // 60s timeout for embedding requests
    };
    
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(responseBody);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${json.error?.message || json.message || responseBody.slice(0, 200)}`));
          } else {
            resolve(json);
          }
        } catch {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${responseBody.slice(0, 200)}`));
          } else {
            reject(new Error(`Invalid JSON response: ${responseBody.slice(0, 200)}`));
          }
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(data);
    req.end();
  });
}

/**
 * Generate embeddings using Cohere API
 */
async function embedWithCohere(texts, inputType = 'search_document') {
  const provider = PROVIDERS.cohere;
  const key = provider.getKey();
  
  if (!key) {
    throw new Error('COHERE_API_KEY not configured');
  }
  
  // Rate limiting: ensure minimum delay between calls (Trial key: 100 calls/min)
  const now = Date.now();
  const timeSinceLastCall = now - lastCohereCallTime;
  if (timeSinceLastCall < COHERE_MIN_DELAY_MS) {
    const delayNeeded = COHERE_MIN_DELAY_MS - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, delayNeeded));
  }
  lastCohereCallTime = Date.now();
  
  const body = {
    model: provider.model,
    texts: Array.isArray(texts) ? texts : [texts],
    input_type: inputType, // 'search_document' or 'search_query'
    embedding_types: ['float'],
  };
  
  const response = await httpPost(
    provider.baseUrl,
    provider.path,
    body,
    { 'Authorization': `Bearer ${key}` }
  );
  
  if (!response.embeddings || !response.embeddings.float) {
    throw new Error('Invalid Cohere response: missing embeddings');
  }
  
  const vectors = response.embeddings.float;
  trackUsage('cohere', vectors.length);
  
  return {
    vectors,
    model: provider.model,
    dimensions: provider.dimensions,
    provider: 'cohere'
  };
}

/**
 * Generate embeddings using HuggingFace Inference API
 */
async function embedWithHuggingFace(texts) {
  const provider = PROVIDERS.huggingface;
  const textsArray = Array.isArray(texts) ? texts : [texts];
  const vectors = [];
  
  const key = provider.getKey();
  const headers = key ? { 'Authorization': `Bearer ${key}` } : {};
  
  // Process one at a time to avoid rate limits
  for (const text of textsArray) {
    const body = {
      inputs: text,
      options: { wait_for_model: true }
    };
    
    const response = await httpPost(
      provider.baseUrl,
      provider.path,
      body,
      headers
    );
    
    // HuggingFace returns array directly
    if (Array.isArray(response) && response.length > 0) {
      vectors.push(response);
    } else {
      throw new Error('Invalid HuggingFace response');
    }
  }
  
  trackUsage('huggingface', vectors.length);
  
  return {
    vectors,
    model: provider.model,
    dimensions: provider.dimensions,
    provider: 'huggingface'
  };
}

/**
 * Check if provider can be used (within limits)
 */
function canUseProvider(providerName) {
  const provider = PROVIDERS[providerName];
  if (!provider) return false;
  
  // Check API key requirement (Cohere requires key, HuggingFace is optional)
  if (providerName === 'cohere') {
    if (!provider.getKey()) {
      return false;
    }
  }
  
  // For HuggingFace, key is recommended but not strictly required for public inference
  // If key is not available, the free tier will be used
  
  // Check daily limits
  const usage = loadUsage();
  const provUsage = usage.providers[providerName];
  
  if (provUsage) {
    const limit = provider.dailyLimit;
    if (provUsage.requests >= limit.requests * 0.95) {
      console.log(`Embedding Engine: ${providerName} approaching daily limit (${provUsage.requests}/${limit.requests}), skipping`);
      return false;
    }
    if (provUsage.embeddings >= limit.embeddings * 0.95) {
      console.log(`Embedding Engine: ${providerName} approaching embedding limit (${provUsage.embeddings}/${limit.embeddings}), skipping`);
      return false;
    }
  }
  
  return true;
}

/**
 * Generate embeddings with automatic provider routing and fallback
 * 
 * @param {string|string[]} texts - Text(s) to embed
 * @param {string} inputType - 'search_document' for indexing, 'search_query' for queries
 * @returns {Promise<{vectors: number[][], model: string, dimensions: number, provider: string}>}
 */
async function embed(texts, inputType = 'search_document') {
  const textsArray = Array.isArray(texts) ? texts : [texts];
  
  if (textsArray.length === 0) {
    throw new Error('No texts provided for embedding');
  }
  
  // Try Cohere first (preferred)
  if (canUseProvider('cohere')) {
    try {
      return await embedWithCohere(textsArray, inputType);
    } catch (e) {
      console.error('Embedding Engine: Cohere failed:', e.message);
      trackError('cohere');
    }
  }
  
  // Fallback to HuggingFace (currently disabled due to DNS issues with router.huggingface.co)
  if (canUseProvider('huggingface')) {
    try {
      console.log('Embedding Engine: Attempting HuggingFace fallback (may fail due to DNS issues)');
      return await embedWithHuggingFace(textsArray);
    } catch (e) {
      console.error('Embedding Engine: HuggingFace failed:', e.message);
      trackError('huggingface');
      // Don't throw, just report that HuggingFace is unavailable
    }
  }
  
  throw new Error('Cohere API failed and HuggingFace fallback is unavailable (DNS issues)');
}

/**
 * Batch embed with automatic chunking
 */
async function batchEmbed(texts, inputType = 'search_document', provider = 'cohere') {
  const textsArray = Array.isArray(texts) ? texts : [texts];
  const maxBatch = PROVIDERS[provider]?.maxBatch || 1;
  
  const allVectors = [];
  let resultProvider = provider;
  let resultModel = PROVIDERS[provider]?.model;
  let resultDimensions = PROVIDERS[provider]?.dimensions;
  
  // Process in chunks
  for (let i = 0; i < textsArray.length; i += maxBatch) {
    const chunk = textsArray.slice(i, i + maxBatch);
    const result = await embed(chunk, inputType);
    
    allVectors.push(...result.vectors);
    resultProvider = result.provider;
    resultModel = result.model;
    resultDimensions = result.dimensions;
  }
  
  return {
    vectors: allVectors,
    model: resultModel,
    dimensions: resultDimensions,
    provider: resultProvider
  };
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    throw new Error('Vectors must have same length');
  }
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Serialize vector to Buffer for SQLite BLOB storage
 */
function vectorToBuffer(vector) {
  const float32Array = new Float32Array(vector);
  return Buffer.from(float32Array.buffer);
}

/**
 * Deserialize Buffer back to vector array
 */
function bufferToVector(buffer) {
  const float32Array = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
  return Array.from(float32Array);
}

/**
 * Generate text hash for deduplication
 */
function textHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Get usage statistics
 */
function getUsageStats() {
  const usage = loadUsage();
  const stats = {};
  
  for (const [name, provider] of Object.entries(PROVIDERS)) {
    const u = usage.providers?.[name] || { requests: 0, embeddings: 0, errors: 0 };
    stats[name] = {
      name: provider.name,
      model: provider.model,
      dimensions: provider.dimensions,
      available: name === 'huggingface' || !!provider.getKey(),
      requests: u.requests,
      embeddings: u.embeddings,
      errors: u.errors,
      dailyLimit: provider.dailyLimit,
      remaining: {
        requests: provider.dailyLimit.requests - u.requests,
        embeddings: provider.dailyLimit.embeddings - u.embeddings,
      },
    };
  }
  
  return { date: usage.date, providers: stats };
}

module.exports = {
  embed,
  batchEmbed,
  cosineSimilarity,
  vectorToBuffer,
  bufferToVector,
  textHash,
  getUsageStats,
  PROVIDERS
};
