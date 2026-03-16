// TourPilot Captain Service Worker
const CACHE_NAME = 'tourpilot-captain-v1';
const OFFLINE_URL = '/captain/offline';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/captain',
  '/captain/checklist',
  '/captain/manifest',
  '/captain/emergency',
  '/captain/offline',
  '/icons/captain-192.png',
  '/icons/captain-512.png',
];

// Install event - precache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle API requests differently
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle captain pages with stale-while-revalidate
  if (url.pathname.startsWith('/captain')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default: cache first for static assets
  event.respondWith(cacheFirst(request));
});

// Cache first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match(OFFLINE_URL);
  }
}

// Network first strategy (for API)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return offline JSON response for API
    return new Response(
      JSON.stringify({ error: 'Offline', offline: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Stale while revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => {
    return cached || caches.match(OFFLINE_URL);
  });

  return cached || fetchPromise;
}

// Background sync for offline check-ins
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins') {
    event.waitUntil(syncCheckIns());
  }
  if (event.tag === 'sync-incidents') {
    event.waitUntil(syncIncidents());
  }
});

async function syncCheckIns() {
  const db = await openIndexedDB();
  const pendingCheckIns = await db.getAll('pendingCheckIns');

  for (const checkIn of pendingCheckIns) {
    try {
      const response = await fetch('/api/captain/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkIn),
      });

      if (response.ok) {
        await db.delete('pendingCheckIns', checkIn.id);
      }
    } catch (error) {
      console.error('[SW] Failed to sync check-in:', error);
    }
  }
}

async function syncIncidents() {
  const db = await openIndexedDB();
  const pendingIncidents = await db.getAll('pendingIncidents');

  for (const incident of pendingIncidents) {
    try {
      const response = await fetch('/api/captain/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incident),
      });

      if (response.ok) {
        await db.delete('pendingIncidents', incident.id);
      }
    } catch (error) {
      console.error('[SW] Failed to sync incident:', error);
    }
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  const options = {
    body: data.body || 'New notification',
    icon: '/icons/captain-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'captain-notification',
    data: data.url ? { url: data.url } : {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'TourPilot Captain', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/captain';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Helper to open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('TourPilotOffline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      resolve({
        getAll: (store) => {
          return new Promise((res, rej) => {
            const tx = db.transaction(store, 'readonly');
            const req = tx.objectStore(store).getAll();
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
          });
        },
        delete: (store, key) => {
          return new Promise((res, rej) => {
            const tx = db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).delete(key);
            req.onsuccess = () => res();
            req.onerror = () => rej(req.error);
          });
        },
      });
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingCheckIns')) {
        db.createObjectStore('pendingCheckIns', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingIncidents')) {
        db.createObjectStore('pendingIncidents', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cachedManifests')) {
        db.createObjectStore('cachedManifests', { keyPath: 'availabilityId' });
      }
    };
  });
}
