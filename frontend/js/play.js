const rows = 6, cols = 7;
const grid = Array.from({ length: rows }, () => Array(cols).fill(0));

let playerNumber = 0; // 1 ou 2
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

      // Activation du clic uniquement si c'est le tour du joueur, partie en cours et case possible
      if (!gameEnded && currentPlayer === playerNumber) {
        // La colonne n'est jouable que si la dernière case de la colonne est vide
        if (grid[0][c] === 0) {
          cell.style.cursor = "pointer";
          cell.addEventListener("click", () => {
            playMove(c);
          });
        }
      }

      rowDiv.appendChild(cell);
    }
    gridDiv.appendChild(rowDiv);
  }
}

function playMove(col) {
  if (gameEnded) return;
  if (currentPlayer !== playerNumber) return;
  if (grid[0][col] !== 0) return; // Colonne pleine

  socket.send(JSON.stringify({
    type: "move",
    column: col,
    player: playerNumber
  }));
}

function applyMove(row, col, player) {
  grid[row][col] = player;
}

function showPopup(message) {
  popupMessage.textContent = message;
  popup.classList.remove("hidden");
}

popupClose.addEventListener("click", () => {
  popup.classList.add("hidden");
});

// Connexion WebSocket
const socket = new WebSocket("ws://localhost:8080");

socket.onopen = () => {
  statusP.textContent = "Connexion établie, en attente d’adversaire...";
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "waiting") {
    statusP.textContent = "En attente d’un autre joueur...";
  }

  else if (data.type === "start") {
    gameId = data.gameId;
    playerNumber = data.playerNumber;
    currentPlayer = 1;
    statusP.textContent = `Partie démarrée (ID: ${gameId})`;
    playerColorSpan.textContent = playerNumber === 1 ? "Rouge" : "Jaune";
    turnIndicator.textContent = currentPlayer === playerNumber ? "À toi de jouer" : "À l’adversaire de jouer";
    renderGrid();
  }

  else if (data.type === "move") {
    applyMove(data.row, data.column, data.player);
    currentPlayer = data.victory ? 0 : (3 - currentPlayer); // Passe au joueur suivant sauf si victoire
    turnIndicator.textContent = currentPlayer === playerNumber ? "À toi de jouer" : "À l’adversaire de jouer";
    renderGrid();

    if (data.victory) {
      gameEnded = true;
      const winnerText = data.player === playerNumber ? "Tu as gagné !" : "Tu as perdu.";
      showPopup(winnerText);
    }
  }
};

socket.onerror = () => {
  statusP.textContent = "Erreur de connexion WebSocket.";
};

socket.onclose = () => {
  if (!gameEnded) statusP.textContent = "Connexion fermée.";
};

renderGrid();
