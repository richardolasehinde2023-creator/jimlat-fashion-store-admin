// ============================================
// FIREBASE — ADMIN
// ============================================

const firebaseConfig = {
  apiKey:            'AIzaSyAdiDfkzuCJVaj6nyfONcF_3OVcAS79iw0',
  authDomain:        'jimlat-fashion-store.firebaseapp.com',
  projectId:         'jimlat-fashion-store',
  storageBucket:     'jimlat-fashion-store.firebasestorage.app',
  messagingSenderId: '906090061473',
  appId:             '1:906090061473:web:21fc6f78c5573df13c9ae0'
};

firebase.initializeApp(firebaseConfig);

var db   = firebase.firestore();
var auth = firebase.auth();