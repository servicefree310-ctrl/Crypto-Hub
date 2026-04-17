import { Router, type IRouter } from "express";
import { asc, count, desc, eq, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { z } from "zod/v4";
import {
  adminActivityTable,
  adminCoinsTable,
  adminFeeTiersTable,
  adminLogsTable,
  adminPairsTable,
  adminUsersTable,
  auditLogsTable,
  balanceHistoryTable,
  bankAccountsTable,
  blockchainLogsTable,
  commissionsTable,
  cryptoDepositsTable,
  cryptoWithdrawalsTable,
  currenciesTable,
  currencyNetworksTable,
  deviceLogsTable,
  db,
  emailLogsTable,
  feesTable,
  fundingPaymentsTable,
  fundingRatesTable,
  futuresAccountsTable,
  futuresBalancesTable,
  futuresMarketsTable,
  futuresOrderFillsTable,
  futuresOrdersTable,
  futuresPairsTable,
  futuresPositionsTable,
  futuresSettingsTable,
  futuresTradesTable,
  inrDepositsTable,
  inrWithdrawalsTable,
  insuranceFundTable,
  ipLogsTable,
  kycRequestsTable,
  ledgerEntriesTable,
  liquidationsTable,
  marginAccountsTable,
  marginInterestTable,
  marginLoansTable,
  marketPairsTable,
  marketSettingsTable,
  marketsTable,
  notificationsTable,
  orderBooksTable,
  orderFillsTable,
  ordersTable,
  paymentGatewaysTable,
  paymentMethodsTable,
  permissionsTable,
  positionHistoryTable,
  promoCodesTable,
  referralRewardsTable,
  referralsTable,
  rolePermissionsTable,
  rolesTable,
  securityEventsTable,
  smsLogsTable,
  systemSettingsTable,
  tradeHistoryTable,
  tradesTable,
  transactionsTable,
  upiAccountsTable,
  user2faTable,
  userLoginHistoryTable,
  userProfilesTable,
  userRolesTable,
  userSessionsTable,
  userSettingsTable,
  usersTable,
  walletAddressesTable,
  walletBalancesTable,
  walletsTable,
  withdrawalApprovalsTable,
} from "@workspace/db";
import {
  CreateAdminCoinBody,
  CreateAdminPairBody,
  CreateAdminUserBody,
  DeleteAdminCoinParams,
  DeleteAdminPairParams,
  DeleteAdminUserParams,
  GetAdminOverviewResponse,
  ListAdminActivityResponse,
  ListAdminCoinsResponseItem,
  ListAdminCoinsResponse,
  ListAdminFeeTiersResponse,
  ListAdminPairsResponseItem,
  ListAdminPairsResponse,
  ListAdminUsersResponseItem,
  ListAdminUsersResponse,
  UpdateAdminFeeTierBody,
  UpdateAdminFeeTierParams,
  UpdateAdminFeeTierResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const PatchAdminCoinBody = z.object({
  name: z.string().optional(),
  network: z.string().optional(),
  price: z.coerce.number().optional(),
  status: z.enum(["Listed", "Paused", "Review"]).optional(),
  depositEnabled: z.boolean().optional(),
  withdrawalEnabled: z.boolean().optional(),
});

const PatchAdminUserBody = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  role: z.enum(["User", "Trader", "Admin"]).optional(),
  kyc: z.enum(["Verified", "Pending", "Rejected"]).optional(),
  status: z.enum(["Active", "Suspended"]).optional(),
  balance: z.coerce.number().optional(),
});

const NetworkBody = z.object({
  currencySymbol: z.string(),
  network: z.string(),
  chainId: z.string().optional(),
  contractAddress: z.string().optional(),
  minDeposit: z.coerce.number().optional(),
  minWithdrawal: z.coerce.number().optional(),
  withdrawalFee: z.coerce.number().optional(),
  confirmations: z.coerce.number().int().optional(),
  depositEnabled: z.boolean().optional(),
  withdrawalEnabled: z.boolean().optional(),
  status: z.string().optional(),
});

const SettingBody = z.object({
  key: z.string(),
  value: z.string(),
  type: z.string().optional(),
  group: z.string().optional(),
});

