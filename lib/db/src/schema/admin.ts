import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adminCoinsTable = pgTable(
  "admin_coins",
  {
    id: serial("id").primaryKey(),
    symbol: text("symbol").notNull(),
    name: text("name").notNull(),
    network: text("network").notNull(),
    price: doublePrecision("price").notNull(),
    status: text("status").notNull().default("Review"),
    depositEnabled: boolean("deposit_enabled").notNull().default(false),
    withdrawalEnabled: boolean("withdrawal_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("admin_coins_symbol_unique").on(table.symbol)],
);

export const adminPairsTable = pgTable(
  "admin_pairs",
  {
    id: serial("id").primaryKey(),
    base: text("base").notNull(),
    quote: text("quote").notNull(),
    minOrder: doublePrecision("min_order").notNull(),
    maxLeverage: integer("max_leverage").notNull(),
    status: text("status").notNull().default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("admin_pairs_symbol_unique").on(table.base, table.quote)],
);

export const adminUsersTable = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull().default("User"),
    kyc: text("kyc").notNull().default("Pending"),
    status: text("status").notNull().default("Active"),
    balance: doublePrecision("balance").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("admin_users_email_unique").on(table.email)],
);

export const adminFeeTiersTable = pgTable("admin_fee_tiers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  makerFee: doublePrecision("maker_fee").notNull(),
  takerFee: doublePrecision("taker_fee").notNull(),
  withdrawalFee: doublePrecision("withdrawal_fee").notNull(),
  minVolume: doublePrecision("min_volume").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const adminActivityTable = pgTable("admin_activity", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdminCoinSchema = createInsertSchema(adminCoinsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAdminPairSchema = createInsertSchema(adminPairsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAdminUserSchema = createInsertSchema(adminUsersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAdminFeeTierSchema = createInsertSchema(adminFeeTiersTable).omit({ id: true, updatedAt: true });
export const insertAdminActivitySchema = createInsertSchema(adminActivityTable).omit({ id: true, createdAt: true });

export type InsertAdminCoin = z.infer<typeof insertAdminCoinSchema>;
export type InsertAdminPair = z.infer<typeof insertAdminPairSchema>;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type InsertAdminFeeTier = z.infer<typeof insertAdminFeeTierSchema>;
export type InsertAdminActivity = z.infer<typeof insertAdminActivitySchema>;

export type AdminCoinRecord = typeof adminCoinsTable.$inferSelect;
export type AdminPairRecord = typeof adminPairsTable.$inferSelect;
export type AdminUserRecord = typeof adminUsersTable.$inferSelect;
export type AdminFeeTierRecord = typeof adminFeeTiersTable.$inferSelect;
export type AdminActivityRecord = typeof adminActivityTable.$inferSelect;