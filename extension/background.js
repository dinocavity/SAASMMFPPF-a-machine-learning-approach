console.log('Background service worker loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received:', request);
  
  if (request.action === "scrollToReviews") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        console.log('Sending to tab:', tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, { action: "scrollToReviews" });
      }
    });
  }
  return true;
});