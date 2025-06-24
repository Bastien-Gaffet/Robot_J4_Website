// === server.js ===
const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 8080 });

let waitingPlayer = null;
let games = new Map(); // Map<GameID, { players: [ws1, ws2], grid, currentPlayer }>

function createEmptyGrid() {
  return Array.from({ length: 6 }, () => Array(7).fill(0));
}

function checkVictory(grid, player) {
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1]
  ];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      if (grid[r][c] !== player) continue;
      for (const [dr, dc] of directions) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr < 0 || nr >= 6 || nc < 0 || nc >= 7 || grid[nr][nc] !== player) break;
          count++;
        }
        if (count === 4) return true;
      }
    }
  }
  return false;
}

function send(ws, data) {
  ws.send(JSON.stringify(data));
}

server.on("connection", (ws) => {
  if (waitingPlayer === null) {
    waitingPlayer = ws;
    ws.send(JSON.stringify({ type: "waiting" }));
  } else {
    const gameId = Math.random().toString(36).substr(2, 6);
    const grid = createEmptyGrid();
    const players = [waitingPlayer, ws];
    const currentPlayer = 1;
    games.set(gameId, { players, grid, currentPlayer });

    players.forEach((p, idx) => {
      send(p, {
        type: "start",
        gameId,
        playerNumber: idx + 1,
      });
    });
    waitingPlayer = null;

    players.forEach((p) => {
      p.on("message", (msg) => {
        const data = JSON.parse(msg);
        if (data.type === "move") {
          const game = games.get(gameId);
          if (!game || game.currentPlayer !== data.player) return;

          const col = data.column;
          const row = game.grid.slice().reverse().findIndex(row => row[col] === 0);
          if (row === -1) return;
          const actualRow = 5 - row;
          game.grid[actualRow][col] = data.player;

          const victory = checkVictory(game.grid, data.player);

          game.players.forEach(client => {
            send(client, {
              type: "move",
              column: col,
              row: actualRow,
              player: data.player,
              victory
            });
          });

          if (!victory) game.currentPlayer = 3 - game.currentPlayer;
        }
      });
    });
  }
});
