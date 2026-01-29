import { Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/ui/toaster";
import { HomePage } from "@/pages/HomePage";
import { ResultsPage } from "@/pages/ResultsPage";
import { AccountPage } from "@/pages/AccountPage";

function App() {
  return (
    <MainLayout>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Routes>
      <Toaster />
    </MainLayout>
  );
}

export default App;
