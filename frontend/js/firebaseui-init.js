// js/firebaseui-init.js

// On n'utilise plus les imports modulaires, mais le namespace `firebase` global
// fourni par firebase-app-compat.js, firebase-auth-compat.js et firebase-firestore-compat.js.
// Assure-toi que ces trois scripts sont chargés **avant** celui-ci dans ton HTML.

const firebaseConfig = {
  apiKey: "AIzaSyAt0gq6_HmBIpH1LLBRBrNcmKjFuW1jUnA",
  authDomain: "robot-j4.firebaseapp.com",
  projectId: "robot-j4",
  storageBucket: "robot-j4.firebasestorage.app",
  messagingSenderId: "934067299754",
  appId: "1:934067299754:web:4be335ab326eff154a77d3",
  measurementId: "G-G4ZKC68G73"
};

// 1) Initialise Firebase
firebase.initializeApp(firebaseConfig);

// 2) Récupère les services compat
const auth = firebase.auth();
const db   = firebase.firestore();

// 3) Initialise FirebaseUI
const ui = new firebaseui.auth.AuthUI(auth);
const uiConfig = {
  signInFlow: 'popup',
  signInOptions: [
    // providers
    firebase.auth.EmailAuthProvider.PROVIDER_ID,
    firebase.auth.GoogleAuthProvider.PROVIDER_ID
  ],
  callbacks: {
    async signInSuccessWithAuthResult(authResult) {
      // 4) Une fois connecté, on vérifie l'existence du profil
      const user = authResult.user;
      try {
        const snap = await db.collection("users").doc(user.uid).get();
        if (snap.exists) {
          // Le profil existe → on va sur home
          window.location.href = "home.html";
        } else {
          // Pas encore de pseudo → choisir
          window.location.href = "choose-username.html";
        }
      } catch (e) {
        console.error("Erreur Firestore :", e);
        // En cas d’erreur, on reste sur la page ou on notifie
      }
      return false; // empêche la redirection automatique
    }
  }
};

// 5) Démarre le widget dans la div
ui.start("#firebaseui-auth-container", uiConfig);
