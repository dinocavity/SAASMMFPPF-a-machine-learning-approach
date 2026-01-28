// content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrollToReviews") {
    console.log('Scroll to reviews triggered');
    startFlow();
    sendResponse({ success: true });
  }
  if (request.action === "startAutoAnalyze") {
    console.log('Auto analyze triggered');
    startAutoAnalyze();
    sendResponse({ success: true });
  }
  if (request.action === "stopAutoAnalyze") {
    console.log('Stop auto analyze triggered');
    stopRequested = true;
    if (captureTimeoutId) {
      clearTimeout(captureTimeoutId);
      captureTimeoutId = null;
    }
    if (isRunning) {
      chrome.runtime.sendMessage({ action: "analysisStopped" });
      window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
      isRunning = false;
    }
    sendResponse({ success: true });
  }
  return true;
});

let ratingsAnchor = null;
let isRunning = false;
let originalScrollY = 0;
let stopRequested = false;
let captureTimeoutId = null;

function startFlow() {
  if (isRunning) {
    console.log('Flow already running, skipping');
    return;
  }
  
  isRunning = true;
  cacheRatingsAnchor();
  if (!ratingsAnchor) {
    isRunning = false;
    return;
  }

  scrollRatingsToTop();
  console.log('Initial pause 3s...');
  setTimeout(() => handlePage(2), 3000);
}

function startAutoAnalyze() {
  if (isRunning) {
    console.log('Flow already running, skipping');
    return;
  }

  isRunning = true;
  stopRequested = false;
  originalScrollY = window.scrollY;
  cacheRatingsAnchor();
  if (!ratingsAnchor) {
    isRunning = false;
    return;
  }

  scrollRatingsToTop();
  setTimeout(() => captureReviewScreenshots(), 2000);
}

function cacheRatingsAnchor() {
  const keywords = [
    'Product Ratings',
    'Product Rating',
    'Product Reviews',
    'Ratings Produk',
    'Penilaian Produk',
    '產品評價',
    '商品評價',
    'Đánh giá sản phẩm'
  ];

  for (const el of document.querySelectorAll('*')) {
    const text = el.textContent.trim();
    if (keywords.some(k => text === k || text.startsWith(k))) {
      let parent = el;
      while (parent && parent !== document.body) {
        if (
          parent.tagName === 'SECTION' ||
          (parent.tagName === 'DIV' && parent.offsetHeight > 100)
        ) {
          ratingsAnchor = parent;
          console.log('Ratings anchor cached at position:', 
            ratingsAnchor.getBoundingClientRect().top);
          return;
        }
        parent = parent.parentElement;
      }
    }
  }

  console.warn('Product Ratings anchor not found');
}

function scrollRatingsToTop(offset = 0) {
  if (!ratingsAnchor) return;

  // Get element's position relative to viewport
  const rect = ratingsAnchor.getBoundingClientRect();

  // Current scroll position
  const currentScroll = window.scrollY;

  // Calculate exact scroll target
  const targetScroll = currentScroll + rect.top - offset; // offset accounts for headers

  console.log(`Scrolling to Product Ratings: from ${currentScroll} → ${targetScroll}`);

  // Smoothly scroll
  window.scrollTo({
    top: targetScroll,
    behavior: 'smooth'
  });
}

function scrollButtonToBottom(button) {
  const rect = button.getBoundingClientRect();
  const targetY = rect.top + window.scrollY - window.innerHeight + 120;
  
  console.log(`Scrolling to button bottom: targetY=${targetY}`);
  
  window.scrollTo({ 
    top: targetY, 
    behavior: 'smooth' 
  });
}

function handlePage(page) {
  if (page > 10) {
    console.log('Finished pages 2 → 10');
    isRunning = false;
    return;
  }

  console.log(`=== Handling page ${page} ===`);

  const buttons = Array.from(
    document.querySelectorAll('button.shopee-button-no-outline')
  );

  const button = buttons.find(b => b.textContent.trim() === String(page));

  if (!button) {
    console.warn(`Page button ${page} not found. Retrying in 3s...`);
    return setTimeout(() => handlePage(page), 3000);
  }

  // Scroll to current page button
  scrollButtonToBottom(button);

  setTimeout(() => {
    // Re-query button before clicking
    const buttonsAfterUpdate = Array.from(
      document.querySelectorAll('button.shopee-button-no-outline')
    );
    const buttonToClick = buttonsAfterUpdate.find(
      b => b.textContent.trim() === String(page)
    );

    if (!buttonToClick) {
      console.warn(`Button for page ${page} not found at click time. Retrying...`);
      return setTimeout(() => handlePage(page), 3000);
    }

    console.log(`[Page ${page}] Clicking button`);
    buttonToClick.click();

    // Special case for page 10: scroll to page 11 button after clicking, but do not click
    if (page === 10) {
      setTimeout(() => {
        const buttonsFinal = Array.from(
          document.querySelectorAll('button.shopee-button-no-outline')
        );
        const button11 = buttonsFinal.find(b => b.textContent.trim() === '11');
        if (button11) {
          console.log('Scrolling to page 11 button (page 10 special case)');
          scrollButtonToBottom(button11);
        } else {
          console.warn('Page 11 button not found.');
        }
        isRunning = false; // stop the flow
      }, 2000); // wait for page 10 content to load
    } else {
      // Continue normally for pages 2 → 9
      setTimeout(() => handlePage(page + 1), 2000);
    }

  }, 3000); // wait before clicking
}

function captureReviewScreenshots() {
  const maxShots = 8;
  const step = Math.max(window.innerHeight - 150, 500);
  const docHeight = document.documentElement.scrollHeight;
  const startY = window.scrollY;
  const screenshots = [];

  const captureAt = (index, y) => {
    if (stopRequested) {
      chrome.runtime.sendMessage({ action: "analysisStopped" });
      window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
      isRunning = false;
      return;
    }

    window.scrollTo({ top: y, behavior: 'smooth' });
    captureTimeoutId = setTimeout(() => {
      if (stopRequested) {
        chrome.runtime.sendMessage({ action: "analysisStopped" });
        window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
        isRunning = false;
        return;
      }
      chrome.runtime.sendMessage({ action: "captureVisible" }, (response) => {
        if (response?.dataUrl) {
          screenshots.push(response.dataUrl);
          chrome.runtime.sendMessage({
            action: "analysisProgress",
            current: screenshots.length,
            total: maxShots
          });
        }

        const nextY = y + step;
        if (index + 1 < maxShots && nextY < docHeight - 50) {
          captureAt(index + 1, nextY);
        } else {
          chrome.runtime.sendMessage({
            action: "analysisScreenshots",
            screenshots
          });
          window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
          isRunning = false;
        }
      });
    }, 800);
  };

  captureAt(0, startY);
}
