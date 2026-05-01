// content.js
if (globalThis.__saasmmfppfContentLoaded) {
  console.debug("content.js already loaded; skipping re-init");
} else {
  globalThis.__saasmmfppfContentLoaded = true;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrollToReviews") {
    console.log('Scroll to reviews triggered');
    startFlow();
    sendResponse({ success: true });
  }
  if (request.action === "startAutoAnalyze") {
    console.log('Auto analyze triggered');
    startAutoAnalyze(request.pagination);
    sendResponse({ success: true });
  }
  if (request.action === "continuePagination") {
    continuePagination();
    sendResponse({ success: true });
  }
  if (request.action === "pauseAfterPage") {
    pauseAfterPage();
    sendResponse({ success: true });
  }
  if (request.action === "analyzeNow") {
    analyzeNow();
    sendResponse({ success: true });
  }
  if (request.action === "stopAutoAnalyze") {
    console.log('Stop auto analyze triggered');
    stopRequested = true;
    pendingContinue = null;
    allScreenshots = [];
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
  if (request.action === "detectPages") {
    cacheRatingsAnchor();
    const totalPages = detectTotalPages();
    sendResponse({ totalPages });
  }
  if (request.action === "getProductName") {
    const productName = extractProductName();
    const pageUrl = window.location.href;
    sendResponse({ productName, pageUrl });
  }
  return true;
});

function extractProductName() {
  // Shopee product title
  const shopeeTitle = document.querySelector(
    "div.product-briefing span, [class*='product-briefing'] span, [data-sqe='name'] span"
  );
  if (shopeeTitle?.textContent?.trim()) return shopeeTitle.textContent.trim();

  // TikTok Shop product title
  const tiktokTitle = document.querySelector(
    "[data-e2e='product-title'], [class*='product-title'] h1, [class*='ProductTitle']"
  );
  if (tiktokTitle?.textContent?.trim()) return tiktokTitle.textContent.trim();

  // OpenGraph title meta tag
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle?.content?.trim()) return ogTitle.content.trim();

  // Amazon product title
  const amazonTitle = document.querySelector("#productTitle, #title span");
  if (amazonTitle?.textContent?.trim()) return amazonTitle.textContent.trim();

  // Generic h1
  const h1 = document.querySelector("h1");
  if (h1?.textContent?.trim()) return h1.textContent.trim();

  // Fallback to document title
  return document.title || null;
}

let ratingsAnchor = null;
let isRunning = false;
let originalScrollY = 0;
let stopRequested = false;
let captureTimeoutId = null;
let lastErrorSent = "";
let paginationEnabled = false;
let pauseEachPage = false;
let pauseAfterCurrentPage = false;
let currentPageIndex = 1;
let maxPages = Infinity;
let allScreenshots = [];
let pendingContinue = null;
let analyzeAfterCurrentPage = false;
let isCapturingPage = false;
let captureReviewTopOffset = 0;
let pageScreenshotCounts = [];
let firstCaptureTimeoutId = null;
let totalPagesForUi = null;

