import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Tesseract from "tesseract.js";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const apiBaseUrl = import.meta.env.VITE_API_URL || "";
const tesseractBaseUrl = import.meta.env.VITE_TESSERACT_BASE_URL || "/tesseract";
const tesseractLangPath =
  import.meta.env.VITE_TESSERACT_LANG_PATH ||
  "https://tessdata.projectnaptha.com/4.0.0";

function App() {
  const api = useMemo(
    () =>
      axios.create({
        baseURL: apiBaseUrl,
      }),
    []
  );

  const [token, setToken] = useState(localStorage.getItem("auth_token") || "");
  const [user, setUser] = useState(null);
  const [loginData, setLoginData] = useState({
    username: "superadmin",
    password: "",
  });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [reviewText, setReviewText] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [ocrFile, setOcrFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState("");

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    api
      .get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => setUser(response.data))
      .catch(() => {
        setUser(null);
        setToken("");
        localStorage.removeItem("auth_token");
      });
  }, [token, api]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const params = new URLSearchParams();
      params.append("username", loginData.username);
      params.append("password", loginData.password);

      const response = await api.post("/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const accessToken = response.data.access_token;
      setToken(accessToken);
      localStorage.setItem("auth_token", accessToken);
      setLoginData((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      setLoginError("Login failed. Check your credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("auth_token");
  };

const scrollToReviews = () => {
  // For side panel, send message directly to the active tab's content script
  chrome.runtime.sendMessage({ action: "scrollToReviews" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError);
    }
  });
};


  const runOcr = async () => {
    if (!ocrFile) {
      setOcrError("Choose an image to run OCR.");
      return;
    }

    setOcrLoading(true);
    setOcrError("");
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(ocrFile, "eng", {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setOcrProgress(Math.round(message.progress * 100));
          }
        },
        workerBlobURL: false,
        workerPath: `${tesseractBaseUrl}/worker.min.js`,
        corePath: `${tesseractBaseUrl}/tesseract-core.wasm.js`,
        langPath: tesseractLangPath,
      });
      const extracted = result.data.text.trim();
      setReviewText(extracted);
    } catch (err) {
      setOcrError("OCR failed. Try a clearer screenshot.");
    } finally {
      setOcrLoading(false);
    }
  };

  const analyzeReview = async () => {
    if (!reviewText.trim()) {
      setError("Enter review text or run OCR.");
      return;
    }

    if (!token) {
      setError("Log in first.");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const response = await api.post(
        "/analyze",
        { text: reviewText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResults(response.data);
    } catch (err) {
      setError("Failed to analyze review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sentimentTone = (value) => {
    if (!value) return "secondary";
    if (value === "positive") return "default";
    if (value === "negative") return "outline";
    return "secondary";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-cyan-50 px-5 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 rounded-2xl border bg-white/70 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
                SAASMMFPPF
              </p>
              <h1 className="text-3xl font-semibold leading-tight">
                Sentiment & social monitoring for preventing purchase fraud.
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">OCR Client</Badge>
              <Badge>FastAPI + Postgres</Badge>
            </div>
          </div>
          <p className="max-w-3xl text-sm text-[hsl(var(--muted-foreground))]">
            Use the side-panel workflow to pull text from screenshots, compare two sentiment
            models, and validate authenticity. Access is gated by a single superadmin for now.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="border-none bg-white/80 shadow-lg">
            <CardHeader>
              <CardTitle>Review Intake</CardTitle>
              <CardDescription>
                Upload a screenshot or paste text manually, then run analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid gap-3 rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Screenshot OCR</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Client-side OCR runs in the browser. No scraping.
                    </p>
                  </div>
                  <Button onClick={scrollToReviews} variant="outline">
                    📍 Scroll to Reviews
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={runOcr}
                    disabled={ocrLoading}
                  >
                    {ocrLoading ? `Reading ${ocrProgress}%` : "Run OCR"}
                  </Button>
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setOcrFile(event.target.files?.[0] || null)}
                />
                {ocrError && (
                  <p className="text-xs text-red-600">{ocrError}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  placeholder="Paste or OCR review text..."
                />
                <Button onClick={analyzeReview} disabled={loading}>
                  {loading ? "Analyzing..." : "Analyze Review"}
                </Button>
                {error && <p className="text-xs text-red-600">{error}</p>}
              </div>

              {results && (
                <div className="grid gap-4">
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle>API Sentiment</CardTitle>
                      <CardDescription>Hosted transformer model</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <Badge variant={sentimentTone(results.sentiment_api?.sentiment)}>
                        {results.sentiment_api?.sentiment || "N/A"}
                      </Badge>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        Confidence:{" "}
                        {results.sentiment_api?.confidence
                          ? `${(results.sentiment_api.confidence * 100).toFixed(1)}%`
                          : "N/A"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle>Custom Sentiment</CardTitle>
                      <CardDescription>Fine-tuned local model</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <Badge
                        variant={sentimentTone(results.sentiment_custom?.sentiment)}
                      >
                        {results.sentiment_custom?.sentiment || "N/A"}
                      </Badge>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        Confidence:{" "}
                        {results.sentiment_custom?.confidence
                          ? `${(results.sentiment_custom.confidence * 100).toFixed(1)}%`
                          : "N/A"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle>Authenticity Check</CardTitle>
                      <CardDescription>Fraud classifier</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <Badge
                        variant={results.authenticity?.is_fake ? "outline" : "default"}
                      >
                        {results.authenticity?.is_fake ? "Likely Fake" : "Likely Authentic"}
                      </Badge>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        Confidence:{" "}
                        {results.authenticity?.confidence
                          ? `${(results.authenticity.confidence * 100).toFixed(1)}%`
                          : "N/A"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-fit border-none bg-white/90 shadow-lg">
            <CardHeader>
              <CardTitle>Superadmin Access</CardTitle>
              <CardDescription>Single user login for now.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {user ? (
                <div className="grid gap-3 rounded-xl border bg-white p-4">
                  <div>
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Superadmin: {user.is_superadmin ? "Yes" : "No"}
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleLogout}>
                    Log out
                  </Button>
                </div>
              ) : (
                <form className="grid gap-3" onSubmit={handleLogin}>
                  <Input
                    type="text"
                    value={loginData.username}
                    onChange={(event) =>
                      setLoginData((prev) => ({
                        ...prev,
                        username: event.target.value,
                      }))
                    }
                    placeholder="Username"
                  />
                  <Input
                    type="password"
                    value={loginData.password}
                    onChange={(event) =>
                      setLoginData((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Password"
                  />
                  <Button type="submit" disabled={loginLoading}>
                    {loginLoading ? "Signing in..." : "Sign in"}
                  </Button>
                  {loginError && (
                    <p className="text-xs text-red-600">{loginError}</p>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default App;
