import axios from "axios";

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL?.trim() || "/api").replace(/\/$/, ""),
  withCredentials: true,
  timeout: 15_000,
  headers: { Accept: "application/json" }
});