function detectTotalPages() {
  // Helper: check if an element's text is an ellipsis
  const isEllipsis = (el) => /^(\u2026|[.]{2,}|\.{3,})$/.test(el.textContent.trim());

  // Helper: extract page numbers from a list of elements, including after ellipsis
  const extractMaxPage = (elements) => {
    const nums = [];
    let hasEllipsis = false;
    let lastEllipsisIndex = -1;
    let lastNumIndex = -1;
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (isEllipsis(el)) {
        hasEllipsis = true;
        lastEllipsisIndex = i;
        continue;
      }
      const n = Number.parseInt(el.textContent.trim(), 10);
      if (Number.isFinite(n) && n > 0) {
        nums.push(n);
        lastNumIndex = i;
      }
    }
    if (!nums.length) {
      return hasEllipsis ? -1 : 0;
    }
    // If there's an ellipsis but no number appears after the last ellipsis,
    // the true total is unknown (pages are revealed progressively)
    if (hasEllipsis && lastNumIndex < lastEllipsisIndex) {
      return -1;
    }
    // If a number appears after the ellipsis (e.g. "1 2 ... 20"), that's the total
    if (hasEllipsis && lastNumIndex > lastEllipsisIndex) {
      return Math.max(...nums);
    }
    // No ellipsis — the visible numbers are all there is
    return Math.max(...nums);
  };

  // Helper: check if a "Next" button exists in the pagination area
  const hasNextButton = () => {
    const candidates = Array.from(
      document.querySelectorAll(
        "button.shopee-button-no-outline, [class*='pagination'] button, [class*='pagination'] a, nav[aria-label*='page'] button, nav[aria-label*='page'] a"
      )
    );
    return candidates.some((el) => {
      const text = el.textContent.trim().toLowerCase();
      const label = (el.getAttribute("aria-label") || "").toLowerCase();
      return (
        text === "next" || text === ">" || text === "\u203a" || text === "\u00bb" ||
        label.includes("next")
      );
    });
  };

  // Try Shopee-style numbered pagination buttons
  const shopeeButtons = Array.from(
    document.querySelectorAll("button.shopee-button-no-outline")
  );
  if (shopeeButtons.length) {
    // Check if any sibling is a next/prev arrow — indicates more pages exist
    const hasArrowSibling = shopeeButtons.some((btn) => {
      const text = btn.textContent.trim();
      return text === ">" || text === "<" || text === "\u203a" || text === "\u2039" || text === "\u00bb" || text === "\u00ab";
    });

    // Also include sibling elements (ellipsis spans) in the pagination container
    const container = shopeeButtons[0].parentElement;
    const siblings = container ? Array.from(container.children) : shopeeButtons;
    const maxPage = extractMaxPage(siblings);
    if (maxPage === -1) return -1;
    // If there's an arrow button, pages are progressively revealed — total unknown
    if (hasArrowSibling && maxPage > 0) return -1;
    if (maxPage > 0) return maxPage;
    // Fallback to just the buttons themselves
    const btnMax = extractMaxPage(shopeeButtons);
    if (hasArrowSibling && btnMax > 0) return -1;
    if (btnMax > 0) return btnMax;
  }

  // Lazada/Ant Design pagination
  const antItems = Array.from(
    document.querySelectorAll(
      ".ant-pagination-item, .lzd-pagination li, ul[class*='pagination'] li, .iweb-pagination-item, .iweb-pagination li"
    )
  );
  if (antItems.length) {
    const maxPage = extractMaxPage(antItems);
    if (maxPage > 0) return maxPage;
    if (maxPage === -1) return -1;
  }

  // Amazon pagination
  const amazonPagItems = Array.from(
    document.querySelectorAll(".a-pagination li")
  );
  if (amazonPagItems.length) {
    const maxPage = extractMaxPage(amazonPagItems);
    if (maxPage > 0) return maxPage;
    if (maxPage === -1) return -1;
  }

  // Generic fallback: look for any pagination container with numbered buttons/links
  const paginationSelectors = [
    "[class*='pagination'] button",
    "[class*='pagination'] a",
    "[class*='pager'] button",
    "[class*='pager'] a",
    "nav[aria-label*='page'] button",
    "nav[aria-label*='page'] a",
    ".ant-pagination-item a",
    ".ant-pagination-item",
    ".lzd-pagination a",
    ".lzd-pagination li",
    ".iweb-pagination-item",
    ".iweb-pagination-item a",
  ];

  for (const selector of paginationSelectors) {
    const els = Array.from(document.querySelectorAll(selector));
    if (!els.length) continue;
    // Include siblings in the container for ellipsis detection
    const container = els[0].parentElement;
    const siblings = container ? Array.from(container.children) : els;
    const maxPage = extractMaxPage(siblings);
    if (maxPage > 0) return maxPage;
    if (maxPage === -1) return -1;
  }

  // TikTok-style pagination: "Next" div with numeric siblings
  const tiktokNext = Array.from(document.querySelectorAll("div.cursor-pointer"))
    .find((el) => el.textContent.trim() === "Next");
  if (tiktokNext?.parentElement) {
    const tiktokItems = Array.from(
      tiktokNext.parentElement.querySelectorAll("div.cursor-pointer")
    );
    const maxPage = extractMaxPage(tiktokItems);
    if (maxPage > 0) return maxPage;
    if (maxPage === -1) return -1;
  }

  // Last resort: if a Next button exists, pages are unknown
  if (hasNextButton()) {
    return -1;
  }

  return 1;
}

