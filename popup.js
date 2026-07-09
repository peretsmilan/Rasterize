document.getElementById("pick").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "RE_ACTIVATE_FROM_POPUP" });
  window.close();
});

chrome.storage?.local.get("lastHex", ({ lastHex }) => {
  if (lastHex) {
    document.getElementById("last").style.display = "flex";
    document.getElementById("sw").style.background = lastHex;
    document.getElementById("hex").textContent = lastHex;
  }
});
