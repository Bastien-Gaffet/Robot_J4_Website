document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("carousel-track");
  if (!track) return;

  let scrollAmount = 0;

  // Dupliquer les éléments une fois
  track.innerHTML += track.innerHTML;

  function scrollCarousel() {
    scrollAmount += 1;
    track.style.transform = `translateX(-${scrollAmount}px)`;

    // Si on a scrollé autant que la moitié (donc une fois les items d'origine), on repart à 0
    if (scrollAmount >= track.scrollWidth / 2) {
      scrollAmount = 0;
    }

    requestAnimationFrame(scrollCarousel);
  }

  requestAnimationFrame(scrollCarousel);
});