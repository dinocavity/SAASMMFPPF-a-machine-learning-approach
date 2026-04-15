import { useState, useCallback, useRef } from "react";
import Tesseract from "tesseract.js";
import { TESSERACT_CONFIG } from "@/lib/constants";

async function preprocessImage(dataUrl, cropY = 0, scale = 1.0) {
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

      // Convert to grayscale + boost contrast so Tesseract reads text more accurately.
      // Tesseract operates internally on grayscale; feeding it a color image forces
      // internal conversion and leaves it vulnerable to color noise.
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      const contrast = 1.4; // 1.0 = no change, >1 = more contrast
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const adjusted = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
        d[i] = d[i + 1] = d[i + 2] = adjusted;
        // d[i+3] (alpha) unchanged
      }
      ctx.putImageData(imageData, 0, 0);

      // PNG: lossless after pixel processing — no JPEG re-compression artifacts
      resolve(canvas.toDataURL('image/png'));
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

    // currentIndex is a mutable variable captured by the logger closure so the
    // single worker can report per-image progress across the entire batch.
    let currentIndex = 0;

    // Create one worker for the whole batch.
    // OEM 1 = LSTM_ONLY — the neural engine is more accurate than the legacy one.
    const worker = await Tesseract.createWorker("eng", 1, {
      workerBlobURL: false,
      workerPath: `${TESSERACT_CONFIG.baseUrl}/worker.min.js`,
      corePath: `${TESSERACT_CONFIG.baseUrl}/tesseract-core.wasm.js`,
      langPath: TESSERACT_CONFIG.langPath,
      logger: (message) => {
        if (cancelRef.current) return;
        if (message.status === "recognizing text") {
          const itemProgress = Math.round(message.progress * 100);
          const overall = Math.round(
            ((currentIndex + message.progress) / screenshots.length) * 100
          );
          const currentProgress = Math.max(itemProgress, overall);
          setProgress(currentProgress);
          onProgress?.(currentProgress, currentIndex + 1, screenshots.length);
        }
      },
    });

    // PSM 6 = SINGLE_BLOCK — treat the image as a single uniform block of text.
    // This is far more reliable than the default PSM 3 (full auto-detect) for
    // review screenshots which are already a single column of text.
    await worker.setParameters({ tessedit_pageseg_mode: "6" });

    try {
      for (let index = 0; index < screenshots.length; index++) {
        if (cancelRef.current) {
          throw new Error("OCR cancelled");
        }

        currentIndex = index;
        const cropY = index === 0 ? firstCropY : 0;
        // 2x upscale before OCR: Tesseract accuracy improves significantly at
        // higher effective DPI — the extra resolution helps it distinguish
        // similar glyphs that get confused at native screen resolution.
        const processedImage = await preprocessImage(screenshots[index], cropY, 2.0);

        const result = await worker.recognize(processedImage);

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
      await worker.terminate();
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
