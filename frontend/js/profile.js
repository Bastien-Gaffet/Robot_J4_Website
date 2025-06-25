import { db } from "./firebase-init.js";
import {
  collection, getDocs,
  query, orderBy, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const pseudo = urlParams.get("pseudo");
document.getElementById("playerName").textContent = `Profile of ${pseudo}`;

const currentEloSpan = document.getElementById("currentElo");
const globalRankSpan = document.getElementById("globalRank");

const chartCtx = document.getElementById("eloChart").getContext("2d");
let eloData = [];
let chart;

async function loadPlayerData() {
    const q = query(
        collection(db, "users"),
        where("pseudo_lower", "==", pseudo.toLowerCase())
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        alert("Joueur non trouvé.");
        return;
    }

    const docSnap = snapshot.docs[0];
    const userData = docSnap.data();
    const userUid = docSnap.id;

    // Affiche l'Elo actuel
    currentEloSpan.textContent = userData.elo ?? "N/A";

    // Récupérer le classement global
    const usersRef = collection(db, "users");
    const qRank = query(usersRef, orderBy("elo", "desc"));
    const querySnapshot = await getDocs(qRank);

    let rank = 1;
    let found = false;
    querySnapshot.forEach(d => {
        if (!found && d.id === userUid) {
            found = true;
            globalRankSpan.textContent = rank;
        }
        rank++;
    });
    if (!found) {
        globalRankSpan.textContent = "N/A";
    }

    // Charger l'historique Elo pour le graphe
    const history = userData.elo_history || [];
    eloData = history.map(entry => ({
        date: new Date(entry.timestamp.seconds * 1000),
        elo: entry.elo
    })).sort((a, b) => a.date - b.date);

    updateChart("90");
}

function updateChart(range) {
    const now = new Date();
    let filtered;
    if (range === "all") {
        filtered = eloData;
    } else {
        const days = parseInt(range);
        const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filtered = eloData.filter(p => p.date >= threshold);
    }

    const labels = filtered.map(p => p.date.toLocaleDateString());
    const values = filtered.map(p => p.elo);

    if (chart) chart.destroy();
    chart = new Chart(chartCtx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Elo",
                data: values,
                fill: false,
                borderColor: "#007BFF",
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Date"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Elo"
                    }
                }
            }
        }
    });
}

document.querySelectorAll(".filter-buttons button").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".filter-buttons button").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        updateChart(button.dataset.range);
    });
});

loadPlayerData();
