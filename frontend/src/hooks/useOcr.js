import { useState, useCallback, useRef } from "react";
import Tesseract from "tesseract.js";
import { TESSERACT_CONFIG } from "@/lib/constants";

export function useOcr() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const cancelRef = useRef(false);
  const stopAfterCurrentRef = useRef(false);
  const stoppedEarlyRef = useRef(false);

  const processScreenshots = useCallback(async (screenshots, onProgress) => {
    setLoading(true);
    setError("");
    setProgress(0);
    cancelRef.current = false;
    stopAfterCurrentRef.current = false;
    stoppedEarlyRef.current = false;

    const extractedBlocks = [];
    let lastIndex = -1;

    try {
      for (let index = 0; index < screenshots.length; index++) {
        if (cancelRef.current) {
          throw new Error("OCR cancelled");
        }

        const result = await Tesseract.recognize(screenshots[index], "eng", {
          logger: (message) => {
            if (cancelRef.current) return;
            if (message.status === "recognizing text") {
              const itemProgress = Math.round(message.progress * 100);
              const overall = Math.round(
                ((index + message.progress) / screenshots.length) * 100
              );
              const currentProgress = Math.max(itemProgress, overall);
              setProgress(currentProgress);
              onProgress?.(currentProgress, index + 1, screenshots.length);
            }
          },
          workerBlobURL: false,
          workerPath: `${TESSERACT_CONFIG.baseUrl}/worker.min.js`,
          corePath: `${TESSERACT_CONFIG.baseUrl}/tesseract-core.wasm.js`,
          langPath: TESSERACT_CONFIG.langPath,
        });

        extractedBlocks.push(result.data.text.trim());
        lastIndex = index;

        if (stopAfterCurrentRef.current) {
          stoppedEarlyRef.current = true;
          break;
        }
      }

      const combined = extractedBlocks.filter(Boolean).join("\n\n");
      const nextIndex = stoppedEarlyRef.current ? lastIndex + 1 : screenshots.length;
      return { text: combined, stoppedEarly: stoppedEarlyRef.current, nextIndex };
    } catch (err) {
      if (err.message === "OCR cancelled") {
        setError("OCR was cancelled");
        return null;
      }
      setError("OCR failed. Try again or use a clearer page.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopAfterCurrent = useCallback(() => {
    stopAfterCurrentRef.current = true;
  }, []);

  const wasStoppedEarly = useCallback(() => stoppedEarlyRef.current, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const terminateNow = useCallback(() => {
    cancelRef.current = true;
    stopAfterCurrentRef.current = false;
    setLoading(false);
    setProgress(0);
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setProgress(0);
    setError("");
    cancelRef.current = false;
    stopAfterCurrentRef.current = false;
    stoppedEarlyRef.current = false;
  }, []);

  return {
    loading,
    progress,
    error,
    processScreenshots,
    stopAfterCurrent,
    wasStoppedEarly,
    cancel,
    terminateNow,
    reset,
  };
}
