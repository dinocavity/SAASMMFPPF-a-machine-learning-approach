import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, setAuthHeader } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("auth_token") || "");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setAuthHeader(null);
      setLoading(false);
      return;
    }

    setAuthHeader(token);
    api
      .get("/auth/me")
      .then((response) => setUser(response.data))
      .catch(() => {
        setUser(null);
        setToken("");
        setAuthHeader(null);
        localStorage.removeItem("auth_token");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (username, password) => {
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);

    const response = await api.post("/auth/login", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const accessToken = response.data.access_token;
    setToken(accessToken);
    setAuthHeader(accessToken);
    localStorage.setItem("auth_token", accessToken);
    return response.data;
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setUser(null);
    setAuthHeader(null);
    localStorage.removeItem("auth_token");
  }, []);

  const value = {
    token,
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
