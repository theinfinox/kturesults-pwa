const CACHE_NAME = "ktu-cgpa-pwa-v8";
const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./app.css",
    "./app.js",
    "./crypto-vault.js",
    "./sync-engine.js",
    "./constants.js",
    "./pdf_vector.js",
    "./libs/jspdf.umd.min.js",
    "./manifest.webmanifest",
    "./icons/16.png",
    "./icons/32.png",
    "./icons/48.png",
    "./icons/128.png"
];

self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn("[PWA SW] Precache warning:", err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((k) => {
                    if (k !== CACHE_NAME) {
                        return caches.delete(k);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (e) => {
    // Pass API / sync requests straight through
    if (e.request.url.includes("/api/") || e.request.url.includes("app.ktu.edu.in")) {
        e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ error: "Offline" }), { status: 503 })));
        return;
    }

    // Network-first with instant offline fallback
    e.respondWith(
        fetch(e.request).then((response) => {
            if (response && response.status === 200) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseToCache);
                });
            }
            return response;
        }).catch(() => caches.match(e.request).then(cached => cached || caches.match("./index.html")))
    );
});
