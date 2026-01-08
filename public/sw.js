// TAMS360 Service Worker - PWA Offline Support
const CACHE_NAME = 'tams360-v1';
const RUNTIME_CACHE = 'tams360-runtime';

// SVG Icon Source (embedded for dynamic generation)
const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <circle cx="256" cy="256" r="256" fill="#010D13"/>
  <circle cx="256" cy="256" r="220" fill="none" stroke="#39AEDF" stroke-width="24" stroke-dasharray="100 10"/>
  <circle cx="256" cy="256" r="180" fill="none" stroke="#5DB32A" stroke-width="20" stroke-dasharray="100 10"/>
  <rect x="250" y="40" width="12" height="20" fill="#F8D227" rx="6"/>
  <rect x="40" y="250" width="20" height="12" fill="#F8D227" rx="6"/>
  <rect x="452" y="250" width="20" height="12" fill="#F8D227" rx="6"/>
  <rect x="250" y="452" width="12" height="20" fill="#F8D227" rx="6"/>
  <path d="M 256 200 Q 236 200 236 220 Q 236 240 256 270 Q 276 240 276 220 Q 276 200 256 200 Z M 256 210 Q 266 210 266 220 Q 266 230 256 230 Q 246 230 246 220 Q 246 210 256 210 Z" fill="white"/>
  <text x="256" y="320" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="900" fill="white" text-anchor="middle">TAMS</text>
  <text x="256" y="375" font-family="Inter, Arial, sans-serif" font-size="60" font-weight="900" fill="white" text-anchor="middle">360°</text>
</svg>`;

// Generate PNG icon blob from SVG
async function generateIconPNG(size) {
  const svgBlob = new Blob([SVG_ICON], { type: 'image/svg+xml' });
  const svgUrl = URL.createObjectURL(svgBlob);
  
  // Return SVG as fallback (browsers can render SVG as icons)
  return new Response(svgBlob, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000'
    }
  });
}

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS.filter(url => {
          // Only cache files that exist
          return fetch(url, { method: 'HEAD' })
            .then(response => response.ok)
            .catch(() => false);
        }));
      })
      .catch(error => {
        console.error('[SW] Precaching failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Dynamic icon generation - serve SVG for PNG requests
  if (url.pathname === '/icon-192x192.png' || 
      url.pathname === '/icon-512x512.png' || 
      url.pathname === '/apple-touch-icon.png') {
    event.respondWith(generateIconPNG(512));
    return;
  }

  // API requests - network only with offline fallback
  if (url.pathname.includes('/functions/v1/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache successful responses
          if (response.status === 200) {
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          
          return response;
        })
        .catch(async () => {
          // Try to return cached version
          const cached = await caches.match(request);
          if (cached) {
            console.log('[SW] Returning cached API response for:', url.pathname);
            return cached;
          }
          
          // Return offline page or error
          return new Response(
            JSON.stringify({ 
              error: 'offline', 
              message: 'You are offline. Some features may be limited.' 
            }),
            { 
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Static assets - cache first, then network
  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) {
          // Return cached version and update in background
          fetch(request).then(response => {
            if (response.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, response);
              });
            }
          }).catch(() => {});
          
          return cached;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Add to cache
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // Offline and not cached - return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-assets') {
    event.waitUntil(syncAssets());
  }
  
  if (event.tag === 'sync-inspections') {
    event.waitUntil(syncInspections());
  }
});

async function syncAssets() {
  console.log('[SW] Syncing offline assets...');
  // This will be handled by the OfflineContext in the app
  // Just notify clients
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_ASSETS' });
  });
}

async function syncInspections() {
  console.log('[SW] Syncing offline inspections...');
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_INSPECTIONS' });
  });
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'TAMS360 Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

console.log('[SW] Service worker loaded');