function sendAnalysisError(message) {
  if (!message || message === lastErrorSent) return;
  lastErrorSent = message;
  chrome.runtime.sendMessage({ action: "analysisError", message });
}

function getStickyHeaderHeight() {
  // Measure the total height of sticky/fixed headers near the top of the viewport
  let maxBottom = 0;
  const candidates = document.querySelectorAll('header,nav,[class*="header"],[class*="navbar"],[class*="topbar"],[class*="sticky"]');
  for (const el of candidates) {
    const style = window.getComputedStyle(el);
    if (style.position !== 'fixed' && style.position !== 'sticky') continue;
    const rect = el.getBoundingClientRect();
    // Only count elements pinned near the top (within top 200px)
    if (rect.top >= 0 && rect.top < 200 && rect.bottom > maxBottom) {
      maxBottom = rect.bottom;
    }
  }
  return Math.round(maxBottom);
}

function getFirstReviewItemTop() {
  // Only remove the fixed/sticky navigation bar — never crop into the review list itself.
  // Using review item selectors was over-cropping and causing the first review to be lost.
  return getStickyHeaderHeight();
}

function findReviewSectionBottom() {
  // Try known review container selectors across all platforms
  const containerSelectors = [
    '#product_ratings',
    '[data-sqe="rating_section"]',
    '[id*="product_ratings"]',
    '#customer-reviews',
    '#cm_cr-review_list',
    '[data-e2e="product-review"]',
    // TikTok Shop confirmed ID
    '#pdp-review-section',
    '.product-review',
    // TikTok Shop: container class is "reviews__bd-<hash>" (CSS module with hash suffix)
    '[class*="reviews__bd"]',
    '[class*="review-list"]',
    '[class*="reviews-container"]',
    '[class*="rating-list"]',
    // Lazada confirmed
    '.pdp-mod-review-main',
    '[class*="pdp-mod-review"]',
    '[class*="pdp-review"]',
    '[class*="mod-ratings"]',
    '[id*="module_product_review"]',
  ];
  for (const sel of containerSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      return window.scrollY + el.getBoundingClientRect().bottom;
    }
  }
  // Fallback: find the lowest visible review item
  const itemSelectors = [
    '.shopee-product-rating', '[data-hook="review"]',
    '[class*="review-item"]', '.item-review',
    // TikTok Shop: individual review items use "review-dp<hash>" (CSS module)
    '[class*="review-dp"]',
    // Lazada confirmed review item class
    '.item-content-main-content-reviews-item',
    // Shopee confirmed review item class (hashed CSS module)
    '.YNedDV',
  ];
  let lowestBottom = 0;
  for (const sel of itemSelectors) {
    const items = document.querySelectorAll(sel);
    if (items.length > 0) {
      const last = items[items.length - 1];
      lowestBottom = Math.max(lowestBottom, window.scrollY + last.getBoundingClientRect().bottom);
    }
  }
  return lowestBottom || null;
}

