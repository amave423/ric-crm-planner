import { createContext, useState, useEffect, type ReactNode } from "react";
import client from "../api/client";
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
  login: (email: string, password: string) => Promise<boolean>;
  register: (u: Omit<User, "id">) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (u: Partial<User> & { id?: number }) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const USE_MOCK = client.USE_MOCK;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("currentUser");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (USE_MOCK) return;
    (async () => {
      try {
        const info = await client.get("/api/users/user-info/");
        setUser(info);
        localStorage.setItem("currentUser", JSON.stringify(info));
      } catch {
        try {
          const ok = await client.doRefresh();
          if (ok) {
            const info = await client.get("/api/users/user-info/");
            setUser(info);
            localStorage.setItem("currentUser", JSON.stringify(info));
          } else {
            setUser(null);
            localStorage.removeItem("currentUser");
          }
        } catch {
          setUser(null);
          localStorage.removeItem("currentUser");
        }
      }
    })();
  }, []);

  const getAllUsersMock = () => {
    const stored = JSON.parse(localStorage.getItem("users") || "[]");
    return [...baseUsers, ...stored];
  };

  const loginMock = async (email: string, password: string) => {
    const users = getAllUsersMock();
    const found = users.find((u: any) => u.email === email && u.password === password);
    if (!found) return false;
    setUser(found);
    localStorage.setItem("currentUser", JSON.stringify(found));
    return true;
  };

  const registerMock = async (u: Omit<User, "id">) => {
    const newUser = { ...u, id: Date.now() };
    const stored = JSON.parse(localStorage.getItem("users") || "[]");
    stored.push(newUser);
    localStorage.setItem("users", JSON.stringify(stored));
    localStorage.setItem("currentUser", JSON.stringify(newUser));
    setUser(newUser);
    return true;
  };

  const updateProfileMock = async (u: Partial<User> & { id?: number }) => {
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

  const logoutMock = async () => {
    setUser(null);
    localStorage.removeItem("currentUser");
  };

  const loginBackend = async (email: string, password: string) => {
    try {
      const info = await client.login(email, password);
      setUser(info);
      localStorage.setItem("currentUser", JSON.stringify(info));
      return true;
    } catch {
      return false;
    }
  };

  const registerBackend = async (u: Omit<User, "id">) => {
    try {
        const payload = {
        email: (u as any).email,
        first_name: (u as any).name || "",
        last_name: (u as any).surname || "",
        password: (u as any).password,
        password_confirmation: (u as any).confirm || (u as any).password,
        };
        await client.post("/api/users/register/", payload);
        return await loginBackend(payload.email, payload.password);
    } catch {
        return false;
    }
  };

  const updateProfileBackend = async (u: Partial<User> & { id?: number }) => {
    try {
      const updated = await client.put("/api/users/profile/", u);
      setUser(updated);
      localStorage.setItem("currentUser", JSON.stringify(updated));
    } catch {
    }
  };

  const logoutBackend = async () => {
    try {
      await client.logout();
    } catch {
    } finally {
      setUser(null);
      localStorage.removeItem("currentUser");
    }
  };

  const value: AuthContextType = USE_MOCK
    ? {
        user,
        login: loginMock,
        register: registerMock,
        logout: logoutMock,
        updateProfile: updateProfileMock,
      }
    : {
        user,
        login: loginBackend,
        register: registerBackend,
        logout: logoutBackend,
        updateProfile: updateProfileBackend,
      };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}