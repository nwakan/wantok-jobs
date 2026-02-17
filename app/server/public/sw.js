const CACHE_NAME = 'wantokjobs-v2-png-optimized';
const API_CACHE_NAME = 'wantokjobs-api-v2';
const JOBS_CACHE_NAME = 'wantokjobs-jobs-v1';
const IMAGES_CACHE_NAME = 'wantokjobs-images-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Maximum cache sizes (for low-storage devices)
const MAX_JOBS_CACHE = 50;
const MAX_IMAGES_CACHE = 30;
const MAX_API_CACHE = 100;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Failed to cache some static assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (![CACHE_NAME, API_CACHE_NAME, JOBS_CACHE_NAME, IMAGES_CACHE_NAME].includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Helper: Limit cache size
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Delete oldest entries
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems); // Recursive cleanup
  }
}

// Fetch event - optimized for PNG's slow networks
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Special handling for job listings - cache and keep fresh
  if (url.pathname.startsWith('/api/jobs') && request.method === 'GET') {
    event.respondWith(
      caches.open(JOBS_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        
        // Return cached immediately if offline
        if (!navigator.onLine && cachedResponse) {
          return cachedResponse;
        }

        // Try network first, fallback to cache
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
              limitCacheSize(JOBS_CACHE_NAME, MAX_JOBS_CACHE);
            }
            return response;
          })
          .catch(() => {
            if (cachedResponse) {
              // Add offline header
              const headers = new Headers(cachedResponse.headers);
              headers.set('X-From-Cache', 'true');
              return new Response(cachedResponse.body, {
                status: cachedResponse.status,
                statusText: cachedResponse.statusText,
                headers: headers
              });
            }
            // Return offline message
            return new Response(JSON.stringify({ 
              error: 'Offline', 
              message: 'You are offline. Please check your connection.',
              data: []
            }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
      })
    );
    return;
  }

  // Handle images - cache with size limit
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    event.respondWith(
      caches.open(IMAGES_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request).then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
            limitCacheSize(IMAGES_CACHE_NAME, MAX_IMAGES_CACHE);
          }
          return response;
        }).catch(() => {
          // Return placeholder for broken images
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  // Network-first for other API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
              limitCacheSize(API_CACHE_NAME, MAX_API_CACHE);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(JSON.stringify({ 
              error: 'Offline', 
              message: 'You are offline'
            }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      }).catch(() => {
        // For HTML requests, return a basic offline page
        if (request.headers.get('Accept').includes('text/html')) {
          return new Response(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Offline - WantokJobs</title>
                <style>
                  body { font-family: system-ui; padding: 2rem; text-align: center; }
                  h1 { color: #dc2626; }
                </style>
              </head>
              <body>
                <h1>📡 Yu stap offlain</h1>
                <p>You are offline. Please check your internet connection.</p>
                <p>Plis sekim intanet bilong yu.</p>
              </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Listen for messages from the app (e.g., to queue applications)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Queue application when offline
  if (event.data && event.data.type === 'QUEUE_APPLICATION') {
    // Store in IndexedDB for later submission
    // (Simplified - would need IndexedDB implementation)
    console.log('Application queued for when online:', event.data.payload);
  }
});
