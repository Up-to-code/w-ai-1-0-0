import { useState, useEffect } from "react";
import { storage } from "../lib/storage";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await storage.getAuthToken();
      const id = await storage.getUserId();
      
      if (token && id) {
        setIsAuthenticated(true);
        setUserId(id);
      } else {
        setIsAuthenticated(false);
        setUserId(null);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (token: string, id: string) => {
    await storage.setAuthToken(token);
    await storage.setUserId(id);
    setIsAuthenticated(true);
    setUserId(id);
  };

  const logout = async () => {
    await storage.clearAuth();
    setIsAuthenticated(false);
    setUserId(null);
  };

  return {
    isAuthenticated,
    userId,
    loading,
    login,
    logout,
    checkAuth,
  };
}
