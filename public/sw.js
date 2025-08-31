const CACHE_NAME = 'borrow-tools-v5'; // ✅ ใช้เวอร์ชันคงที่ เปลี่ยนเมื่อ deploy
const urlsToCache = [
    '/index.html',
    '/style.css',
    '/script.js',
    '/admin.html',
    '/admin.js',
    '/manifest.json'
];

self.addEventListener('install', function(event) {
    self.skipWaiting(); // ✅ บังคับให้ Service Worker ใหม่ทำงานทันที
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('✅ Cache opened:', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
            .catch(err => {
                console.error('❌ Cache install failed:', err);
            })
    );
});

self.addEventListener('activate', function(event) {
    self.clients.claim(); // ✅ ควบคุม page ทันที
    
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(name) {
                    return name !== CACHE_NAME;
                }).map(function(name) {
                    console.log('🗑️ ลบ cache เก่า:', name);
                    return caches.delete(name);
                })
            );
        })
    );
});

// ✅ Network First + Proper Fallback
self.addEventListener('fetch', function(event) {
    // ข้าม API calls
    if (event.request.url.includes('/api/') || event.request.url.includes('/borrow')) {
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                // ถ้า fetch สำเร็จ ให้ cache ใหม่
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(function() {
                // ถ้า fetch ไม่ได้ (offline) ใช้จาก cache
                return caches.match(event.request).then(function(response) {
                    if (response) {
                        return response;
                    }
                    // ถ้าไม่มีใน cache ส่ง generic offline page
                    if (event.request.destination === 'document') {
                        return new Response('<!DOCTYPE html><html><body><h1>🚫 ออฟไลน์</h1><p>ไม่สามารถเชื่อมต่อได้</p></body></html>', {
                            headers: { 'Content-Type': 'text/html' }
                        });
                    }
                });
            })
    );
});