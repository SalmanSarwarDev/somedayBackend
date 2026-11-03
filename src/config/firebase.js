const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.resolve(__dirname, '../../someday-firebase-service-account.json');

let app;

if (!getApps().length) {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
    console.log(`Firebase Admin initialized successfully for project: ${serviceAccount.project_id}`);
  } else {
    console.warn(`[Firebase] Service account file not found at: ${serviceAccountPath}`);
  }
} else {
  app = getApps()[0];
}

const auth = () => getAuth(app);
const messaging = () => getMessaging(app);

module.exports = {
  app,
  auth,
  messaging,
  getAuth: () => getAuth(app),
  getMessaging: () => getMessaging(app),
};
