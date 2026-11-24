// Configuration du Service Worker BROCOLI pour PWA (compatible iOS / iPhone)
// Version du cache à incrémenter à chaque nouveau déploiement pour déclencher une mise à jour
const CACHE_VERSION = 'v2.2.0';
const CACHE_NAME = `brocoli-pwa-${CACHE_VERSION}`;

// Ressources essentielles à pré-cacher à l'installation (sans jamais inclure sw.js)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo_brocoli.jpg',
  '/logo-2.png',
];

// Installation du nouveau Service Worker : pré-cache les ressources critiques
// On n'appelle PAS self.skipWaiting() ici afin que l'utilisateur déclenche la mise à jour depuis les Réglages
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Ajout tolérant aux erreurs pour ne pas bloquer l'installation si une image optionnelle manque
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: 'reload' }).then((response) => {
            if (response && response.ok) {
              return cache.put(url, response);
            }
          })
        )
      );
    })
  );
});

// Activation : suppression des anciens caches versionnés et prise de contrôle des onglets ouverts
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((oldName) => caches.delete(oldName))
      );
      await self.clients.claim();
    })()
  );
});

// Réception des messages depuis l'application React (bouton "Mettre à jour")
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Stratégie de mise en cache réseau : ne jamais mettre sw.js ni les appels API en cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignorer les requêtes non-GET et les requêtes hors origine (ex: Supabase, CDN externes)
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Ne JAMAIS mettre sw.js lui-même en cache
  if (url.pathname === '/sw.js') {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Ne pas mettre en cache les endpoints API, MCP ou Widgets dynamiques
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/widget/')) {
    return;
  }

  // Pour la navigation HTML : Network-First avec repli sur le cache hors ligne
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('/index.html');
        })
    );
    return;
  }

  // Pour les assets statiques (JS, CSS, images, polices) : Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
