console.log('Background service worker loaded');

const CONTENT_ACTIONS = new Set([
  "scrollToReviews",
  "startAutoAnalyze",
  "stopAutoAnalyze",
]);

const sendToActiveTab = (action) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const tabId = tabs[0].id;
    const payload = { action };

    chrome.tabs.sendMessage(tabId, payload, () => {
      if (!chrome.runtime.lastError) return;

      chrome.scripting.executeScript(
        { target: { tabId }, files: ["content.js"] },
        () => {
          chrome.tabs.sendMessage(tabId, payload);
        }
      );
    });
  });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received:', request);
  
  if (CONTENT_ACTIONS.has(request.action)) {
    sendToActiveTab(request.action);
  }

  if (request.action === "captureVisible") {
    chrome.tabs.captureVisibleTab(
      sender.tab?.windowId,
      { format: "png" },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ dataUrl });
      }
    );
    return true;
  }
  return true;
});
