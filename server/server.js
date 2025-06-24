// === server.js ===
const WebSocket = require("ws");

// Écouter le port fourni par Render ou par défaut 8080
const port = process.env.PORT || 8080;
const server = new WebSocket.Server({ port });
console.log(`WebSocket server listening on port ${port}`);

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
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

server.on("connection", (ws) => {
  console.log('New client connected');

  // Si on n'attend personne, ce WS devient le joueur en attente
  if (waitingPlayer === null) {
    waitingPlayer = ws;
    send(ws, { type: "waiting" });
  } else {
    // On crée une nouvelle partie
    const gameId = Math.random().toString(36).substr(2, 6);
    const grid = createEmptyGrid();
    const players = [waitingPlayer, ws];
    let currentPlayer = 1;
    games.set(gameId, { players, grid, currentPlayer });

    // Envoyer le début de partie aux deux joueurs
    players.forEach((p, idx) => {
      send(p, {
        type: "start",
        gameId,
        playerNumber: idx + 1,
      });
    });
    waitingPlayer = null;

    // Gestion des messages pour cette partie
    players.forEach((p) => {
      p.on("message", (msg) => {
        try {
          const data = JSON.parse(msg);
          if (data.type === "move") {
            const game = games.get(gameId);
            if (!game || game.currentPlayer !== data.player) return;

            // Calcul de la ligne où tomberait le jeton
            const col = data.column;
            const rowIdx = game.grid.slice().reverse().findIndex(row => row[col] === 0);
            if (rowIdx === -1) return;
            const actualRow = 5 - rowIdx;
            game.grid[actualRow][col] = data.player;

            const victory = checkVictory(game.grid, data.player);

            // Envoyer le coup et état à tous les clients
            game.players.forEach(client => {
              send(client, {
                type: "move",
                column: col,
                row: actualRow,
                player: data.player,
                victory
              });
            });

            // Si pas de victoire, on change de joueur
            if (!victory) game.currentPlayer = 3 - game.currentPlayer;
          }
        } catch (e) {
          console.error('Invalid message', e);
        }
      });

      // Gérer la déconnexion d'un joueur
      p.on("close", () => {
        console.log('Client disconnected');
        // Si c'était le joueur en attente
        if (waitingPlayer === p) waitingPlayer = null;

        // Si partie en cours, prévenir l'autre
        const game = Array.from(games.entries()).find(([id, g]) => g.players.includes(p));
        if (game) {
          const [id, g] = game;
          const other = g.players.find(x => x !== p);
          if (other && other.readyState === WebSocket.OPEN) {
            send(other, { type: "opponent_left" });
          }
          games.delete(id);
        }
      });
    });
  }
});
