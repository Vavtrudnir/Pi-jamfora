// Pi Calculator Pro - Service Worker
// Offline functionality and caching for PWA

const CACHE_NAME = 'pi-calculator-v1';
const STATIC_CACHE = 'pi-calculator-static-v1';
const DYNAMIC_CACHE = 'pi-calculator-dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/index.html',
    '/styles.css',
    '/tailwind-local.css',
    '/app.js',
    '/workers.js',
    '/visualization.js',
    '/storage.js',
    '/pi-worker.js',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Static files cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Failed to cache static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip external requests (except Chart.js)
    if (url.origin !== self.location.origin && !url.href.includes('cdn.jsdelivr.net')) {
        return;
    }
    
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // Return cached version if available
                if (cachedResponse) {
                    // For HTML files, always try network first for fresh content
                    if (request.destination === 'document') {
                        fetchAndCache(request);
                        return cachedResponse;
                    }
                    return cachedResponse;
                }
                
                // Otherwise fetch from network
                return fetchAndCache(request);
            })
            .catch(() => {
                // If network fails, try to serve offline page
                if (request.destination === 'document') {
                    return caches.match('/index.html');
                }
                
                // For other requests, return appropriate error response
                return new Response('Offline - Resource not available', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
    );
});

// Helper function to fetch and cache resources
function fetchAndCache(request) {
    return fetch(request)
        .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
                return response;
            }
            
            // Clone the response since it can only be consumed once
            const responseToCache = response.clone();
            const url = new URL(request.url);
            
            // Determine which cache to use
            const cacheName = url.origin === self.location.origin ? STATIC_CACHE : DYNAMIC_CACHE;
            
            caches.open(cacheName)
                .then((cache) => {
                    cache.put(request, responseToCache);
                })
                .catch((error) => {
                    console.warn('Service Worker: Failed to cache resource:', error);
                });
            
            return response;
        })
        .catch((error) => {
            console.error('Service Worker: Fetch failed:', error);
            throw error;
        });
}

// Background sync for offline calculations
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-calculations') {
        event.waitUntil(syncCalculations());
    }
});

// Sync calculations when back online
async function syncCalculations() {
    try {
        // Get all pending calculations from IndexedDB
        const pendingCalculations = await getPendingCalculations();
        
        // Process each pending calculation
        for (const calculation of pendingCalculations) {
            try {
                // Send to server or process as needed
                await processCalculation(calculation);
                
                // Remove from pending queue
                await removePendingCalculation(calculation.id);
            } catch (error) {
                console.error('Failed to sync calculation:', calculation.id, error);
            }
        }
        
        console.log('Service Worker: Calculations synced');
    } catch (error) {
        console.error('Service Worker: Sync failed:', error);
    }
}

// Push notifications for calculation completion
self.addEventListener('push', (event) => {
    const options = {
        body: 'Your Pi calculation has completed!',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%232563eb" width="100" height="100"/><text y=".9em" font-size="90" fill="white" text-anchor="middle" x="50">π</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle fill="%2310b981" cx="50" cy="50" r="50"/></svg>',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Result',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>'
            },
            {
                action: 'close',
                title: 'Close',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
            }
        ]
    };

    if (event.data) {
        const data = event.data.json();
        options.body = data.body || options.body;
        options.data = data;
    }

    event.waitUntil(
        self.registration.showNotification('Pi Calculator Pro', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        // Open the app and focus on results
        event.waitUntil(
            clients.openWindow('/')
                .then((client) => {
                    if (client) {
                        return client.focus();
                    }
                    return clients.openWindow('/');
                })
        );
    } else if (event.action === 'close') {
        // Just close the notification
        event.notification.close();
    } else {
        // Default action - open the app
        event.waitUntil(
            clients.matchAll().then((clientList) => {
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('Service Worker: Notification closed:', event.notification);
});

// Periodic background sync for data updates
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'update-pi-data') {
        event.waitUntil(updatePiData());
    }
});

// Update Pi data periodically
async function updatePiData() {
    try {
        // Fetch latest Pi digits from external API if needed
        console.log('Service Worker: Updating Pi data...');
        // Implementation would go here
    } catch (error) {
        console.error('Service Worker: Failed to update Pi data:', error);
    }
}

// IndexedDB helpers for offline functionality
function getPendingCalculations() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PiCalculatorDB', 1);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pendingCalculations'], 'readonly');
            const store = transaction.objectStore('pendingCalculations');
            const getRequest = store.getAll();
            
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

function removePendingCalculation(id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PiCalculatorDB', 1);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pendingCalculations'], 'readwrite');
            const store = transaction.objectStore('pendingCalculations');
            const deleteRequest = store.delete(id);
            
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

function processCalculation(calculation) {
    // Process calculation - could send to server or perform other actions
    return new Promise((resolve) => {
        console.log('Processing calculation:', calculation);
        setTimeout(resolve, 1000); // Simulate processing
    });
}

// Message handling from main thread
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: CACHE_NAME });
            break;
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
        default:
            console.warn('Service Worker: Unknown message type:', type);
    }
});

// Clear all caches
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Service Worker: All caches cleared');
    } catch (error) {
        console.error('Service Worker: Failed to clear caches:', error);
    }
}

// Network status monitoring
self.addEventListener('online', () => {
    console.log('Service Worker: Client is online');
    // Trigger sync when coming back online
    self.registration.sync.register('sync-calculations');
});

self.addEventListener('offline', () => {
    console.log('Service Worker: Client is offline');
});

// Performance monitoring
self.addEventListener('fetch', (event) => {
    const start = performance.now();
    
    event.waitUntil(
        fetch(event.request).then(response => {
            const duration = performance.now() - start;
            
            // Log slow requests
            if (duration > 1000) {
                console.warn(`Slow request: ${event.request.url} took ${duration.toFixed(2)}ms`);
            }
            
            return response;
        }).catch(error => {
            const duration = performance.now() - start;
            console.error(`Failed request: ${event.request.url} after ${duration.toFixed(2)}ms`, error);
            throw error;
        })
    );
});

console.log('Service Worker: Loaded');
