import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

// Lazy-loaded route components for code splitting
const HomePage = lazy(() => import("@/pages/HomePage").then(m => ({ default: m.HomePage })));
const ResultsPage = lazy(() => import("@/pages/ResultsPage").then(m => ({ default: m.ResultsPage })));
const ResultsDetailsPage = lazy(() => import("@/pages/ResultsDetailsPage").then(m => ({ default: m.ResultsDetailsPage })));
const HistoryPage = lazy(() => import("@/pages/HistoryPage").then(m => ({ default: m.HistoryPage })));
const AboutPage = lazy(() => import("@/pages/AboutPage").then(m => ({ default: m.AboutPage })));

// Loading fallback for lazy routes
function RouteLoadingFallback() {
  return (
    <div className="flex flex-col items-center gap-4 py-8 px-4 w-full max-w-lg mx-auto">
      <SkeletonText lines={2} className="w-full" />
      <SkeletonCard className="w-full" />
      <SkeletonCard className="w-full" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <MainLayout>
        <Navbar />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/results/details" element={<ResultsDetailsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </Suspense>
        <Toaster />
      </MainLayout>
    </ErrorBoundary>
  );
}

export default App;
