import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
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

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull().default(""),
  status: text("status").notNull().default("Active"),
  kycStatus: text("kyc_status").notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const userProfilesTable = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  country: text("country").notNull().default("IN"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSessionsTable = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  ipAddress: text("ip_address").notNull().default(""),
  userAgent: text("user_agent").notNull().default(""),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userLoginHistoryTable = pgTable("user_login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  ipAddress: text("ip_address").notNull().default(""),
  device: text("device").notNull().default(""),
  status: text("status").notNull().default("Success"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const user2faTable = pgTable("user_2fa", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  method: text("method").notNull().default("TOTP"),
  secretRef: text("secret_ref").notNull().default(""),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rolesTable = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
}, (table) => [uniqueIndex("roles_name_unique").on(table.name)]);

export const permissionsTable = pgTable("permissions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  description: text("description").notNull().default(""),
}, (table) => [uniqueIndex("permissions_key_unique").on(table.key)]);

export const rolePermissionsTable = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull(),
  permissionId: integer("permission_id").notNull(),
});

export const userRolesTable = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  roleId: integer("role_id").notNull(),
});

export const adminLogsTable = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id"),
  action: text("action").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const currenciesTable = pgTable("currencies", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("crypto"),
  precision: integer("precision").notNull().default(8),
  priceUsd: doublePrecision("price_usd").notNull().default(0),
  status: text("status").notNull().default("Active"),
  depositEnabled: boolean("deposit_enabled").notNull().default(true),
  withdrawalEnabled: boolean("withdrawal_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("currencies_symbol_unique").on(table.symbol)]);

export const currencyNetworksTable = pgTable("currency_networks", {
  id: serial("id").primaryKey(),
  currencySymbol: text("currency_symbol").notNull(),
  network: text("network").notNull(),
  chainId: text("chain_id").notNull().default(""),
  contractAddress: text("contract_address").notNull().default(""),
  minDeposit: doublePrecision("min_deposit").notNull().default(0),
  minWithdrawal: doublePrecision("min_withdrawal").notNull().default(0),
  withdrawalFee: doublePrecision("withdrawal_fee").notNull().default(0),
  confirmations: integer("confirmations").notNull().default(1),
  depositEnabled: boolean("deposit_enabled").notNull().default(true),
  withdrawalEnabled: boolean("withdrawal_enabled").notNull().default(true),
  status: text("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("currency_networks_unique").on(table.currencySymbol, table.network)]);

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull().default("spot"),
  status: text("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const walletBalancesTable = pgTable("wallet_balances", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull(),
  currency: text("currency").notNull(),
  available: doublePrecision("available").notNull().default(0),
  locked: doublePrecision("locked").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const walletAddressesTable = pgTable("wallet_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currency: text("currency").notNull(),
  network: text("network").notNull(),
  address: text("address").notNull(),
  tag: text("tag").notNull().default(""),
  status: text("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bankAccountsTable = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  holderName: text("holder_name").notNull(),
  accountNumberMasked: text("account_number_masked").notNull(),
  ifsc: text("ifsc").notNull(),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const upiAccountsTable = pgTable("upi_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  upiId: text("upi_id").notNull(),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentMethodsTable = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("INR"),
  provider: text("provider").notNull().default("Manual"),
  status: text("status").notNull().default("Active"),
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentGatewaysTable = pgTable("payment_gateways", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  mode: text("mode").notNull().default("sandbox"),
  status: text("status").notNull().default("Disabled"),
  priority: integer("priority").notNull().default(1),
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inrDepositsTable = pgTable("inr_deposits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  fee: doublePrecision("fee").notNull().default(0),
  method: text("method").notNull().default("UPI"),
  utr: text("utr").notNull().default(""),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inrWithdrawalsTable = pgTable("inr_withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  fee: doublePrecision("fee").notNull().default(0),
  bankAccountId: integer("bank_account_id"),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cryptoDepositsTable = pgTable("crypto_deposits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currency: text("currency").notNull(),
  network: text("network").notNull(),
  amount: doublePrecision("amount").notNull(),
  txHash: text("tx_hash").notNull().default(""),
  confirmations: integer("confirmations").notNull().default(0),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cryptoWithdrawalsTable = pgTable("crypto_withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currency: text("currency").notNull(),
  network: text("network").notNull(),
  address: text("address").notNull(),
  amount: doublePrecision("amount").notNull(),
  fee: doublePrecision("fee").notNull().default(0),
  txHash: text("tx_hash").notNull().default(""),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blockchainLogsTable = pgTable("blockchain_logs", {
  id: serial("id").primaryKey(),
  network: text("network").notNull(),
  eventType: text("event_type").notNull(),
  txHash: text("tx_hash").notNull().default(""),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marketsTable = pgTable("markets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("spot"),
  status: text("status").notNull().default("Active"),
});

export const marketPairsTable = pgTable("market_pairs", {
  id: serial("id").primaryKey(),
  base: text("base").notNull(),
  quote: text("quote").notNull(),
  symbol: text("symbol").notNull(),
  minOrder: doublePrecision("min_order").notNull().default(0),
  tickSize: doublePrecision("tick_size").notNull().default(0.01),
  stepSize: doublePrecision("step_size").notNull().default(0.000001),
  status: text("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("market_pairs_symbol_unique").on(table.symbol)]);

export const marketSettingsTable = pgTable("market_settings", {
  id: serial("id").primaryKey(),
  pair: text("pair").notNull(),
  makerFee: doublePrecision("maker_fee").notNull().default(0.1),
  takerFee: doublePrecision("taker_fee").notNull().default(0.1),
  tradingEnabled: boolean("trading_enabled").notNull().default(true),
  config: jsonb("config").notNull().default({}),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pair: text("pair").notNull(),
  side: text("side").notNull(),
  type: text("type").notNull(),
  price: doublePrecision("price").notNull().default(0),
  quantity: doublePrecision("quantity").notNull(),
  filledQuantity: doublePrecision("filled_quantity").notNull().default(0),
  status: text("status").notNull().default("Open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderFillsTable = pgTable("order_fills", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  tradeId: integer("trade_id"),
  price: doublePrecision("price").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  fee: doublePrecision("fee").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  pair: text("pair").notNull(),
  price: doublePrecision("price").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  side: text("side").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tradeHistoryTable = pgTable("trade_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pair: text("pair").notNull(),
  side: text("side").notNull(),
  price: doublePrecision("price").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  fee: doublePrecision("fee").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderBooksTable = pgTable("order_books", {
  id: serial("id").primaryKey(),
  pair: text("pair").notNull(),
  side: text("side").notNull(),
  price: doublePrecision("price").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const futuresMarketsTable = pgTable("futures_markets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("Active"),
});

export const futuresPairsTable = pgTable("futures_pairs", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  base: text("base").notNull(),
  quote: text("quote").notNull().default("USDT"),
  contractType: text("contract_type").notNull().default("perpetual"),
  maxLeverage: integer("max_leverage").notNull().default(125),
  status: text("status").notNull().default("Active"),
}, (table) => [uniqueIndex("futures_pairs_symbol_unique").on(table.symbol)]);

export const futuresSettingsTable = pgTable("futures_settings", {
  id: serial("id").primaryKey(),
  pair: text("pair").notNull(),
  maintenanceMarginRate: doublePrecision("maintenance_margin_rate").notNull().default(0.005),
  initialMarginRate: doublePrecision("initial_margin_rate").notNull().default(0.01),
  fundingIntervalHours: integer("funding_interval_hours").notNull().default(8),
  tradingEnabled: boolean("trading_enabled").notNull().default(true),
});

export const futuresAccountsTable = pgTable("futures_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  marginMode: text("margin_mode").notNull().default("cross"),
  status: text("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const futuresBalancesTable = pgTable("futures_balances", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  currency: text("currency").notNull().default("USDT"),
  walletBalance: doublePrecision("wallet_balance").notNull().default(0),
  unrealizedPnl: doublePrecision("unrealized_pnl").notNull().default(0),
  marginBalance: doublePrecision("margin_balance").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const futuresOrdersTable = pgTable("futures_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pair: text("pair").notNull(),
  side: text("side").notNull(),
  type: text("type").notNull(),
  price: doublePrecision("price").notNull().default(0),
  quantity: doublePrecision("quantity").notNull(),
  leverage: integer("leverage").notNull().default(1),
  status: text("status").notNull().default("Open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const futuresOrderFillsTable = pgTable("futures_order_fills", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  price: doublePrecision("price").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  fee: doublePrecision("fee").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const futuresTradesTable = pgTable("futures_trades", {
  id: serial("id").primaryKey(),
  pair: text("pair").notNull(),
  price: doublePrecision("price").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  side: text("side").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const futuresPositionsTable = pgTable("futures_positions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pair: text("pair").notNull(),
  leverage: integer("leverage").notNull(),
  entryPrice: doublePrecision("entry_price").notNull(),
  markPrice: doublePrecision("mark_price").notNull(),
  pnl: doublePrecision("pnl").notNull().default(0),
  liquidationPrice: doublePrecision("liquidation_price").notNull(),
  margin: doublePrecision("margin").notNull().default(0),
  status: text("status").notNull().default("Open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const positionHistoryTable = pgTable("position_history", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id").notNull(),
  userId: integer("user_id").notNull(),
  pair: text("pair").notNull(),
  realizedPnl: doublePrecision("realized_pnl").notNull().default(0),
  closedAt: timestamp("closed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const liquidationsTable = pgTable("liquidations", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id").notNull(),
  userId: integer("user_id").notNull(),
  pair: text("pair").notNull(),
  liquidationPrice: doublePrecision("liquidation_price").notNull(),
  loss: doublePrecision("loss").notNull().default(0),
  status: text("status").notNull().default("Completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insuranceFundTable = pgTable("insurance_fund", {
  id: serial("id").primaryKey(),
  currency: text("currency").notNull().default("USDT"),
  balance: doublePrecision("balance").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fundingRatesTable = pgTable("funding_rates", {
  id: serial("id").primaryKey(),
  pair: text("pair").notNull(),
  rate: doublePrecision("rate").notNull(),
  nextFundingAt: timestamp("next_funding_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fundingPaymentsTable = pgTable("funding_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pair: text("pair").notNull(),
  amount: doublePrecision("amount").notNull(),
  rate: doublePrecision("rate").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marginAccountsTable = pgTable("margin_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marginLoansTable = pgTable("margin_loans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currency: text("currency").notNull(),
  amount: doublePrecision("amount").notNull(),
  interestRate: doublePrecision("interest_rate").notNull(),
  status: text("status").notNull().default("Open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marginInterestTable = pgTable("margin_interest", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  currency: text("currency").notNull(),
  amount: doublePrecision("amount").notNull(),
  status: text("status").notNull().default("Completed"),
  reference: text("reference").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ledgerEntriesTable = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id"),
  account: text("account").notNull(),
  currency: text("currency").notNull(),
  debit: doublePrecision("debit").notNull().default(0),
  credit: doublePrecision("credit").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const balanceHistoryTable = pgTable("balance_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currency: text("currency").notNull(),
  balanceBefore: doublePrecision("balance_before").notNull(),
  balanceAfter: doublePrecision("balance_after").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feesTable = pgTable("fees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  rate: doublePrecision("rate").notNull().default(0),
  fixedAmount: doublePrecision("fixed_amount").notNull().default(0),
  status: text("status").notNull().default("Active"),
});

export const commissionsTable = pgTable("commissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sourceUserId: integer("source_user_id"),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailLogsTable = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("Queued"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const smsLogsTable = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("Queued"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const systemSettingsTable = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  value: text("value").notNull().default(""),
  type: text("type").notNull().default("string"),
  group: text("group").notNull().default("general"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [uniqueIndex("system_settings_key_unique").on(table.key)]);

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id"),
  actorType: text("actor_type").notNull().default("admin"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull().default(""),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const securityEventsTable = pgTable("security_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  severity: text("severity").notNull().default("low"),
  eventType: text("event_type").notNull(),
  details: jsonb("details").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ipLogsTable = pgTable("ip_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  ipAddress: text("ip_address").notNull(),
  country: text("country").notNull().default(""),
  riskScore: integer("risk_score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deviceLogsTable = pgTable("device_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  deviceId: text("device_id").notNull(),
  deviceName: text("device_name").notNull().default(""),
  trusted: boolean("trusted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kycRequestsTable = pgTable("kyc_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  documentType: text("document_type").notNull(),
  documentRef: text("document_ref").notNull(),
  status: text("status").notNull().default("Pending"),
  reviewedBy: integer("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const withdrawalApprovalsTable = pgTable("withdrawal_approvals", {
  id: serial("id").primaryKey(),
  withdrawalType: text("withdrawal_type").notNull(),
  withdrawalId: integer("withdrawal_id").notNull(),
  status: text("status").notNull().default("Pending"),
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerUserId: integer("referrer_user_id").notNull(),
  referredUserId: integer("referred_user_id").notNull(),
  code: text("code").notNull(),
  status: text("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referralRewardsTable = pgTable("referral_rewards", {
  id: serial("id").primaryKey(),
  referralId: integer("referral_id").notNull(),
  userId: integer("user_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const promoCodesTable = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  rewardType: text("reward_type").notNull().default("bonus"),
  rewardValue: doublePrecision("reward_value").notNull().default(0),
  maxUses: integer("max_uses").notNull().default(0),
  usedCount: integer("used_count").notNull().default(0),
  status: text("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("promo_codes_code_unique").on(table.code)]);

export const userSettingsTable = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  settingKey: text("setting_key").notNull(),
  settingValue: text("setting_value").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const coinScheduleTable = pgTable("coin_schedule", {
  id: serial("id").primaryKey(),
  coinSymbol: text("coin_symbol").notNull(),
  listingAt: timestamp("listing_at", { withTimezone: true }),
  tradingStartAt: timestamp("trading_start_at", { withTimezone: true }),
  depositStartAt: timestamp("deposit_start_at", { withTimezone: true }),
  withdrawStartAt: timestamp("withdraw_start_at", { withTimezone: true }),
  buyEnabledAt: timestamp("buy_enabled_at", { withTimezone: true }),
  sellEnabledAt: timestamp("sell_enabled_at", { withTimezone: true }),
  tradeEnabled: boolean("trade_enabled").notNull().default(false),
  depositEnabled: boolean("deposit_enabled").notNull().default(false),
  withdrawEnabled: boolean("withdraw_enabled").notNull().default(false),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [uniqueIndex("coin_schedule_symbol_unique").on(table.coinSymbol)]);

export const serviceRegistryTable = pgTable("service_registry", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  category: text("category").notNull().default("core"),
  description: text("description").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [uniqueIndex("service_registry_name_unique").on(table.name)]);

export const roleServicePermissionsTable = pgTable("role_service_permissions", {
  id: serial("id").primaryKey(),
  roleName: text("role_name").notNull(),
  serviceName: text("service_name").notNull(),
  canRead: boolean("can_read").notNull().default(false),
  canWrite: boolean("can_write").notNull().default(false),
  canExecute: boolean("can_execute").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("role_service_perm_unique").on(table.roleName, table.serviceName)]);

export const smtpSettingsTable = pgTable("smtp_settings", {
  id: serial("id").primaryKey(),
  host: text("host").notNull().default(""),
  port: integer("port").notNull().default(587),
  username: text("username").notNull().default(""),
  password: text("password").notNull().default(""),
  fromEmail: text("from_email").notNull().default(""),
  fromName: text("from_name").notNull().default("CryptoX"),
  encryption: text("encryption").notNull().default("tls"),
  enabled: boolean("enabled").notNull().default(false),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  lastTestStatus: text("last_test_status").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const blockchainNodesTable = pgTable("blockchain_nodes", {
  id: serial("id").primaryKey(),
  network: text("network").notNull(),
  chainId: text("chain_id").notNull().default(""),
  rpcUrl: text("rpc_url").notNull(),
  wsUrl: text("ws_url").notNull().default(""),
  nodeType: text("node_type").notNull().default("mainnet"),
  provider: text("provider").notNull().default("custom"),
  status: text("status").notNull().default("Active"),
  priority: integer("priority").notNull().default(1),
  latencyMs: integer("latency_ms").notNull().default(0),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const aiIntegrationsTable = pgTable("ai_integrations", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  displayName: text("display_name").notNull(),
  apiKey: text("api_key").notNull().default(""),
  baseUrl: text("base_url").notNull().default(""),
  model: text("model").notNull().default(""),
  enabled: boolean("enabled").notNull().default(false),
  isDefault: boolean("is_default").notNull().default(false),
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [uniqueIndex("ai_integrations_provider_unique").on(table.provider)]);

export const apiKeysTable = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  platform: text("platform").notNull().default("mobile"),
  scopes: jsonb("scopes").notNull().default([]),
  status: text("status").notNull().default("Active"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiCodeLogsTable = pgTable("ai_code_logs", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  provider: text("provider").notNull().default("gemini"),
  action: text("action").notNull().default("generate"),
  targetPath: text("target_path").notNull().default(""),
  generatedCode: text("generated_code").notNull().default(""),
  status: text("status").notNull().default("Pending"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
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