const PaymentMethodBody = z.object({
  name: z.string(),
  type: z.string().optional(),
  provider: z.string().optional(),
  status: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const PaymentGatewayBody = z.object({
  name: z.string(),
  provider: z.string(),
  mode: z.string().optional(),
  status: z.string().optional(),
  priority: z.coerce.number().int().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const AdminLoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const IdBody = z.object({
  id: z.coerce.number().int().positive(),
});

const ApprovalBody = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(["Approved", "Rejected"]).default("Approved"),
  reason: z.string().optional(),
});

const MarketToggleBody = z.object({
  id: z.coerce.number().int().positive(),
});

const RoleBody = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

const authSecret = process.env.ADMIN_JWT_SECRET ?? process.env.SESSION_SECRET ?? "dev-admin-secret";

const signToken = (payload: Record<string, unknown>) => {
  const encoded = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString("base64url");
  const signature = crypto.createHmac("sha256", authSecret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
};

const verifyToken = (token: string) => {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", authSecret).update(encoded).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { exp?: number; role?: string; email?: string };
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
};

const readAdminAuth = (header: string | undefined) => {
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  return token ? verifyToken(token) : null;
};

let seedPromise: Promise<void> | null = null;

const toIso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value);

const coinResponse = (coin: typeof adminCoinsTable.$inferSelect) => ({
  ...coin,
  createdAt: toIso(coin.createdAt),
});

const pairResponse = (pair: typeof adminPairsTable.$inferSelect) => ({
  ...pair,
  createdAt: toIso(pair.createdAt),
});

const userResponse = (user: typeof adminUsersTable.$inferSelect) => ({
  ...user,
  createdAt: toIso(user.createdAt),
});

const activityResponse = (activity: typeof adminActivityTable.$inferSelect) => ({
  ...activity,
  createdAt: toIso(activity.createdAt),
});

const recordActivity = async (message: string) => {
  await db.insert(adminActivityTable).values({ message });
};

const ensureSeedData = async () => {
  if (!seedPromise) {
    seedPromise = (async () => {
      const [existing] = await db.select({ value: count() }).from(adminCoinsTable);
      if ((existing?.value ?? 0) === 0) {
        await db.insert(adminCoinsTable).values([
          { symbol: "BTC", name: "Bitcoin", network: "Bitcoin", price: 64250.5, status: "Listed", depositEnabled: true, withdrawalEnabled: true },
          { symbol: "ETH", name: "Ethereum", network: "ERC20", price: 3180.2, status: "Listed", depositEnabled: true, withdrawalEnabled: true },
          { symbol: "SOL", name: "Solana", network: "Solana", price: 142.6, status: "Listed", depositEnabled: true, withdrawalEnabled: true },
          { symbol: "XRP", name: "XRP", network: "XRPL", price: 0.58, status: "Review", depositEnabled: false, withdrawalEnabled: false },
        ]);

        await db.insert(adminPairsTable).values([
          { base: "BTC", quote: "USDT", minOrder: 10, maxLeverage: 125, status: "Active" },
          { base: "ETH", quote: "USDT", minOrder: 10, maxLeverage: 100, status: "Active" },
          { base: "SOL", quote: "USDT", minOrder: 5, maxLeverage: 50, status: "Active" },
          { base: "XRP", quote: "USDT", minOrder: 5, maxLeverage: 25, status: "Paused" },
        ]);

        await db.insert(adminUsersTable).values([
          { name: "Maya Chen", email: "maya@example.com", role: "Admin", kyc: "Verified", status: "Active", balance: 84250.22 },
          { name: "Arjun Patel", email: "arjun@example.com", role: "Trader", kyc: "Verified", status: "Active", balance: 12840.5 },
          { name: "Sofia Reyes", email: "sofia@example.com", role: "User", kyc: "Pending", status: "Active", balance: 650.1 },
          { name: "Noah Smith", email: "noah@example.com", role: "User", kyc: "Rejected", status: "Suspended", balance: 0 },
        ]);

        await db.insert(adminFeeTiersTable).values([
          { name: "Starter", makerFee: 0.1, takerFee: 0.1, withdrawalFee: 0.0005, minVolume: 0 },
          { name: "Pro", makerFee: 0.075, takerFee: 0.085, withdrawalFee: 0.00035, minVolume: 50000 },
          { name: "VIP", makerFee: 0.02, takerFee: 0.04, withdrawalFee: 0.0002, minVolume: 1000000 },
        ]);
      }

      const [existingCurrencies] = await db.select({ value: count() }).from(currenciesTable);
      if ((existingCurrencies?.value ?? 0) > 0) return;

      await db.insert(currenciesTable).values([
        { symbol: "INR", name: "Indian Rupee", type: "fiat", precision: 2, priceUsd: 0.012, status: "Active", depositEnabled: true, withdrawalEnabled: true },
        { symbol: "USDT", name: "Tether USD", type: "crypto", precision: 6, priceUsd: 1, status: "Active", depositEnabled: true, withdrawalEnabled: true },
        { symbol: "BTC", name: "Bitcoin", type: "crypto", precision: 8, priceUsd: 64250.5, status: "Active", depositEnabled: true, withdrawalEnabled: true },
        { symbol: "ETH", name: "Ethereum", type: "crypto", precision: 8, priceUsd: 3180.2, status: "Active", depositEnabled: true, withdrawalEnabled: true },
      ]);

      await db.insert(currencyNetworksTable).values([
        { currencySymbol: "USDT", network: "TRC20", chainId: "tron", minDeposit: 1, minWithdrawal: 10, withdrawalFee: 1, confirmations: 20, depositEnabled: true, withdrawalEnabled: true, status: "Active" },
        { currencySymbol: "USDT", network: "ERC20", chainId: "1", contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7", minDeposit: 10, minWithdrawal: 20, withdrawalFee: 8, confirmations: 12, depositEnabled: true, withdrawalEnabled: true, status: "Active" },
        { currencySymbol: "BTC", network: "Bitcoin", chainId: "bitcoin", minDeposit: 0.0001, minWithdrawal: 0.001, withdrawalFee: 0.0004, confirmations: 2, depositEnabled: true, withdrawalEnabled: true, status: "Active" },
        { currencySymbol: "ETH", network: "ERC20", chainId: "1", minDeposit: 0.001, minWithdrawal: 0.01, withdrawalFee: 0.003, confirmations: 12, depositEnabled: true, withdrawalEnabled: true, status: "Active" },
      ]);

      await db.insert(marketsTable).values([
        { name: "Spot", type: "spot", status: "Active" },
        { name: "Futures", type: "futures", status: "Active" },
      ]);

      await db.insert(marketPairsTable).values([
        { base: "BTC", quote: "USDT", symbol: "BTC/USDT", minOrder: 10, tickSize: 0.01, stepSize: 0.000001, status: "Active" },
        { base: "BTC", quote: "INR", symbol: "BTC/INR", minOrder: 500, tickSize: 1, stepSize: 0.000001, status: "Active" },
        { base: "ETH", quote: "USDT", symbol: "ETH/USDT", minOrder: 10, tickSize: 0.01, stepSize: 0.00001, status: "Active" },
        { base: "USDT", quote: "INR", symbol: "USDT/INR", minOrder: 100, tickSize: 0.01, stepSize: 0.01, status: "Active" },
      ]);

      await db.insert(futuresPairsTable).values([
        { symbol: "BTCUSDT", base: "BTC", quote: "USDT", contractType: "perpetual", maxLeverage: 125, status: "Active" },
        { symbol: "ETHUSDT", base: "ETH", quote: "USDT", contractType: "perpetual", maxLeverage: 100, status: "Active" },
      ]);

      await db.insert(systemSettingsTable).values([
        { key: "maintenance_mode", value: "false", type: "boolean", group: "system" },
        { key: "registration_enabled", value: "true", type: "boolean", group: "users" },
        { key: "kyc_required_for_withdrawal", value: "true", type: "boolean", group: "compliance" },
        { key: "max_withdrawal_without_manual_approval", value: "50000", type: "number", group: "risk" },
      ]);

      await db.insert(paymentMethodsTable).values([
        { name: "UPI Manual", type: "INR_DEPOSIT", provider: "Manual", status: "Active", config: { requireUtr: true } },
        { name: "Bank Transfer", type: "INR_WITHDRAWAL", provider: "Manual", status: "Active", config: { approvalRequired: true } },
      ]);

      await db.insert(paymentGatewaysTable).values([
        { name: "Razorpay INR Gateway", provider: "Razorpay", mode: "sandbox", status: "Disabled", priority: 1, config: { currency: "INR" } },
        { name: "Manual Crypto Gateway", provider: "Internal Wallet", mode: "live", status: "Active", priority: 2, config: { confirmationsManaged: true } },
      ]);

      await db.insert(usersTable).values([
        { email: "trader1@example.com", passwordHash: "managed-auth", status: "Active", kycStatus: "Verified" },
        { email: "kyc-pending@example.com", passwordHash: "managed-auth", status: "Active", kycStatus: "Pending" },
      ]);

      await db.insert(kycRequestsTable).values([
        { userId: 1, documentType: "PAN", documentRef: "kyc/pan/sample-1", status: "Pending" },
        { userId: 2, documentType: "AADHAAR", documentRef: "kyc/aadhaar/sample-2", status: "Pending" },
      ]);

      await db.insert(inrDepositsTable).values([
        { userId: 1, amount: 25000, fee: 0, method: "UPI", utr: "UTR123456", status: "Pending" },
        { userId: 2, amount: 100000, fee: 0, method: "BANK", utr: "UTR987654", status: "Approved" },
      ]);

      await db.insert(cryptoWithdrawalsTable).values([
        { userId: 1, currency: "USDT", network: "TRC20", address: "TYsampleWalletAddress", amount: 150, fee: 1, status: "Pending" },
      ]);

      await db.insert(futuresPositionsTable).values([
        { userId: 1, pair: "BTCUSDT", leverage: 20, entryPrice: 63500, markPrice: 64250.5, pnl: 236.4, liquidationPrice: 60420, margin: 500, status: "Open" },
      ]);

      await db.insert(transactionsTable).values([
        { userId: 1, type: "deposit", currency: "INR", amount: 25000, status: "Pending", reference: "UTR123456" },
        { userId: 1, type: "trade", currency: "USDT", amount: -100, status: "Completed", reference: "BTC/USDT buy" },
      ]);

      await recordActivity("Database seeded with live admin records.");
    })();
  }

  await seedPromise;
};

router.use(async (_req, _res, next): Promise<void> => {
  await ensureSeedData();
  next();
});

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const allowedPassword = process.env.ADMIN_DEMO_PASSWORD ?? "admin123";
  if (parsed.data.password !== allowedPassword) {
    res.status(401).json({ error: "Invalid admin credentials" });
    return;
  }

  const token = signToken({
    email,
    role: "admin",
    permissions: ["dashboard", "users", "kyc", "deposits", "withdrawals", "markets", "roles", "settings"],
  });

  res.json({
    token,
    admin: {
      email,
      name: "CryptoX Admin",
      role: "admin",
      permissions: ["dashboard", "users", "kyc", "deposits", "withdrawals", "markets", "roles", "settings"],
    },
  });
});

router.get("/admin/me", async (req, res): Promise<void> => {
  const admin = readAdminAuth(req.headers.authorization);
  if (!admin || admin.role !== "admin") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ email: admin.email, role: admin.role });
});

