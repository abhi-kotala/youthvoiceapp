/* Firebase Cloud Messaging service worker */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBGRCQW0ZSbrYjfKxtvQEcCV_EhumrybhQ",
  authDomain: "civicvoice-ee420.firebaseapp.com",
  projectId: "civicvoice-ee420",
  storageBucket: "civicvoice-ee420.firebasestorage.app",
  messagingSenderId: "884634129825",
  appId: "1:884634129825:web:4427854414651e6f4a27e0",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Youth Voice";
  const body = (payload.notification && payload.notification.body) || "";
  const url = (payload.data && payload.data.url) || "/";
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.openWindow(url));
});
