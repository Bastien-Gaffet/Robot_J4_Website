import { auth, db } from './firebase-init.js';
import {
  collection, query, where, getDocs,
  doc, getDoc, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// DOM
const tabs        = document.querySelectorAll('.tab');
const pseudoInput = document.getElementById('pseudo');
const tokenGroup  = document.getElementById('claim-token-section');
const tokenInput  = document.getElementById('claim-token');
const submitBtn   = document.getElementById('submit-btn');
const errorDiv    = document.getElementById('error-message');

let mode = 'new'; // 'new' ou 'claim'

// 1) Guard : si pas connecté → login, ou déjà pseudo → home
onAuthStateChanged(auth, async user => {
  if (!user) {
    return window.location.href = 'login.html';
  }
  // Si le doc sous {uid} existe déjà et contient un pseudo, on redirige
  const meRef = doc(db, "users", user.uid);
  const meSnap = await getDoc(meRef);
  if (meSnap.exists() && meSnap.data().pseudo) {
    return window.location.href = 'home.html';
  }
});

// 2) Onglets
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    mode = tab.dataset.mode;
    tokenGroup.style.display = (mode === 'claim') ? 'block' : 'none';
    errorDiv.textContent = '';
  });
});

// 3) Soumission
submitBtn.addEventListener('click', async () => {
  errorDiv.textContent = '';
  const user = auth.currentUser;
  if (!user) {
    return window.location.href = 'login.html';
  }

  const pseudo = pseudoInput.value.trim();
  if (!pseudo) {
    return errorDiv.textContent = "Please enter a username.";
  }

  const lower = pseudo.toLowerCase();
  // Cherche tout doc où pseudo_lower == lower
  const q        = query(collection(db, "users"), where("pseudo_lower", "==", lower));
  const snapshot = await getDocs(q);

  if (mode === 'new') {
    // Nouveau pseudo
    if (!snapshot.empty) {
      return errorDiv.textContent = "This username is already taken.";
    }

    const timestampNow = Timestamp.now();

    const eloHistory = {
      game_id: "initial",
      timestamp: timestampNow,
      elo: 500
    }

    // Crée sous /users/{uid}
    await setDoc(doc(db, "users", user.uid), {
      pseudo,
      pseudo_lower: lower,
      elo: 500,
      elo_history: eloHistory,
      wins: 0,
      losses: 0,
      draws: 0,
      claimed: true
    });
    return window.location.href = '/home';
  }

  // Mode "claim"
  if (snapshot.empty) {
    return errorDiv.textContent = "No such username to claim.";
  }
  const existingDoc = snapshot.docs[0];
  const data        = existingDoc.data();
  const oldId       = existingDoc.id;

  if (data.claimed === false && tokenInput.value.trim() === data.claim_token) {
    const {
      claim_token,
      ...rest
    } = data;

    // 1) Copier l'ancien doc sous /users/{uid}
    await setDoc(doc(db, "users", user.uid), {
      ...rest,
      claimed: true,
    });
    // 2) Supprimer l'ancien doc
    await deleteDoc(doc(db, "users", oldId));
    return window.location.href = '/home';
  } else {
    return errorDiv.textContent = "Invalid claim token or already claimed.";
  }
});
