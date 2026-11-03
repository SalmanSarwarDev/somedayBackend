// Firebase Cloud Messaging Service Worker
try {
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

  // Read config from query params if passed, or use defaults
  const params = new URLSearchParams(location.search);
  const apiKey = params.get('apiKey') || 'AIzaSyBRo3bPfml6whomPpFefpKO986jnpHxcc';
  const projectId = params.get('projectId') || 'someday-e47c0';
  const messagingSenderId = params.get('messagingSenderId') || '1017626458064';
  const appId = params.get('appId') || '1:1017626458064:web:fc9057a81706a6b9a9at';

  if (!firebase.apps.length) {
    const config = {
      apiKey: apiKey,
      authDomain: `${projectId}.firebaseapp.com`,
      projectId: projectId,
      messagingSenderId: messagingSenderId,
    };
    if (appId) {
      config.appId = appId;
    }
    firebase.initializeApp(config);
  }

  const messaging = firebase.messaging();

  // Background message handler
  // CRITICAL: When the backend payload contains 'notification: { title, body }',
  // Firebase Web SDK automatically displays the notification natively.
  // Calling self.registration.showNotification() here causes a DUPLICATE notification
  // to pop up 3-4 seconds later! Keep this handler purely for data logging.
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background push payload received by Firebase SDK:', payload);
  });
} catch (error) {
  console.error('[firebase-messaging-sw.js] Error initializing service worker:', error);
}
