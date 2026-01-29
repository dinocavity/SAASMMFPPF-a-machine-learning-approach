import { createContext, useContext } from "react";
import { useAnalysis as useAnalysisHook } from "@/hooks/useAnalysis";

const AnalysisContext = createContext(null);

export function AnalysisProvider({ children }) {
  const analysis = useAnalysisHook();
  return (
    <AnalysisContext.Provider value={analysis}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysisContext() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysisContext must be used within an AnalysisProvider");
  }
  return context;
}
