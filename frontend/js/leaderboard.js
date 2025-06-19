import { db } from "./firebase-init.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function loadLeaderboard() {
  const tbody = document.querySelector("#leaderboard tbody");

  try {
    const q = query(collection(db, "games"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn("Aucune donnée trouvée dans la collection 'games'.");
      tbody.innerHTML = `<tr><td colspan="6">Aucune partie trouvée</td></tr>`;
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const date = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
      const duration = data.duration_seconds || 0;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${data.player_pseudo || 'Anonyme'}</td>
        <td>${date.toLocaleString()}</td>
        <td>${duration.toFixed(1)}s</td>
        <td>${data.ai_depth || 'N/A'}</td>
        <td>${data.winner || 'N/A'}</td>
        <td><a href="replay.html?game_id=${data.game_id}">Rejouer</a></td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des parties :", error);
    tbody.innerHTML = `<tr><td colspan="6">Erreur de chargement des données</td></tr>`;
  }
}

loadLeaderboard();