router.get("/admin/dashboard-stats", async (_req, res): Promise<void> => {
  const [usersCount] = await db.select({ value: count() }).from(adminUsersTable);
  const [inrDeposits] = await db.select({ value: sql<number>`coalesce(sum(${inrDepositsTable.amount}), 0)` }).from(inrDepositsTable);
  const [cryptoDeposits] = await db.select({ value: sql<number>`coalesce(sum(${cryptoDepositsTable.amount}), 0)` }).from(cryptoDepositsTable);
  const [inrWithdrawals] = await db.select({ value: sql<number>`coalesce(sum(${inrWithdrawalsTable.amount}), 0)` }).from(inrWithdrawalsTable);
  const [cryptoWithdrawals] = await db.select({ value: sql<number>`coalesce(sum(${cryptoWithdrawalsTable.amount}), 0)` }).from(cryptoWithdrawalsTable);
  const [spotVolume] = await db.select({ value: sql<number>`coalesce(sum(${tradesTable.price} * ${tradesTable.quantity}), 0)` }).from(tradesTable);
  const [futuresVolume] = await db.select({ value: sql<number>`coalesce(sum(${futuresTradesTable.price} * ${futuresTradesTable.quantity}), 0)` }).from(futuresTradesTable);

  res.json({
    totalUsers: Number(usersCount?.value ?? 0),
    totalDeposits: Number(inrDeposits?.value ?? 0) + Number(cryptoDeposits?.value ?? 0),
    totalWithdrawals: Number(inrWithdrawals?.value ?? 0) + Number(cryptoWithdrawals?.value ?? 0),
    tradingVolume: Number(spotVolume?.value ?? 0) + Number(futuresVolume?.value ?? 0),
  });
});

