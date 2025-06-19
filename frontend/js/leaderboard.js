import { db } from "./firebase-init.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const tbody = document.querySelector("#leaderboard tbody");

const querySnapshot = await getDocs(collection(db, "games"));

if (querySnapshot.empty) {
  console.warn("Aucune donnée trouvée dans la collection 'games'.");
  tbody.innerHTML = `<tr><td colspan="6">Aucune partie trouvée</td></tr>`;
} else {
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log("Document reçu :", data);  // <-- DEBUG ici

    const date = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
    const duration = data.duration_seconds || 0;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${data.player_pseudo}</td>
      <td>${date.toLocaleString()}</td>
      <td>${duration.toFixed(1)}s</td>
      <td>${data.ai_depth || ''}</td>
      <td>${data.winner || ''}</td>
      <td><a href="replay.html?game_id=${data.game_id}">Rejouer</a></td>
    `;
    tbody.appendChild(row);
  });
}
