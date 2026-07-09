async function activate(tab) {
  if (!tab || !tab.id) return;
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
    await chrome.tabs.sendMessage(tab.id, { type: "RE_ACTIVATE", dataUrl });
  } catch (e) {
    console.error("Reactive Eyedropper:", e);
  }
}

chrome.action.onClicked.addListener(activate);

chrome.commands.onCommand.addListener((command) => {
  if (command === "activate-eyedropper") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => activate(tab));
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "RE_ACTIVATE_FROM_POPUP") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => activate(tab));
    sendResponse({ ok: true });
  }
  if (msg.type === "RE_PICKED") {
    chrome.storage.local.set({ lastHex: msg.hex });
  }
  if (msg.type === "RE_REQUEST_CAPTURE" && sender.tab) {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" })
      .then((dataUrl) => sendResponse({ dataUrl }))
      .catch(() => sendResponse({ dataUrl: null }));
    return true;
  }
  return true;
});