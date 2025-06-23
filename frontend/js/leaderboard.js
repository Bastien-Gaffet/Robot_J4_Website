import { db } from "./firebase-init.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const tbody = document.querySelector("#leaderboard tbody");
let leaderboardData = [];

loadLeaderboard();

async function loadLeaderboard() {
  try {
    const q = query(collection(db, "users"), orderBy("elo", "desc"));
    const snapshot = await getDocs(q);

    let rank = 1;
    snapshot.forEach(doc => {
      const data = doc.data();
      leaderboardData.push({
        pseudo: doc.id,
        elo: data.elo ?? 0,
        games: data.games_played ?? data.elo_history?.length ?? 0,
        win: data.wins ?? 0,
        draw: data.draws ?? 0,
        loss: data.losses ?? 0,
        rank: rank++
      });
    });

    renderLeaderboard(leaderboardData);
  } catch (error) {
    console.error("Erreur de chargement du leaderboard :", error);
    tbody.innerHTML = `<tr><td colspan="6">Erreur de chargement</td></tr>`;
  }
}

function renderLeaderboard(data) {
  tbody.innerHTML = "";
  data.forEach(entry => {
    const row = document.createElement("tr");

    const total = entry.win + entry.draw + entry.loss;
    const winPct = total ? ((entry.win / total) * 100).toFixed(1) : 0;
    const drawPct = total ? ((entry.draw / total) * 100).toFixed(1) : 0;
    const lossPct = total ? ((entry.loss / total) * 100).toFixed(1) : 0;

    const rankClass = entry.rank === 1 ? "gold" :
                      entry.rank === 2 ? "silver" :
                      entry.rank === 3 ? "bronze" : "";

    const rowHTML = `
      <td class="left-align" data-label="Rank">
        <span class="rank-badge ${rankClass}">#${entry.rank}</span>
      </td>
      <td class="left-align" data-label="Username">
        <a href="elo.html?pseudo=${encodeURIComponent(entry.pseudo)}">${entry.pseudo}</a>
      </td>
      <td class="center-align" data-label="Elo">${entry.elo}</td>

      <td class="win center-align" data-label="Wins">
        <span class="stat stat-raw">${entry.win}</span>
        <span class="stat stat-pct">${winPct}%</span>
      </td>

      <td class="draw center-align" data-label="Draws">
        <span class="stat stat-raw">${entry.draw}</span>
        <span class="stat stat-pct">${drawPct}%</span>
      </td>

      <td class="loss center-align" data-label="Losses">
        <span class="stat stat-raw">${entry.loss}</span>
        <span class="stat stat-pct">${lossPct}%</span>
      </td>
    `;

    row.innerHTML = rowHTML;
    tbody.appendChild(row);
  });
}
