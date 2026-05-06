const CACHE_NAME = 'baseline-shell-v1';
const OFFLINE_URL = '/offline.html';
const SHELL_ASSETS = [
  '/',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png'
];

const NETWORK_ONLY_PATH_PREFIXES = [
  '/api/odds',
  '/api/stream/odds',
  '/api/chat',
  '/mcp',
  '/auth',
  '/payment',
  '/checkout'
];

const NETWORK_ONLY_HOST_MATCHES = [
  'api.stripe.com',
  'checkout.stripe.com',
  'js.stripe.com',
  'securetoken.googleapis.com',
  'identitytoolkit.googleapis.com',
  'firebaseauth.googleapis.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isNetworkOnlyRequest(url) {
  return (
    NETWORK_ONLY_HOST_MATCHES.some((host) => url.host.includes(host)) ||
    NETWORK_ONLY_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  );
}

function isStaticAssetRequest(requestUrl) {
  return /^\/assets\//.test(requestUrl.pathname) ||
    /\.(?:js|css|woff2?|ttf|eot|png|jpg|jpeg|svg|webp|ico)$/i.test(requestUrl.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isNetworkOnlyRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  if (!isStaticAssetRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
