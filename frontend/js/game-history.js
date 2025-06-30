import { db } from "./firebase-init.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let leaderboardData = [];
let filteredData = [];
let currentSort = { key: "timestamp", order: "desc" }; // Tri initial ici !
let searchFilter = "";
let currentPage = 1;
let pageSize = determinePageSize();
let totalPages = 1;

const tbody = document.querySelector("#leaderboard tbody");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

function determinePageSize() {
  return window.innerWidth <= 768 ? 5 : 50;
}
window.addEventListener("resize", () => {
  const newSize = determinePageSize();
  if (newSize !== pageSize) {
    pageSize = newSize;
    currentPage = 1;
    applyFilterAndSort();
  }
});

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
  setupSorting();
  initSortIcon();
  loadLeaderboard();
});

function initSortIcon() {
  // On met l'icône down sur la colonne timestamp dès le départ
  const th = document.querySelector('th[data-key="timestamp"]');
  if (th) {
    th.classList.add("sort-desc");
    const icon = th.querySelector(".sort-icon");
    if (icon) icon.src = "images/svg/sort-down.svg";
  }
}

// Search
document.getElementById("searchInput").addEventListener("input", function () {
  searchFilter = this.value.toLowerCase();
  currentPage = 1;
  applyFilterAndSort();
});

// Pagination
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

  pageSize = determinePageSize();
  totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  renderLeaderboard();
}

function renderLeaderboard() {
  tbody.innerHTML = "";

  if (filteredData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No games found</td></tr>`;
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  const start = (currentPage - 1) * pageSize;
  const pageData = filteredData.slice(start, start + pageSize);

  pageData.forEach(data => {
    const row = document.createElement("tr");
    row.classList.add("clickable-row");

    const dateObj = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
    const date = dateObj.toLocaleDateString();
    const duration = (data.duration_seconds || 0).toFixed(1) + "s";
    const moves = Array.isArray(data.moves) ? data.moves.length : "N/A";

    const p1 = data.player1;
    const p2 = data.player2;
    const result = data.result;

    const isP1Winner = result === p1;
    const isP2Winner = result === p2;
    const isDraw = result === "draw";

    let p1Class = "player-loss";
    let p2Class = "player-loss";
    let p1Score = "0";
    let p2Score = "0";

    if (isDraw) {
      p1Class = p2Class = "player-draw";
      p1Score = p2Score = "½";
    } else if (isP1Winner) {
      p1Class = "player-win";
      p2Class = "player-loss";
      p1Score = "1";
      p2Score = "0";
    } else if (isP2Winner) {
      p1Class = "player-loss";
      p2Class = "player-win";
      p1Score = "0";
      p2Score = "1";
    }

    const playerTd = document.createElement("td");
    playerTd.classList.add("player-cell");
    playerTd.setAttribute("data-label", "Players");
    playerTd.innerHTML = `
      <a href="/profile?pseudo=${encodeURIComponent(p1)}" class="${p1Class}">${p1}</a><br>
      <a href="/profile?pseudo=${encodeURIComponent(p2)}" class="${p2Class}">${p2}</a>
    `;

    const movesTd = document.createElement("td");
    movesTd.setAttribute("data-label", "Moves");
    movesTd.textContent = moves;

    const durationTd = document.createElement("td");
    durationTd.setAttribute("data-label", "Duration");
    durationTd.textContent = duration;

    const dateTd = document.createElement("td");
    dateTd.setAttribute("data-label", "Date");
    dateTd.textContent = date;

    const resultTd = document.createElement("td");
    resultTd.setAttribute("data-label", "Result");
    resultTd.innerHTML = `
      <div style="line-height: 1.2">
        <div>${p1Score}</div>
        <div>${p2Score}</div>
      </div>
    `;

    // Ajout des cellules à la ligne
    row.appendChild(playerTd);
    row.appendChild(resultTd);
    row.appendChild(movesTd);
    row.appendChild(durationTd);
    row.appendChild(dateTd);

    row.addEventListener("click", () => {
      window.location.href = `/replay?game_id=${encodeURIComponent(data.game_id)}`;
    });

    tbody.appendChild(row);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderPaginationControls();
}


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

  container.appendChild(createBtn("First", 1, currentPage === 1));
  container.appendChild(createBtn("‹", currentPage - 1, currentPage === 1));

  let start = currentPage - 1;
  let end = currentPage + 1;
  if (start < 1) {
    start = 1;
    end = Math.min(3, totalPages);
  }
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, totalPages - 2);
  }

  if (start > 1) addEllipsis();
  for (let p = start; p <= end; p++) {
    container.appendChild(createBtn(p, p, false, p === currentPage));
  }
  if (end < totalPages) addEllipsis();

  container.appendChild(createBtn("›", currentPage + 1, currentPage === totalPages));
  container.appendChild(createBtn("Last", totalPages, currentPage === totalPages));
}

function setupSorting() {
  const ths = document.querySelectorAll("#leaderboard th[data-key]");
  ths.forEach(th => {
    const key = th.dataset.key;

    th.addEventListener("click", () => {
      const currentOrder = th.classList.contains("sort-asc") ? "asc"
                           : th.classList.contains("sort-desc") ? "desc"
                           : null;

      const newOrder = currentOrder === "asc" ? "desc" : "asc";
      currentSort = { key, order: newOrder };
      currentPage = 1;

      // Reset tous les autres headers
      ths.forEach(otherTh => {
        otherTh.classList.remove("sort-asc", "sort-desc");
        const icon = otherTh.querySelector(".sort-icon");
        if (icon) icon.src = "images/svg/sort-neutral.svg";
      });

      // Appliquer nouvelle classe & icône
      th.classList.add(`sort-${newOrder}`);
      const icon = th.querySelector(".sort-icon");
      if (icon) icon.src = `images/svg/sort-${newOrder === "asc" ? "up" : "down"}.svg`;

      applyFilterAndSort();
    });
  });
}
