import { auth, db } from './firebase-init.js';
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

onAuthStateChanged(auth, async user => {
  const isLoggedIn = !!user;
  let pseudo = null;
  let avatar = "neutral.png";

  if (isLoggedIn) {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        pseudo = data.pseudo;
        avatar = data.avatar || "neutral.png";
      }
    } catch (e) {
      console.error("Erreur récupération pseudo :", e);
    }
  }

  const currentPath = window.location.pathname;

  // --- Navbar PC ---
  const pcNav = document.getElementById("nav-links");
  if (pcNav) {
    const playHref = isLoggedIn ? "/home" : "/login";
    const accountHref = isLoggedIn ? `/account` : "/login";

    pcNav.innerHTML = `
      <div class="nav-left">
        <a href="/" class="nav-link">Home</a>
        <a href="${playHref}" class="nav-link play-tab">Play</a>
        <a href="/leaderboard" class="nav-link">Leaderboard</a>
        <a href="/game-history" class="nav-link">History</a>
      </div>
      ${isLoggedIn ? `
        <div class="nav-right">
          <div class="nav-logo-pc">
            <a href="${isLoggedIn ? `/profile?pseudo=${encodeURIComponent(pseudo)}` : '/login'}" class="pc-avatar-link" aria-label="Go to profile">
              <img src="/images/avatars/${avatar}" alt="Avatar" class="pc-avatar-img" />
            </a>
          </div>  
          <a href="${accountHref}" class="nav-link">Account</a>
          <a href="#" onclick="logout()" class="nav-link logout-btn" style="display: flex; align-items: center;">
            <svg class="logout-icon" viewBox="0 0 24 24" width="20" height="20" style="vertical-align: middle; margin-right: 6px; fill: white;">
              <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6-6V9a6 6 0 0 0-12 0h2a4 4 0 1 1 8 0v2H6v10h12V11h-2z" />
            </svg>
            Logout
          </a>
        </div>
      ` : ""}
    `;

    // Activation onglets PC
    pcNav.querySelectorAll('a:not(.logout-btn)').forEach(link => {
      link.classList.remove("active");
      const linkPath = new URL(link.href).pathname;

      if (currentPath === "/login") {
        // Sur /login, toujours activer Profile
        if (link.textContent.trim() === "Profile") {
          link.classList.add("active");
        }
      } else if (currentPath.startsWith("/profile")) {
        if (linkPath.startsWith("/profile")) {
          link.classList.add("active");
        }
      } else if (currentPath === "/home") {
        if (linkPath === "/home" || link.classList.contains("play-tab")) {
          link.classList.add("active");
        }
      } else if (currentPath === "/game-history" || currentPath.startsWith("/replay")) {
        if (linkPath === "/game-history") {
          link.classList.add("active");
        }
      } else if (currentPath === "/leaderboard") {
        if (linkPath === "/leaderboard") {
          link.classList.add("active");
        }
      } else if (currentPath === "/") {
        if (linkPath === "/") {
          link.classList.add("active");
        }
      } else {
        if (linkPath === currentPath) {
          link.classList.add("active");
        }
      }
    });
  }

    // --- Top Mobile Navbar ---
  const topNav = document.getElementById("top-mobile-navbar");
  if (topNav && currentPath !== "/") {
    topNav.innerHTML = `
      <div class="top-nav-inner">
        <a href="${isLoggedIn ? `/profile?pseudo=${encodeURIComponent(pseudo)}` : '/login'}" class="avatar-container" aria-label="Go to profile">
          <img src="/images/avatars/${avatar}" alt="Avatar" class="mobile-avatar" />
        </a>
        <span class="site-title">Connect4 J4</span>
        ${isLoggedIn ? `
        <div class="nav-right">
          <a href="#" onclick="logout()" class="nav-link logout-btn" style="display: flex; align-items: center;">
            <svg class="logout-icon" viewBox="0 0 24 24" width="20" height="20" style="vertical-align: middle; margin-right: 6px; fill: white;">
              <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6-6V9a6 6 0 0 0-12 0h2a4 4 0 1 1 8 0v2H6v10h12V11h-2z" />
            </svg>
            Logout
          </a>
        </div>
      ` : ""}
    `;
    if (!isLoggedIn) {
      const title = topNav.querySelector(".site-title");
      if (title) {
        title.style.textAlign = "left";
        title.style.marginLeft = "10rem";
      }
    }
  }
  
  // --- Bottom navbar mobile ---
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    const playHref = isLoggedIn ? "/home" : "/login";
    const accountHref = isLoggedIn ? `/account` : "/login";

    bottomNav.innerHTML = `
      <a href="/" class="nav-item" aria-label="Home">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M3 12l9-9 9 9v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9z"/>
        </svg>
        <span class="label">Home</span>
      </a>
      <a href="${playHref}" class="nav-item play-tab" aria-label="Play">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <span class="label">Play</span>
      </a>
      <a href="/leaderboard" class="nav-item" aria-label="Leaderboard">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M4 22h16v-2H4v2zm0-6h10v-2H4v2zm0-6h7V8H4v2zm0-6v2h4V4H4z"/>
        </svg>
        <span class="label">Stats</span>
      </a>
      <a href="/game-history" class="nav-item" aria-label="History">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M13 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3zm-1 5h2v6l5.25 3.15-1 1.65L11 14V8z"/>
        </svg>
        <span class="label">History</span>
      </a>
      <a href="${accountHref}" class="nav-item profile-tab" aria-label="Account">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/>
        </svg>
        <span class="label">Account</span>
      </a>
    `;

    // Activation onglets bottom nav
    bottomNav.querySelectorAll('.nav-item').forEach(link => {
      link.classList.remove("active");
      const linkPath = new URL(link.href).pathname;

      if (currentPath === "/login") {
        // Sur login : seul Account actif
        if (link.classList.contains("profile-tab")) {
          link.classList.add("active");
        }
      } else if (currentPath === "/game-history" || currentPath.startsWith("/replay")) {
        if (linkPath === "/game-history") {
          link.classList.add("active");
        }
      } else if (currentPath.startsWith("/profile")) {
        if (linkPath.startsWith("/profile")) {
          link.classList.add("active");
        }
      } else if (currentPath === "/home") {
        if (linkPath === "/home" || link.classList.contains("play-tab")) {
          link.classList.add("active");
        }
      } else if (currentPath === "/") {
        if (linkPath === "/") {
          link.classList.add("active");
        }
      } else {
        if (linkPath === currentPath) {
          link.classList.add("active");
        }
      }
    });
  }
});

window.logout = function () {
  signOut(auth)
    .then(() => {
      window.location.href = "/login";
    })
    .catch(err => console.error("Logout error:", err));
};
