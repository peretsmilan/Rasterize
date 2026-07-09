(() => {
  if (window.__reactiveEyedropperActive) return;
  window.__reactiveEyedropperActive = true;

  let canvas, ctx, tooltip, crosshair, img;
  let scale = window.devicePixelRatio || 1;
  let lastCapture = 0;
  let capturing = false;
  const RECAPTURE_MS = 350;

  function cleanup() {
    window.__reactiveEyedropperActive = false;
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("contextmenu", onCancel, true);
    tooltip?.remove();
    crosshair?.remove();
    document.documentElement.style.cursor = "";
  }

  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      cleanup();
    }
  }

  function onCancel(e) {
    e.preventDefault();
    cleanup();
  }

  function hexAt(clientX, clientY) {
    const x = Math.min(Math.max(Math.round(clientX * scale), 0), canvas.width - 1);
    const y = Math.min(Math.max(Math.round(clientY * scale), 0), canvas.height - 1);
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  function drawFrame(dataUrl) {
    const frame = new Image();
    frame.onload = () => ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
    frame.src = dataUrl;
  }

  function maybeRecapture() {
    const now = performance.now();
    if (capturing || now - lastCapture < RECAPTURE_MS) return;
    capturing = true;
    lastCapture = now;
    chrome.runtime.sendMessage({ type: "RE_REQUEST_CAPTURE" }, (res) => {
      capturing = false;
      if (res?.dataUrl) drawFrame(res.dataUrl);
    });
  }

  function onMove(e) {
    maybeRecapture();
    const hex = hexAt(e.clientX, e.clientY);
    tooltip.style.left = e.clientX + 16 + "px";
    tooltip.style.top = e.clientY + 16 + "px";
    tooltip.querySelector(".re-swatch").style.background = hex;
    tooltip.querySelector(".re-hex").textContent = hex;
    crosshair.style.left = e.clientX + "px";
    crosshair.style.top = e.clientY + "px";
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const hex = hexAt(e.clientX, e.clientY);
    navigator.clipboard?.writeText(hex).catch(() => {});
    chrome.runtime.sendMessage({ type: "RE_PICKED", hex });
    document.removeEventListener("mousemove", onMove, true);

    const face = tooltip.querySelector(".re-face");
    const copied = tooltip.querySelector(".re-copied");
    face.style.opacity = "0";
    setTimeout(() => {
      face.style.display = "none";
      copied.style.display = "inline-flex";
      requestAnimationFrame(() => (copied.style.opacity = "1"));
    }, 180);

    setTimeout(cleanup, 900);
  }

  function buildUI() {
    tooltip = document.createElement("div");
    tooltip.innerHTML = `
      <span class="re-face">
        <span class="re-swatch"></span><span class="re-hex"></span>
      </span>
      <span class="re-copied"> ✓ Copied to Clipboard </span>
    `;
    Object.assign(tooltip.style, {
      position: "fixed",
      zIndex: 2147483647,
      display: "flex",
      alignItems: "center",
      padding: "6px 10px",
      background: "rgba(20,20,20,0.92)",
      color: "#fff",
      font: "12px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      borderRadius: "6px",
      pointerEvents: "none",
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      whiteSpace: "nowrap"
    });
    const face = tooltip.querySelector(".re-face");
    Object.assign(face.style, {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      transition: "opacity 180ms ease"
    });
    const swatch = tooltip.querySelector(".re-swatch");
    Object.assign(swatch.style, {
      width: "14px",
      height: "14px",
      borderRadius: "3px",
      border: "1px solid rgba(255,255,255,0.5)",
      display: "inline-block"
    });
    const copied = tooltip.querySelector(".re-copied");
    Object.assign(copied.style, {
      display: "none",
      alignItems: "center",
      opacity: "0",
      transition: "opacity 180ms ease",
      color: "#6bffb0"
    });

    crosshair = document.createElement("div");
    Object.assign(crosshair.style, {
      position: "fixed",
      zIndex: 2147483646,
      width: "1px",
      height: "1px",
      pointerEvents: "none"
    });
    crosshair.innerHTML = `
      <div style="position:absolute;left:-9px;top:0;width:18px;height:1px;background:rgba(255,255,255,0.9);box-shadow:0 0 1px #000"></div>
      <div style="position:absolute;left:0;top:-9px;width:1px;height:18px;background:rgba(255,255,255,0.9);box-shadow:0 0 1px #000"></div>
    `;

    document.documentElement.appendChild(tooltip);
    document.documentElement.appendChild(crosshair);
    document.documentElement.style.cursor = "crosshair";
  }

  function start(dataUrl) {
    img = new Image();
    img.onload = () => {
      canvas = document.createElement("canvas");
      canvas.width = Math.round(window.innerWidth * scale);
      canvas.height = Math.round(window.innerHeight * scale);
      ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      buildUI();
      document.addEventListener("mousemove", onMove, true);
      document.addEventListener("click", onClick, true);
      document.addEventListener("keydown", onKey, true);
      document.addEventListener("contextmenu", onCancel, true);
    };
    img.src = dataUrl;
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "RE_ACTIVATE") start(msg.dataUrl);
  });
})();