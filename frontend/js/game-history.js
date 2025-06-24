import { db } from "./firebase-init.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let leaderboardData = [];
let filteredData = [];
let currentSort = { key: null, order: null };
let searchFilter = "";
let currentPage = 1;
let pageSize = determinePageSize();
let totalPages = 1;

// DOM réfs
const tbody = document.querySelector("#leaderboard tbody");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");

// Ajuste pageSize selon largeur
function determinePageSize() {
  return window.innerWidth <= 768 ? 3 : 50;
}
window.addEventListener("resize", () => {
  const newSize = determinePageSize();
  if (newSize !== pageSize) {
    pageSize = newSize;
    currentPage = 1;
    applyFilterAndSort();
  }
});

loadLeaderboard();

// Search
document.getElementById("searchInput").addEventListener("input", function () {
  searchFilter = this.value.toLowerCase();
  currentPage = 1;
  applyFilterAndSort();
});

// Pagination buttons
prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderLeaderboard();
  }
});
nextBtn.addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    renderLeaderboard();
  }
});

async function loadLeaderboard() {
  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
  try {
    const q = query(collection(db, "games"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    leaderboardData = snapshot.empty ? [] : snapshot.docs.map(d => d.data());
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6">Erreur de chargement</td></tr>`;
    return;
  }
  applyFilterAndSort();
}

function applyFilterAndSort() {
  filteredData = leaderboardData.filter(entry =>
    Object.values(entry).some(val =>
      String(val).toLowerCase().includes(searchFilter)
    )
  );

  if (currentSort.key) {
    const { key, order } = currentSort;
    filteredData.sort((a, b) => {
      let aVal = key === "timestamp"
        ? (a[key]?.toDate ? a[key].toDate() : new Date(a[key]))
        : a[key];
      let bVal = key === "timestamp"
        ? (b[key]?.toDate ? b[key].toDate() : new Date(b[key]))
        : b[key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number") return order === "asc" ? aVal - bVal : bVal - aVal;
      return order === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }

  // forcer recalcul pageSize (important pour que le rendu initial soit correct)
  pageSize = determinePageSize();
  totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  renderLeaderboard();
}


function renderLeaderboard() {
  tbody.innerHTML = "";

  if (filteredData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No games found</td></tr>`;
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * pageSize;
  const pageData = filteredData.slice(start, start + pageSize);

  pageData.forEach(data => {
    const row = document.createElement("tr");
    const date = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
    const duration = (data.duration_seconds || 0).toFixed(1) + "s";
    const cells = [
      `<a href="elo.html?pseudo=${encodeURIComponent(data.player_pseudo)}">${data.player_pseudo || "Anonymous"}</a>`,
      date.toLocaleString(),
      duration,
      data.ai_depth || "N/A",
      data.winner || "N/A",
      `<a href="replay.html?game_id=${data.game_id}" target="_blank">Replay</a>`
    ];

    cells.forEach((html, i) => {
      const td = document.createElement("td");
      td.setAttribute("data-label", ["Username", "Date", "Duration", "AI Level", "Winner", "Replay"][i]);
      td.innerHTML = html;
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });
  // Scroll vers le haut quand on change de page
  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderPaginationControls();
}

// Tri des colonnes (inchangé)
document.querySelectorAll("#leaderboard th").forEach(th => {
  const key = th.dataset.key;
  if (!key) return;
  th.addEventListener("click", () => {
    const asc = th.classList.contains("sort-asc");
    const desc = th.classList.contains("sort-desc");
    const newOrder = asc ? "desc" : "asc";
    currentSort = { key, order: newOrder };
    // reset icônes et classes
    document.querySelectorAll("#leaderboard th")
      .forEach(o => o.classList.remove("sort-asc","sort-desc"));
    th.classList.add(`sort-${newOrder}`);
    th.querySelector(".sort-icon").src = `images/svg/sort-${newOrder==='asc'?'up':'down'}.svg`;
    currentPage = 1;
    applyFilterAndSort();
  });
});

function renderPaginationControls() {
  const container = document.getElementById("pagination");
  container.innerHTML = "";

  const createBtn = (label, page, disabled = false, isActive = false) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (disabled) btn.disabled = true;
    if (isActive) btn.classList.add("active");
    btn.addEventListener("click", () => {
      if (!disabled && !isActive) {
        currentPage = page;
        renderLeaderboard();
      }
    });
    return btn;
  };

  const addEllipsis = () => {
    const span = document.createElement("span");
    span.textContent = "…";
    span.style.margin = "0 5px";
    span.style.userSelect = "none";
    container.appendChild(span);
  };

  totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  // 1) First et Prev
  container.appendChild(createBtn("First", 1, currentPage === 1));
  container.appendChild(createBtn("‹", currentPage - 1, currentPage === 1));

  // 2) Calcul du bloc de 3 pages autour de currentPage
  let start = currentPage - 1;
  let end   = currentPage + 1;
  if (start < 1) {
    start = 1;
    end = Math.min(3, totalPages);
  }
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, totalPages - 2);
  }

  // 3) Ellipsis AVANT si on n'inclut pas la page 1
  if (start > 1) {
    addEllipsis();
  }

  // 4) Affichage du bloc de pages [start..end]
  for (let p = start; p <= end; p++) {
    const isActive = (p === currentPage);
    container.appendChild(createBtn(p, p, false, isActive));
  }

  // 5) Ellipsis APRÈS si on n'inclut pas la dernière page
  if (end < totalPages) {
    addEllipsis();
  }

  // 6) Next et Last
  container.appendChild(createBtn("›", currentPage + 1, currentPage === totalPages));
  container.appendChild(createBtn("Last", totalPages, currentPage === totalPages));
}
