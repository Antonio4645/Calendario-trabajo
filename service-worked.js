const CACHE_NAME = "fichaje-cache-v1";
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./logo.png",
  "./logo-icon.png",
  "./manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => { if(key!==CACHE_NAME) return caches.delete(key); }))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request).then(response => {
      if(event.request.url.endsWith(".js") || event.request.url.endsWith(".css") || event.request.url.endsWith(".html")){
        caches.open(CACHE_NAME).then(cache => { cache.put(event.request, response.clone()); });
      }
      return response;
    }))
  );
});