const CACHE_NAME = 'dokon-qarz-v6';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
];

// O'rnatish — barcha statik fayllarni cache qilish
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Faollashish — eski cachelarni tozalash
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Offline ma'lumotlar uchun alohida cache
const DATA_CACHE = 'dokon-qarz-data-v6';

// Offline saqlash uchun API endpointlar
const CACHE_APIS = [
  '/api/stats',
  '/api/qarzdorlar',
  '/api/stats/monthly',
  '/api/stats/top-qarzdorlar',
  '/api/mahsulotlar',
];

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Faqat GET so'rovlarga ishlov ber
  if (event.request.method !== 'GET') return;

  // API so'rovlari — Network first, offline bo'lsa cache
  if (url.pathname.startsWith('/api/')) {
    const shouldCache = CACHE_APIS.some(api => url.pathname.startsWith(api));

    if (shouldCache) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(DATA_CACHE).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => caches.match(event.request))
      );
    } else {
      // Boshqa API lar — faqat network
      event.respondWith(
        fetch(event.request).catch(() =>
          new Response(JSON.stringify({ error: 'Offline rejim — internet ulanishi yo\'q', offline: true }),
            { headers: { 'Content-Type': 'application/json' }, status: 503 }
          )
        )
      );
    }
    return;
  }

  // Statik fayllar — Cache first, keyin network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline bo'lsa HTML sahifalar uchun index.html qaytarish
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Push xabarnoma (kelajak uchun)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "Do'kon Qarz", {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'default',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});