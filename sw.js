/* Service worker appky: kostra (stránka, skript, štýly, ikony) je uložená v zariadení, takže sa appka otvorí aj
   bez signálu. Dáta dashboardu tu nie sú – tie rieši appka sama. 4f9a5286ed dopĺňa tools/build-pwa.js; nová zostava
   = nový súbor = prehliadač ponúkne aktualizáciu. */
const BUILD = "4f9a5286ed";
const CACHE = "ensafe-kostra-" + BUILD;
const FONTS = "ensafe-pisma";
const SHELL = ["./", "config.js", "app.js", "appka.js", "fronta.js", "leaflet.js", "leaflet.css", "styles.css", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // volania servera (POST) idú vždy priamo
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // kostra z pamäte zariadenia; čo v nej nie je (iná adresa na tom istom webe), ide zo siete
    event.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req, { ignoreSearch: true });
        return hit || fetch(req);
      }),
    );
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    // písma: z pamäte, ak tam sú; inak zo siete a uložiť (bez signálu sa použije náhradné písmo)
    event.respondWith(
      caches.open(FONTS).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === "opaque") c.put(req, res.clone());
        return res;
      }),
    );
  }
});
