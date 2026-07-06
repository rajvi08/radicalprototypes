// Y-axis turntable — lock tilt and zoom; camera angle from data-camera-phi.
(() => {
  "use strict";

  function initTurntable(viewer) {
    const phi = viewer.dataset.cameraPhi || "75deg";
    let radius = null;
    let ready = false;

    function lockOrbit() {
      if (!ready || !viewer.getCameraOrbit) return;
      const orbit = viewer.getCameraOrbit();
      viewer.cameraOrbit = `${orbit.theta}rad ${phi} ${radius}`;
    }

    function onReady() {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const orbit = viewer.getCameraOrbit();
          radius = `${orbit.radius.toFixed(3)}m`;
          viewer.minCameraOrbit = `auto ${phi} ${radius}`;
          viewer.maxCameraOrbit = `auto ${phi} ${radius}`;
          ready = true;
          lockOrbit();
        });
      });
    }

    if (viewer.loaded) {
      onReady();
    } else {
      viewer.addEventListener("load", onReady, { once: true });
    }

    viewer.addEventListener("camera-change", lockOrbit);
  }

  function boot() {
    document.querySelectorAll(".bespoke__viewer").forEach(initTurntable);
  }

  if (customElements.get("model-viewer")) {
    boot();
  } else {
    customElements.whenDefined("model-viewer").then(boot);
  }
})();
