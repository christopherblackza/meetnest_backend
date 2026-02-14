import * as admin from 'firebase-admin';

const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!admin.apps.length) {
  if (!serviceAccountBase64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  }

  try {
    const decoded = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(decoded);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.warn('Failed to initialize Firebase Admin SDK:', error.message);
    console.warn('Please ensure FIREBASE_SERVICE_ACCOUNT environment variable contains a valid base64-encoded service account JSON.');
  }
}