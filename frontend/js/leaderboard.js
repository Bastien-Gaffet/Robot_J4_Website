import { db } from "./firebase-init.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let leaderboardData = [];
let filteredData = [];
let currentSort = { key: null, order: null }; // Pas de tri initial ici
let currentPage = 1;
let pageSize = determinePageSize();
let totalPages = 1;

const tbody = document.querySelector("#leaderboard tbody");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

function determinePageSize() {
  return window.innerWidth <= 768 ? 20 : 50; // Ajuste pageSize si nécessaire
}

window.addEventListener("resize", () => {
  const newSize = determinePageSize();
  if (newSize !== pageSize) {
    pageSize = newSize;
    currentPage = 1;
    applyPagination();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();
  setupPaginationButtons();
});

async function loadLeaderboard() {
  tbody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;
  try {
    const q = query(collection(db, "users"), orderBy("elo", "desc"));
    const snapshot = await getDocs(q);
    let rank = 1;
    leaderboardData = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        pseudo: doc.id,
        elo: data.elo ?? 0,
        games: data.games_played ?? data.elo_history?.length ?? 0,
        win: data.wins ?? 0,
        draw: data.draws ?? 0,
        loss: data.losses ?? 0,
        rank: rank++
      };
    });
  } catch (err) {
    console.error("Erreur de chargement du leaderboard :", err);
    tbody.innerHTML = `<tr><td colspan="6">Erreur de chargement</td></tr>`;
    return;
  }
  applyPagination();
}

function applyPagination() {
  filteredData = leaderboardData; // pas de filtre de recherche ici
  totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  renderPage();
}

function renderPage() {
  tbody.innerHTML = "";
  if (!filteredData.length) {
    tbody.innerHTML = `<tr><td colspan="6">No players found</td></tr>`;
    return;
  }
  const start = (currentPage - 1) * pageSize;
  const pageData = filteredData.slice(start, start + pageSize);

  pageData.forEach(entry => {
    const row = document.createElement("tr");
    const total = entry.win + entry.draw + entry.loss;
    const winPct = total ? ((entry.win / total) * 100).toFixed(1) : 0;
    const drawPct = total ? ((entry.draw / total) * 100).toFixed(1) : 0;
    const lossPct = total ? ((entry.loss / total) * 100).toFixed(1) : 0;
    const rankClass = entry.rank === 1 ? "gold" : entry.rank === 2 ? "silver" : entry.rank === 3 ? "bronze" : "";

    row.innerHTML = `
      <td class="left-align" data-label="Rank">
        <span class="rank-badge ${rankClass}">#${entry.rank}</span>
      </td>
      <td class="left-align" data-label="Username">${entry.pseudo}</td>
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

    row.style.cursor = "pointer";
    row.addEventListener("click", () => {
      window.location.href = `profile.html?pseudo=${encodeURIComponent(entry.pseudo)}`;
    });
    
    tbody.appendChild(row);
  });
  renderPaginationControls();
}

function setupPaginationButtons() {
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
    }
  });
  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderPage();
    }
  });
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
        renderPage();
      }
    });
    return btn;
  };

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

  if (start > 1) addEllipsis(container);
  for (let p = start; p <= end; p++) {
    container.appendChild(createBtn(p, p, false, p === currentPage));
  }
  if (end < totalPages) addEllipsis(container);

  container.appendChild(createBtn("›", currentPage + 1, currentPage === totalPages));
  container.appendChild(createBtn("Last", totalPages, currentPage === totalPages));
}

function addEllipsis(container) {
  const span = document.createElement("span");
  span.textContent = "…";
  span.style.margin = "0 5px";
  span.style.userSelect = "none";
  container.appendChild(span);
}