router.post("/admin/user/block", async (req, res): Promise<void> => {
  const parsed = IdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, parsed.data.id));
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [user] = await db.update(adminUsersTable).set({ status: existing.status === "Active" ? "Suspended" : "Active" }).where(eq(adminUsersTable.id, parsed.data.id)).returning();
  await recordActivity(`${user.status === "Active" ? "Unblocked" : "Blocked"} user ${user.email}.`);
  res.json(userResponse(user));
});

router.get("/admin/kyc", async (_req, res): Promise<void> => {
  res.json(await db.select().from(kycRequestsTable).orderBy(desc(kycRequestsTable.createdAt)));
});

router.post("/admin/kyc/approve", async (req, res): Promise<void> => {
  const parsed = ApprovalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [kyc] = await db.update(kycRequestsTable).set({ status: parsed.data.status }).where(eq(kycRequestsTable.id, parsed.data.id)).returning();
  if (!kyc) {
    res.status(404).json({ error: "KYC request not found" });
    return;
  }
  await db.update(adminUsersTable).set({ kyc: parsed.data.status === "Approved" ? "Verified" : "Rejected" }).where(eq(adminUsersTable.id, kyc.userId));
  await recordActivity(`${parsed.data.status} KYC request #${kyc.id}.`);
  res.json(kyc);
});

router.get("/admin/inr/deposits", async (_req, res): Promise<void> => {
  res.json(await db.select().from(inrDepositsTable).orderBy(desc(inrDepositsTable.createdAt)));
});

router.post("/admin/inr/deposit/approve", async (req, res): Promise<void> => {
  const parsed = ApprovalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [deposit] = await db.update(inrDepositsTable).set({ status: parsed.data.status }).where(eq(inrDepositsTable.id, parsed.data.id)).returning();
  if (!deposit) {
    res.status(404).json({ error: "INR deposit not found" });
    return;
  }
  await recordActivity(`${parsed.data.status} INR deposit #${deposit.id}.`);
  res.json(deposit);
});

router.get("/admin/inr/withdrawals", async (_req, res): Promise<void> => {
  res.json(await db.select().from(inrWithdrawalsTable).orderBy(desc(inrWithdrawalsTable.createdAt)));
});

router.post("/admin/inr/withdraw/approve", async (req, res): Promise<void> => {
  const parsed = ApprovalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [withdrawal] = await db.update(inrWithdrawalsTable).set({ status: parsed.data.status }).where(eq(inrWithdrawalsTable.id, parsed.data.id)).returning();
  if (!withdrawal) {
    res.status(404).json({ error: "INR withdrawal not found" });
    return;
  }
  await recordActivity(`${parsed.data.status} INR withdrawal #${withdrawal.id}.`);
  res.json(withdrawal);
});

