import { Router, type IRouter } from "express";
import { asc, count, desc, eq, sql } from "drizzle-orm";
import {
  adminActivityTable,
  adminCoinsTable,
  adminFeeTiersTable,
  adminPairsTable,
  adminUsersTable,
  db,
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
      if ((existing?.value ?? 0) > 0) return;

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

      await recordActivity("Database seeded with live admin records.");
    })();
  }

  await seedPromise;
};

router.use(async (_req, _res, next): Promise<void> => {
  await ensureSeedData();
  next();
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

export default router;