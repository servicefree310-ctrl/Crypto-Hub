import axios from "axios";
import { getToken } from "@/utils/auth";

export const api = axios.create({
  baseURL: `${import.meta.env.BASE_URL}api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function login(email: string, password: string) {
  const { data } = await api.post("/admin/login", { email, password });
  return data;
}

export async function getDashboardStats() {
  const { data } = await api.get("/admin/dashboard-stats");
  return data;
}

export async function listUsers() {
  const { data } = await api.get("/admin/users");
  return data;
}

export async function blockUser(id: number) {
  const { data } = await api.post("/admin/user/block", { id });
  return data;
}

export async function getRows(path: string) {
  const { data } = await api.get(path);
  return data;
}

export async function postAction(path: string, body: Record<string, unknown>) {
  const { data } = await api.post(path, body);
  return data;
}