function hasRecommendationContent() {
  const keywords = [
    'you may also like', 'you might also like', 'similar products',
    'customers also bought', 'related products', 'also viewed',
    'recommended for you', 'more from this shop', 'more products',
    'from the same shop', 'from the same seller',
    'similar items', 'you may also need',
    // Filipino / Tagalog
    'maaaring gusto mo rin', 'mga katulad na produkto', 'mungkahi para sa iyo',
    'mga produktong katulad', 'inirerekomenda para sa iyo',
    // Malay / Indonesian
    'anda mungkin juga suka', 'produk serupa', 'rekomendasi untuk anda',
    'produk terkait', 'pelanggan juga membeli',
  ];
  // Check headings and prominent elements near the top half of the viewport
  const candidates = document.querySelectorAll('h1,h2,h3,h4,[class*="title"],[class*="heading"],[class*="section"]');
  for (const el of candidates) {
    const rect = el.getBoundingClientRect();
    if (rect.top >= 0 && rect.top < window.innerHeight * 0.6) {
      const text = (el.textContent || '').toLowerCase().trim();
      if (keywords.some(kw => text.includes(kw)) && text.length < 80) {
        return true;
      }
    }
  }
  return false;
}

function detectNoReviews(anchor) {
  const el = anchor || document.body;
  const text = (el.textContent || '').toLowerCase();
  const noReviewPhrases = [
    'no reviews yet', 'no ratings yet', 'no customer reviews',
    'be the first to review', 'be the first to rate',
    'no reviews found', '0 ratings', '0 reviews',
    "haven't received any reviews", 'no review yet',
  ];
  return noReviewPhrases.some(phrase => text.includes(phrase));
}

function startFlow() {
  if (isRunning) {
    console.log('Flow already running, skipping');
    return;
  }
  
  isRunning = true;
  cacheRatingsAnchor();
  if (!ratingsAnchor) {
    console.warn("Ratings anchor not found. Falling back to current view.");
    ratingsAnchor = document.body;
  }

  scrollRatingsToTop();
  console.log('Initial pause 3s...');
  setTimeout(() => handlePage(2), 3000);
}

function startAutoAnalyze(pagination) {
  if (isRunning) {
    console.log('Flow already running, skipping');
    return;
  }

  isRunning = true;
  stopRequested = false;
  lastErrorSent = "";
  paginationEnabled = !!pagination?.enabled;
  pauseEachPage = !!pagination?.pauseEachPage;
  pauseAfterCurrentPage = false;
  maxPages = pagination?.maxPages || Infinity;
  const totalPagesKnown = pagination?.totalPagesKnown;
  totalPagesForUi = Number.isFinite(maxPages) && maxPages < 9999
    ? maxPages
    : (Number.isFinite(totalPagesKnown) ? totalPagesKnown : null);
  currentPageIndex = 1;
  allScreenshots = [];
  pendingContinue = null;
  analyzeAfterCurrentPage = false;
  isCapturingPage = false;
  pageScreenshotCounts = [];
  if (firstCaptureTimeoutId) {
    clearTimeout(firstCaptureTimeoutId);
    firstCaptureTimeoutId = null;
  }
  originalScrollY = window.scrollY;
  cacheRatingsAnchor();
  if (!ratingsAnchor) {
    console.warn("Ratings anchor not found. Falling back to current view.");
    ratingsAnchor = document.body;
  }

  if (detectNoReviews(ratingsAnchor)) {
    sendAnalysisError("No reviews found on this page.");
    chrome.runtime.sendMessage({ action: "analysisStopped" });
    isRunning = false;
    return;
  }

  scrollRatingsToTop();
  chrome.runtime.sendMessage({ action: "analysisScrolling" });
  // Kick off initial progress so UI knows capture is starting
  chrome.runtime.sendMessage({
    action: "analysisProgress",
    current: 0,
    total: 8,
    page: currentPageIndex,
    pageTotal: totalPagesForUi,
  });
  if (firstCaptureTimeoutId) {
    clearTimeout(firstCaptureTimeoutId);
  }
  firstCaptureTimeoutId = setTimeout(() => {
    if (isRunning && allScreenshots.length === 0) {
      sendAnalysisError("Capture did not start. Please try again.");
      chrome.runtime.sendMessage({ action: "analysisStopped" });
      window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
      isRunning = false;
    }
  }, 8000);
  setTimeout(() => {
    const cfg = getDirectExtractionConfig();
    if (cfg) {
      extractDirectReviewText(cfg);
    } else {
      captureReviewTopOffset = getFirstReviewItemTop();
      captureReviewScreenshots(handlePageCaptured);
    }
  }, 1000);
}

