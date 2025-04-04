// sw.js - Minimal Service Worker for PWA Installability

// Basic install event listener (can be expanded for caching)
self.addEventListener('install', (event) => {
  console.log('Mika SW installed!', event);
  // event.waitUntil(caches.open('mika-static-v1').then(cache => {
  //   return cache.addAll([
  //     '.', // Alias for index.html
  //     'index.html',
  //     'api.js',
  //     'icon-192.png', // Add other assets if caching
  //     'icon-512.png'
  //   ]);
  // }));
  self.skipWaiting(); // Activate new SW immediately
});

// Basic activate event listener
self.addEventListener('activate', (event) => {
  console.log('Mika SW activated!', event);
   // Claim clients immediately
   event.waitUntil(self.clients.claim());
});

// Basic fetch event listener (network-first strategy)
self.addEventListener('fetch', (event) => {
  // console.log('Mika SW fetching:', event.request.url);
  // Minimal fetch handler just passes through requests
  // More complex strategies (cache-first, offline page) can be added here
  event.respondWith(fetch(event.request));
});