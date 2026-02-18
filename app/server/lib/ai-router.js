/**
 * AI Router — Smart multi-provider AI with free-tier auto-switching
 * 
 * Routes tasks to the cheapest/fastest free provider.
 * Tracks usage, auto-switches when limits approach, falls back gracefully.
 */

const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Usage tracking
const USAGE_FILE = path.join(__dirname, '../data/ai-usage.json');
const DAILY_RESET_HOUR = 0; // Reset at midnight

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
    fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
  } catch (e) {
    console.error('AI Router: Failed to save usage:', e.message);
  }
}

function trackUsage(provider, tokens = 0) {
  const usage = loadUsage();
  if (!usage.providers[provider]) {
    usage.providers[provider] = { requests: 0, tokens: 0, errors: 0, lastUsed: null };
  }
  usage.providers[provider].requests++;
  usage.providers[provider].tokens += tokens;
  usage.providers[provider].lastUsed = new Date().toISOString();
  saveUsage(usage);
  return usage.providers[provider];
}

function trackError(provider) {
  const usage = loadUsage();
  if (!usage.providers[provider]) {
    usage.providers[provider] = { requests: 0, tokens: 0, errors: 0, lastUsed: null };
  }
  usage.providers[provider].errors++;
  saveUsage(usage);
}

