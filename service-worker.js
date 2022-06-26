const VERSION = "0.1"
const APP_PREFIX = "animage_"
const CACHE_STORE = APP_PREFIX + VERSION
const NAVIGATION_FALLBACK = 'index.html';

const FILES = [
  '/animage/bundle.js',
  '/animage/gif.js',
  '/animage/gif.worker.js',
  '/animage/index.css',
  '/animage/index.html',
  '/animage/tree.jfif'
];

const navigateFallback = NAVIGATION_FALLBACK;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STORE)
      .then(cache => {
        console.log(`installing cache ${CACHE_STORE}`)
        return cache.addAll(FILES);
      })
      .then(() => {
        console.log('Skip waiting when installing cache')
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(function (keyList) {
      // `keyList` contains all cache names under your username.github.io
      // filter out ones that has this app prefix to create white list
      var cacheWhitelist = keyList.filter(function (key) {
        return key.indexOf(APP_PREFIX)
      })
      // add current cache name to white list
      cacheWhitelist.push(CACHE_STORE)

      return Promise.all(keyList.map(function (key, i) {
        if (cacheWhitelist.indexOf(key) === -1) {
          console.log('deleting cache : ' + keyList[i] )
          return caches.delete(keyList[i])
        }
      }))
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method === 'GET') {
    let url = event.request.url.indexOf(self.location.origin) !== -1 ?
      event.request.url.split(`${self.location.origin}/`)[1] :
      event.request.url;
    let isFileCached = FILES.indexOf(url) !== -1;

    // This is important part if your app needs to be available offline
    // If request wasn't found in array of files and this request has navigation mode and there is defined navigation fallback
    // then navigation fallback url is picked istead of real request url
    if (!isFileCached && event.request.mode === 'navigate' && navigateFallback) {
      url = navigateFallback;
      isFileCached = FILES.indexOf(url) !== -1;
    }

    if (isFileCached) {
      event.respondWith(
        caches.open(CACHE_STORE)
          .then(cache => {
            return cache.match(url)
              .then(response => {
                if (response) {
                  return response;
                }
                throw Error('There is not response for such request', url);
              });
          })
          .catch(error => {
            return fetch(event.request);
          })
      );
    }
  }
});