// Per-platform selectors for direct DOM text extraction (bypasses screenshots/OCR).
// itemSelector: the element whose textContent is one review.
// scopeSelector: optional ancestor to limit the search (avoids grabbing non-review text).
function getDirectExtractionConfig() {
  const h = window.location.hostname;
  if (h.includes('tiktok'))  return { item: '.H4-Regular.text-color-UIText1', scope: '#pdp-review-section' };
  if (h.includes('lazada'))  return { item: '.item-content-main', scope: null, exclude: '.seller-reply-wrapper-v2' };
  if (h.includes('shopee'))  return { item: '.YNedDV', scope: null };
  return null;
}

function extractDirectReviewText({ item: itemSelector, scope: scopeSelector, exclude: excludeSelector }) {
  const allTexts = [];
  let pageNum = 1;

  if (firstCaptureTimeoutId) {
    clearTimeout(firstCaptureTimeoutId);
    firstCaptureTimeoutId = null;
  }

  function collectFromPage() {
    const root = (scopeSelector && document.querySelector(scopeSelector)) || document;
    root.querySelectorAll(itemSelector).forEach(el => {
      if (excludeSelector && el.closest(excludeSelector)) return;
      const text = el.textContent.trim();
      if (text && text.length > 5) allTexts.push(text);
    });
  }

  function sendAndFinish() {
    const numberedText = allTexts.map((t, i) => `[Review ${i + 1}]\n${t}`).join('\n\n');
    chrome.runtime.sendMessage({
      action: 'analysisText',
      text: numberedText,
      reviewCount: allTexts.length,
      pagesCaptured: pageNum,
    });
    window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
    isRunning = false;
  }

  function processPage() {
    if (stopRequested) {
      chrome.runtime.sendMessage({ action: 'analysisStopped' });
      window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
      isRunning = false;
      return;
    }

    collectFromPage();

    chrome.runtime.sendMessage({
      action: 'analysisProgress',
      current: pageNum,
      total: maxPages === Infinity ? pageNum : maxPages,
      page: pageNum,
      pageTotal: totalPagesForUi,
    });

    if (!paginationEnabled || pageNum >= maxPages) {
      sendAndFinish();
      return;
    }

    scrollToPaginationArea();
    setTimeout(() => {
      const clicked = clickNextPageButton();
      if (!clicked) {
        sendAndFinish();
        return;
      }
      pageNum++;
      setTimeout(() => {
        scrollRatingsToTop();
        setTimeout(processPage, 1500);
      }, 2000);
    }, 600);
  }

  scrollRatingsToTop();
  setTimeout(processPage, 1500);
}

