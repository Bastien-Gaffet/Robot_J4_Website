// navbar-controller.js
import { auth, db } from './firebase-init.js';
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

onAuthStateChanged(auth, async user => {
  const isLoggedIn = !!user;
  let pseudo = null;

  // Si connecté, récupère le pseudo dans Firestore
  if (isLoggedIn) {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        pseudo = userDoc.data().pseudo;
      }
    } catch (e) {
      console.error("Erreur récupération pseudo :", e);
    }
  }

  // -------- Navbar PC --------
  const pcNav = document.getElementById("nav-links");
  if (pcNav) {
    pcNav.innerHTML = isLoggedIn
      ? `
        <a href="#" class="play-tab">Play</a>
        <a href="/leaderboard">Leaderboard</a>
        <a href="/game-history">History</a>
        <a href="/profile?pseudo=${encodeURIComponent(pseudo)}">Profile</a>
        <button onclick="logout()" class="logout-btn">Logout</button>
      `
      : `<a href="#" class="play-tab">Login</a>`;
  }

  // -------- Navbar Mobile (Profile tab) --------
  const mobileProfileLink = document.querySelector('.nav-item.profile-tab');
  if (mobileProfileLink) {
    mobileProfileLink.href = isLoggedIn
      ? `/profile?pseudo=${encodeURIComponent(pseudo)}`
      : `/login`;
  }

  // -------- Lien "Play" dynamique (PC + Mobile) --------
  document.querySelectorAll('.play-tab').forEach(el => {
    el.href = isLoggedIn ? "/home" : "/login";
  });
});

// -------- Fonction globale de logout --------
window.logout = function () {
  signOut(auth)
    .then(() => { window.location.href = "/login"; })
    .catch(err => console.error("Logout error:", err));
};
