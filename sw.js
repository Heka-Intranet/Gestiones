const CACHE_NAME = 'heka-panel-v2'; // ← CAMBIA esto en cada despliegue
const ASSETS_TO_CACHE = [
  './',
  './manifest.json'
  // Ya NO pones index.html aquí
];

// Instalar
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activar: limpiar cachés viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  // No cachear llamadas a la API
  if (event.request.url.includes('/exec') || event.request.url.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({status: "error", message: "Sin conexión"}), {
        headers: {'Content-Type': 'application/json'}
      }))
    );
    return;
  }

  const url = new URL(event.request.url);

  // ── INDEX.HTML: SIEMPRE A LA RED PRIMERO ──
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cacheamos la versión nueva para offline
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Sin red: usamos lo que haya en caché (offline)
          return caches.match(event.request);
        })
    );
    return;
  }

  // ── DEMÁS ARCHIVOS: cache first ──
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