function cacheRatingsAnchor() {
  const selectorCandidates = [
    "#product_ratings",
    "[id*='product_ratings']",
    "[data-sqe='rating']",
    "[data-sqe='rating_section']",
    "[data-sqe='ratings']",
    "[class*='product-rating']",
    "[class*='product-ratings']",
    "section[id*='rating']",
    // Amazon review selectors
    "#reviews-medley-footer",
    "#customer-reviews",
    "[data-hook='reviews-medley-footer']",
    // TikTok Shop review selectors
    "#pdp-review-section",
    "[data-e2e='product-review']",
    "[class*='reviews__bd']",
    "[class*='review-list']",
    "[class*='review-filter-container']",
    "[class*='review-filter']",
    // Lazada confirmed
    ".pdp-mod-review-main",
    "[class*='pdp-mod-review']",
  ];

  for (const selector of selectorCandidates) {
    const el = document.querySelector(selector);
    if (el) {
      ratingsAnchor = el;
      console.log("Ratings anchor found by selector:", selector);
      return;
    }
  }

  const keywords = [
    'Product Ratings',
    'Product Rating',
    'Product Reviews',
    'Ratings & Reviews',
    'Ratings and Reviews',
    'Rating & Reviews',
    'Rating and Reviews',
    'Ratings Produk',
    'Penilaian Produk',
    'Customer Reviews',
    'Top reviews',
    'Reviews',
    'ç”¢å“è©•åƒ¹',
    'å•†å“è©•åƒ¹',
    'ÄÃ¡nh giÃ¡ sáº£n pháº©m'
  ];
  const includeMatchers = [
    (text) => text.includes('global reviews'),
    (text) => text.includes('photos from reviews'),
    (text) => text.includes('displaying') && text.includes('reviews'),
  ];

  for (const el of document.querySelectorAll('*')) {
    const text = el.textContent.trim();
    const lower = text.toLowerCase();
    const matchesKeyword = keywords.some(k => text === k || text.startsWith(k));
    const matchesInclude = includeMatchers.some((fn) => fn(lower));
    if (matchesKeyword || matchesInclude) {
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

  console.log(`Scrolling to Product Ratings: from ${currentScroll} -> ${targetScroll}`);

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
    console.log('Finished pages 2 -> 10');
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
      // Continue normally for pages 2 -> 9
      setTimeout(() => handlePage(page + 1), 2000);
    }

  }, 3000); // wait before clicking
}

function captureReviewScreenshots(onComplete) {
  const maxShots = 6;
  const step = Math.max(window.innerHeight - 150, 500);
  const docHeight = document.documentElement.scrollHeight;
  const startY = window.scrollY;
  const screenshots = [];
  isCapturingPage = true;

  const finishCapture = () => {
    isCapturingPage = false;
    if (typeof onComplete === "function") {
      onComplete(screenshots);
    } else {
      chrome.runtime.sendMessage({
        action: "analysisScreenshots",
        screenshots,
        reviewTopOffset: captureReviewTopOffset,
      });
      captureReviewTopOffset = 0;
      window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
      isRunning = false;
    }
  };

  const captureAt = (index, y) => {
    if (stopRequested) {
      isCapturingPage = false;
      chrome.runtime.sendMessage({ action: "analysisStopped" });
      window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
      isRunning = false;
      return;
    }

    window.scrollTo({ top: y, behavior: 'smooth' });
    captureTimeoutId = setTimeout(() => {
      if (stopRequested) {
        isCapturingPage = false;
        chrome.runtime.sendMessage({ action: "analysisStopped" });
        window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
        isRunning = false;
        return;
      }

      // Stop if recommendation/carousel section has entered the viewport
      if (screenshots.length > 0 && hasRecommendationContent()) {
        finishCapture();
        return;
      }
      try {
        console.log("captureVisible: request", { index, y });
        let responded = false;
        const timeoutId = setTimeout(() => {
          if (responded) return;
          responded = true;
          console.warn("captureVisible: response timeout");
          sendAnalysisError("Capture timed out. Please try again.");
          chrome.runtime.sendMessage({ action: "analysisStopped" });
          window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
          isRunning = false;
        }, 3000);

        chrome.runtime.sendMessage({ action: "captureVisible" }, (response) => {
          if (responded) return;
          responded = true;
          clearTimeout(timeoutId);
          console.log("captureVisible: response", response);
          if (response?.error) {
            sendAnalysisError(`Capture failed: ${response.error}`);
            chrome.runtime.sendMessage({ action: "analysisStopped" });
          window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
          isRunning = false;
          return;
        }

        if (response?.dataUrl) {
          screenshots.push(response.dataUrl);
          if (firstCaptureTimeoutId) {
            clearTimeout(firstCaptureTimeoutId);
            firstCaptureTimeoutId = null;
          }
          chrome.runtime.sendMessage({
            action: "analysisProgress",
            current: screenshots.length,
            total: maxShots,
            page: currentPageIndex,
            pageTotal: totalPagesForUi
          });
        }

        const nextY = y + step;
        const reviewBottom = findReviewSectionBottom();
        const withinReviews = reviewBottom === null || nextY < reviewBottom;
        if (index + 1 < maxShots && nextY < docHeight - 50 && withinReviews) {
          captureAt(index + 1, nextY);
        } else {
          finishCapture();
        }
        });
      } catch (err) {
        sendAnalysisError(`Capture failed: ${err?.message || "unknown error"}`);
        chrome.runtime.sendMessage({ action: "analysisStopped" });
        window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
        isRunning = false;
      }
    }, 600);
  };

  captureAt(0, startY);
}

