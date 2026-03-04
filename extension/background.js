console.log('Background service worker loaded');

// --- Tab / URL change detection ---
let lastCommunicatedUrl = null;

function notifyTabChange(tabId, url) {
  if (url === lastCommunicatedUrl) return;
  lastCommunicatedUrl = url;

  chrome.runtime.sendMessage(
    { action: 'TAB_CHANGED', tabId, url },
    () => {
      // Sidepanel might not be open — ignore errors
      if (chrome.runtime.lastError) { /* silent */ }
    }
  );
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    notifyTabChange(tab.id, tab.url);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url && changeInfo.status !== 'complete') return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id === tabId) {
      notifyTabChange(tabId, tab.url);
    }
  });
});

const CONTENT_ACTIONS = new Set([
  "scrollToReviews",
  "startAutoAnalyze",
  "stopAutoAnalyze",
  "continuePagination",
  "pauseAfterPage",
  "analyzeNow",
]);

const sendToActiveTab = (request) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const tabId = tabs[0].id;

    chrome.tabs.sendMessage(tabId, request, () => {
      if (!chrome.runtime.lastError) return;

      chrome.scripting.executeScript(
        { target: { tabId }, files: ["content.js"] },
        () => {
          chrome.tabs.sendMessage(tabId, request);
        }
      );
    });
  });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received:', request);

  if (CONTENT_ACTIONS.has(request.action)) {
    sendToActiveTab(request);
    sendResponse({ success: true });
    return false;
  }

  // getProductName needs a response from content script, so forward and relay back
  if (request.action === "getProductName") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse({ productName: null });
        return;
      }
      const tabId = tabs[0].id;

      chrome.tabs.sendMessage(tabId, { action: "getProductName" }, (response) => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript(
            { target: { tabId }, files: ["content.js"] },
            () => {
              chrome.tabs.sendMessage(tabId, { action: "getProductName" }, (retryResponse) => {
                sendResponse(retryResponse || { productName: null });
              });
            }
          );
        } else {
          sendResponse(response || { productName: null });
        }
      });
    });
    return true; // async response
  }

  // detectPages needs a response from content script, so forward and relay back
  if (request.action === "detectPages") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse({ totalPages: 1 });
        return;
      }
      const tabId = tabs[0].id;

      chrome.tabs.sendMessage(tabId, { action: "detectPages" }, (response) => {
        if (chrome.runtime.lastError) {
          // Try injecting content script first, then retry
          chrome.scripting.executeScript(
            { target: { tabId }, files: ["content.js"] },
            () => {
              chrome.tabs.sendMessage(tabId, { action: "detectPages" }, (retryResponse) => {
                sendResponse(retryResponse || { totalPages: 1 });
              });
            }
          );
        } else {
          sendResponse(response || { totalPages: 1 });
        }
      });
    });
    return true; // async response
  }

  if (request.action === "captureVisible") {
    try {
      const captureWithWindow = (windowId) => {
        console.log("captureVisible: captureVisibleTab start", { windowId });
        let responded = false;
        const timeoutId = setTimeout(() => {
          if (responded) return;
          responded = true;
          console.warn("captureVisible: timed out");
          sendResponse({ error: "captureVisibleTab timed out" });
        }, 4000);
        chrome.tabs.captureVisibleTab(
          windowId,
          { format: "png" },
          (dataUrl) => {
            if (responded) return;
            responded = true;
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) {
              console.warn("captureVisible: lastError", chrome.runtime.lastError.message);
              sendResponse({ error: chrome.runtime.lastError.message });
              return;
            }
            console.log("captureVisible: success", { bytes: dataUrl?.length || 0 });
            sendResponse({ dataUrl });
          }
        );
      };

      const activateAndCapture = (tabId, windowId) => {
        console.log("captureVisible: activateAndCapture", { tabId, windowId });
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError || !tab) {
            console.warn("captureVisible: tabs.get failed", chrome.runtime.lastError?.message);
            captureWithWindow(windowId);
            return;
          }
          if (!tab.active) {
            chrome.tabs.update(tabId, { active: true }, () => {
              console.log("captureVisible: tab activated");
              setTimeout(() => captureWithWindow(windowId), 200);
            });
            return;
          }
          captureWithWindow(windowId);
        });
      };

      if (sender?.tab?.id && sender?.tab?.windowId !== undefined) {
        activateAndCapture(sender.tab.id, sender.tab.windowId);
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]) {
            sendResponse({ error: "No active tab to capture." });
            return;
          }
          activateAndCapture(tabs[0].id, tabs[0].windowId);
        });
      }
    } catch (err) {
      sendResponse({ error: err?.message || "captureVisible failed" });
    }
    return true; // async response
  }
  return false;
});
