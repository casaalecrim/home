/* Casa Alecrim · Finanças — Service Worker
   Guarda em cache só o "esqueleto" do app (HTML, ícones, manifest) para abrir
   rápido e funcionar offline. Nunca guarda em cache as chamadas para a planilha
   (Apps Script) — essas sempre vão direto para a rede, para os dados nunca
   ficarem desatualizados. Também recebe as notificações push (Firebase) e as
   exibe mesmo com o app fechado. */
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');

// Precisa ser IGUAL ao FIREBASE_CONFIG do index.html.
firebase.initializeApp({
  apiKey: "COLE_AQUI_A_API_KEY",
  authDomain: "COLE_AQUI.firebaseapp.com",
  projectId: "COLE_AQUI_O_PROJECT_ID",
  messagingSenderId: "COLE_AQUI_O_SENDER_ID",
  appId: "COLE_AQUI_O_APP_ID"
});
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'Casa Alecrim';
  const body = (payload.notification && payload.notification.body) || '';
  self.registration.showNotification(title, { body, icon: './icon-192.png', badge: './favicon-32.png' });
});

const CACHE_NAME = 'casa-alecrim-shell-v5';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon-32.png', './sg-logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca interceptar chamadas à API da planilha (Apps Script) — sempre rede.
  if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) return;

  // Não interceptar recursos de outros domínios (fontes, Chart.js via CDN) —
  // deixa o cache HTTP normal do navegador cuidar disso.
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
