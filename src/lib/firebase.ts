import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);

if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
  // Check if emulators are already connected to prevent errors during hot reloading
  // For Auth, there isn't a direct way to check if it's already connected to the emulator,
  // so we rely on the fact that connectAuthEmulator can be called multiple times,
  // though it might log warnings.
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  } catch (e) {
    // console.warn("Auth emulator already connected or error connecting:", e);
  }

  // For Firestore, we can check if it's already connected by trying to access a property
  // that only exists after connection, or by catching the error.
  // A simpler way is to just try to connect. It will error if already connected.
  try {
     // @ts-ignore Using _settings because the JS SDK doesn't have a clean way to check
    if (!db._settings.host?.includes('localhost')) {
        connectFirestoreEmulator(db, "localhost", 8080);
    }
  } catch (e) {
    // console.warn("Firestore emulator already connected or error connecting:", e);
  }
}


export { app, auth, db };
