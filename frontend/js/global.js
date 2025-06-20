//source code javascript
//scripts.js
document.addEventListener("DOMContentLoaded", function () {
    var nav = document.querySelector("nav");
    var footer = document.querySelector("footer");
    var lastScrollTop = 0;
    var scrollThreshold = 300; // Nombre de pixels apres lequel les barres disparaissent
    window.addEventListener("scroll", function () {
        var scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (scrollTop > scrollThreshold) {
        if (scrollTop > lastScrollTop) {
            // Defilement vers le bas
            nav.classList.add("hide-nav");
        } else {
            // Defilement vers le haut
            nav.classList.remove("hide-nav");
        }
    } else {
        // En haut de la page ou avant d'atteindre le seuil
        nav.classList.remove("hide-nav");
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // Pour les appareils mobiles ou pour eviter les valeurs negatives
    });
});

window.onscroll = function () { scrollFunction() };

function scrollFunction() {
    const backToTopButton = document.getElementById("backtotopBtn");
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        backToTopButton.classList.add("show");
    } else {
        backToTopButton.classList.remove("show");
    }
}

document.getElementById("backtotopBtn").onclick = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}