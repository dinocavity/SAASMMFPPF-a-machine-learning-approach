import { useState, useCallback, useMemo, useEffect } from "react";

/**
 * Hook for detecting supported e-commerce platforms and product pages.
 * Extracted from useAnalysis for better maintainability.
 */

const SUPPORTED_DOMAINS = [
  'shopee.ph', 'shopee.com',
  'lazada.com', 'lazada.sg', 'lazada.com.ph',
  'lazada.vn', 'lazada.co.id', 'lazada.co.th', 'lazada.com.my',
  'amazon.com', 'amazon.com.ph', 'amazon.sg', 'amazon.co.jp',
  'tiktok.com',
];

export function usePlatformDetection() {
  const [currentTabUrl, setCurrentTabUrl] = useState(null);

  const isSupportedDomain = useCallback((url) => {
    if (!url) return false;
    if (/^(chrome|edge|about|chrome-extension):/.test(url)) return false;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return SUPPORTED_DOMAINS.some(
        (d) => hostname === d || hostname.endsWith('.' + d)
      );
    } catch { return false; }
  }, []);

  const isProductPage = useCallback((url) => {
    if (!url || !isSupportedDomain(url)) return false;
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname.toLowerCase();

      // Shopee product pages: old "-i.shop_id.item_id" format or modern "/product/item_id/shop_id" shared links
      if (SUPPORTED_DOMAINS.some((d) => (d.startsWith('shopee') && (hostname === d || hostname.endsWith('.' + d))))) {
        return /-i\.\d+\.\d+/.test(pathname) || /\/product\/\d+\/\d+/.test(pathname);
      }

      // Lazada product pages: /products/ path or -i<item_id> pattern
      if (SUPPORTED_DOMAINS.some((d) => (d.startsWith('lazada') && (hostname === d || hostname.endsWith('.' + d))))) {
        return /\/products\//.test(pathname) || /-i\d+/.test(pathname);
      }

      // Amazon product pages: /dp/ or /gp/product/ in pathname
      if (SUPPORTED_DOMAINS.some((d) => (d.startsWith('amazon') && (hostname === d || hostname.endsWith('.' + d))))) {
        return /\/dp\//.test(pathname) || /\/gp\/product\//.test(pathname);
      }

      // TikTok Shop product pages: /product/ or /shop/.../pdp/ in pathname
      if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) {
        return /\/product\//.test(pathname) || /\/shop\/.+\/pdp\//.test(pathname) || /\/pdp\//.test(pathname);
      }

      return false;
    } catch { return false; }
  }, [isSupportedDomain]);

  const isSupportedUrl = useCallback((url) => {
    return isSupportedDomain(url);
  }, [isSupportedDomain]);

  const getPlatformFromUrl = useCallback((url) => {
    if (!url) return null;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (SUPPORTED_DOMAINS.some((d) => d.startsWith('shopee') && (hostname === d || hostname.endsWith('.' + d)))) return 'shopee';
      if (SUPPORTED_DOMAINS.some((d) => d.startsWith('lazada') && (hostname === d || hostname.endsWith('.' + d)))) return 'lazada';
      if (SUPPORTED_DOMAINS.some((d) => d.startsWith('amazon') && (hostname === d || hostname.endsWith('.' + d)))) return 'amazon';
      if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) return 'tiktok';
      return null;
    } catch { return null; }
  }, []);

  const currentPlatform = useMemo(
    () => getPlatformFromUrl(currentTabUrl),
    [currentTabUrl, getPlatformFromUrl]
  );

  const isSupportedPage = useMemo(
    () => currentTabUrl === null ? true : isProductPage(currentTabUrl),
    [currentTabUrl, isProductPage]
  );

  const isOnSupportedDomain = useMemo(
    () => currentTabUrl === null ? true : isSupportedDomain(currentTabUrl),
    [currentTabUrl, isSupportedDomain]
  );

  // Initialize current tab URL on mount
  useEffect(() => {
    if (!chrome?.tabs?.query) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs[0]) return;
      setCurrentTabUrl(tabs[0].url);
    });
  }, []);

  return {
    currentTabUrl,
    setCurrentTabUrl,
    currentPlatform,
    isSupportedPage,
    isOnSupportedDomain,
    isSupportedDomain,
    isProductPage,
    isSupportedUrl,
    getPlatformFromUrl,
    SUPPORTED_DOMAINS,
  };
}
