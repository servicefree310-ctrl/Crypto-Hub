import { Router, type IRouter } from "express";
import { asc, desc, eq, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { z } from "zod/v4";
import {
  adminCoinsTable,
  adminPairsTable,
  coinScheduleTable,
  cryptoDepositsTable,
  cryptoWithdrawalsTable,
  currenciesTable,
  currencyNetworksTable,
  db,
  futuresPairsTable,
  futuresPositionsTable,
  futuresSettingsTable,
  inrDepositsTable,
  inrWithdrawalsTable,
  marketPairsTable,
  marketSettingsTable,
  marketsTable,
  ordersTable,
  orderFillsTable,
  tradeHistoryTable,
  transactionsTable,
  usersTable,
  userProfilesTable,
  userSessionsTable,
  walletAddressesTable,
  walletBalancesTable,
  walletsTable,
  adminActivityTable,
} from "@workspace/db";

const router: IRouter = Router();

const authSecret = process.env.SESSION_SECRET ?? "dev-user-secret";

const signUserToken = (payload: Record<string, unknown>) => {
  const encoded = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString("base64url");
  const sig = crypto.createHmac("sha256", authSecret).update(encoded).digest("base64url");
  return `u.${encoded}.${sig}`;
};

const verifyUserToken = (token: string) => {
  if (!token.startsWith("u.")) return null;
  const [, encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac("sha256", authSecret).update(encoded).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { exp?: number; userId?: number; email?: string };
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
};

const requireUser = async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
  const token = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : "";
  const payload = token ? verifyUserToken(token) : null;
  if (!payload?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  if (!user || user.status === "Suspended") { res.status(401).json({ error: "Account suspended or not found" }); return; }
  (req as import("express").Request & { userId: number; userEmail: string }).userId = user.id;
  (req as import("express").Request & { userId: number; userEmail: string }).userEmail = user.email;
  next();
};

type AuthReq = import("express").Request & { userId: number; userEmail: string };

// ─── Seed initial market data if needed ──────────────────────────────────────
let marketSeeded = false;
const ensureMarketData = async () => {
  if (marketSeeded) return;
  marketSeeded = true;
  const existing = await db.select().from(marketPairsTable).limit(1);
  if (existing.length > 0) return;
  const pairs = [
    { base: "BTC", quote: "USDT", symbol: "BTCUSDT", minOrder: 0.0001, tickSize: 0.01, stepSize: 0.000001 },
    { base: "ETH", quote: "USDT", symbol: "ETHUSDT", minOrder: 0.001, tickSize: 0.01, stepSize: 0.00001 },
    { base: "BNB", quote: "USDT", symbol: "BNBUSDT", minOrder: 0.01, tickSize: 0.01, stepSize: 0.0001 },
    { base: "SOL", quote: "USDT", symbol: "SOLUSDT", minOrder: 0.01, tickSize: 0.001, stepSize: 0.001 },
    { base: "XRP", quote: "USDT", symbol: "XRPUSDT", minOrder: 1, tickSize: 0.0001, stepSize: 0.1 },
    { base: "ADA", quote: "USDT", symbol: "ADAUSDT", minOrder: 1, tickSize: 0.0001, stepSize: 0.1 },
    { base: "DOGE", quote: "USDT", symbol: "DOGEUSDT", minOrder: 1, tickSize: 0.00001, stepSize: 1 },
    { base: "DOT", quote: "USDT", symbol: "DOTUSDT", minOrder: 0.1, tickSize: 0.001, stepSize: 0.01 },
    { base: "AVAX", quote: "USDT", symbol: "AVAXUSDT", minOrder: 0.01, tickSize: 0.001, stepSize: 0.01 },
    { base: "LINK", quote: "USDT", symbol: "LINKUSDT", minOrder: 0.1, tickSize: 0.001, stepSize: 0.01 },
  ];
  await db.insert(marketPairsTable).values(pairs).onConflictDoNothing();
  const settings = pairs.map(p => ({ pair: p.symbol, makerFee: 0.1, takerFee: 0.1, tradingEnabled: true }));
  await db.insert(marketSettingsTable).values(settings).onConflictDoNothing();
};

// ─── Auth Routes ──────────────────────────────────────────────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  const body = z.object({ email: z.email(), password: z.string().min(8), firstName: z.string().optional(), lastName: z.string().optional() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, body.data.email)).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Email already registered" }); return; }
  const passwordHash = crypto.createHash("sha256").update(body.data.password + authSecret).digest("hex");
  const [user] = await db.insert(usersTable).values({ email: body.data.email, passwordHash }).returning();
  await db.insert(userProfilesTable).values({ userId: user.id, firstName: body.data.firstName ?? "", lastName: body.data.lastName ?? "" });
  const [wallet] = await db.insert(walletsTable).values({ userId: user.id, type: "spot" }).returning();
  const defaultCoins = ["USDT", "BTC", "ETH"];
  for (const currency of defaultCoins) {
    await db.insert(walletBalancesTable).values({ walletId: wallet.id, currency, available: currency === "USDT" ? 1000 : 0 }).onConflictDoNothing();
  }
  const token = signUserToken({ userId: user.id, email: user.email });
  res.status(201).json({ token, user: { id: user.id, email: user.email, status: user.status, kycStatus: user.kycStatus } });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const body = z.object({ email: z.email(), password: z.string().min(1) }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, body.data.email)).limit(1);
  const passwordHash = crypto.createHash("sha256").update(body.data.password + authSecret).digest("hex");
  if (!user || user.passwordHash !== passwordHash) { res.status(401).json({ error: "Invalid credentials" }); return; }
  if (user.status === "Suspended") { res.status(403).json({ error: "Account suspended" }); return; }
  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, user.id)).limit(1);
  const token = signUserToken({ userId: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, firstName: profile?.firstName ?? "", lastName: profile?.lastName ?? "", status: user.status, kycStatus: user.kycStatus } });
});

