import { Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/toaster";
import { HomePage } from "@/pages/HomePage";
import { ResultsPage } from "@/pages/ResultsPage";
import { ResultsDetailsPage } from "@/pages/ResultsDetailsPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { AboutPage } from "@/pages/AboutPage";

function App() {
  return (
    <MainLayout>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/results/details" element={<ResultsDetailsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
      <Toaster />
    </MainLayout>
  );
}

export default App;
