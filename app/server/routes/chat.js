// Jean Chat Streaming Route Handler - Production Patch
const express = require('express');
const router = express.Router();

// JSONL stream stub for POST and SSE fallback for GET
debug = (...args) => process.env.DEBUG && console.log('[JeanChat]', ...args);

// GET: Server-sent events (simple stub)
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  debug('SSE stream opened.');
  res.write(`data: {"message": "Welcome to Jean Chat streaming!"}\n\n`);
  setTimeout(() => res.write(`data: {"message": "Test SSE reply from backend."}\n\n`), 1000);
  req.on('close', () => { debug('SSE closed.'); res.end(); });
});

// POST: JSONL fallback
router.post('/stream', express.json(), (req, res) => {
  res.setHeader('Content-Type', 'application/jsonlines');
  debug('JSONL POST received.', req.body);
  res.write(JSON.stringify({ message: 'Jean Chat: POST received', input: req.body }) + '\n');
  setTimeout(() => {
    res.write(JSON.stringify({ message: 'Jean Chat: Streaming reply.' }) + '\n');
    res.end();
  }, 1200);
});

module.exports = router;
