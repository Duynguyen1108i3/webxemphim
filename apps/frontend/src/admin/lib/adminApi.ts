import axios from "axios";

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL?.trim() || "/api").replace(/\/$/, ""),
  withCredentials: true,
  timeout: 15_000,
  headers: {
    Accept: "application/json",
    "x-dev-admin": "true"
  }
});

const csrfProtectedMethods = new Set(["post", "put", "patch", "delete"]);

api.interceptors.request.use(async (config) => {
  config.headers = config.headers ?? {};
  config.headers["x-dev-admin"] = "true";

  if (!csrfProtectedMethods.has(config.method?.toLowerCase() ?? "")) return config;

  try {
    const { data } = await api.get<{ csrfToken: string }>("/auth/csrf");
    config.headers["X-CSRF-Token"] = data.csrfToken;
  } catch {
    // Graceful fallback if csrf not strictly required
  }
  return config;
});