router.get("/admin/crypto/withdrawals", async (_req, res): Promise<void> => {
  res.json(await db.select().from(cryptoWithdrawalsTable).orderBy(desc(cryptoWithdrawalsTable.createdAt)));
});

router.post("/admin/crypto/withdraw/approve", async (req, res): Promise<void> => {
  const parsed = ApprovalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [withdrawal] = await db.update(cryptoWithdrawalsTable).set({ status: parsed.data.status }).where(eq(cryptoWithdrawalsTable.id, parsed.data.id)).returning();
  if (!withdrawal) {
    res.status(404).json({ error: "Crypto withdrawal not found" });
    return;
  }
  await recordActivity(`${parsed.data.status} crypto withdrawal #${withdrawal.id}.`);
  res.json(withdrawal);
});

router.get("/admin/transactions", async (_req, res): Promise<void> => {
  res.json(await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)));
});

router.get("/admin/markets", async (_req, res): Promise<void> => {
  res.json(await db.select().from(marketPairsTable).orderBy(asc(marketPairsTable.symbol)));
});

router.post("/admin/market/toggle", async (req, res): Promise<void> => {
  const parsed = MarketToggleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(marketPairsTable).where(eq(marketPairsTable.id, parsed.data.id));
  if (!existing) {
    res.status(404).json({ error: "Market not found" });
    return;
  }
  const [market] = await db.update(marketPairsTable).set({ status: existing.status === "Active" ? "Paused" : "Active" }).where(eq(marketPairsTable.id, parsed.data.id)).returning();
  await recordActivity(`${market.status === "Active" ? "Enabled" : "Disabled"} market ${market.symbol}.`);
  res.json(market);
});

router.get("/admin/roles", async (_req, res): Promise<void> => {
  const [existing] = await db.select({ value: count() }).from(rolesTable);
  if ((existing?.value ?? 0) === 0) {
    await db.insert(rolesTable).values([
      { name: "admin", description: "Full exchange administration access" },
      { name: "support", description: "Users and KYC support access" },
      { name: "finance", description: "Deposits, withdrawals and ledger access" },
    ]);
  }
  res.json(await db.select().from(rolesTable).orderBy(asc(rolesTable.name)));
});

router.post("/admin/roles", async (req, res): Promise<void> => {
  const parsed = RoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [role] = await db.insert(rolesTable).values({ name: parsed.data.name, description: parsed.data.description ?? "" }).returning();
  await recordActivity(`Created admin role ${role.name}.`);
  res.status(201).json(role);
});

router.get("/admin/overview", async (_req, res): Promise<void> => {
  const [coinCounts] = await db
    .select({
      totalCoins: count(),
      listedCoins: sql<number>`count(*) filter (where ${adminCoinsTable.status} = 'Listed')`,
    })
    .from(adminCoinsTable);
  const [pairCounts] = await db
    .select({
      totalPairs: count(),
      activePairs: sql<number>`count(*) filter (where ${adminPairsTable.status} = 'Active')`,
    })
    .from(adminPairsTable);
  const [userCounts] = await db
    .select({
      users: count(),
      pendingKyc: sql<number>`count(*) filter (where ${adminUsersTable.kyc} = 'Pending')`,
    })
    .from(adminUsersTable);
  const [topFee] = await db
    .select({ value: sql<number>`min(${adminFeeTiersTable.makerFee})` })
    .from(adminFeeTiersTable);

  res.json(
    GetAdminOverviewResponse.parse({
      listedCoins: Number(coinCounts?.listedCoins ?? 0),
      totalCoins: Number(coinCounts?.totalCoins ?? 0),
      activePairs: Number(pairCounts?.activePairs ?? 0),
      totalPairs: Number(pairCounts?.totalPairs ?? 0),
      users: Number(userCounts?.users ?? 0),
      pendingKyc: Number(userCounts?.pendingKyc ?? 0),
      topMakerFee: Number(topFee?.value ?? 0),
    }),
  );
});

router.get("/admin/activity", async (_req, res): Promise<void> => {
  const activity = await db.select().from(adminActivityTable).orderBy(desc(adminActivityTable.createdAt)).limit(8);
  res.json(ListAdminActivityResponse.parse(activity.map(activityResponse)));
});

router.get("/admin/coins", async (_req, res): Promise<void> => {
  const coins = await db.select().from(adminCoinsTable).orderBy(asc(adminCoinsTable.symbol));
  res.json(ListAdminCoinsResponse.parse(coins.map(coinResponse)));
});