router.get("/auth/me", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, r.userId)).limit(1);
  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, r.userId)).limit(1);
  res.json({ id: user.id, email: user.email, firstName: profile?.firstName ?? "", lastName: profile?.lastName ?? "", status: user.status, kycStatus: user.kycStatus, createdAt: user.createdAt });
});

router.patch("/auth/profile", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const body = z.object({ firstName: z.string().optional(), lastName: z.string().optional(), phone: z.string().optional(), country: z.string().optional() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  await db.update(userProfilesTable).set(body.data).where(eq(userProfilesTable.userId, r.userId));
  const [p] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, r.userId)).limit(1);
  res.json(p);
});

// ─── Markets ──────────────────────────────────────────────────────────────────
router.get("/markets", async (_req, res): Promise<void> => {
  await ensureMarketData();
  const pairs = await db.select().from(marketPairsTable).where(eq(marketPairsTable.status, "Active")).orderBy(asc(marketPairsTable.symbol));
  const coins = await db.select().from(adminCoinsTable);
  const coinMap = new Map(coins.map(c => [c.symbol, c]));
  const PRICES: Record<string, number> = {
    BTC: 64250.50, ETH: 3180.20, BNB: 580.40, SOL: 142.60, XRP: 0.59,
    ADA: 0.45, DOGE: 0.168, DOT: 7.82, AVAX: 38.40, LINK: 14.80, USDT: 1.0,
  };
  const CHANGES: Record<string, number> = {
    BTC: 2.5, ETH: -1.2, BNB: 5.4, SOL: 8.2, XRP: 1.8, ADA: -0.5,
    DOGE: 3.1, DOT: -2.1, AVAX: 4.6, LINK: 1.2,
  };
  const result = pairs.map(p => {
    const coin = coinMap.get(p.base);
    const price = coin?.price ?? PRICES[p.base] ?? 0;
    const change24h = CHANGES[p.base] ?? 0;
    return {
      ...p,
      price,
      change24h,
      high24h: price * 1.03,
      low24h: price * 0.97,
      volume24h: Math.random() * 100000 + 5000,
      quoteVolume24h: price * (Math.random() * 100000 + 5000),
    };
  });
  res.json(result);
});

