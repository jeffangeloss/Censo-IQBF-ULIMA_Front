/*
 * Service worker de la PWA de censo.
 *
 * Cachea el armazon de la aplicacion para que abra sin senal. NO cachea la
 * API: un envase con datos viejos es peor que un error de red, porque el
 * operador creeria estar viendo el estado actual de la botella.
 *
 * Las escrituras no pasan por aqui: viven en IndexedDB y las sincroniza la
 * propia aplicacion.
 */

const VERSION = "censo-v1";
const ARMAZON = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(ARMAZON)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(
          claves.filter((clave) => clave !== VERSION).map((clave) => caches.delete(clave)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const solicitud = evento.request;

  if (solicitud.method !== "GET") return;

  const url = new URL(solicitud.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navegacion: red primero para tomar la version nueva; si no hay senal, el
  // armazon cacheado.
  if (solicitud.mode === "navigate") {
    evento.respondWith(
      fetch(solicitud).catch(() => caches.match("/index.html")),
    );
    return;
  }

  // Recursos con hash en el nombre: cache primero, y se guarda lo nuevo.
  evento.respondWith(
    caches.match(solicitud).then((guardado) => {
      if (guardado) return guardado;
      return fetch(solicitud).then((respuesta) => {
        if (respuesta.ok && respuesta.type === "basic") {
          const copia = respuesta.clone();
          caches.open(VERSION).then((cache) => cache.put(solicitud, copia));
        }
        return respuesta;
      });
    }),
  );
});
