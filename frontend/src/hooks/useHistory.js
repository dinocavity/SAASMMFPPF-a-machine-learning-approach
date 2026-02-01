import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "saasmmfppf_history";
const MAX_ENTRIES = 50;

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function extractFraudVerdict(results) {
  if (!results?.fraud) return "Unknown";
  const { models_ok, consensus_is_fake } = results.fraud;
  if (!models_ok) return "Unknown";
  return consensus_is_fake ? "Likely Fake" : "Likely Authentic";
}

function extractSentimentVerdict(results) {
  if (!results?.sentiment) return "Unknown";
  const { models_ok, consensus_sentiment } = results.sentiment;
  if (!models_ok) return "Unknown";
  return consensus_sentiment || "Unknown";
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full or unavailable
  }
}

export function useHistory() {
  const [history, setHistory] = useState(() => loadHistory());

  // Sync to localStorage whenever history changes
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const addEntry = useCallback((entry) => {
    const newEntry = {
      id: generateId(),
      url: entry.url || null,
      productName: entry.productName || null,
      date: new Date().toISOString(),
      results: entry.results,
      captureMetadata: entry.captureMetadata || null,
      fraudVerdict: extractFraudVerdict(entry.results),
      sentimentVerdict: extractSentimentVerdict(entry.results),
    };

    setHistory((prev) => [newEntry, ...prev].slice(0, MAX_ENTRIES));
    return newEntry;
  }, []);

  const removeEntry = useCallback((id) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const getEntryById = useCallback(
    (id) => history.find((e) => e.id === id) || null,
    [history]
  );

  const getEntryByUrl = useCallback(
    (url) => {
      if (!url) return null;
      return history.find((e) => e.url === url) || null;
    },
    [history]
  );

  return {
    history,
    addEntry,
    removeEntry,
    clearHistory,
    getEntryById,
    getEntryByUrl,
  };
}
