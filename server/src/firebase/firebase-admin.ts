import * as admin from 'firebase-admin';

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!admin.apps.length) {
  if (!serviceAccountBase64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  }

  const decoded = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
  const serviceAccount = JSON.parse(decoded);
  

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}