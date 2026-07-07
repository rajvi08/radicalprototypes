// Looping video — plays automatically when in view
(() => {
  "use strict";

  const video = document.getElementById("scroll-video");
  if (!video) return;

  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  video.muted = true;
  video.playsInline = true;
  video.loop = true;

  if (prefersReduced) {
    video.controls = true;
    return;
  }

  const play = () => {
    video.play().catch(() => {});
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) play();
          else video.pause();
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(video);
  } else {
    play();
  }

  video.addEventListener("loadeddata", play);
})();
