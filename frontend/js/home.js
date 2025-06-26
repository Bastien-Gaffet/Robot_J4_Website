import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  // 1) Pas connecté → login
  if (!user) {
    return window.location.href = "/login";
  }

  // 2) Récupérer le doc Firestore du user
  let pseudo, elo;
  try {
    const userRef  = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Pas encore de profil → choose pseudo
      return window.location.href = "/choose-username";
    }

    // Profil trouvé, extraire pseudo + elo
    const data = userSnap.data();
    pseudo = data.pseudo;        // ici, pas de fallback
    elo    = data.elo ?? null;

  } catch (e) {
    console.error("Erreur récupération profil Firestore", e);
    // En cas d’erreur, tu peux décider d’une redirection ou afficher un message
    return;
  }

  // 3) Afficher pseudo + elo
  document.getElementById("userName").textContent    = pseudo;
  document.getElementById("profileInfo").textContent = 
    elo !== null ? `Elo actuel : ${elo}` : "";

  // 4) Mettre à jour la nav
  const navLinks = document.getElementById("nav-links");
  navLinks.innerHTML = `
    <a href="/">Accueil</a>
    <a href="/profile?pseudo=${encodeURIComponent(pseudo)}">Profil</a>
    <a href="/leaderboard">Classement</a>
    <a href="#" id="logoutBtn">Déconnexion</a>
  `;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    auth.signOut().then(() => window.location.href = "/login");
  });
});

// Boutons d'action
document.getElementById('btnProfile').addEventListener('click', () => {
  const pseudo = document.getElementById('userName').textContent;
  window.location.href = `/profile?pseudo=${encodeURIComponent(pseudo)}`;
});

document.getElementById('btnPlayBot').addEventListener('click', () => {
  // Rediriger vers la page jeu vs bot
  window.location.href = '/play-bot';
});

document.getElementById('btnPlayOnline').addEventListener('click', () => {
  // Rediriger vers la page jeu multijoueur (matchmaking)
  window.location.href = '/play-online';
});
