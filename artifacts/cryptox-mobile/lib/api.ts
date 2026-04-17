import Constants from "expo-constants";

function getBaseUrl(): string {
  const devDomain = process.env.EXPO_PUBLIC_DEV_DOMAIN ?? Constants.expoConfig?.extra?.devDomain;
  if (devDomain) return `https://${devDomain}/api`;
  const replitDev = process.env.REPLIT_DEV_DOMAIN;
  if (replitDev) return `https://${replitDev}/api`;
  return "http://localhost:8080/api";
}

const BASE_URL = getBaseUrl();

let _token: string | null = null;

export function setToken(t: string | null) { _token = t; }
export function getToken() { return _token; }

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers as Record<string, string> ?? {}) };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data?.error ?? "Request failed"), { status: res.status, data });
  return data;
}

export const authApi = {
  register: (body: { email: string; password: string; firstName?: string }) =>
    request<{ token: string; user: any }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: any }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<any>("/auth/me"),
};

export const marketApi = {
  getMarkets: () => request<any[]>("/markets"),
  getCandles: (symbol: string, count = 100) => request<any[]>(`/candles/${symbol}?count=${count}`),
  getOrderbook: (symbol: string) => request<any>(`/orderbook/${symbol}`),
  getTrades: (symbol: string) => request<any[]>(`/trades/${symbol}`),
};

export const walletApi = {
  getBalances: () => request<{ balances: any[]; totalUsd: number }>("/wallet/balances"),
  getTransactions: () => request<any[]>("/wallet/transactions"),
  withdrawCrypto: (body: { currency: string; network: string; address: string; amount: number }) =>
    request<any>("/wallet/withdraw/crypto", { method: "POST", body: JSON.stringify(body) }),
  depositCrypto: (body: { currency: string; network: string; amount: number; txHash?: string }) =>
    request<any>("/wallet/deposit/crypto", { method: "POST", body: JSON.stringify(body) }),
};

export const tradingApi = {
  getOrders: () => request<any[]>("/orders"),
  placeOrder: (body: { pair: string; side: "buy" | "sell"; type: "market" | "limit"; price?: number; quantity: number }) =>
    request<any>("/orders", { method: "POST", body: JSON.stringify(body) }),
  cancelOrder: (id: number) => request<any>(`/orders/${id}`, { method: "DELETE" }),
  getHistory: () => request<any[]>("/orders/history"),
};

export const futuresApi = {
  getMarkets: () => request<any[]>("/futures/markets"),
  getPositions: () => request<any[]>("/futures/positions"),
};

export const userApi = {
  getStats: () => request<any>("/user/stats"),
};
