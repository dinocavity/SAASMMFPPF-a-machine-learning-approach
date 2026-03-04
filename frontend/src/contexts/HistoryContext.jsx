import { createContext, useContext } from "react";
import { useHistory } from "@/hooks/useHistory";

const HistoryContext = createContext(null);

export function HistoryProvider({ children }) {
  const history = useHistory();
  return (
    <HistoryContext.Provider value={history}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistoryContext() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error("useHistoryContext must be used within a HistoryProvider");
  }
  return context;
}