router.post("/admin/coins", async (req, res): Promise<void> => {
  const parsed = CreateAdminCoinBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid coin payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const symbol = parsed.data.symbol.trim().toUpperCase();
  const [coin] = await db
    .insert(adminCoinsTable)
    .values({
      symbol,
      name: parsed.data.name.trim(),
      network: parsed.data.network.trim(),
      price: parsed.data.price,
      status: "Review",
      depositEnabled: false,
      withdrawalEnabled: false,
    })
    .returning();
  await recordActivity(`Created coin ${symbol}.`);
  res.status(201).json(ListAdminCoinsResponseItem.parse(coinResponse(coin)));
});

router.delete("/admin/coins/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminCoinParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [coin] = await db.delete(adminCoinsTable).where(eq(adminCoinsTable.id, params.data.id)).returning();
  if (!coin) {
    res.status(404).json({ error: "Coin not found" });
    return;
  }

  await db.delete(adminPairsTable).where(sql`${adminPairsTable.base} = ${coin.symbol} or ${adminPairsTable.quote} = ${coin.symbol}`);
  await recordActivity(`Deleted coin ${coin.symbol} and related pairs.`);
  res.sendStatus(204);
});

router.patch("/admin/coins/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid coin id" });
    return;
  }

  const parsed = PatchAdminCoinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [coin] = await db.update(adminCoinsTable).set(parsed.data).where(eq(adminCoinsTable.id, id)).returning();
  if (!coin) {
    res.status(404).json({ error: "Coin not found" });
    return;
  }

  await recordActivity(`Updated coin ${coin.symbol}.`);
  res.json(ListAdminCoinsResponseItem.parse(coinResponse(coin)));
});

router.get("/admin/pairs", async (_req, res): Promise<void> => {
  const pairs = await db.select().from(adminPairsTable).orderBy(asc(adminPairsTable.base), asc(adminPairsTable.quote));
  res.json(ListAdminPairsResponse.parse(pairs.map(pairResponse)));
});

router.post("/admin/pairs", async (req, res): Promise<void> => {
  const parsed = CreateAdminPairBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid pair payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const base = parsed.data.base.trim().toUpperCase();
  const quote = parsed.data.quote.trim().toUpperCase();
  const [pair] = await db
    .insert(adminPairsTable)
    .values({
      base,
      quote,
      minOrder: parsed.data.minOrder,
      maxLeverage: parsed.data.maxLeverage,
      status: "Active",
    })
    .returning();
  await recordActivity(`Created pair ${base}/${quote}.`);
  res.status(201).json(ListAdminPairsResponseItem.parse(pairResponse(pair)));
});

router.delete("/admin/pairs/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminPairParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [pair] = await db.delete(adminPairsTable).where(eq(adminPairsTable.id, params.data.id)).returning();
  if (!pair) {
    res.status(404).json({ error: "Pair not found" });
    return;
  }

  await recordActivity(`Deleted pair ${pair.base}/${pair.quote}.`);
  res.sendStatus(204);
});

router.get("/admin/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(adminUsersTable).orderBy(asc(adminUsersTable.name));
  res.json(ListAdminUsersResponse.parse(users.map(userResponse)));
});

router.post("/admin/users", async (req, res): Promise<void> => {
  const parsed = CreateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid user payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .insert(adminUsersTable)
    .values({
      name: parsed.data.name.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      role: parsed.data.role,
      kyc: "Pending",
      status: "Active",
      balance: 0,
    })
    .returning();
  await recordActivity(`Created user ${user.email}.`);
  res.status(201).json(ListAdminUsersResponseItem.parse(userResponse(user)));
});

router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db.delete(adminUsersTable).where(eq(adminUsersTable.id, params.data.id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await recordActivity(`Deleted user ${user.email}.`);
  res.sendStatus(204);
});

router.patch("/admin/users/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const parsed = PatchAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.update(adminUsersTable).set(parsed.data).where(eq(adminUsersTable.id, id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await recordActivity(`Updated user ${user.email}.`);
  res.json(ListAdminUsersResponseItem.parse(userResponse(user)));
});

router.get("/admin/fee-tiers", async (_req, res): Promise<void> => {
  const feeTiers = await db.select().from(adminFeeTiersTable).orderBy(asc(adminFeeTiersTable.minVolume));
  res.json(ListAdminFeeTiersResponse.parse(feeTiers));
});

router.patch("/admin/fee-tiers/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminFeeTierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAdminFeeTierBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid fee tier payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [feeTier] = await db
    .update(adminFeeTiersTable)
    .set(parsed.data)
    .where(eq(adminFeeTiersTable.id, params.data.id))
    .returning();
  if (!feeTier) {
    res.status(404).json({ error: "Fee tier not found" });
    return;
  }

  await recordActivity(`Updated fee tier ${feeTier.name}.`);
  res.json(UpdateAdminFeeTierResponse.parse(feeTier));
});

