import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBGRCQW0ZSbrYjfKxtvQEcCV_EhumrybhQ",
  authDomain: "civicvoice-ee420.firebaseapp.com",
  projectId: "civicvoice-ee420",
  storageBucket: "civicvoice-ee420.firebasestorage.app",
  messagingSenderId: "884634129825",
  appId: "1:884634129825:web:4427854414651e6f4a27e0",
};

const VAPID_KEY =
  "BL94c-E2_Avz9lIJdx-wTAgAz6jt7VlNPNvrNmxlgLF85bshV9EAQJpXHDJexB_ShyhhDEUqbtsErWDrmlN_yvo";

export function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export async function getMessagingIfSupported() {
  if (typeof window === "undefined") return null;
  if (!(await isSupported())) return null;
  return getMessaging(getFirebaseApp());
}

export async function requestPushToken(): Promise<string | null> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
  );

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  return token || null;
}

export async function onForegroundMessage(cb: (payload: unknown) => void) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => {};
  return onMessage(messaging, cb);
}
