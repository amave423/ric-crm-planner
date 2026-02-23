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

type BackendUserRecord = Record<string, unknown>;
type MockUser = User & { password?: string; confirm?: string };
type ProfileUpdate = Partial<User> &
  Record<string, unknown> & {
    first_name?: string;
    last_name?: string;
    patronymic?: string;
    telegram?: string;
    course?: string;
    university?: string;
    vk?: string;
    job?: string;
  };

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (u: Omit<User, "id"> & { confirm?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (u: ProfileUpdate) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const USE_MOCK = client.USE_MOCK;

function mapBackendUser(data: unknown): User | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as BackendUserRecord;
  const profile = (obj.profile && typeof obj.profile === "object" ? obj.profile : {}) as BackendUserRecord;

  const idRaw = obj.id ?? obj.pk ?? null;
  const id =
    typeof idRaw === "number"
      ? idRaw
      : typeof idRaw === "string" && !Number.isNaN(Number(idRaw))
      ? Number(idRaw)
      : null;
  const email = String(obj.email ?? profile.email ?? "");
  const name = String(obj.firstName ?? obj.first_name ?? obj.name ?? profile.name ?? "");
  const surname = String(obj.lastName ?? obj.last_name ?? obj.surname ?? profile.surname ?? "");
  let role = "guest";
  if (typeof obj.role === "string") {
    role = obj.role;
  } else if (profile.crm_role) {
    const crm = String(profile.crm_role).toLowerCase();
    if (crm.includes("project") || crm.includes("projectant")) role = "student";
    else if (crm.includes("curator") || crm.includes("admin")) role = "organizer";
  } else if (obj.crm_role) {
    const crm = String(obj.crm_role).toLowerCase();
    if (crm.includes("project") || crm.includes("projectant")) role = "student";
    else if (crm.includes("curator") || crm.includes("admin")) role = "organizer";
  } else {
    role = obj.is_staff ? "organizer" : "student";
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
    const stored = JSON.parse(localStorage.getItem("users") || "[]") as MockUser[];
    return [...(baseUsers as MockUser[]), ...stored];
  };

  const loginMock = async (email: string, password: string) => {
    const users = getAllUsersMock();
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) return false;
    setUser(found);
    localStorage.setItem("currentUser", JSON.stringify(found));
    return true;
  };

  const registerMock = async (u: Omit<User, "id"> & { confirm?: string }) => {
    const newUser: MockUser = { ...u, id: Date.now() };
    const stored = JSON.parse(localStorage.getItem("users") || "[]") as MockUser[];
    stored.push(newUser);
    localStorage.setItem("users", JSON.stringify(stored));
    localStorage.setItem("currentUser", JSON.stringify(newUser));
    setUser(newUser);
    return true;
  };

  const updateProfileMock = async (u: ProfileUpdate) => {
    if (!user) return;
    const updated: MockUser = { ...user, ...u };
    setUser(updated);
    localStorage.setItem("currentUser", JSON.stringify(updated));
    const stored = JSON.parse(localStorage.getItem("users") || "[]") as MockUser[];
    const idx = stored.findIndex((s) => s.id === updated.id);
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
        email: u.email,
        first_name: u.name || "",
        last_name: u.surname || "",
        password: u.password || "",
        password_confirmation: u.confirm || u.password || "",
      };
      await client.post("/api/users/register/", payload);
      return await loginBackend(payload.email, payload.password);
    } catch {
      return false;
    }
  };

  const updateProfileBackend = async (u: ProfileUpdate) => {
    try {
      const allowed: Array<keyof ProfileUpdate> = [
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
      const payload: Record<string, unknown> = {};
      allowed.forEach((k) => {
        const value = u[k];
        if (typeof value !== "undefined") payload[String(k)] = value;
      });

      if (typeof u.first_name !== "undefined") payload["name"] = u.first_name;
      if (typeof u.last_name !== "undefined") payload["surname"] = u.last_name;

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
