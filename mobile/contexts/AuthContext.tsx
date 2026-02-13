import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { storage, UserRole } from "../lib/storage";

type AuthContextType = {
  isAuthenticated: boolean | null;
  userId: string | null;
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  login: (token: string, id: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === "admin";

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await storage.getAuthToken();
      const id = await storage.getUserId();
      const userRole = await storage.getUserRole();

      if (token && id) {
        setIsAuthenticated(true);
        setUserId(id);
        setRoleState(userRole || "user");
      } else {
        setIsAuthenticated(false);
        setUserId(null);
        setRoleState(null);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (token: string, id: string, userRole: UserRole = "user") => {
    await storage.setAuthToken(token);
    await storage.setUserId(id);
    await storage.setUserRole(userRole);
    setIsAuthenticated(true);
    setUserId(id);
    setRoleState(userRole);
  };

  const setRole = async (newRole: UserRole) => {
    await storage.setUserRole(newRole);
    setRoleState(newRole);
  };

  const logout = async () => {
    await storage.clearAuth();
    setIsAuthenticated(false);
    setUserId(null);
    setRoleState(null);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userId, 
      role, 
      isAdmin, 
      loading, 
      login, 
      logout,
      setRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
