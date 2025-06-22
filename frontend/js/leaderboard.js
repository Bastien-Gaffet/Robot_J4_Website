import { db } from "./firebase-init.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let leaderboardData = [];
let currentSort = { key: null, order: null };
let searchFilter = "";

// Chargement initial
loadLeaderboard();

// Initialiser le tri visuel sur la colonne "Date"
const initialTh = document.querySelector('th[data-key="timestamp"]');
if (initialTh) {
  initialTh.classList.add("sort-desc");
  const icon = initialTh.querySelector(".sort-icon");
  if (icon) icon.src = "images/svg/sort-down.svg";
}

// Définir le tri initial
currentSort = { key: "timestamp", order: "desc" };

document.getElementById("searchInput").addEventListener("input", function () {
  searchFilter = this.value.toLowerCase();
  applyFilterAndSort();
});

async function loadLeaderboard() {
  const tbody = document.querySelector("#leaderboard tbody");
  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;

  try {
    const q = query(collection(db, "games"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="6">Aucune partie trouvée</td></tr>`;
      return;
    }

    leaderboardData = [];
    querySnapshot.forEach((doc) => leaderboardData.push(doc.data()));
    applyFilterAndSort();

  } catch (error) {
    console.error("Erreur lors de la récupération des parties :", error);
    tbody.innerHTML = `<tr><td colspan="6">Erreur de chargement des données</td></tr>`;
  }
}

function applyFilterAndSort() {
  let filtered = leaderboardData.filter(entry =>
    Object.values(entry).some(val =>
      String(val).toLowerCase().includes(searchFilter)
    )
  );

  if (currentSort.key) {
    const { key, order } = currentSort;
    filtered.sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];

      if (key === "timestamp") {
        aVal = aVal?.toDate ? aVal.toDate() : new Date(aVal);
        bVal = bVal?.toDate ? bVal.toDate() : new Date(bVal);
      }

      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return order === "asc" ? aVal - bVal : bVal - aVal;
      }

      return order === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  renderLeaderboard(filtered);
}

function renderLeaderboard(data) {
  const tbody = document.querySelector("#leaderboard tbody");
  tbody.innerHTML = "";

  data.forEach((data) => {
    const row = document.createElement("tr");

    const date = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
    const duration = data.duration_seconds || 0;

    const fields = [
      { label: "Pseudo", value: data.player_pseudo || "Anonyme" },
      { label: "Date", value: date.toLocaleString() },
      { label: "Duration", value: `${duration.toFixed(1)}s` },
      { label: "AI Level", value: data.ai_depth || "N/A" },
      { label: "Winner", value: data.winner || "N/A" },
      { label: "Replay", value: `<a href="replay.html?game_id=${data.game_id}" target="_blank">Replay</a>` }
    ];

    fields.forEach((field) => {
      const td = document.createElement("td");
      td.setAttribute("data-label", field.label);

      if (field.label === "Replay") {
        const link = document.createElement("a");
        link.href = `replay.html?game_id=${data.game_id}`;
        link.textContent = "Replay";
        td.appendChild(link);
      } else {
        td.textContent = field.value;
      }

      row.appendChild(td);
    });

    tbody.appendChild(row);
  });
}

// Gestion du tri des colonnes
document.querySelectorAll("#leaderboard th").forEach((th) => {
  const key = th.getAttribute("data-key");
  if (!key) return; // Ignorer les colonnes sans clé (comme "Replay")

  th.addEventListener("click", () => {
    const currentOrder = th.classList.contains("sort-asc") ? "asc" :
                         th.classList.contains("sort-desc") ? "desc" : null;
    const newOrder = currentOrder === "asc" ? "desc" : "asc";

    currentSort = { key, order: newOrder };

    // Réinitialiser les icônes et classes
    document.querySelectorAll("#leaderboard th").forEach(otherTh => {
      otherTh.classList.remove("sort-asc", "sort-desc");
      const icon = otherTh.querySelector(".sort-icon");
      if (icon) icon.src = "images/svg/sort-neutral.svg";
    });

    th.classList.add(`sort-${newOrder}`);
    const icon = th.querySelector(".sort-icon");
    if (icon) icon.src = newOrder === "asc"
      ? "images/svg/sort-up.svg"
      : "images/svg/sort-down.svg";

    applyFilterAndSort();
  });
});
