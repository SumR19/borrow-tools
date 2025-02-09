const CACHE_NAME = "borrow-tools-cache-v1";
const urlsToCache = [
    "/",
    "/index.html",
    "/style.css",
    "/script.js",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png"
];

// ติดตั้ง Service Worker และเก็บไฟล์ไว้ใน Cache
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// ดักจับการเรียกไฟล์จาก Network
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});

// อัปเดต Cache เมื่อมีการเปลี่ยนแปลง
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME).map(cacheName => caches.delete(cacheName))
            );
        })
    );
});
