// Define a unique name for the cache
const CACHE_NAME = 'remedio-na-hora-cache-v1';

// List of files to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/constants.tsx',
  '/services/geminiService.ts',
  '/components/AddReminderModal.tsx',
  '/components/Calendar.tsx',
  '/components/NotificationModal.tsx',
  '/components/ReminderList.tsx',
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1/',
  'https://aistudiocdn.com/@google/genai@^1.17.0'
];

// Install event: opens the cache and adds the files to it
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event: serves requests from the cache if available, otherwise fetches from the network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response from cache
        if (response) {
          return response;
        }

        // Not in cache - fetch from network
        return fetch(event.request);
      }
    )
  );
});

// Activate event: cleans up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