function handlePageCaptured(screenshots) {
  if (stopRequested) {
    chrome.runtime.sendMessage({ action: "analysisStopped" });
    window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
    isRunning = false;
    return;
  }

  allScreenshots.push(...screenshots);
  pageScreenshotCounts[currentPageIndex - 1] = screenshots.length;

  if (!paginationEnabled) {
    chrome.runtime.sendMessage({
      action: "analysisScreenshots",
      screenshots: allScreenshots,
      pagesCaptured: currentPageIndex,
      pageScreenshotCounts,
      reviewTopOffset: captureReviewTopOffset,
    });
    captureReviewTopOffset = 0;
    window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
    isRunning = false;
    return;
  }

  if (analyzeAfterCurrentPage) {
    analyzeAfterCurrentPage = false;
    chrome.runtime.sendMessage({
      action: "analysisScreenshots",
      screenshots: allScreenshots,
      pagesCaptured: currentPageIndex,
      pageScreenshotCounts,
      reviewTopOffset: captureReviewTopOffset,
    });
    captureReviewTopOffset = 0;
    window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
    isRunning = false;
    return;
  }

  if (pauseEachPage || pauseAfterCurrentPage) {
    pauseAfterCurrentPage = false;
    pendingContinue = () => proceedToNextPage();
    chrome.runtime.sendMessage({
      action: "analysisPageComplete",
      page: currentPageIndex,
      totalScreenshots: allScreenshots.length,
      pageScreenshotCount: screenshots.length,
    });
    return;
  }

  proceedToNextPage();
}

function continuePagination() {
  if (typeof pendingContinue === "function") {
    const fn = pendingContinue;
    pendingContinue = null;
    pauseAfterCurrentPage = false;
    fn();
  }
}

function analyzeNow() {
  analyzeAfterCurrentPage = true;
  pauseAfterCurrentPage = false;

  if (pendingContinue) {
    pendingContinue = null;
    const screenshots = allScreenshots.slice();
    allScreenshots = [];
    chrome.runtime.sendMessage({
      action: "analysisScreenshots",
      screenshots,
      pagesCaptured: currentPageIndex,
      pageScreenshotCounts,
      reviewTopOffset: captureReviewTopOffset,
    });
    captureReviewTopOffset = 0;
    window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
    isRunning = false;
    return;
  }

  if (!isCapturingPage) {
    const screenshots = allScreenshots.slice();
    allScreenshots = [];
    chrome.runtime.sendMessage({
      action: "analysisScreenshots",
      screenshots,
      pagesCaptured: currentPageIndex,
      pageScreenshotCounts,
      reviewTopOffset: captureReviewTopOffset,
    });
    captureReviewTopOffset = 0;
    window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
    isRunning = false;
  }
}

function pauseAfterPage() {
  pauseAfterCurrentPage = true;
}