router.get("/markets/:symbol", async (req, res): Promise<void> => {
  await ensureMarketData();
  const [pair] = await db.select().from(marketPairsTable).where(eq(marketPairsTable.symbol, req.params.symbol.toUpperCase())).limit(1);
  if (!pair) { res.status(404).json({ error: "Market not found" }); return; }
  const [coin] = await db.select().from(adminCoinsTable).where(eq(adminCoinsTable.symbol, pair.base)).limit(1);
  const PRICES: Record<string, number> = { BTC: 64250.50, ETH: 3180.20, BNB: 580.40, SOL: 142.60, XRP: 0.59, ADA: 0.45, DOGE: 0.168, DOT: 7.82, AVAX: 38.40, LINK: 14.80 };
  const CHANGES: Record<string, number> = { BTC: 2.5, ETH: -1.2, BNB: 5.4, SOL: 8.2, XRP: 1.8, ADA: -0.5, DOGE: 3.1, DOT: -2.1, AVAX: 4.6, LINK: 1.2 };
  const price = coin?.price ?? PRICES[pair.base] ?? 0;
  const change24h = CHANGES[pair.base] ?? 0;
  res.json({ ...pair, price, change24h, high24h: price * 1.03, low24h: price * 0.97, volume24h: Math.random() * 100000 + 5000 });
});

router.get("/coins", async (_req, res): Promise<void> => {
  const coins = await db.select().from(adminCoinsTable).orderBy(asc(adminCoinsTable.symbol));
  const PRICES: Record<string, number> = { BTC: 64250.50, ETH: 3180.20, BNB: 580.40, SOL: 142.60, XRP: 0.59, ADA: 0.45, DOGE: 0.168, DOT: 7.82, AVAX: 38.40, LINK: 14.80, USDT: 1.0 };
  const CHANGES: Record<string, number> = { BTC: 2.5, ETH: -1.2, BNB: 5.4, SOL: 8.2, XRP: 1.8, ADA: -0.5, DOGE: 3.1, DOT: -2.1, AVAX: 4.6, LINK: 1.2 };
  res.json(coins.map(c => ({ ...c, price: c.price || PRICES[c.symbol] || 0, change24h: CHANGES[c.symbol] ?? 0 })));
});

router.get("/orderbook/:symbol", async (req, res): Promise<void> => {
  const sym = req.params.symbol.toUpperCase();
  const [pair] = await db.select().from(marketPairsTable).where(eq(marketPairsTable.symbol, sym)).limit(1);
  const PRICES: Record<string, number> = { BTCUSDT: 64250.50, ETHUSDT: 3180.20, BNBUSDT: 580.40, SOLUSDT: 142.60, XRPUSDT: 0.59, ADAUSDT: 0.45, DOGEUSDT: 0.168, DOTUSDT: 7.82, AVAXUSDT: 38.40, LINKUSDT: 14.80 };
  const basePrice = pair ? (PRICES[sym] ?? 100) : (PRICES[sym] ?? 100);
  const asks: Array<{ price: string; amount: string; total: string; depth: number }> = [];
  const bids: Array<{ price: string; amount: string; total: string; depth: number }> = [];
  let askTotal = 0, bidTotal = 0;
  const isCheap = basePrice < 1;
  for (let i = 0; i < 15; i++) {
    const p = basePrice + (i * basePrice * 0.001) + Math.random() * basePrice * 0.0005;
    const a = +(Math.random() * 2 + 0.01).toFixed(isCheap ? 0 : 4);
    askTotal += a;
    asks.push({ price: isCheap ? p.toFixed(6) : p.toFixed(2), amount: a.toFixed(isCheap ? 0 : 4), total: askTotal.toFixed(4), depth: Math.min((askTotal / 25) * 100, 100) });
  }
  for (let i = 0; i < 15; i++) {
    const p = basePrice - (i * basePrice * 0.001) - Math.random() * basePrice * 0.0005;
    const a = +(Math.random() * 2 + 0.01).toFixed(isCheap ? 0 : 4);
    bidTotal += a;
    bids.push({ price: isCheap ? p.toFixed(6) : p.toFixed(2), amount: a.toFixed(isCheap ? 0 : 4), total: bidTotal.toFixed(4), depth: Math.min((bidTotal / 25) * 100, 100) });
  }
  res.json({ symbol: sym, lastPrice: basePrice, asks, bids, timestamp: Date.now() });
});

