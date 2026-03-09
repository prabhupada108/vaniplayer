// Service Worker for Vani Player PWA
const CACHE_NAME = 'vaniplayer-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Network-first strategy - app relies on live data
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