const tableRegistry = {
  users: usersTable,
  user_profiles: userProfilesTable,
  user_sessions: userSessionsTable,
  user_login_history: userLoginHistoryTable,
  user_2fa: user2faTable,
  roles: rolesTable,
  permissions: permissionsTable,
  role_permissions: rolePermissionsTable,
  user_roles: userRolesTable,
  admin_users: adminUsersTable,
  admin_logs: adminLogsTable,
  wallets: walletsTable,
  wallet_balances: walletBalancesTable,
  currencies: currenciesTable,
  currency_networks: currencyNetworksTable,
  wallet_addresses: walletAddressesTable,
  inr_deposits: inrDepositsTable,
  inr_withdrawals: inrWithdrawalsTable,
  bank_accounts: bankAccountsTable,
  upi_accounts: upiAccountsTable,
  payment_methods: paymentMethodsTable,
  payment_gateways: paymentGatewaysTable,
  crypto_deposits: cryptoDepositsTable,
  crypto_withdrawals: cryptoWithdrawalsTable,
  blockchain_logs: blockchainLogsTable,
  markets: marketsTable,
  market_pairs: marketPairsTable,
  market_settings: marketSettingsTable,
  orders: ordersTable,
  order_fills: orderFillsTable,
  trades: tradesTable,
  trade_history: tradeHistoryTable,
  order_books: orderBooksTable,
  futures_markets: futuresMarketsTable,
  futures_pairs: futuresPairsTable,
  futures_settings: futuresSettingsTable,
  futures_accounts: futuresAccountsTable,
  futures_balances: futuresBalancesTable,
  futures_orders: futuresOrdersTable,
  futures_order_fills: futuresOrderFillsTable,
  futures_trades: futuresTradesTable,
  futures_positions: futuresPositionsTable,
  position_history: positionHistoryTable,
  liquidations: liquidationsTable,
  insurance_fund: insuranceFundTable,
  funding_rates: fundingRatesTable,
  funding_payments: fundingPaymentsTable,
  margin_accounts: marginAccountsTable,
  margin_loans: marginLoansTable,
  margin_interest: marginInterestTable,
  transactions: transactionsTable,
  ledger_entries: ledgerEntriesTable,
  balance_history: balanceHistoryTable,
  fees: feesTable,
  commissions: commissionsTable,
  notifications: notificationsTable,
  email_logs: emailLogsTable,
  sms_logs: smsLogsTable,
  system_settings: systemSettingsTable,
  audit_logs: auditLogsTable,
  security_events: securityEventsTable,
  ip_logs: ipLogsTable,
  device_logs: deviceLogsTable,
  kyc_requests: kycRequestsTable,
  withdrawal_approvals: withdrawalApprovalsTable,
  referrals: referralsTable,
  referral_rewards: referralRewardsTable,
  promo_codes: promoCodesTable,
  user_settings: userSettingsTable,
} as const;

router.get("/admin/exchange/table-counts", async (_req, res): Promise<void> => {
  const rows = await Promise.all(
    Object.entries(tableRegistry).map(async ([name, table]) => {
      const [result] = await db.select({ value: count() }).from(table);
      return { name, count: Number(result?.value ?? 0) };
    }),
  );
  res.json(rows);
});

router.get("/admin/exchange/full-db", async (_req, res): Promise<void> => {
  const [
    currencies,
    networks,
    marketPairs,
    futuresPairs,
    positions,
    deposits,
    withdrawals,
    kyc,
    transactions,
    settings,
    methods,
    gateways,
    securityEvents,
  ] = await Promise.all([
    db.select().from(currenciesTable).orderBy(asc(currenciesTable.symbol)),
    db.select().from(currencyNetworksTable).orderBy(asc(currencyNetworksTable.currencySymbol), asc(currencyNetworksTable.network)),
    db.select().from(marketPairsTable).orderBy(asc(marketPairsTable.symbol)),
    db.select().from(futuresPairsTable).orderBy(asc(futuresPairsTable.symbol)),
    db.select().from(futuresPositionsTable).orderBy(desc(futuresPositionsTable.createdAt)).limit(25),
    db.select().from(inrDepositsTable).orderBy(desc(inrDepositsTable.createdAt)).limit(25),
    db.select().from(cryptoWithdrawalsTable).orderBy(desc(cryptoWithdrawalsTable.createdAt)).limit(25),
    db.select().from(kycRequestsTable).orderBy(desc(kycRequestsTable.createdAt)).limit(25),
    db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(25),
    db.select().from(systemSettingsTable).orderBy(asc(systemSettingsTable.group), asc(systemSettingsTable.key)),
    db.select().from(paymentMethodsTable).orderBy(asc(paymentMethodsTable.name)),
    db.select().from(paymentGatewaysTable).orderBy(asc(paymentGatewaysTable.priority), asc(paymentGatewaysTable.name)),
    db.select().from(securityEventsTable).orderBy(desc(securityEventsTable.createdAt)).limit(25),
  ]);

  res.json({
    currencies,
    networks,
    marketPairs,
    futuresPairs,
    positions,
    deposits,
    withdrawals,
    kyc,
    transactions,
    settings,
    methods,
    gateways,
    securityEvents,
  });
});

router.get("/admin/currency-networks", async (_req, res): Promise<void> => {
  res.json(await db.select().from(currencyNetworksTable).orderBy(asc(currencyNetworksTable.currencySymbol), asc(currencyNetworksTable.network)));
});

