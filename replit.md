# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### crypto-exchange (React + Vite)
- **Path**: `artifacts/crypto-exchange/`
- **Preview path**: `/` (root)
- **Description**: A Binance-inspired cryptocurrency exchange frontend UI
- **Tech**: React, Vite, Tailwind CSS, Recharts, Framer Motion, Wouter, Radix UI
- **Theme**: Dark theme with #fcd535 yellow accent (Binance-style)
- **Pages**:
  - `/` — Home page with price ticker, hero, stats, trending coin table
  - `/trade` — Full trading interface with order book, chart, buy/sell panel, open orders
  - `/wallet` — Portfolio dashboard with allocation chart, asset list, transaction history
  - `/admin` — Mock admin panel for coin listings, trading pair deletion/creation, user management, and fee setup
  - `/login` — Login with email/password, social login
  - `/register` — Registration with password strength indicator
- **Mock data**: `src/lib/mock-data.ts` (coins, candles, order book, admin coins/pairs/users/fees)
- **Admin data**: Browser-local mock state only; no live database is connected or required for admin actions
- **Layout**: Sticky navbar, footer (hidden on trading page)

### exchange-admin (React + Vite)
- **Path**: `artifacts/exchange-admin/`
- **Preview path**: `/` (root)
- **Description**: Registered preview app containing the CryptoX exchange UI and mock admin panel
- **Admin features**: Coin list/create/delete, trading pair create/delete, user management, and fee setup
- **Data source**: Mock frontend state only; no live database required
