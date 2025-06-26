// js/account.js
import { auth, db } from './firebase-init.js';
import {
  onAuthStateChanged,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const emailDisplay = document.getElementById("user-email");
const pseudoInput = document.getElementById("pseudo");
const saveBtn = document.getElementById("save-btn");
const deleteBtn = document.getElementById("delete-btn");
const selectedAvatarInput = document.getElementById("selected-avatar");
const avatarSelection = document.getElementById("avatar-selection");
const popup = document.getElementById("delete-popup");
const confirmDelete = document.getElementById("confirm-delete");
const cancelDelete = document.getElementById("cancel-delete");
const confirmPseudoInput = document.getElementById("confirm-pseudo-input");

let currentUser;

// Avatar injection
for (let i = 1; i <= 12; i++) {
  const img = document.createElement("img");
  img.src = `/images/avatars/avatar${i}.png`;
  img.alt = `Avatar ${i}`;
  img.dataset.avatar = `avatar${i}.png`;

  img.addEventListener("click", () => {
    document.querySelectorAll(".avatar-selection img").forEach(img => img.classList.remove("selected"));
    img.classList.add("selected");
    selectedAvatarInput.value = img.dataset.avatar;
  });

  avatarSelection.appendChild(img);
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "/login";
    return;
  }
  currentUser = user;
  emailDisplay.textContent = user.email;

  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    pseudoInput.value = data.pseudo || "";
    selectedAvatarInput.value = data.avatar || "avatar1.png";

    // Mettre l'avatar sélectionné
    const selected = document.querySelector(`[data-avatar="${data.avatar}"]`);
    if (selected) selected.classList.add("selected");
  }
});

saveBtn.addEventListener("click", async () => {
  const newPseudo = pseudoInput.value.trim();
  const newAvatar = selectedAvatarInput.value;
  const newPseudoLower = newPseudo.toLowerCase();

  if (!newPseudo) return alert("Please enter a username.");
  if (newPseudo.length > 16) return alert("Your username must be 16 characters max.");

  const validPseudo = /^[\p{L}0-9_]+$/u;
  if (!validPseudo.test(newPseudo)) {
    return alert("Username must contain only letters, numbers, or underscores.");
  }

  try {
    // Récupérer les données actuelles de l'utilisateur
    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      return alert("User data not found.");
    }

    const currentData = userDocSnap.data();
    const currentPseudo = currentData.pseudo || "";
    const currentAvatar = currentData.avatar || "avatar1.png";

    // Vérifier s’il y a un vrai changement
    if (
      newPseudo === currentPseudo.trim() &&
      newAvatar === currentAvatar
    ) {
      return alert("No changes to update.");
    }

    // Vérifier si le nouveau pseudo est déjà pris
    if (newPseudo.toLowerCase() !== (currentPseudo.toLowerCase() || "")) {
      const q = query(
        collection(db, "users"),
        where("pseudo_lower", "==", newPseudoLower)
      );
      const snapshot = await getDocs(q);

      const isTaken = !snapshot.empty && snapshot.docs.some(doc => doc.id !== currentUser.uid);
      if (isTaken) {
        return alert("This username is already taken.");
      }
    }

    // Effectuer la mise à jour
    await updateDoc(userDocRef, {
      pseudo: newPseudo,
      pseudo_lower: newPseudoLower,
      avatar: newAvatar
    });

    alert("Information updated!");
  } catch (e) {
    console.error("Update error:", e);
    alert("Failed to update information.");
  }
});

deleteBtn.addEventListener("click", () => {
  confirmPseudoInput.value = "";
  popup.style.display = "flex";
});

cancelDelete.addEventListener("click", () => {
  popup.style.display = "none";
  confirmPseudoInput.value = "";
});

confirmDelete.addEventListener("click", async () => {
  const typedPseudo = confirmPseudoInput.value.trim().toLowerCase();

  try {
    // Récupérer le document utilisateur
    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      alert("User data not found.");
      return;
    }

    const storedPseudoLower = userDocSnap.data().pseudo_lower || "";

    // Comparaison insensible à la casse
    if (typedPseudo !== storedPseudoLower) {
      alert("The entered username does not match your username (case-insensitive). Please try again.");
      return;
    }

    // Supprimer Firestore + Auth
    await deleteDoc(userDocRef);
    await deleteUser(currentUser);

    // Déconnexion forcée (pour éviter la redirection automatique)
    localStorage.clear();  // en plus si tu stockes des infos locales
    sessionStorage.clear(); // idem si utilisé
    alert("Account successfully deleted.");
    window.location.href = "/login"; // vers la page de login
  } catch (e) {
    if (e.code === 'auth/requires-recent-login') {
      alert("Please log in again to delete your account.");
      await auth.signOut(); // <- Ajoute ceci pour forcer la déconnexion Firebase
      window.location.href = "/login";
    } else {
      console.error("Error during deletion:", e);
      alert("Error deleting the account.");
    }
  }
});


