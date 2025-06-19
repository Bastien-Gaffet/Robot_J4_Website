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

      const fields = [
        { label: "Pseudo", value: data.player_pseudo || "Anonyme" },
        { label: "Date", value: date.toLocaleString() },
        { label: "Durée", value: `${duration.toFixed(1)}s` },
        { label: "IA", value: data.ai_depth || "N/A" },
        { label: "Gagnant", value: data.winner || "N/A" },
        { label: "Replay", value: `<a href="replay.html?game_id=${data.game_id}">Rejouer</a>` }
      ];

      fields.forEach((field) => {
        const td = document.createElement("td");
        td.setAttribute("data-label", field.label);
        td.innerHTML = field.value;
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des parties :", error);
    tbody.innerHTML = `<tr><td colspan="6">Erreur de chargement des données</td></tr>`;
  }
}

loadLeaderboard();