function proceedToNextPage() {
  if (stopRequested) {
    chrome.runtime.sendMessage({ action: "analysisStopped" });
    window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
    isRunning = false;
    return;
  }

  // Stop if we've reached the max pages the user selected
  if (currentPageIndex >= maxPages) {
    chrome.runtime.sendMessage({
      action: "analysisScreenshots",
      screenshots: allScreenshots,
      pagesCaptured: currentPageIndex,
      pageScreenshotCounts,
      reviewTopOffset: captureReviewTopOffset,
    });
    captureReviewTopOffset = 0;
    window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
    isRunning = false;
    return;
  }

  scrollToPaginationArea();
  setTimeout(() => {
    const nextClicked = clickNextPageButton();
    if (!nextClicked) {
      if (paginationEnabled) {
        sendAnalysisError("Pagination buttons not found. Stopping after first page.");
      }
      chrome.runtime.sendMessage({
        action: "analysisScreenshots",
        screenshots: allScreenshots,
        pagesCaptured: currentPageIndex,
        pageScreenshotCounts,
        reviewTopOffset: captureReviewTopOffset,
      });
      captureReviewTopOffset = 0;
      window.scrollTo({ top: originalScrollY, behavior: 'smooth' });
      isRunning = false;
      return;
    }

    currentPageIndex += 1;
    setTimeout(() => {
      scrollRatingsToTop();
      setTimeout(() => captureReviewScreenshots(handlePageCaptured), 1500);
    }, 2000);
  }, 600);
}

function scrollToPaginationArea() {
  if (!ratingsAnchor) return;
  const rect = ratingsAnchor.getBoundingClientRect();
  const targetScroll = window.scrollY + rect.bottom - window.innerHeight + 120;
  window.scrollTo({ top: Math.max(targetScroll, 0), behavior: "smooth" });
}

function clickNextPageButton() {
  const numberButtons = Array.from(document.querySelectorAll("button.shopee-button-no-outline"))
    .map((btn) => {
      const text = btn.textContent.trim();
      const num = Number.parseInt(text, 10);
      return Number.isFinite(num) ? { btn, num } : null;
    })
    .filter(Boolean);

  if (numberButtons.length) {
    const direct = numberButtons.find((item) => item.num === currentPageIndex + 1);
    if (direct && !direct.btn.disabled && !direct.btn.classList.contains("disabled")) {
      direct.btn.click();
      return true;
    }

    const nextHigher = numberButtons
      .filter((item) => item.num > currentPageIndex)
      .sort((a, b) => a.num - b.num)[0];
    if (nextHigher && !nextHigher.btn.disabled && !nextHigher.btn.classList.contains("disabled")) {
      nextHigher.btn.click();
      return true;
    }
  }

  const selectorCandidates = [
    "button[aria-label='Next Page']",
    "button[aria-label='Next']",
    "button[title='Next']",
    "button.shopee-button-no-outline[aria-label='Next Page']",
    "button.shopee-button-no-outline[aria-label='Next']",
    "button.shopee-button-solid[aria-label='Next Page']",
    ".ant-pagination-next button",
    ".ant-pagination-next",
    ".lzd-pagination-next",
    ".lzd-pagination-next button",
    "li.ant-pagination-next button",
    "li.ant-pagination-next a",
    ".iweb-pagination-next",
    ".iweb-pagination-next button",
    "li.iweb-pagination-next button",
    ".iweb-pagination-next .iweb-pagination-item-link",
    // Amazon
    "li.a-last a",
    ".a-pagination .a-last a",
    // TikTok Shop
    "[data-e2e='pagination-next']",
  ];

  for (const selector of selectorCandidates) {
    const el = document.querySelector(selector);
    if (el && !el.disabled && !el.classList.contains("disabled")) {
      el.click();
      return true;
    }
  }

  
  // TikTok-style pagination: clickable div with 'Next' text and cursor-pointer
  const nextDivs = Array.from(document.querySelectorAll("div.cursor-pointer"));
  const nextDiv = nextDivs.find((el) => el.textContent.trim() === "Next");
  if (nextDiv) {
    nextDiv.click();
    return true;
  }
const buttons = Array.from(document.querySelectorAll("button"));
  const nextText = new Set(["Next", "Next Page", ">", "›", "»"]);
  const nextBtn = buttons.find((btn) => {
    const text = btn.textContent.trim();
    if (!nextText.has(text)) return false;
    if (btn.disabled) return false;
    if (btn.classList.contains("disabled")) return false;
    return true;
  });

  if (nextBtn) {
    nextBtn.click();
    return true;
  }

  return false;
}


}
