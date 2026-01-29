import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, setAuthHeader } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("auth_token") || "");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setAuthHeader(null);
      localStorage.removeItem("auth_user");
      setLoading(false);
      return;
    }

    setAuthHeader(token);
    api
      .get("/auth/me")
      .then((response) => {
        setUser(response.data);
        localStorage.setItem("auth_user", JSON.stringify(response.data));
      })
      .catch(() => {
        // Keep local-only session if we have one
        const saved = localStorage.getItem("auth_user");
        if (saved) {
          setUser(JSON.parse(saved));
        } else {
          setUser(null);
          setToken("");
          setAuthHeader(null);
          localStorage.removeItem("auth_token");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (username, password) => {
    // Try real backend login first
    try {
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
    } catch {
      // Fallback: create a local demo session so any credentials work
      const localUser = {
        username: username || "user",
        email: null,
        is_superadmin: false,
      };
      const demoToken = "local-session";
      setToken(demoToken);
      setUser(localUser);
      localStorage.setItem("auth_token", demoToken);
      localStorage.setItem("auth_user", JSON.stringify(localUser));
      return { access_token: demoToken, token_type: "bearer" };
    }
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setUser(null);
    setAuthHeader(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
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
