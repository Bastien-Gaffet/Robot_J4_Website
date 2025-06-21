// js/replay.js
import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const rows = 6, cols = 7;
const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
let lastMove = null;
let shouldAnimate = false;
let winningCells = [];
let endReached = false;

const audioContext = new AudioContext();
let buffers = [];
let victoryBuffer = null;
let secretVictoryBuffer = null;
let defeatBuffer = null;

async function loadSounds() {
  const jetonFiles = ["sounds/jeton1.mp3", "sounds/jeton2.mp3"];
  
  // Charger les sons de jetons
  buffers = await Promise.all(
    jetonFiles.map(async (url) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await audioContext.decodeAudioData(arrayBuffer);
    })
  );

  // Charger le son de victoire
  const victoryResponse = await fetch("sounds/victory.mp3");
  const victoryArrayBuffer = await victoryResponse.arrayBuffer();
  victoryBuffer = await audioContext.decodeAudioData(victoryArrayBuffer);

  // Charger le son spécial (easter egg)
  const secretResponse = await fetch("sounds/secret-victory.mp3");
  const secretArrayBuffer = await secretResponse.arrayBuffer();
  secretVictoryBuffer = await audioContext.decodeAudioData(secretArrayBuffer);
  // Son de défaite
  const defeatResponse = await fetch("sounds/defeat.mp3");
  const defeatArrayBuffer = await defeatResponse.arrayBuffer();
  defeatBuffer = await audioContext.decodeAudioData(defeatArrayBuffer);
}

function playRandomCoinSound() {
  if (buffers.length === 0) return;

  const buffer = buffers[Math.floor(Math.random() * buffers.length)];
  const source = audioContext.createBufferSource();
  source.buffer = buffer;

    // Définir 3 valeurs de pitch fixes
  const pitchValues = [0.8, 1.0, 1.2];
  const randomPitch = pitchValues[Math.floor(Math.random() * pitchValues.length)];
  source.playbackRate.value = randomPitch;

  // Connexion au haut-parleur
  source.connect(audioContext.destination);
  source.start();
}

function playEndSound(isPlayerWinner) {
  let bufferToPlay = null;

  if (isPlayerWinner) {
    // 1 chance sur 100 : son spécial
    if (secretVictoryBuffer && Math.random() < 0.01) {
      bufferToPlay = secretVictoryBuffer;
      console.log("🎉 Easter egg !");
    } else {
      bufferToPlay = victoryBuffer;
    }
  } else {
    bufferToPlay = defeatBuffer;
  }

  if (bufferToPlay) {
    const source = audioContext.createBufferSource();
    source.buffer = bufferToPlay;
    source.playbackRate.value = 1;
    source.connect(audioContext.destination);
    source.start();
  }
}

async function main() {
  const gridDiv = document.getElementById("grid");
  const playPauseImg = document.getElementById("playpause-img");
  document.body.addEventListener("click", () => {
  if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  }, { once: true });
  await loadSounds();

  function renderGrid() {
    gridDiv.innerHTML = "";
    for (let r = 0; r < rows; r++) {
      const rowDiv = document.createElement("div");
      rowDiv.classList.add("row");

      for (let c = 0; c < cols; c++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");

        // Ajout des couleurs de joueur
        if (grid[r][c] === 1) cell.classList.add("red");
        if (grid[r][c] === 2) cell.classList.add("yellow");

        // Vérifie si la cellule fait partie des gagnantes
        const isWinningCell = winningCells.some(
          ([wr, wc]) => wr === r && wc === c
        );

        if (isWinningCell) {
          cell.classList.add("winning-cell");
        }

        // Ajoute l'animation de chute si c'est le dernier coup et pas une cellule gagnante
        if (
          lastMove &&
          lastMove[0] === r &&
          lastMove[1] === c &&
          !isWinningCell
        ) {
          cell.classList.add("last-move");
        }

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

  function showGridMessage(text) {
  const gridMessage = document.getElementById("grid-message");
  gridMessage.textContent = text;
  gridMessage.classList.remove("hidden");
  }

  function hideGridMessage() {
    const gridMessage = document.getElementById("grid-message");
    gridMessage.classList.add("hidden");
  }

  if (!gameId) {
    showGridMessage("No game specified.");
    renderGrid();
    disableControls();
    throw new Error("game_id missing in URL");
  }

  try {
    const gameDoc = await getDoc(doc(db, "games", gameId));
    if (!gameDoc.exists()) {
      showGridMessage("Game not found.");
      throw new Error("Files not found in Firestore");
    }

    hideGridMessage();

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
          if (shouldAnimate) {
            lastMove = [r, colIndex]; // Pour animation si demandé
          } else {
            lastMove = null; // Pas d’animation si on recule
          }
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
      winningCells = [];
      endReached = false;
      lastMove = null;
    }

    function highlightWinningCells() {
      if (endReached) return;

      const directions = [
        { dr: 0, dc: 1 },   // Horizontal
        { dr: 1, dc: 0 },   // Vertical
        { dr: 1, dc: 1 },   // Diagonale /
        { dr: 1, dc: -1 }   // Diagonale \
      ];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const player = grid[r][c];
          if (player === 0) continue;

          for (const { dr, dc } of directions) {
            const cells = [];
            for (let i = 0; i < 4; i++) {
              const nr = r + dr * i;
              const nc = c + dc * i;
              if (
                nr >= 0 && nr < rows &&
                nc >= 0 && nc < cols &&
                grid[nr][nc] === player
              ) {
                cells.push([nr, nc]);
              } else {
                break;
              }
            }

            if (cells.length === 4) {
              winningCells = cells;
              endReached = true; // ✅ On marque la fin
              setTimeout(renderGrid, 200);
              return;
            }
          }
        }
      }
    }

    function getWinnerText() {
      const winnerColor = (currentMove % 2 === 0 ? firstPlayer : (firstPlayer === 1 ? 2 : 1));
      return winnerColor === 1 ? "Yellow (Player)" : "Red (Algorithm)";
    }

    function showPopup(message) {
      const popup = document.getElementById("popup");
      const popupMessage = document.getElementById("popup-message");

      setTimeout(() => {
        const isPlayerWinner = ((currentMove - 1) % 2 === 0) === (firstPlayer === 2);
        playEndSound(isPlayerWinner);
      }, 200);

      setTimeout(() => {
        popup.classList.remove("hidden");
        popupMessage.textContent = message;
      }, 1800); // ← délai en ms
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
            shouldAnimate = true;
            applyMove(col, player);
            currentMove++;
            playRandomCoinSound();
            renderGrid();
            updateButtons();

            if (currentMove === moves.length) {
              clearInterval(playInterval);
              isPlaying = false;
              playPauseImg.src = "images/svg/play.svg";
              playPauseImg.alt = "Play";
              showPopup(getWinnerText() + " wins!");
              highlightWinningCells();
            }
          }
        }, 700);
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
          shouldAnimate = false;
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
        shouldAnimate = true;
        applyMove(col, player);
        currentMove++;
        playRandomCoinSound();
        renderGrid();
        updateButtons();

        if (currentMove === moves.length) {
          clearInterval(playInterval);
          isPlaying = false;
          playPauseImg.src = "images/svg/play.svg";
          playPauseImg.alt = "Play";
          showPopup(getWinnerText() + " wins!");
          highlightWinningCells();
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
        shouldAnimate = true;
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
      highlightWinningCells();
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