router.get("/candles/:symbol", async (req, res): Promise<void> => {
  const sym = req.params.symbol.toUpperCase();
  const count = Math.min(Number(req.query.count) || 100, 500);
  const PRICES: Record<string, number> = { BTCUSDT: 64250.50, ETHUSDT: 3180.20, BNBUSDT: 580.40, SOLUSDT: 142.60, XRPUSDT: 0.59, ADAUSDT: 0.45, DOGEUSDT: 0.168, DOTUSDT: 7.82, AVAXUSDT: 38.40, LINKUSDT: 14.80 };
  let price = PRICES[sym] ?? 100;
  const candles = [];
  const now = Date.now();
  for (let i = count; i >= 0; i--) {
    const time = now - i * 3600000;
    const change = (Math.random() - 0.5) * price * 0.02;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    const volume = Math.random() * 500 + 50;
    candles.push({ time, open: +open.toFixed(4), high: +high.toFixed(4), low: +low.toFixed(4), close: +close.toFixed(4), volume: +volume.toFixed(2) });
    price = close;
  }
  res.json(candles);
});

router.get("/trades/:symbol", async (req, res): Promise<void> => {
  const sym = req.params.symbol.toUpperCase();
  const PRICES: Record<string, number> = { BTCUSDT: 64250.50, ETHUSDT: 3180.20, BNBUSDT: 580.40, SOLUSDT: 142.60, XRPUSDT: 0.59, ADAUSDT: 0.45, DOGEUSDT: 0.168, DOTUSDT: 7.82, AVAXUSDT: 38.40, LINKUSDT: 14.80 };
  const basePrice = PRICES[sym] ?? 100;
  const isCheap = basePrice < 1;
  const trades = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    price: (basePrice + (Math.random() - 0.5) * basePrice * 0.002).toFixed(isCheap ? 6 : 2),
    amount: (Math.random() * 2 + 0.001).toFixed(isCheap ? 0 : 4),
    side: Math.random() > 0.5 ? "buy" : "sell",
    time: new Date(Date.now() - i * 8000).toISOString(),
  }));
  res.json(trades);
});

// ─── Wallet ───────────────────────────────────────────────────────────────────
router.get("/wallet/balances", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  let [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, r.userId)).limit(1);
  if (!wallet) {
    [wallet] = await db.insert(walletsTable).values({ userId: r.userId, type: "spot" }).returning();
    await db.insert(walletBalancesTable).values({ walletId: wallet.id, currency: "USDT", available: 1000 });
  }
  const balances = await db.select().from(walletBalancesTable).where(eq(walletBalancesTable.walletId, wallet.id));
  const PRICES: Record<string, number> = { BTC: 64250.50, ETH: 3180.20, BNB: 580.40, SOL: 142.60, XRP: 0.59, ADA: 0.45, DOGE: 0.168, DOT: 7.82, AVAX: 38.40, LINK: 14.80, USDT: 1.0 };
  const COLORS: Record<string, string> = { BTC: "#F7931A", ETH: "#627EEA", BNB: "#F3BA2F", SOL: "#9945FF", XRP: "#00AAE4", ADA: "#0033AD", DOGE: "#C2A633", DOT: "#E6007A", AVAX: "#E84142", LINK: "#2A5ADA", USDT: "#26A17B" };
  const result = balances.map(b => ({
    ...b,
    usdValue: (b.available + b.locked) * (PRICES[b.currency] ?? 0),
    price: PRICES[b.currency] ?? 0,
    color: COLORS[b.currency] ?? "#888",
  }));
  const totalUsd = result.reduce((s, b) => s + b.usdValue, 0);
  res.json({ balances: result, totalUsd, walletId: wallet.id });
});

