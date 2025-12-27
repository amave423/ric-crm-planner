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
  register: (u: Omit<User, "id"> & { confirm?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (u: Partial<User> & Record<string, any>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const USE_MOCK = client.USE_MOCK;

function mapBackendUser(data: any): User | null {
  if (!data) return null;

  const id = data.id ?? data.pk ?? null;
  const email = data.email ?? (data.profile && data.profile.email) ?? "";
  const name =
    data.first_name ??
    data.name ??
    (data.profile && data.profile.name) ??
    "";
  const surname =
    data.last_name ??
    data.surname ??
    (data.profile && data.profile.surname) ??
    "";
  let role = "guest";
  if (typeof data.role === "string") {
    role = data.role;
  } else if (data.profile && data.profile.crm_role) {
    const crm = String(data.profile.crm_role).toLowerCase();
    if (crm.includes("project") || crm.includes("projectant")) role = "student";
    else if (crm.includes("curator") || crm.includes("admin")) role = "organizer";
  } else if (data.crm_role) {
    const crm = String(data.crm_role).toLowerCase();
    if (crm.includes("project") || crm.includes("projectant")) role = "student";
    else if (crm.includes("curator") || crm.includes("admin")) role = "organizer";
  } else {
    role = data.is_staff ? "organizer" : "student";
  }

  if (id == null) return null;

  return {
    id,
    email,
    name,
    surname,
    role,
  };
}

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
        const mapped = mapBackendUser(info);
        setUser(mapped);
        if (mapped) localStorage.setItem("currentUser", JSON.stringify(mapped));
        else localStorage.removeItem("currentUser");
      } catch {
        try {
          const ok = await client.doRefresh();
          if (ok) {
            const info = await client.get("/api/users/user-info/");
            const mapped = mapBackendUser(info);
            setUser(mapped);
            if (mapped) localStorage.setItem("currentUser", JSON.stringify(mapped));
            else localStorage.removeItem("currentUser");
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

  const registerMock = async (u: Omit<User, "id"> & { confirm?: string }) => {
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
      const mapped = mapBackendUser(info);
      setUser(mapped);
      if (mapped) localStorage.setItem("currentUser", JSON.stringify(mapped));
      else localStorage.removeItem("currentUser");
      return true;
    } catch {
      return false;
    }
  };

  const registerBackend = async (u: Omit<User, "id"> & { confirm?: string }) => {
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

  const updateProfileBackend = async (u: Partial<User> & Record<string, any>) => {
    try {
      const allowed = [
        "surname",
        "name",
        "patronymic",
        "telegram",
        "email",
        "course",
        "university",
        "vk",
        "job",
      ];
      const payload: Record<string, any> = {};
      allowed.forEach((k) => {
        if (k in u && typeof (u as any)[k] !== "undefined") payload[k] = (u as any)[k];
      });

      if ("first_name" in u) payload["name"] = (u as any)["first_name"];
      if ("last_name" in u) payload["surname"] = (u as any)["last_name"];

      await client.put("/api/users/profile/", payload);
      try {
        const info = await client.get("/api/users/user-info/");
        const mapped = mapBackendUser(info);
        setUser(mapped);
        if (mapped) localStorage.setItem("currentUser", JSON.stringify(mapped));
        else localStorage.removeItem("currentUser");
      } catch {
        const partial = { ...user, ...(payload.name ? { name: payload.name } : {}), ...(payload.surname ? { surname: payload.surname } : {}) };
        setUser(partial as User);
        if (partial) localStorage.setItem("currentUser", JSON.stringify(partial));
      }
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