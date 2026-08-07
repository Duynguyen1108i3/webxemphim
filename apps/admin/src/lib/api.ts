import axios from "axios";

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL?.trim() || "/api").replace(/\/$/, ""),
  withCredentials: true,
  timeout: 15_000,
  headers: { Accept: "application/json" }
});

const csrfProtectedMethods = new Set(["post", "put", "patch", "delete"]);

api.interceptors.request.use(async (config) => {
  if (!csrfProtectedMethods.has(config.method?.toLowerCase() ?? "")) return config;

  const { data } = await api.get<{ csrfToken: string }>("/auth/csrf");
  config.headers = config.headers ?? {};
  config.headers["X-CSRF-Token"] = data.csrfToken;
  return config;
});