router.get("/wallet/transactions", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, r.userId)).orderBy(desc(transactionsTable.createdAt)).limit(50);
  res.json(txs);
});

router.get("/wallet/addresses", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const addrs = await db.select().from(walletAddressesTable).where(eq(walletAddressesTable.userId, r.userId));
  res.json(addrs);
});

router.post("/wallet/deposit/crypto", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const body = z.object({ currency: z.string().min(1), network: z.string().min(1), amount: z.coerce.number().positive(), txHash: z.string().optional() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [dep] = await db.insert(cryptoDepositsTable).values({ userId: r.userId, currency: body.data.currency, network: body.data.network, amount: body.data.amount, txHash: body.data.txHash ?? "", status: "Pending" }).returning();
  res.status(201).json(dep);
});

router.post("/wallet/withdraw/crypto", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const body = z.object({ currency: z.string().min(1), network: z.string().min(1), address: z.string().min(10), amount: z.coerce.number().positive() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, r.userId)).limit(1);
  if (!wallet) { res.status(400).json({ error: "Wallet not found" }); return; }
  const [balance] = await db.select().from(walletBalancesTable).where(eq(walletBalancesTable.walletId, wallet.id)).limit(1);
  if (!balance || balance.available < body.data.amount) { res.status(400).json({ error: "Insufficient balance" }); return; }
  await db.update(walletBalancesTable).set({ available: balance.available - body.data.amount }).where(eq(walletBalancesTable.walletId, wallet.id));
  const [wd] = await db.insert(cryptoWithdrawalsTable).values({ userId: r.userId, currency: body.data.currency, network: body.data.network, address: body.data.address, amount: body.data.amount, fee: body.data.amount * 0.001, status: "Pending" }).returning();
  res.status(201).json(wd);
});

router.post("/wallet/deposit/inr", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const body = z.object({ amount: z.coerce.number().positive().min(100), method: z.string().optional(), utr: z.string().optional() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [dep] = await db.insert(inrDepositsTable).values({ userId: r.userId, amount: body.data.amount, method: body.data.method ?? "UPI", utr: body.data.utr ?? "" }).returning();
  res.status(201).json(dep);
});

router.post("/wallet/withdraw/inr", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const body = z.object({ amount: z.coerce.number().positive().min(100) }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [wd] = await db.insert(inrWithdrawalsTable).values({ userId: r.userId, amount: body.data.amount, fee: 5 }).returning();
  res.status(201).json(wd);
});

router.get("/wallet/networks", async (req, res): Promise<void> => {
  const currency = (req.query.currency as string)?.toUpperCase();
  if (!currency) { const all = await db.select().from(currencyNetworksTable); res.json(all); return; }
  const nets = await db.select().from(currencyNetworksTable).where(eq(currencyNetworksTable.currencySymbol, currency));
  res.json(nets);
});

// ─── Trading ──────────────────────────────────────────────────────────────────
router.get("/orders", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, r.userId)).orderBy(desc(ordersTable.createdAt)).limit(50);
  res.json(orders);
});

router.post("/orders", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const body = z.object({ pair: z.string().min(1), side: z.enum(["buy", "sell"]), type: z.enum(["market", "limit"]), price: z.coerce.number().optional(), quantity: z.coerce.number().positive() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, r.userId)).limit(1);
  const [order] = await db.insert(ordersTable).values({ userId: r.userId, pair: body.data.pair, side: body.data.side, type: body.data.type, price: body.data.price ?? 0, quantity: body.data.quantity, filledQuantity: 0, status: body.data.type === "market" ? "Filled" : "Open" }).returning();
  if (wallet && body.data.type === "market") {
    const PRICES: Record<string, number> = { BTCUSDT: 64250.50, ETHUSDT: 3180.20, BNBUSDT: 580.40, SOLUSDT: 142.60, XRPUSDT: 0.59, ADAUSDT: 0.45 };
    const pairUpper = body.data.pair.toUpperCase();
    const price = body.data.price || PRICES[pairUpper] || 0;
    const base = pairUpper.replace("USDT", "");
    if (body.data.side === "buy") {
      const usdt = await db.select().from(walletBalancesTable).where(eq(walletBalancesTable.walletId, wallet.id)).limit(1);
      const cost = price * body.data.quantity;
      if (usdt[0] && usdt[0].available >= cost) {
        await db.update(walletBalancesTable).set({ available: usdt[0].available - cost }).where(eq(walletBalancesTable.walletId, wallet.id));
        const [existing] = await db.select().from(walletBalancesTable).where(eq(walletBalancesTable.walletId, wallet.id)).limit(1);
        if (!existing) await db.insert(walletBalancesTable).values({ walletId: wallet.id, currency: base, available: body.data.quantity });
        await db.insert(tradeHistoryTable).values({ userId: r.userId, pair: body.data.pair, side: "buy", price, quantity: body.data.quantity, fee: price * body.data.quantity * 0.001 });
      }
    }
  }
  res.status(201).json(order);
});

