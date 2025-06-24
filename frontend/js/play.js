// === play.js ===
const rows = 6, cols = 7;
const grid = Array.from({ length: rows }, () => Array(cols).fill(0));

let playerNumber = 0;      // 1 ou 2
let currentPlayer = 0;
let gameId = null;
let gameEnded = false;

const gridDiv = document.getElementById("grid");
const statusP = document.getElementById("status");
const playerColorSpan = document.getElementById("player-color");
const turnIndicator = document.getElementById("turn-indicator");
const popup = document.getElementById("popup");
const popupMessage = document.getElementById("popup-message");
const popupClose = document.getElementById("popup-close");

function renderGrid() {
  gridDiv.innerHTML = "";
  for (let r = 0; r < rows; r++) {
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("row");

    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");

      if (grid[r][c] === 1) cell.classList.add("red");
      else if (grid[r][c] === 2) cell.classList.add("yellow");

      cell.dataset.col = c;

      // Activation du clic uniquement si le socket est ouvert, partie en cours et c'est ton tour
      if (!gameEnded && socket.readyState === WebSocket.OPEN && currentPlayer === playerNumber) {
        if (grid[0][c] === 0) {
          cell.style.cursor = "pointer";
          cell.addEventListener("click", () => playMove(c));
        }
      }

      rowDiv.appendChild(cell);
    }
    gridDiv.appendChild(rowDiv);
  }
}

function playMove(col) {
  // Attendre que WebSocket soit ouvert
  if (socket.readyState !== WebSocket.OPEN) {
    console.warn("WebSocket non ouvert, impossibilité d'envoyer le coup");
    return;
  }
  if (gameEnded) return;
  if (currentPlayer !== playerNumber) return;
  if (grid[0][col] !== 0) return; // Colonne pleine

  socket.send(JSON.stringify({ type: "move", column: col, player: playerNumber }));
}

function applyMove(row, col, player) {
  grid[row][col] = player;
}

function showPopup(message) {
  popupMessage.textContent = message;
  popup.classList.remove("hidden");
}

popupClose.addEventListener("click", () => popup.classList.add("hidden"));

// Connexion WebSocket (met l'URL de ton service Render)
const socket = new WebSocket("https://connect4-server-mfwo.onrender.com/");

socket.onopen = () => {
  console.log("WebSocket ouvert");
  statusP.textContent = "Connexion établie, en attente d’adversaire...";
  // On peut afficher une grille vide instantly
  renderGrid();
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "waiting":
      statusP.textContent = "En attente d’un autre joueur...";
      break;

    case "start":
      gameId = data.gameId;
      playerNumber = data.playerNumber;
      currentPlayer = 1;
      statusP.textContent = `Partie démarrée (ID: ${gameId})`;
      playerColorSpan.textContent = playerNumber === 1 ? "Rouge" : "Jaune";
      turnIndicator.textContent = currentPlayer === playerNumber ? "À toi de jouer" : "À l’adversaire de jouer";
      renderGrid();
      break;

    case "move":
      applyMove(data.row, data.column, data.player);
      if (data.victory) {
        gameEnded = true;
        const texte = data.player === playerNumber ? "Tu as gagné !" : "Tu as perdu.";
        showPopup(texte);
      } else {
        currentPlayer = 3 - currentPlayer;
        turnIndicator.textContent = currentPlayer === playerNumber ? "À toi de jouer" : "À l’adversaire de jouer";
      }
      renderGrid();
      break;

    case "opponent_left":
      showPopup("Ton adversaire a quitté la partie.");
      break;

    default:
      console.warn("Type de message inconnu :", data.type);
  }
};

socket.onerror = () => {
  statusP.textContent = "Erreur de connexion WebSocket.";
};

socket.onclose = () => {
  if (!gameEnded) statusP.textContent = "Connexion fermée.";
};