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

const avatarSelection      = document.getElementById("avatar-selection");
const selectedAvatarInput  = document.getElementById("selected-avatar");

let mode = 'new'; // 'new' ou 'claim'

// 1) Guard : si pas connecté → login, ou déjà pseudo → home
onAuthStateChanged(auth, async user => {
  if (!user) {
    return window.location.href = 'login.html';
  }
  const meRef = doc(db, "users", user.uid);
  const meSnap = await getDoc(meRef);
  if (meSnap.exists() && meSnap.data().pseudo) {
    return window.location.href = 'home.html';
  }
});

// 2) Injecter les avatars
for (let i = 1; i <= 12; i++) {
  const img = document.createElement("img");
  img.src = `/images/avatars/avatar${i}.png`;
  img.alt = `Avatar ${i}`;
  img.dataset.avatar = `avatar${i}.png`;

  img.addEventListener('click', () => {
    document.querySelectorAll(".avatar-selection img").forEach(img => img.classList.remove("selected"));
    img.classList.add("selected");
    selectedAvatarInput.value = img.dataset.avatar;
  });

  avatarSelection.appendChild(img);
}

// 3) Sélection par défaut de avatar1.png
selectedAvatarInput.value = "avatar1.png";
const firstAvatar = document.querySelector(`[data-avatar="avatar1.png"]`);
if (firstAvatar) {
  firstAvatar.classList.add("selected");
}

// 4) Onglets
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    mode = tab.dataset.mode;
    tokenGroup.style.display = (mode === 'claim') ? 'block' : 'none';
    errorDiv.textContent = '';
  });
});

// 5) Soumission
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

  const selectedAvatar = selectedAvatarInput.value;
  if (!selectedAvatar) {
    return errorDiv.textContent = "Please select an avatar.";
  }

  const lower = pseudo.toLowerCase();
  const q = query(collection(db, "users"), where("pseudo_lower", "==", lower));
  const snapshot = await getDocs(q);

  if (mode === 'new') {
    if (!snapshot.empty) {
      return errorDiv.textContent = "This username is already taken.";
    }

    const timestampNow = Timestamp.now();
    const eloHistory = {
      game_id: "initial",
      timestamp: timestampNow,
      elo: 500
    };

    await setDoc(doc(db, "users", user.uid), {
      pseudo,
      pseudo_lower: lower,
      avatar: selectedAvatar,
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
  const data = existingDoc.data();
  const oldId = existingDoc.id;

  if (data.claimed === false && tokenInput.value.trim() === data.claim_token) {
    const { claim_token, ...rest } = data;

    await setDoc(doc(db, "users", user.uid), {
      ...rest,
      avatar: selectedAvatar,
      claimed: true
    });

    await deleteDoc(doc(db, "users", oldId));
    return window.location.href = '/home';
  } else {
    return errorDiv.textContent = "Invalid claim token or already claimed.";
  }
});