router.post("/admin/currency-networks", async (req, res): Promise<void> => {
  const parsed = NetworkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [network] = await db.insert(currencyNetworksTable).values(parsed.data).returning();
  await recordActivity(`Created ${network.currencySymbol} ${network.network} network.`);
  res.status(201).json(network);
});

router.patch("/admin/currency-networks/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = NetworkBody.partial().safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid network id" : parsed.error.message });
    return;
  }
  const [network] = await db.update(currencyNetworksTable).set(parsed.data).where(eq(currencyNetworksTable.id, id)).returning();
  if (!network) {
    res.status(404).json({ error: "Network not found" });
    return;
  }
  await recordActivity(`Updated ${network.currencySymbol} ${network.network} network.`);
  res.json(network);
});

router.delete("/admin/currency-networks/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid network id" });
    return;
  }
  const [network] = await db.delete(currencyNetworksTable).where(eq(currencyNetworksTable.id, id)).returning();
  if (!network) {
    res.status(404).json({ error: "Network not found" });
    return;
  }
  await recordActivity(`Deleted ${network.currencySymbol} ${network.network} network.`);
  res.sendStatus(204);
});

router.get("/admin/system-settings", async (_req, res): Promise<void> => {
  res.json(await db.select().from(systemSettingsTable).orderBy(asc(systemSettingsTable.group), asc(systemSettingsTable.key)));
});

router.post("/admin/system-settings", async (req, res): Promise<void> => {
  const parsed = SettingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [setting] = await db.insert(systemSettingsTable).values(parsed.data).returning();
  await recordActivity(`Created setting ${setting.key}.`);
  res.status(201).json(setting);
});

router.patch("/admin/system-settings/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = SettingBody.partial().safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid setting id" : parsed.error.message });
    return;
  }
  const [setting] = await db.update(systemSettingsTable).set(parsed.data).where(eq(systemSettingsTable.id, id)).returning();
  if (!setting) {
    res.status(404).json({ error: "Setting not found" });
    return;
  }
  await recordActivity(`Updated setting ${setting.key}.`);
  res.json(setting);
});

router.get("/admin/payment-methods", async (_req, res): Promise<void> => {
  res.json(await db.select().from(paymentMethodsTable).orderBy(asc(paymentMethodsTable.name)));
});

router.post("/admin/payment-methods", async (req, res): Promise<void> => {
  const parsed = PaymentMethodBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [method] = await db.insert(paymentMethodsTable).values(parsed.data).returning();
  await recordActivity(`Created payment method ${method.name}.`);
  res.status(201).json(method);
});

router.patch("/admin/payment-methods/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = PaymentMethodBody.partial().safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid payment method id" : parsed.error.message });
    return;
  }
  const [method] = await db.update(paymentMethodsTable).set(parsed.data).where(eq(paymentMethodsTable.id, id)).returning();
  if (!method) {
    res.status(404).json({ error: "Payment method not found" });
    return;
  }
  await recordActivity(`Updated payment method ${method.name}.`);
  res.json(method);
});

router.delete("/admin/payment-methods/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid payment method id" });
    return;
  }
  const [method] = await db.delete(paymentMethodsTable).where(eq(paymentMethodsTable.id, id)).returning();
  if (!method) {
    res.status(404).json({ error: "Payment method not found" });
    return;
  }
  await recordActivity(`Deleted payment method ${method.name}.`);
  res.sendStatus(204);
});

router.get("/admin/payment-gateways", async (_req, res): Promise<void> => {
  res.json(await db.select().from(paymentGatewaysTable).orderBy(asc(paymentGatewaysTable.priority), asc(paymentGatewaysTable.name)));
});

router.post("/admin/payment-gateways", async (req, res): Promise<void> => {
  const parsed = PaymentGatewayBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [gateway] = await db.insert(paymentGatewaysTable).values(parsed.data).returning();
  await recordActivity(`Created payment gateway ${gateway.name}.`);
  res.status(201).json(gateway);
});

router.patch("/admin/payment-gateways/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = PaymentGatewayBody.partial().safeParse(req.body);
  if (!Number.isInteger(id) || id <= 0 || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid gateway id" : parsed.error.message });
    return;
  }
  const [gateway] = await db.update(paymentGatewaysTable).set(parsed.data).where(eq(paymentGatewaysTable.id, id)).returning();
  if (!gateway) {
    res.status(404).json({ error: "Payment gateway not found" });
    return;
  }
  await recordActivity(`Updated payment gateway ${gateway.name}.`);
  res.json(gateway);
});

router.delete("/admin/payment-gateways/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid gateway id" });
    return;
  }
  const [gateway] = await db.delete(paymentGatewaysTable).where(eq(paymentGatewaysTable.id, id)).returning();
  if (!gateway) {
    res.status(404).json({ error: "Payment gateway not found" });
    return;
  }
  await recordActivity(`Deleted payment gateway ${gateway.name}.`);
  res.sendStatus(204);
});

export default router;