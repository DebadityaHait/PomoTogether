import { initializeApp, getApps } from 'firebase/app';
import { Firestore, getFirestore, initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import firebaseConfig from '../config/firebase.config.js';

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firestore with long polling configuration. Fast refresh can evaluate this
// module more than once, so fall back to the existing instance if it is already ready.
let firestore: Firestore;
try {
  firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true
  });
} catch {
  firestore = getFirestore(app);
}

export const db = firestore;

// Initialize Cloud Functions
export const functions = getFunctions(app);

export default app; 
