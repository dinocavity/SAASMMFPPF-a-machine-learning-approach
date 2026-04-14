import { useState, useCallback, useRef } from "react";
import Tesseract from "tesseract.js";
import { TESSERACT_CONFIG } from "@/lib/constants";

async function preprocessImage(dataUrl, cropY = 0, scale = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const srcHeight = img.height - cropY;
      if (srcHeight <= 0) { resolve(dataUrl); return; }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(srcHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, cropY, img.width, srcHeight, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = dataUrl;
  });
}

export function useOcr() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const cancelRef = useRef(false);
  const stopAfterCurrentRef = useRef(false);
  const stoppedEarlyRef = useRef(false);

  const processScreenshots = useCallback(async (screenshots, onProgress, firstCropY = 0) => {
    setLoading(true);
    setError("");
    setProgress(0);
    cancelRef.current = false;
    stopAfterCurrentRef.current = false;
    stoppedEarlyRef.current = false;

    const extractedBlocks = [];
    const confidenceScores = [];
    let lastIndex = -1;

    try {
      for (let index = 0; index < screenshots.length; index++) {
        if (cancelRef.current) {
          throw new Error("OCR cancelled");
        }

        const cropY = index === 0 ? firstCropY : 0;
        const processedImage = await preprocessImage(screenshots[index], cropY, 0.75);

        const result = await Tesseract.recognize(processedImage, "eng", {
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
        if (result.data.confidence > 0) {
          confidenceScores.push(result.data.confidence);
        }
        lastIndex = index;

        if (stopAfterCurrentRef.current) {
          stoppedEarlyRef.current = true;
          break;
        }
      }

      const combined = extractedBlocks.filter(Boolean).join("\n\n");
      const nextIndex = stoppedEarlyRef.current ? lastIndex + 1 : screenshots.length;
      const averageConfidence = confidenceScores.length
        ? Math.round(confidenceScores.reduce((s, v) => s + v, 0) / confidenceScores.length)
        : null;
      return { text: combined, stoppedEarly: stoppedEarlyRef.current, nextIndex, averageConfidence };
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
