"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

// Firebase web config — safe to expose (public values from the Firebase console).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

const REQUIRED_KEYS = ["apiKey", "projectId", "appId"] as const;

/** False until .env.local is filled in — app then runs in "not configured" mode with empty states. */
export const isFirebaseConfigured: boolean = REQUIRED_KEYS.every(
  (key) => Boolean(firebaseConfig[key]),
);

let cachedApp: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApps()[0];
    return cachedApp;
  }
  cachedApp = initializeApp(firebaseConfig);
  return cachedApp;
}