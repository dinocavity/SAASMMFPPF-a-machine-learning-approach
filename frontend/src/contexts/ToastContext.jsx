import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, description, variant = "default", duration = 5000 }) => {
    const id = ++toastId;
    const toast = { id, title, description, variant };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options) => {
      if (typeof options === "string") {
        return addToast({ description: options });
      }
      return addToast(options);
    },
    [addToast]
  );

  toast.success = (message) =>
    addToast({
      title: "Success",
      description: message,
      variant: "success",
    });

  toast.error = (message) =>
    addToast({
      title: "Error",
      description: message,
      variant: "destructive",
    });

  toast.info = (message) =>
    addToast({
      title: "Info",
      description: message,
      variant: "default",
    });

  const value = {
    toasts,
    toast,
    addToast,
    removeToast,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
