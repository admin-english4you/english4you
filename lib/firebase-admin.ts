import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getStorage, Storage } from "firebase-admin/storage";
import { getDatabase, Database } from "firebase-admin/database";

let app: App | undefined;
let adminAuth: Auth | null = null;
let adminStorage: Storage | null = null;
let adminDb: Database | null = null;

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  }
} else {
  app = getApps()[0];
}

if (app) {
  adminAuth = getAuth(app);
  adminStorage = getStorage(app);
  // Só o Realtime Database é opcional aqui: getDatabase() lança na hora se
  // não houver databaseURL configurada, e nem todo deploy liga o board ao
  // vivo da sala do professor — sem a env var, fica nulo em vez de derrubar
  // Auth/Storage (que continuam funcionando normalmente) junto.
  if (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
    adminDb = getDatabase(app);
  }
}

export { adminAuth, adminStorage, adminDb };
