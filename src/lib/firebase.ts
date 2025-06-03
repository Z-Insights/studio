
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";

const apiKeyFromEnv = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomainFromEnv = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectIdFromEnv = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucketFromEnv = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderIdFromEnv = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appIdFromEnv = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

// Perform robust checks for the API key
if (!apiKeyFromEnv) {
  console.error(
    "CRITICAL Firebase Configuration Error: NEXT_PUBLIC_FIREBASE_API_KEY is UNDEFINED or EMPTY in your environment variables. " +
    "Please ensure this variable is set with your actual Firebase API key in your .env file at the project root, and that you have RESTARTED your Next.js development server. " +
    "Firebase will fail to initialize without it."
  );
  // Throw an error to prevent Firebase from attempting to initialize with a missing key.
  throw new Error("Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing or empty. Check your .env file and restart the server.");
} else if (
    apiKeyFromEnv.includes("YOUR_") || 
    apiKeyFromEnv.includes("_HERE") || 
    apiKeyFromEnv.includes("XXXXX") || // Common placeholder pattern
    apiKeyFromEnv.length < 20 // Firebase API keys are typically around 39-40 characters
  ) {
  console.error(
    `CRITICAL Firebase Configuration Error: The provided NEXT_PUBLIC_FIREBASE_API_KEY ('${apiKeyFromEnv}') appears to be a PLACEHOLDER or is too short to be a valid Firebase API key. ` +
    "Please ensure you have replaced placeholder values (e.g., 'YOUR_API_KEY_HERE') with your actual Firebase API key in your .env file at the project root. " +
    "Verify the key for typos and ensure it's the correct one for your project. Restart your Next.js development server after changes."
  );
  // Throw an error to make this issue highly visible.
  throw new Error(
    `Invalid Firebase API Key detected: '${apiKeyFromEnv}'. It looks like a placeholder or is too short. Check NEXT_PUBLIC_FIREBASE_API_KEY in your .env file and restart the server.`
  );
}

// Check other critical environment variables
if (!authDomainFromEnv || !projectIdFromEnv) {
    console.warn(
        "Firebase Configuration Warning: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN or NEXT_PUBLIC_FIREBASE_PROJECT_ID might be missing or empty. " +
        "While the API key is the most common cause for 'auth/invalid-api-key', ensure all Firebase config variables are correctly set in your .env file."
    );
}


const firebaseConfig = {
  apiKey: apiKeyFromEnv,
  authDomain: authDomainFromEnv,
  projectId: projectIdFromEnv,
  storageBucket: storageBucketFromEnv,
  messagingSenderId: messagingSenderIdFromEnv,
  appId: appIdFromEnv,
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
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  } catch (e) {
    // console.warn("Auth emulator already connected or error connecting:", e);
  }
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