router.delete("/orders/:id", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
  if (!order || order.userId !== r.userId) { res.status(404).json({ error: "Order not found" }); return; }
  await db.update(ordersTable).set({ status: "Cancelled" }).where(eq(ordersTable.id, id));
  res.json({ success: true });
});

router.get("/orders/history", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const history = await db.select().from(tradeHistoryTable).where(eq(tradeHistoryTable.userId, r.userId)).orderBy(desc(tradeHistoryTable.createdAt)).limit(50);
  res.json(history);
});

// ─── Futures ──────────────────────────────────────────────────────────────────
router.get("/futures/markets", async (_req, res): Promise<void> => {
  const pairs = await db.select().from(futuresPairsTable).where(eq(futuresPairsTable.status, "Active"));
  if (pairs.length === 0) {
    const seed = [
      { symbol: "BTCUSDT", base: "BTC", quote: "USDT", maxLeverage: 125 },
      { symbol: "ETHUSDT", base: "ETH", quote: "USDT", maxLeverage: 100 },
      { symbol: "BNBUSDT", base: "BNB", quote: "USDT", maxLeverage: 50 },
      { symbol: "SOLUSDT", base: "SOL", quote: "USDT", maxLeverage: 50 },
    ];
    await db.insert(futuresPairsTable).values(seed).onConflictDoNothing();
    const refreshed = await db.select().from(futuresPairsTable).where(eq(futuresPairsTable.status, "Active"));
    const PRICES: Record<string, number> = { BTCUSDT: 64250.50, ETHUSDT: 3180.20, BNBUSDT: 580.40, SOLUSDT: 142.60 };
    res.json(refreshed.map(p => ({ ...p, price: PRICES[p.symbol] ?? 0, change24h: (Math.random() - 0.5) * 5, fundingRate: 0.0001 })));
    return;
  }
  const PRICES: Record<string, number> = { BTCUSDT: 64250.50, ETHUSDT: 3180.20, BNBUSDT: 580.40, SOLUSDT: 142.60 };
  res.json(pairs.map(p => ({ ...p, price: PRICES[p.symbol] ?? 0, change24h: (Math.random() - 0.5) * 5, fundingRate: 0.0001 })));
});

router.get("/futures/positions", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const positions = await db.select().from(futuresPositionsTable).where(eq(futuresPositionsTable.userId, r.userId)).orderBy(desc(futuresPositionsTable.createdAt));
  res.json(positions);
});

// ─── User Stats ───────────────────────────────────────────────────────────────
router.get("/user/stats", requireUser, async (req, res): Promise<void> => {
  const r = req as AuthReq;
  const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.userId, r.userId));
  const [tradeVol] = await db.select({ total: sql<number>`coalesce(sum(price * quantity), 0)` }).from(tradeHistoryTable).where(eq(tradeHistoryTable.userId, r.userId));
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, r.userId)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, r.userId)).limit(1);
  res.json({ totalOrders: orderCount?.count ?? 0, totalVolume: tradeVol?.total ?? 0, kycStatus: user?.kycStatus ?? "Pending", memberSince: user?.createdAt });
});

export default router;
