// js/replay.js
import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const rows = 6, cols = 7;
const grid = Array.from({ length: rows }, () => Array(cols).fill(0));

async function main() {
  const gridDiv = document.getElementById("grid");
  const playPauseImg = document.getElementById("playpause-img");
  function renderGrid() {
    gridDiv.innerHTML = "";
    for (let r = 0; r < rows; r++) {
      const rowDiv = document.createElement("div");
      rowDiv.classList.add("row");
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        if (grid[r][c] === 1) cell.classList.add("red");
        if (grid[r][c] === 2) cell.classList.add("yellow");
        rowDiv.appendChild(cell);
      }
      gridDiv.appendChild(rowDiv);
    }
  }

  function disableControls() {
    document.getElementById("previous").disabled = true;
    document.getElementById("next").disabled = true;
    document.getElementById("playpause").disabled = true;
    document.getElementById("rewind").disabled = true;
    document.getElementById("end").disabled = true;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get("game_id");

  if (!gameId) {
    const message = document.createElement("p");
    message.textContent = "Aucune partie spécifiée.";
    message.classList.add("grid-message");
    gridDiv.parentNode.insertBefore(message, gridDiv);
    renderGrid();
    disableControls();
    throw new Error("game_id manquant dans l'URL");
  }

  try {
    const gameDoc = await getDoc(doc(db, "games", gameId));
    if (!gameDoc.exists()) {
      const message = document.createElement("p");
      message.textContent = "Partie introuvable.";
      message.classList.add("grid-message");
      gridDiv.parentNode.insertBefore(message, gridDiv);
      throw new Error("Document introuvable");
    }

    const data = gameDoc.data();
    const firstPlayer = data.first_player || 1;
    const moves = data.moves || [];
    let currentMove = 0;
    let isPlaying = false;
    let playInterval = null;

    function applyMove(colIndex, player) {
      for (let r = rows - 1; r >= 0; r--) {
        if (grid[r][colIndex] === 0) {
          grid[r][colIndex] = player;
          break;
        }
      }
    }

    function resetGrid() {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          grid[r][c] = 0;
        }
      }
    }

    function getWinnerText() {
      const winnerColor = (currentMove % 2 === 0 ? firstPlayer : (firstPlayer === 1 ? 2 : 1));
      return winnerColor === 1 ? "Yellow" : "Red";
    }

    function showPopup(message) {
      const popup = document.getElementById("popup");
      const popupMessage = document.getElementById("popup-message");
      
      popup.classList.remove("hidden");

      // Force animation redémarrage
      const popupContent = popup.querySelector(".popup-content");
      popupContent.style.animation = "none";
      void popupContent.offsetWidth; // ← trigger reflow
      popupContent.style.animation = "";
      popupMessage.textContent = message;
    }

    function updateButtons() {
      document.getElementById("previous").disabled = (currentMove === 0);
      document.getElementById("next").disabled = (currentMove === moves.length);
      document.getElementById("playpause").disabled = (currentMove === moves.length);
      document.getElementById("rewind").disabled = (currentMove === 0);
      document.getElementById("end").disabled = (currentMove === moves.length);
    }

    function togglePlayPause() {
      if (isPlaying) {
        clearInterval(playInterval);
        isPlaying = false;
        playPauseImg.src = "images/svg/play.svg";
        playPauseImg.alt = "Play";
      } else {
        isPlaying = true;
        playPauseImg.src = "images/svg/pause.svg";
        playPauseImg.alt = "Pause";

        playInterval = setInterval(() => {
          if (currentMove < moves.length) {
            const col = moves[currentMove] - 1;
            const player = (currentMove % 2 === 0) ? firstPlayer : (firstPlayer === 1 ? 2 : 1);
            applyMove(col, player);
            currentMove++;
            renderGrid();
            updateButtons();

            if (currentMove === moves.length) {
              clearInterval(playInterval);
              isPlaying = false;
              playPauseImg.src = "images/svg/play.svg";
              playPauseImg.alt = "Play";
              showPopup(getWinnerText() + " wins!");
            }
          }
        }, 500);
      }
    }

    renderGrid();
    updateButtons();

    document.getElementById("playpause").addEventListener("click", togglePlayPause);

    document.getElementById("previous").addEventListener("click", () => {
      if (currentMove > 0) {
        clearInterval(playInterval);
        isPlaying = false;
        playPauseImg.src = "images/svg/play.svg";
        playPauseImg.alt = "Play";
        currentMove--;

        resetGrid();

        for (let i = 0; i < currentMove; i++) {
          const col = moves[i] - 1;
          const player = (i % 2 === 0) ? firstPlayer : (firstPlayer === 1 ? 2 : 1);
          applyMove(col, player);
        }
        renderGrid();
        updateButtons();
      }
    });

    document.getElementById("next").addEventListener("click", () => {
      if (currentMove < moves.length) {
        clearInterval(playInterval);
        isPlaying = false;
        playPauseImg.src = "images/svg/play.svg";
        playPauseImg.alt = "Play";
        const col = moves[currentMove] - 1;
        const player = (currentMove % 2 === 0) ? firstPlayer : (firstPlayer === 1 ? 2 : 1);
        applyMove(col, player);
        currentMove++;
        renderGrid();
        updateButtons();

        if (currentMove === moves.length) {
          clearInterval(playInterval);
          isPlaying = false;
          playPauseImg.src = "images/svg/play.svg";
          playPauseImg.alt = "Play";
          showPopup(getWinnerText() + " wins!");
        }
      }
    });

    document.getElementById("rewind").addEventListener("click", () => {
      clearInterval(playInterval);
      isPlaying = false;
      playPauseImg.src = "images/svg/play.svg";
      playPauseImg.alt = "Play";
      currentMove = 0;
      resetGrid();
      renderGrid();
      updateButtons();
    });

    document.getElementById("end").addEventListener("click", () => {
      resetGrid();
      for (let i = 0; i < moves.length; i++) {
        const col = moves[i] - 1;
        const player = (i % 2 === 0) ? firstPlayer : (firstPlayer === 1 ? 2 : 1);
        applyMove(col, player);
      }
      currentMove = moves.length;
      clearInterval(playInterval);
      isPlaying = false;
      playPauseImg.src = "images/svg/play.svg";
      playPauseImg.alt = "Play";
      renderGrid();
      updateButtons();
      showPopup(getWinnerText() + " wins!");
    });

    document.getElementById("popup-close").addEventListener("click", () => {
      document.getElementById("popup").classList.add("hidden");
    });

  } catch (error) {
    console.error("Erreur Firestore :", error);
    gridDiv.innerText = "Erreur lors du chargement de la partie.";
  }
}

main();
