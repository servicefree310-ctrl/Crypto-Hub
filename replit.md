# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies. The main product is CryptoX, a Binance-inspired cryptocurrency exchange with a live PostgreSQL-backed admin panel.

## New Features (added)

- **Coin Listing Schedule** — per-coin listing time, trading start, deposit/withdraw windows, buy/sell enable times
- **Service Registry** — register and enable/disable any platform service; role-level service permissions (read/write/execute)
- **Blockchain Nodes** — manage RPC/WS endpoints per network with latency checks
- **Email/SMTP Setup** — configure SMTP server with test connection, encryption options, quick-setup guides
- **API Keys** — generate/revoke keys for mobile, web, server platforms with scope management
- **AI Integrations** — connect Gemini, ChatGPT, Claude, or any OpenAI-compatible API
- **AI Code Tool** — generate code, modify components, change design, add DB tables/rows from admin panel using connected AI APIs

## New DB Tables

- `coin_schedule` — listing/trading/deposit/withdraw schedule per coin
- `service_registry` — platform service registry with enable/disable
- `role_service_permissions` — role → service → canRead/canWrite/canExecute
- `smtp_settings` — SMTP email server configuration
- `blockchain_nodes` — blockchain RPC/WS node management
- `ai_integrations` — AI provider config (Gemini/OpenAI/Anthropic/custom)
- `api_keys` — API key management with scopes and platform
- `ai_code_logs` — log of AI code generation requests and results

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (API), Vite (web apps)

## Key Commands

- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes in development
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/crypto-exchange run dev` — run main exchange web app and local API server with Vite proxying `/api`
- `pnpm --filter @workspace/exchange-admin run dev` — run standalone admin web app

## API and Database

- API routes live in `artifacts/api-server/src/routes/`.
- Admin API routes are implemented in `artifacts/api-server/src/routes/admin.ts` under `/api/admin/*`.
- Admin OpenAPI contract lives in `lib/api-spec/openapi.yaml`.
- Generated React Query hooks and schemas live in `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/`.
- Admin Drizzle schema lives in `lib/db/src/schema/admin.ts`.
- Admin and exchange schema lives in one file: `lib/db/src/schema/admin.ts`.
- Core admin tables:
  - `admin_coins`
  - `admin_pairs`
  - `admin_users`
  - `admin_fee_tiers`
  - `admin_activity`
- Expanded Binance-like exchange tables include users/auth, roles/permissions, wallets, INR deposits/withdrawals, crypto deposits/withdrawals, spot markets/orders/trades, futures markets/accounts/orders/positions/liquidations/funding, margin, global ledger, notifications, security/audit logs, KYC, withdrawal approvals, referrals, promo codes, system settings, payment methods, and payment gateways.
- The admin API seeds starter live records on first request if the admin coin table is empty.
- The admin API also exposes `/api/admin/exchange/table-counts`, `/api/admin/exchange/full-db`, `/api/admin/currency-networks`, `/api/admin/system-settings`, `/api/admin/payment-methods`, and `/api/admin/payment-gateways` for advanced DB-connected admin controls.

## Artifacts

### crypto-exchange (React + Vite)

- **Path**: `artifacts/crypto-exchange/`
- **Preview path**: `/` (root)
- **Description**: A Binance-inspired cryptocurrency exchange frontend UI
- **Tech**: React, Vite, Tailwind CSS, Recharts, Framer Motion, Wouter, Radix UI, React Query
- **Theme**: Dark theme with #fcd535 yellow accent (Binance-style)
- **Pages**:
  - `/` — Home page with price ticker, hero, stats, trending coin table
  - `/trade` — Full trading interface with order book, chart, buy/sell panel, open orders
  - `/futures` — Futures trading UI
  - `/wallet` — Portfolio dashboard with allocation chart, asset list, transaction history
  - `/admin` — Live database-backed admin panel for coin listings, trading pairs, users, fee tiers, and recent admin activity
  - `/login` — Login with email/password, social login
  - `/register` — Registration with password strength indicator
- **Mock data**: `src/lib/mock-data.ts` still powers non-admin exchange screens.
- **Admin data**: Uses generated React Query hooks plus direct admin API calls and persists to PostgreSQL via `/api/admin/*`.
- **Advanced admin sections**: Full DB table counts, network management, payment gateways, payment methods, system settings, coin/user edit toggles, futures positions, KYC queues, deposits, withdrawals, and transaction ledger.
- **Layout**: Sticky navbar, footer hidden on trading/admin pages.

### exchange-admin (React + Vite)

- **Path**: `artifacts/exchange-admin/`
- **Description**: Standalone admin-only CryptoX operations panel, separate from the user exchange app.
- **Tech**: React + Vite, Tailwind CSS, Axios API service, React Router protected routes.
- **Authentication**: Admin login uses `POST /api/admin/login` and stores the returned signed session token in browser session storage. Default development credentials are `admin@cryptox.local` / `admin123` unless `ADMIN_DEMO_PASSWORD` is set.
- **Admin features**: Protected dashboard with stats/charts, user management with block/unblock, KYC approve/reject, INR deposit approvals, INR withdrawal approvals, crypto withdrawal approvals, transactions/ledger table, market enable/disable, roles and permissions, settings.
- **Data source**: PostgreSQL via the shared API server `/api/admin/*` routes.
- **Local behavior**: `pnpm --filter @workspace/exchange-admin run dev` starts the admin frontend and proxies `/api` to the shared API server on port `8080`.
