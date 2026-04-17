export const MOCK_COINS = [
  { symbol: "BTC", name: "Bitcoin", price: 64250.50, change24h: 2.5, volume: "32.5B", marketCap: "1.2T", holding: 0.15 },
  { symbol: "ETH", name: "Ethereum", price: 3180.20, change24h: -1.2, volume: "15.2B", marketCap: "380B", holding: 2.5 },
  { symbol: "BNB", name: "BNB", price: 580.40, change24h: 5.4, volume: "2.1B", marketCap: "85B", holding: 10 },
  { symbol: "SOL", name: "Solana", price: 142.60, change24h: 8.2, volume: "4.5B", marketCap: "65B", holding: 45 },
  { symbol: "ADA", name: "Cardano", price: 0.45, change24h: -0.5, volume: "350M", marketCap: "16B", holding: 0 },
  { symbol: "DOGE", name: "Dogecoin", price: 0.15, change24h: 12.5, volume: "1.2B", marketCap: "22B", holding: 0 },
  { symbol: "XRP", name: "XRP", price: 0.58, change24h: 0.2, volume: "900M", marketCap: "32B", holding: 0 },
  { symbol: "MATIC", name: "Polygon", price: 0.72, change24h: -2.1, volume: "250M", marketCap: "7B", holding: 0 },
  { symbol: "LINK", name: "Chainlink", price: 14.50, change24h: 1.5, volume: "400M", marketCap: "8.5B", holding: 0 },
  { symbol: "DOT", name: "Polkadot", price: 7.20, change24h: 3.2, volume: "180M", marketCap: "4.2B", holding: 0 }
];

export const generateMockCandles = (count = 100) => {
  let currentPrice = 64250;
  const data = [];
  const now = new Date().getTime();
  
  for (let i = count; i >= 0; i--) {
    const time = now - i * 3600000; // hourly
    const change = (Math.random() - 0.5) * 500;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * 200;
    const low = Math.min(open, close) - Math.random() * 200;
    const volume = Math.random() * 1000 + 500;
    
    data.push({
      time,
      dateStr: new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      open,
      high,
      low,
      close,
      volume
    });
    
    currentPrice = close;
  }
  
  return data;
};

export const generateOrderBook = () => {
  const currentPrice = 64250.50;
  const asks = [];
  const bids = [];
  
  let askTotal = 0;
  for (let i = 0; i < 15; i++) {
    const price = currentPrice + (i * 10.5) + Math.random() * 5;
    const amount = +(Math.random() * 2 + 0.01).toFixed(4);
    askTotal += amount;
    asks.push({ price: price.toFixed(2), amount: amount.toFixed(4), total: askTotal.toFixed(4), depth: Math.min((askTotal / 25) * 100, 100) });
  }
  
  let bidTotal = 0;
  for (let i = 0; i < 15; i++) {
    const price = currentPrice - (i * 10.5) - Math.random() * 5;
    const amount = +(Math.random() * 2 + 0.01).toFixed(4);
    bidTotal += amount;
    bids.push({ price: price.toFixed(2), amount: amount.toFixed(4), total: bidTotal.toFixed(4), depth: Math.min((bidTotal / 25) * 100, 100) });
  }
  
  return { asks: asks.reverse(), bids };
};

export type AdminCoin = {
  id: string;
  symbol: string;
  name: string;
  network: string;
  price: number;
  status: "Listed" | "Paused" | "Review";
  depositEnabled: boolean;
  withdrawalEnabled: boolean;
};

export type AdminPair = {
  id: string;
  base: string;
  quote: string;
  minOrder: number;
  maxLeverage: number;
  status: "Active" | "Paused";
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "User" | "Trader" | "Admin";
  kyc: "Verified" | "Pending" | "Rejected";
  status: "Active" | "Suspended";
  balance: number;
};

export type AdminFeeTier = {
  id: string;
  name: string;
  makerFee: number;
  takerFee: number;
  withdrawalFee: number;
  minVolume: number;
};

export const MOCK_ADMIN_COINS: AdminCoin[] = [
  { id: "coin-btc", symbol: "BTC", name: "Bitcoin", network: "Bitcoin", price: 64250.5, status: "Listed", depositEnabled: true, withdrawalEnabled: true },
  { id: "coin-eth", symbol: "ETH", name: "Ethereum", network: "ERC20", price: 3180.2, status: "Listed", depositEnabled: true, withdrawalEnabled: true },
  { id: "coin-sol", symbol: "SOL", name: "Solana", network: "Solana", price: 142.6, status: "Listed", depositEnabled: true, withdrawalEnabled: true },
  { id: "coin-xrp", symbol: "XRP", name: "XRP", network: "XRPL", price: 0.58, status: "Review", depositEnabled: false, withdrawalEnabled: false },
];

export const MOCK_ADMIN_PAIRS: AdminPair[] = [
  { id: "pair-btc-usdt", base: "BTC", quote: "USDT", minOrder: 10, maxLeverage: 125, status: "Active" },
  { id: "pair-eth-usdt", base: "ETH", quote: "USDT", minOrder: 10, maxLeverage: 100, status: "Active" },
  { id: "pair-sol-usdt", base: "SOL", quote: "USDT", minOrder: 5, maxLeverage: 50, status: "Active" },
  { id: "pair-xrp-usdt", base: "XRP", quote: "USDT", minOrder: 5, maxLeverage: 25, status: "Paused" },
];

export const MOCK_ADMIN_USERS: AdminUser[] = [
  { id: "user-001", name: "Maya Chen", email: "maya@example.com", role: "Admin", kyc: "Verified", status: "Active", balance: 84250.22 },
  { id: "user-002", name: "Arjun Patel", email: "arjun@example.com", role: "Trader", kyc: "Verified", status: "Active", balance: 12840.5 },
  { id: "user-003", name: "Sofia Reyes", email: "sofia@example.com", role: "User", kyc: "Pending", status: "Active", balance: 650.1 },
  { id: "user-004", name: "Noah Smith", email: "noah@example.com", role: "User", kyc: "Rejected", status: "Suspended", balance: 0 },
];

export const MOCK_FEE_TIERS: AdminFeeTier[] = [
  { id: "tier-starter", name: "Starter", makerFee: 0.1, takerFee: 0.1, withdrawalFee: 0.0005, minVolume: 0 },
  { id: "tier-pro", name: "Pro", makerFee: 0.075, takerFee: 0.085, withdrawalFee: 0.00035, minVolume: 50000 },
  { id: "tier-vip", name: "VIP", makerFee: 0.02, takerFee: 0.04, withdrawalFee: 0.0002, minVolume: 1000000 },
];
