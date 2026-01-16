/* sw.js — 改變｜換一個反應
   重要：改版時請更新 CACHE_VERSION，確保新版本會被取用
*/
'use strict';

const CACHE_VERSION = 'angel-change-v1.0.0-2026-01-16';
const CACHE_NAME = `cache-${CACHE_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve())
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });
    if(cached) return cached;

    try{
      const fresh = await fetch(req);
      // only cache same-origin
      if(new URL(req.url).origin === self.location.origin){
        cache.put(req, fresh.clone());
      }
      return fresh;
    }catch(e){
      // fallback to index for navigation when offline
      if(req.mode === 'navigate'){
        const fallback = await cache.match('./index.html');
        if(fallback) return fallback;
      }
      throw e;
    }
  })());
});