// Provider configurations
const PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    models: {
      flash: 'gemini-2.0-flash',
      pro: 'gemini-1.5-pro',
    },
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    dailyLimit: { requests: 1500, tokens: 1000000 },
    getKey: () => process.env.GOOGLE_AI_KEY,
    
    async call(prompt, opts = {}) {
      const key = this.getKey();
      if (!key) throw new Error('GOOGLE_AI_KEY not set');
      
      const model = opts.model || this.models.flash;
      const url = `${this.baseUrl}/models/${model}:generateContent?key=${key}`;
      
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: opts.maxTokens || 2048,
          temperature: opts.temperature || 0.7,
        },
      };

      if (opts.systemPrompt) {
        body.systemInstruction = { parts: [{ text: opts.systemPrompt }] };
      }
      
      const response = await httpPost(url, body);
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const tokens = response?.usageMetadata?.totalTokenCount || 0;
      trackUsage('gemini', tokens);
      return { text, tokens, provider: 'gemini', model };
    }
  },

  kimi: {
    name: 'Kimi K2 (NVIDIA NIM)',
    models: {
      instruct: 'moonshotai/kimi-k2-instruct',
    },
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    dailyLimit: { requests: 5000, tokens: 500000 },
    getKey: () => process.env.NVIDIA_API_KEY,
    
    async call(prompt, opts = {}) {
      const key = this.getKey();
      if (!key) throw new Error('NVIDIA_API_KEY not set');
      
      const model = opts.model || this.models.instruct;
      const url = `${this.baseUrl}/chat/completions`;
      
      const messages = [];
      if (opts.systemPrompt) {
        messages.push({ role: 'system', content: opts.systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });
      
      const body = {
        model,
        messages,
        max_tokens: opts.maxTokens || 2048,
        temperature: opts.temperature || 0.7,
      };
      
      const response = await httpPost(url, body, {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      });
      
      const text = response?.choices?.[0]?.message?.content || '';
      const tokens = response?.usage?.total_tokens || 0;
      trackUsage('kimi', tokens);
      return { text, tokens, provider: 'kimi', model };
    }
  },

  groq: {
    name: 'Groq',
    models: {
      fast: 'llama-3.3-70b-versatile',
      small: 'llama-3.1-8b-instant',
    },
    baseUrl: 'https://api.groq.com/openai/v1',
    dailyLimit: { requests: 6000, tokens: 500000 },
    getKey: () => process.env.GROQ_API_KEY,
    
    async call(prompt, opts = {}) {
      const key = this.getKey();
      if (!key) throw new Error('GROQ_API_KEY not set');
      
      const model = opts.model || this.models.fast;
      const url = `${this.baseUrl}/chat/completions`;
      
      const messages = [];
      if (opts.systemPrompt) {
        messages.push({ role: 'system', content: opts.systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });
      
      const body = {
        model,
        messages,
        max_tokens: opts.maxTokens || 2048,
        temperature: opts.temperature || 0.7,
      };
      
      const response = await httpPost(url, body, {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      });
      
      const text = response?.choices?.[0]?.message?.content || '';
      const tokens = response?.usage?.total_tokens || 0;
      trackUsage('groq', tokens);
      return { text, tokens, provider: 'groq', model };
    }
  },
};

// Task-to-provider routing
const TASK_ROUTES = {
  // Chat / conversational
  chat:           ['gemini', 'kimi', 'groq'],
  // Content generation (marketing, descriptions)
  content:        ['gemini', 'kimi'],
  // Job matching / semantic analysis
  matching:       ['gemini', 'kimi'],
  // Resume parsing / structured extraction
  resume:         ['gemini', 'kimi'],
  // Translation (Tok Pisin)
  translation:    ['gemini', 'kimi'],
  // Classification (spam, category)
  classification: ['gemini', 'groq', 'kimi'],
  // Quick / simple tasks
  quick:          ['groq', 'gemini', 'kimi'],
  // Cover letter generation
  coverletter:    ['gemini', 'kimi'],
  // Job description improvement
  jobdesc:        ['gemini', 'kimi'],
  // General fallback
  general:        ['gemini', 'kimi', 'groq'],
};

/**
 * Route a task to the best available free AI provider
 * 
 * @param {string} prompt - The prompt text
 * @param {object} opts - Options
 * @param {string} opts.task - Task type (chat, content, matching, resume, etc.)
 * @param {string} opts.systemPrompt - System prompt
 * @param {number} opts.maxTokens - Max response tokens
 * @param {number} opts.temperature - Temperature (0-1)
 * @param {string} opts.preferProvider - Force a specific provider
 * @returns {Promise<{text: string, tokens: number, provider: string, model: string}>}
 */
async function route(prompt, opts = {}) {
  const task = opts.task || 'general';
  const providers = opts.preferProvider 
    ? [opts.preferProvider]
    : (TASK_ROUTES[task] || TASK_ROUTES.general);
  
  const usage = loadUsage();
  const errors = [];
  
  for (const providerName of providers) {
    const provider = PROVIDERS[providerName];
    if (!provider) continue;
    
    // Check if API key is available
    try {
      if (!provider.getKey()) continue;
    } catch { continue; }
    
    // Check daily limits
    const provUsage = usage.providers?.[providerName];
    if (provUsage) {
      const limit = provider.dailyLimit;
      if (provUsage.requests >= limit.requests * 0.9) {
        console.log(`AI Router: ${providerName} approaching daily limit (${provUsage.requests}/${limit.requests}), skipping`);
        continue;
      }
    }
    
    // Check recent error rate
    if (provUsage && provUsage.errors > 5 && provUsage.errors > provUsage.requests * 0.3) {
      console.log(`AI Router: ${providerName} high error rate (${provUsage.errors}), skipping`);
      continue;
    }
    
    try {
      const result = await provider.call(prompt, opts);
      return result;
    } catch (e) {
      trackError(providerName);
      errors.push(`${providerName}: ${e.message}`);
      console.error(`AI Router: ${providerName} failed: ${e.message}`);
      continue;
    }
  }
  
  throw new Error(`All AI providers failed: ${errors.join('; ')}`);
}

/**
 * Get current usage stats
 */
function getUsageStats() {
  const usage = loadUsage();
  const stats = {};
  for (const [name, provider] of Object.entries(PROVIDERS)) {
    const u = usage.providers?.[name] || { requests: 0, tokens: 0, errors: 0 };
    stats[name] = {
      name: provider.name,
      available: !!provider.getKey(),
      requests: u.requests,
      tokens: u.tokens,
      errors: u.errors,
      dailyLimit: provider.dailyLimit,
      remaining: {
        requests: provider.dailyLimit.requests - u.requests,
        tokens: provider.dailyLimit.tokens - u.tokens,
      },
    };
  }
  return { date: usage.date, providers: stats };
}

// HTTP helper
function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const data = JSON.stringify(body);
    
    const req = mod.request(parsed, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
      },
      timeout: 30000,
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${json.error?.message || body.slice(0, 200)}`));
          } else {
            resolve(json);
          }
        } catch {
          reject(new Error(`Invalid JSON response: ${body.slice(0, 200)}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(data);
    req.end();
  });
}

module.exports = { route, getUsageStats, PROVIDERS, TASK_ROUTES };
