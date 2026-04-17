import axios from "axios";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const apiClient = axios.create({
  baseURL: `${BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(cfg => {
  const token = localStorage.getItem("user_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

apiClient.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem("user_token");
      localStorage.removeItem("user_data");
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    apiClient.post("/auth/register", data).then(r => r.data),
  login: (data: { email: string; password: string }) =>
    apiClient.post("/auth/login", data).then(r => r.data),
  me: () => apiClient.get("/auth/me").then(r => r.data),
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; country?: string }) =>
    apiClient.patch("/auth/profile", data).then(r => r.data),
};

export const marketApi = {
  getMarkets: () => apiClient.get("/markets").then(r => r.data),
  getMarket: (symbol: string) => apiClient.get(`/markets/${symbol}`).then(r => r.data),
  getCoins: () => apiClient.get("/coins").then(r => r.data),
  getOrderbook: (symbol: string) => apiClient.get(`/orderbook/${symbol}`).then(r => r.data),
  getCandles: (symbol: string, count = 100) => apiClient.get(`/candles/${symbol}?count=${count}`).then(r => r.data),
  getTrades: (symbol: string) => apiClient.get(`/trades/${symbol}`).then(r => r.data),
};

export const walletApi = {
  getBalances: () => apiClient.get("/wallet/balances").then(r => r.data),
  getTransactions: () => apiClient.get("/wallet/transactions").then(r => r.data),
  getNetworks: (currency?: string) => apiClient.get(`/wallet/networks${currency ? `?currency=${currency}` : ""}`).then(r => r.data),
  depositCrypto: (data: { currency: string; network: string; amount: number; txHash?: string }) =>
    apiClient.post("/wallet/deposit/crypto", data).then(r => r.data),
  withdrawCrypto: (data: { currency: string; network: string; address: string; amount: number }) =>
    apiClient.post("/wallet/withdraw/crypto", data).then(r => r.data),
  depositInr: (data: { amount: number; method?: string; utr?: string }) =>
    apiClient.post("/wallet/deposit/inr", data).then(r => r.data),
  withdrawInr: (data: { amount: number }) =>
    apiClient.post("/wallet/withdraw/inr", data).then(r => r.data),
};

export const tradingApi = {
  getOrders: () => apiClient.get("/orders").then(r => r.data),
  placeOrder: (data: { pair: string; side: "buy" | "sell"; type: "market" | "limit"; price?: number; quantity: number }) =>
    apiClient.post("/orders", data).then(r => r.data),
  cancelOrder: (id: number) => apiClient.delete(`/orders/${id}`).then(r => r.data),
  getHistory: () => apiClient.get("/orders/history").then(r => r.data),
};

export const futuresApi = {
  getMarkets: () => apiClient.get("/futures/markets").then(r => r.data),
  getPositions: () => apiClient.get("/futures/positions").then(r => r.data),
};

export const userApi = {
  getStats: () => apiClient.get("/user/stats").then(r => r.data),
};
