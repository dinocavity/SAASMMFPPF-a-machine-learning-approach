import { useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export function useApi() {
  const { token } = useAuth();

  const request = useCallback(
    async (config) => {
      const headers = {
        ...config.headers,
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      return api({
        ...config,
        headers,
      });
    },
    [token]
  );

  const get = useCallback(
    (url, config = {}) => request({ ...config, method: "GET", url }),
    [request]
  );

  const post = useCallback(
    (url, data, config = {}) => request({ ...config, method: "POST", url, data }),
    [request]
  );

  return { request, get, post, api };
}
