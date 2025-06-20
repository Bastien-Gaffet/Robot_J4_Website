document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("carousel-track");
  if (!track) return;

  let scrollAmount = 0;
  let isPaused = false;

  // Dupliquer les éléments une fois
  track.innerHTML += track.innerHTML;

  track.addEventListener("mouseenter", () => {
    isPaused = true;
  });

  track.addEventListener("mouseleave", () => {
    isPaused = false;
  });

  function scrollCarousel() {
    if (!isPaused) {
      scrollAmount += 0.5; // plus fluide si < 1
      track.style.transform = `translateX(-${scrollAmount}px)`;

      if (scrollAmount >= track.scrollWidth / 2) {
        scrollAmount = 0;
      }
    }

    requestAnimationFrame(scrollCarousel);
  }

  requestAnimationFrame(scrollCarousel);
});
