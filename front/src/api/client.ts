const API_BASE = (import.meta as any).env.VITE_API_BASE || "";
const USE_MOCK = (import.meta as any).env.VITE_USE_MOCK === "true";

function getCookie(name: string) {
  const match = document.cookie.split("; ").find((s) => s.trim().startsWith(name + "="));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function toCamel(s: string) {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function transformSpecial(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(transformSpecial);

  const res: any = {};
  for (const k of Object.keys(obj)) {
    const nk = toCamel(k);
    res[nk] = transformSpecial(obj[k]);
  }

  if ("name" in res && ( "startDate" in res || "stage" in res || "endDate" in res || "eventId" in res || "directionId" in res )) {
    res.title = res.name;
    delete res.name;
  }
  if ("name" in res && !("startDate" in res) && !("questionCount" in res)) {
    res.title = res.name;
    delete res.name;
  }
  if ("endAppDate" in res && !("applyDeadline" in res)) {
    res.applyDeadline = res.endAppDate;
    delete res.endAppDate;
  }
  if ("event" in res && (typeof res.event === "number" || typeof res.event === "string")) {
    res.eventId = Number(res.event);
    delete res.event;
  }
  if ("direction" in res && (typeof res.direction === "number" || typeof res.direction === "string")) {
    res.directionId = Number(res.direction);
    delete res.direction;
  }
  if ("project" in res && (typeof res.project === "number" || typeof res.project === "string")) {
    res.projectId = Number(res.project);
  }
  if ("leader" in res && (typeof res.leader === "number" || typeof res.leader === "string")) {
    res.organizer = Number(res.leader);
    delete res.leader;
  }
  if ("curator" in res && (typeof res.curator === "number" || typeof res.curator === "string")) {
    res.curator = Number(res.curator);
  }
  if ("message" in res && !("about" in res)) {
    res.about = res.message;
    delete res.message;
  }
  if ("dateSub" in res && !("createdAt" in res)) {
    res.createdAt = res.dateSub;
    delete res.dateSub;
  }
  if ("user" in res && (typeof res.user === "number" || typeof res.user === "string")) {
    res.ownerId = Number(res.user);
  }
  if ("status" in res && typeof res.status === "object" && res.status !== null) {
    res.status = res.status.name ?? res.status;
  }
  return res;
}

async function parseResponse(res: Response) {
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
  return transformSpecial(data);
}

let refreshingPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (refreshingPromise) return refreshingPromise;
  refreshingPromise = (async () => {
    try {
      const r = await fetch(API_BASE + "/api/users/refresh/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      refreshingPromise = null;
      return r.ok;
    } catch {
      refreshingPromise = null;
      return false;
    }
  })();
  return refreshingPromise;
}

async function request(path: string, options: RequestInit = {}) {
  if (USE_MOCK) throw new Error("client.request: called in mock mode (switch to backend in AuthContext).");

  const url = API_BASE + path;
  const init: RequestInit = {
    credentials: "include",
    headers: { ...(options.headers || {}), "Content-Type": "application/json" },
    ...options,
  };

  const method = (init.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrf = getCookie("csrftoken");
    if (csrf) (init.headers as any)["X-CSRFToken"] = csrf;
  }

  if (init.body && typeof init.body !== "string") {
    init.body = JSON.stringify(init.body);
  }

  let res = await fetch(url, init);

  if (res.status === 401) {
    const ok = await doRefresh();
    if (ok) {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        const csrf = getCookie("csrftoken");
        if (csrf) (init.headers as any)["X-CSRFToken"] = csrf;
      }
      res = await fetch(url, init);
    }
  }

  const data = await parseResponse(res);
  if (!res.ok) {
    const err = data || { message: res.statusText || "Request failed" };
    throw err;
  }
  return data;
}

async function get(path: string) {
  return request(path, { method: "GET" });
}

async function post(path: string, body?: any) {
  return request(path, { method: "POST", body });
}

async function put(path: string, body?: any) {
  return request(path, { method: "PUT", body });
}

async function del(path: string) {
  return request(path, { method: "DELETE" });
}

async function login(email: string, password: string) {
  if (USE_MOCK) throw new Error("client.login: mock mode");
  await post("/api/users/login/", { email, password });
  const info = await get("/api/users/user-info/");
  return info;
}

async function logout() {
  if (USE_MOCK) throw new Error("client.logout: mock mode");
  await post("/api/users/logout/");
  return true;
}

export default {
  API_BASE,
  USE_MOCK,
  request,
  get,
  post,
  put,
  del,
  login,
  logout,
  doRefresh,
};