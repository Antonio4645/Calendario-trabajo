// Nombre del cache: cambia la versión cada vez que actualices CSS/JS
const CACHE_NAME = "calendario-cache-v2"; // ++Sube a v3, v4, etc., cuando actualices archivos

// Archivos que queremos cachear para funcionar offline
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./logo.png",
  "./logo-icon.png"
];

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Instalando y cacheando archivos...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del Service Worker
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activado");
  // Limpiar caches antiguos
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Eliminando cache antiguo:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Interceptar peticiones y servir desde cache si existe
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        // Devuelve archivo cacheado
        return response;
      }
      // Sino, busca online
      return fetch(event.request);
    })
  );
});