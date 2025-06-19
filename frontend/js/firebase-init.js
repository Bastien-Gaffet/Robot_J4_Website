// js/firebase-init.js

// Import depuis le CDN (comme pour Firestore)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDh-ApzhDEw5GncfJdoTJzLHaOSFzNVX8c",
  authDomain: "dataconnect4-89912.firebaseapp.com",
  databaseURL: "https://dataconnect4-89912-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "dataconnect4-89912",
  storageBucket: "dataconnect4-89912.appspot.com",
  messagingSenderId: "401441267427",
  appId: "1:401441267427:web:5c99c3825c938de8ff2fd6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);