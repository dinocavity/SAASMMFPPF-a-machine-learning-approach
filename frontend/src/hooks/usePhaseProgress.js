import { useState, useCallback, useRef, useEffect } from "react";
import { PHASES } from "@/lib/constants";

/**
 * Hook for managing analysis phase progress state.
 * Extracted from useAnalysis for better maintainability.
 */
export function usePhaseProgress() {
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [phaseDetail, setPhaseDetail] = useState("");

  const phaseRef = useRef(PHASES.IDLE);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const resetPhase = useCallback(() => {
    setPhase(PHASES.IDLE);
    setPhaseProgress(0);
    setPhaseDetail("");
  }, []);

  const setPhaseState = useCallback((newPhase, progress = 0, detail = "") => {
    setPhase(newPhase);
    setPhaseProgress(progress);
    setPhaseDetail(detail);
  }, []);

  return {
    phase,
    setPhase,
    phaseProgress,
    setPhaseProgress,
    phaseDetail,
    setPhaseDetail,
    phaseRef,
    resetPhase,
    setPhaseState,
  };
}
