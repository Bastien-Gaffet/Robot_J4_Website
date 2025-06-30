// js/multiplayer.js
import { db } from "./firebase-init.js";
import { doc, setDoc, updateDoc, getDoc, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const socket = new WebSocket("wss://connect4-server-mfwo.onrender.com/");
const uid = localStorage.getItem("uid");
const pseudo = localStorage.getItem("pseudo");
const avatar = localStorage.getItem("avatar_url");

const rows = 6, cols = 7;
const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
let lastMove = null;
let yourTurn = false;
let playerColor = 1;
let opponent = {};
let gameId = null;
let myTime = 300, opponentTime = 300;
let timerInterval = null;
let gameStartTime = null;
const gridDiv = document.getElementById("grid");

function getClickedColumn(e) {
  const rect = gridDiv.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const colWidth = rect.width / cols;
  return Math.floor(x / colWidth);
}

function startTimer() {
  timerInterval = setInterval(() => {
    if (yourTurn) myTime--;
    else opponentTime--;
    updateTimerDisplay();
    if (myTime <= 0 || opponentTime <= 0) {
      clearInterval(timerInterval);
      socket.send(JSON.stringify({ type: "timeout", game_id: gameId, uid }));
    }
  }, 1000);
}

function updateTimerDisplay() {
  document.getElementById("your-timer").textContent = formatTime(myTime);
  document.getElementById("opponent-timer").textContent = formatTime(opponentTime);
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function applyMove(col, color) {
  for (let r = rows - 1; r >= 0; r--) {
    if (grid[r][col] === 0) {
      grid[r][col] = color;
      lastMove = [r, col];
      playRandomCoinSound();
      renderGrid();
      break;
    }
  }
}

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
      if (lastMove && lastMove[0] === r && lastMove[1] === c) cell.classList.add("last-move");
      rowDiv.appendChild(cell);
    }
    gridDiv.appendChild(rowDiv);
  }
}

// --- WebSocket Events ---
socket.addEventListener("open", () => {
  const reconnectGameId = localStorage.getItem("game_id");
  if (reconnectGameId) {
    socket.send(JSON.stringify({ type: "reconnect", uid, game_id: reconnectGameId }));
  } else {
    socket.send(JSON.stringify({ type: "matchmaking", uid, pseudo, avatar }));
    document.getElementById("loading-screen").style.display = "block";
  }
});

socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "start_game") {
    document.getElementById("loading-screen").style.display = "none";
    gameId = msg.game_id;
    localStorage.setItem("game_id", gameId);
    yourTurn = msg.isYourTurn;
    playerColor = msg.color === "red" ? 1 : 2;
    opponent = msg.opponent;
    gameStartTime = Date.now();
    renderGrid();
    updateOpponentDisplay();
    startTimer();
  }

  if (msg.type === "move") {
    applyMove(msg.column, msg.color);
    yourTurn = msg.nextTurn === uid;
  }

  if (msg.type === "game_over") {
    clearInterval(timerInterval);
    saveGameToFirebase(msg);
  }
});

document.getElementById("grid").addEventListener("click", (e) => {
  if (!yourTurn) return;
  const col = getClickedColumn(e);
  if (grid[0][col] !== 0) return;
  socket.send(JSON.stringify({ type: "play", game_id: gameId, column: col, uid }));
});

function updateOpponentDisplay() {
  document.getElementById("opponent-pseudo").textContent = opponent.pseudo;
  document.getElementById("opponent-elo").textContent = `ELO: ${opponent.elo}`;
  document.getElementById("opponent-avatar").src = opponent.avatar;
}

function saveGameToFirebase(msg) {
  const now = new Date();
  const duration = Math.floor((now - gameStartTime) / 1000);
  const result = msg.result;
  const gameDoc = {
    game_id: gameId,
    timestamp: now,
    duration,
    winner: result === "draw" ? "draw" : msg[result].pseudo,
    red_player: msg.red.pseudo,
    yellow_player: msg.yellow.pseudo,
    red_uid: msg.red.uid,
    yellow_uid: msg.yellow.uid,
    moves: msg.moves,
    red_color: msg.red.uid === msg.first ? true : false,
    result,
  };
  setDoc(doc(db, "games", gameId), gameDoc);
}
