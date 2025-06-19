// js/replay.js
import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

  const rows = 6, cols = 7;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  const gridDiv = document.getElementById("grid");

function renderGrid() {
  gridDiv.innerHTML = "";
  for (let r = 0; r < rows; r++) {
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("row");
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      if (grid[r][c] === 1) cell.classList.add("red");
      if (grid[r][c] === 2) cell.classList.add("yellow");
      rowDiv.appendChild(cell);
    }
    gridDiv.appendChild(rowDiv);
  }
}

function disableControls() {
  document.getElementById("precedent").disabled = true;
  document.getElementById("suivant").disabled = true;
}

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("game_id");
  // Vérifie si game_id est présent dans l'URL
if (!gameId) {
  const message = document.createElement("p");
  message.textContent = "Aucune partie spécifiée.";
  message.classList.add("grid-message");
  gridDiv.parentNode.insertBefore(message, gridDiv);
  renderGrid();
  disableControls();
  throw new Error("game_id manquant dans l'URL");
}

try {
  const gameDoc = await getDoc(doc(db, "games", gameId));
  if (!gameDoc.exists()) {
    const message = document.createElement("p");
    message.textContent = "Partie introuvable.";
    message.classList.add("grid-message");
    gridDiv.parentNode.insertBefore(message, gridDiv);
    throw new Error("Document introuvable");
  }

  const data = gameDoc.data();
  const firstPlayer = data.first_player || 1;
  const moves = data.moves || [];
  let currentMove = 0;

  function applyMove(colIndex, player) {
    for (let r = rows - 1; r >= 0; r--) {
      if (grid[r][colIndex] === 0) {
        grid[r][colIndex] = player;
        break;
      }
    }
  }

  function resetGrid() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[r][c] = 0;
      }
    }
  }

  function updateButtons() {
  document.getElementById("precedent").disabled = (currentMove === 0);
  document.getElementById("suivant").disabled = (currentMove === moves.length);
  }

  renderGrid();
  updateButtons();

  document.getElementById("precedent").addEventListener("click", () => {
    if (currentMove > 0) {
      currentMove--;  // On recule d’un coup

      resetGrid();    // On vide la grille

      // On rejoue tous les coups jusqu'à currentMove - 1
      for (let i = 0; i < currentMove; i++) {
        const col = moves[i] - 1;
        const player = (i % 2 === 0) ? firstPlayer : (firstPlayer === 1 ? 2 : 1);
        applyMove(col, player);
      }

      renderGrid();   // Affiche la grille mise à jour
      updateButtons();
    }
  });

  document.getElementById("suivant").addEventListener("click", () => {
    if (currentMove < moves.length) {
      const col = moves[currentMove] - 1;
      // alterne entre firstPlayer et l'autre
      const player = (currentMove % 2 === 0) ? firstPlayer : (firstPlayer === 1 ? 2 : 1);
      applyMove(col, player);
      currentMove++;
      renderGrid();
      updateButtons();
      
      if (currentMove === moves.length) {
        setTimeout(() => alert("Partie terminée !"), 1000);
      }
    }
  });
  
} catch (error) {
  console.error("Erreur Firestore :", error);
  document.getElementById("grid").innerText = "Erreur lors du chargement de la partie.";
}
