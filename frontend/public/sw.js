// Healthcare Monitoring App - Service Worker
// Provides offline functionality for critical features

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `healthcare-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `healthcare-dynamic-${CACHE_VERSION}`;
const API_CACHE = `healthcare-api-${CACHE_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/main.tsx',
  '/src/index.css',
];

// API endpoints to cache for offline access
const CACHEABLE_API_PATTERNS = [
  /\/api\/v1\/health\/vitals/,
  /\/api\/v1\/medications/,
  /\/api\/v1\/appointments/,
  /\/api\/v1\/care-circle/,
  /\/api\/v1\/alerts/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('healthcare-') && 
                     name !== STATIC_CACHE && 
                     name !== DYNAMIC_CACHE &&
                     name !== API_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

// Handle static asset requests with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    throw error;
  }
}

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const shouldCache = CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));

  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses for critical endpoints
    if (shouldCache && networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', url.pathname);
    
    // Fall back to cache if available
    if (shouldCache) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Add custom header to indicate offline mode
        const headers = new Headers(cachedResponse.headers);
        headers.set('X-Offline-Response', 'true');
        
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: headers
        });
      }
    }
    
    throw error;
  }
}

// Handle background sync for queued operations
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-health-data') {
    event.waitUntil(syncHealthData());
  } else if (event.tag === 'sync-emergency-alerts') {
    event.waitUntil(syncEmergencyAlerts());
  }
});

// Sync queued health data when connection is restored
async function syncHealthData() {
  try {
    const db = await openIndexedDB();
    const queuedData = await getQueuedHealthData(db);
    
    for (const data of queuedData) {
      try {
        await fetch('/api/v1/health/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.payload)
        });
        
        // Remove from queue after successful sync
        await removeFromQueue(db, data.id);
      } catch (error) {
        console.error('[SW] Failed to sync health data:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync queued emergency alerts
async function syncEmergencyAlerts() {
  try {
    const db = await openIndexedDB();
    const queuedAlerts = await getQueuedEmergencyAlerts(db);
    
    for (const alert of queuedAlerts) {
      try {
        await fetch('/api/v1/health/emergency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert.payload)
        });
        
        await removeFromQueue(db, alert.id);
      } catch (error) {
        console.error('[SW] Failed to sync emergency alert:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Emergency alert sync failed:', error);
  }
}

// IndexedDB helper functions
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HealthcareMonitoringDB', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getQueuedHealthData(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const request = store.getAll();
    
    request.onsuccess = () => {
      const items = request.result.filter(item => item.type === 'health-data');
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

function getQueuedEmergencyAlerts(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const request = store.getAll();
    
    request.onsuccess = () => {
      const items = request.result.filter(item => item.type === 'emergency-alert');
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

function removeFromQueue(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Handle push notifications for emergency alerts
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.message,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'healthcare-notification',
    requireInteraction: data.severity === 'critical',
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
