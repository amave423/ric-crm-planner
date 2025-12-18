import { createContext, useState, type ReactNode, useEffect } from "react";
import baseUsers from "../mock-data/users.json";

interface User {
  id: number;
  email: string;
  name: string;
  surname: string;
  role: string;
  password?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  register: (u: Omit<User, "id">) => boolean;
  logout: () => void;
  updateProfile: (u: Partial<User> & { id?: number }) => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("currentUser");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const getAllUsers = () => {
    const stored = JSON.parse(localStorage.getItem("users") || "[]");
    return [...baseUsers, ...stored];
  };

  const login = (email: string, password: string) => {
    const users = getAllUsers();
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) return false;
    setUser(found);
    localStorage.setItem("currentUser", JSON.stringify(found));
    return true;
  };

  const register = (u: Omit<User, "id">) => {
    const newUser = { ...u, id: Date.now() };
    const stored = JSON.parse(localStorage.getItem("users") || "[]");
    stored.push(newUser);
    localStorage.setItem("users", JSON.stringify(stored));
    localStorage.setItem("currentUser", JSON.stringify(newUser));
    setUser(newUser);
    return true;
  };

  const updateProfile = (u: Partial<User> & { id?: number }) => {
    if (!user) return;
    const updated = { ...user, ...u };
    setUser(updated);
    localStorage.setItem("currentUser", JSON.stringify(updated));
    const stored = JSON.parse(localStorage.getItem("users") || "[]");
    const idx = stored.findIndex((s: any) => s.id === updated.id);
    if (idx >= 0) stored[idx] = updated;
    else stored.push(updated);
    localStorage.setItem("users", JSON.stringify(stored));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("currentUser");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}