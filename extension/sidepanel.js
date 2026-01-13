const ocrTextEl = document.getElementById("ocrText");
const resultsEl = document.getElementById("results");
const imageInputEl = document.getElementById("imageInput");
const previewEl = document.getElementById("preview");

// OCR + backend analysis
async function runAnalysis(file) {
  if (!file || !file.type.startsWith("image/")) {
    alert("Please upload or paste a valid image file.");
    return;
  }

  // Show preview
  previewEl.src = URL.createObjectURL(file);

  ocrTextEl.innerText = "Processing OCR...";
  resultsEl.innerHTML = "";

  try {
    const { data } = await Tesseract.recognize(file, "eng");
    const text = data.text.trim();
    ocrTextEl.innerText = text || "No text detected";

    if (!text) {
      resultsEl.innerText = "No text found in the image.";
      return;
    }

    resultsEl.innerText = "Analyzing text with backend...";

    const res = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!res.ok) throw new Error("Backend error");

    const dataRes = await res.json();
    resultsEl.innerHTML = `
      <p><strong>API Sentiment:</strong> ${dataRes.sentiment_api.label}</p>
      <p><strong>Custom Sentiment:</strong> ${dataRes.sentiment_custom.label}</p>
      <p><strong>Authenticity Risk:</strong> ${dataRes.authenticity.risk}</p>
    `;
  } catch (err) {
    console.error(err);
    resultsEl.innerText = "Error during analysis. Make sure backend is running.";
  }
}

// File input
document.getElementById("analyzeBtn").addEventListener("click", () => {
  const file = imageInputEl.files[0];
  runAnalysis(file);
});

// Paste from clipboard
document.addEventListener("paste", e => {
  const items = e.clipboardData.items;
  for (let item of items) {
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      runAnalysis(file);
      break;
    }
  }
});
