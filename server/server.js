// server.js
import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

// Initialize Firebase
initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const players = new Map();
const waitingPlayers = [];
const ongoingGames = new Map();

function generateGameId() {
  return Math.random().toString(36).substring(2, 10);
}

function calculateK(numGames) {
  return Math.max(10, 40 - ((numGames / 12) * 30));
}

function expectedScore(eloA, eloB) {
  return 1 / (1 + 10 ** ((eloB - eloA) / 400));
}

function updateElo(eloA, eloB, resultA, k) {
  const expectedA = expectedScore(eloA, eloB);
  const newA = eloA + k * (resultA - expectedA);
  const newB = eloB + k * ((1 - resultA) - (1 - expectedA));
  return [Math.round(Math.max(newA, 100)), Math.round(Math.max(newB, 100))];
}

function checkWinner(board) {
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1]
  ];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const player = board[r][c];
      if (player === 0) continue;
      for (let [dr, dc] of directions) {
        let count = 0;
        for (let i = 0; i < 4; i++) {
          const nr = r + i * dr, nc = c + i * dc;
          if (nr < 0 || nr >= 6 || nc < 0 || nc >= 7 || board[nr][nc] !== player) break;
          count++;
        }
        if (count === 4) return player;
      }
    }
  }
  return 0;
}

function findMatch(player) {
  if (waitingPlayers.length === 0) {
    waitingPlayers.push(player);
    return;
  }
  waitingPlayers.sort((a, b) => Math.abs(player.elo - a.elo) - Math.abs(player.elo - b.elo));
  const opponent = waitingPlayers.shift();
  if (opponent.uid === player.uid) {
    waitingPlayers.unshift(opponent);
    return;
  }
  const gameId = generateGameId();
  const red = Math.random() < 0.5 ? player : opponent;
  const yellow = red === player ? opponent : player;
  red.ws.send(JSON.stringify({ type: "start_game", color: "red", opponent: yellow, game_id: gameId, isYourTurn: true }));
  yellow.ws.send(JSON.stringify({ type: "start_game", color: "yellow", opponent: red, game_id: gameId, isYourTurn: false }));
  ongoingGames.set(gameId, {
    players: { red, yellow },
    board: Array.from({ length: 6 }, () => Array(7).fill(0)),
    turn: "red",
    moves: [],
    start: Date.now(),
    first: red.uid,
  });
}

function handleMove(ws, data) {
  const game = ongoingGames.get(data.game_id);
  if (!game || game.turn !== data.color) return;
  const col = data.column;
  const board = game.board;
  let rowPlayed = -1;
  for (let r = 5; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = data.color === "red" ? 1 : 2;
      rowPlayed = r;
      break;
    }
  }
  if (rowPlayed === -1) return;
  game.moves.push(col);
  const winner = checkWinner(board);
  const full = board.every(row => row.every(cell => cell !== 0));

  if (winner || full) {
    const result = winner === 1 ? "red" : winner === 2 ? "yellow" : "draw";
    const { red, yellow } = game.players;
    red.ws.send(JSON.stringify({ type: "game_over", result, moves: game.moves, red, yellow, first: game.first }));
    yellow.ws.send(JSON.stringify({ type: "game_over", result, moves: game.moves, red, yellow, first: game.first }));
    ongoingGames.delete(data.game_id);
  } else {
    game.turn = game.turn === "red" ? "yellow" : "red";
    game.players.red.ws.send(JSON.stringify({ type: "move", column: col, color: data.color, nextTurn: game.players[game.turn].uid }));
    game.players.yellow.ws.send(JSON.stringify({ type: "move", column: col, color: data.color, nextTurn: game.players[game.turn].uid }));
  }
}

wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "matchmaking") {
        const userSnap = await db.collection("users").doc(data.uid).get();
        if (!userSnap.exists) return;
        const user = userSnap.data();
        const player = {
          ws,
          uid: data.uid,
          pseudo: data.pseudo,
          avatar: data.avatar,
          elo: user.elo || 500
        };
        players.set(data.uid, player);
        findMatch(player);
      }
      if (data.type === "play") {
        handleMove(ws, data);
      }
    } catch (err) {
      console.error("Invalid message:", message);
    }
  });

  ws.on("close", () => {
    for (const [uid, player] of players.entries()) {
      if (player.ws === ws) {
        players.delete(uid);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("WebSocket server running on port", PORT);
});
