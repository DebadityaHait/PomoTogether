import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import firebaseConfig from '../config/firebase.config.js';

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firestore with long polling configuration
// This prevents "WebChannelConnection RPC 'Write' stream transport errored" issues
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

// Initialize Cloud Functions
export const functions = getFunctions(app);

export default app; 