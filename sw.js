const CACHE_NAME = 'heka-panel-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// Instalar: cachear archivos estáticos
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

// Fetch: Network first, fallback a cache (para API)
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

  // Para archivos estáticos: cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cachear respuestas exitosas
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});