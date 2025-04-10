// sw.js - Minimal Service Worker for PWA Installability & Notifications! Nyaa~!

// Basic install event listener (can be expanded for caching)
self.addEventListener('install', (event) => {
  console.log('Mika SW installed!', event);
  // Example caching (uncomment and modify if needed):
  // event.waitUntil(caches.open('mika-static-v1').then(cache => {
  //   return cache.addAll([
  //     '.', // Alias for index.html
  //     'index.html',
  //     'api.js',
  //     // Add other core assets here
  //     'icon-192.png',
  //     'icon-512.png',
  //     'icon-kana-192.png' // Make sure Kana's icon exists!
  //   ]);
  // }));
  self.skipWaiting(); // Activate new SW immediately
});

// Basic activate event listener
self.addEventListener('activate', (event) => {
  console.log('Mika SW activated!', event);
   // Claim clients immediately to control them
   event.waitUntil(self.clients.claim());
   // Example: Clean up old caches (if using versioned caches)
   // const cacheWhitelist = ['mika-static-v1']; // Update version if needed
   // event.waitUntil(
   //   caches.keys().then(cacheNames => {
   //     return Promise.all(
   //       cacheNames.map(cacheName => {
   //         if (cacheWhitelist.indexOf(cacheName) === -1) {
   //           return caches.delete(cacheName);
   //         }
   //       })
   //     );
   //   })
   // );
});

// Basic fetch event listener (network-first strategy - can be customized)
self.addEventListener('fetch', (event) => {
  // console.log('Mika SW fetching:', event.request.url);
  // Example: Cache-first strategy (uncomment to use)
  // event.respondWith(
  //   caches.match(event.request).then(response => {
  //     return response || fetch(event.request);
  //   })
  // );

  // Current simple pass-through:
   event.respondWith(fetch(event.request));
});

// --- Notification Handling ---

// Listen for messages from the main page (to trigger notification display)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'show-notification') {
    const { title, options } = event.data;
    console.log("SW received message to show notification:", title, options);
    // Check for permission again inside the SW? Might not be necessary if triggered from main page check.
    // self.registration.permissionState === 'granted' // Not directly available?
    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => console.log("SW Notification displayed successfully."))
        .catch(err => console.error("SW Error showing notification:", err))
    );
  }
});

// Listen for clicks on the notification
self.addEventListener('notificationclick', event => {
  console.log('SW Notification clicked:', event.notification.tag);
  event.notification.close(); // Close the notification

  // Define the URL to open/focus (usually the main app URL)
  const urlToOpen = new URL('.', self.location.origin).href;

  // Focus an existing window/tab or open a new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Check if there's already a window open at the target URL
      let clientWasFocused = false;
      for (const client of clientList) {
        // Use startsWith to handle potential query parameters or hash fragments
        if (client.url.startsWith(urlToOpen) && 'focus' in client) {
          console.log("SW: Focusing existing client window.");
          client.focus();
          clientWasFocused = true;
          break; // Stop after focusing the first match
        }
      }

      // If no existing window was focused, open a new one
      if (!clientWasFocused && clients.openWindow) {
        console.log("SW: Opening new client window.");
        return clients.openWindow(urlToOpen);
      }
    }).catch(err => console.error("SW notificationclick error:", err))
  );
});