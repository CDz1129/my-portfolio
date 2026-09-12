# My Portfolio

> A local-first personal asset manager. **Your data never leaves your browser.**

[中文](./README.md) · English

Track A-shares, Hong Kong and US stocks, crypto and every other asset or liability through a Chinese/English UI. No account, no login, no cloud database — the server stores none of your data.

## Privacy promise

Most money apps ask you to sign up and upload your holdings to someone else's server. My Portfolio is the opposite: **all data lives in your own browser** (IndexedDB), and the code is fully open to audit.

- Accounts, holdings, transactions and settings are stored in browser IndexedDB (database `my-portfolio`).
- Demo data lives in a **separate database** (`my-portfolio-demo`), completely isolated from your real data, and can be toggled at any time.
- The market service is a **stateless proxy**: it forwards public requests to data providers and never receives, logs or stores your portfolio.
- **No account, no login, no tracking, no analytics.**
- The only outbound requests fetch public market data (quotes, FX rates, symbol search); none of them contain personal information.

Data is bound to "the same browser + the same origin": clearing site data, using incognito, or switching browsers yields an independent copy. Export a JSON backup regularly from **Settings → Backup & restore**.

## Features

- **Multiple accounts**: liquid funds, investments, fixed assets, receivables and liabilities, with groups, archiving and custom colors.
- **Holdings**: symbol search auto-fills name / market / currency and fetches the live price; shares, cost and price tracked; sorted by market value.
- **Transactions**: income, expense, transfer, buy, sell and balance adjustment.
- **Dashboard**: net worth, total assets / liabilities, allocation, investment performance and net-worth trend.
- **Two allocation lenses**: by **account type**, or by **liquidity** (broker cash counts as liquid; only holdings count as investment assets).
- **Multi-currency**: 12 currencies; switch the display currency of total assets right from the home header.
- **Bilingual UI**: switch between Chinese and English in Settings; number and date formats follow.
- **Market sync**: configurable auto-update frequency (daily / weekly / monthly / quarterly / never), quarterly by default, with manual refresh anytime.
- **Collapsible sections**: account-type sections on Home and Accounts collapse/expand with remembered state.
- **Data management**: CSV export (transactions), full JSON backup & restore, and a safe clear that requires typed confirmation.
- **PWA**: installable, offline-capable, light/dark theme.

## Tech stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **Styling**: Tailwind CSS
- **Local storage**: Dexie (IndexedDB) + dexie-react-hooks (reactive live queries)
- **Charts**: Recharts · **Icons**: lucide-react · **PWA**: vite-plugin-pwa
- **Testing**: Vitest + Testing Library
- **Market proxy**: shared logic for Node (local) and Cloudflare Workers (cloud)

## Architecture notes

- **Event-sourced ledger**: an account stores only `openingBalance`; every other balance is replayed from transactions, so history and trends can be recomputed freely.
- **Demo isolation**: demo data lives in its own database; demo data that older builds mixed into the real database is auto-migrated on startup.
- **Market fallback chain**: Yahoo first, then Tencent (A / HK / US, GBK decoded) and OKX (crypto).
- **i18n**: a small in-house dictionary + React Context, no third-party dependency.
- **Settings vs data**: base currency, rates, theme, language and sync frequency are app preferences, kept in the real database and shared across views.

## Quick start

Requires Node 22+ (the wrangler used for Cloudflare deployment needs Node 22 or newer).

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm start          # build and serve locally at http://localhost:4173
npm test           # run the full test suite
```

Common scripts:

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server (with market proxy middleware) |
| `npm run build` | Type-check + production build |
| `npm start` | Build and start the local server (port 4173) |
| `npm run serve` | Start the local server only (no rebuild) |
| `npm test` | Run all tests |
| `npm run coverage` | Coverage report |
| `npm run deploy` | Build and deploy to Cloudflare Workers |
| `npm run service:install` | macOS login autostart (launchd) |

## Language & currency

- **Language**: Settings → General → Language, choose Chinese or English. Number and date formatting follows (`zh-CN` / `en-US`).
- **Base currency**: pick it in Settings, or switch it quickly from the top-right of the net-worth card on Home. Everything is converted into this currency.
- **Exchange rates**: only the foreign currencies you actually use (across accounts and holdings) are listed. They convert foreign-currency assets into the base currency for totals, allocation and trends.

## Market data sources

| Use | Source |
| --- | --- |
| HK / US / A-share quotes | Yahoo Finance, falling back to Tencent |
| Crypto quotes | Yahoo, falling back to OKX |
| FX rates | open.er-api.com |
| Symbol search | Tencent smartbox + Yahoo, merged and de-duplicated |

All public data. Under a restricted network each source degrades gracefully, so local bookkeeping is unaffected; without a market source, prices can be entered fully by hand.

## Deployment

### Cloudflare Workers (recommended, single deployment)

The repo ships `worker.mjs` and `wrangler.toml`; one Worker serves the static frontend and handles `/api/*`:

```bash
npx wrangler login
npm run deploy
```

You can also connect it to Git in Cloudflare: Workers & Pages → your Worker → Settings → Builds → Connect to Git, with build command `npm run build` and deploy command `npx wrangler deploy`, then every push redeploys automatically.

### GitHub Pages (frontend only)

GitHub Pages is static-only and cannot run `/api`. You'd set `base: '/<repo>/'`, add a `404.html` SPA fallback, host the market proxy elsewhere, and point the client at it via `VITE_MARKET_API`. All local features work without a market source.

## API protection

- **Rate limiting**: `wrangler.toml` includes a Cloudflare Rate Limiting binding (default 60 requests / 60s per IP on `/api/*`), no custom domain needed; remove the `[[ratelimits]]` block to disable.
- **Optional token**: set the `API_TOKEN` secret (`npx wrangler secret put API_TOKEN`) and requests must send `X-API-Token`; the frontend provides the same value via the `VITE_MARKET_API_TOKEN` build variable. Note a token in a static frontend only deters scrapers, it is not a real secret.
- **Edge cache**: quote / rate / search responses are cached at the edge for 60–300s, cutting upstream calls.

## Data & backup

- Data lives only in your browser by default. To migrate or archive, use **Settings → Backup & restore** to export JSON (all accounts, holdings, groups, transactions and settings).
- Restoring overwrites current data; JSON that isn't from this app is rejected.
- User data is never uploaded; the repository contains no data files.

## Project layout

```
src/
  domain/       Pure business logic: types, currency conversion, event-sourced ledger, overview model
  db/           Dexie database & repositories (CRUD, CSV, backup/restore, demo data)
  store/        App use-cases (actions), data mode (real / demo) and sync
  i18n/         Chinese/English dictionary and provider
  components/   UI components (forms, charts, search, nav, mode bar, account badges)
  pages/        Route pages
  lib/          Market API client, theme, collapse state, utilities
server/         Market proxy (Node server + Vite middleware + shared market logic)
worker.mjs      Cloudflare Worker entry (static assets + /api)
wrangler.toml   Cloudflare deployment config
scripts/        macOS launchd service install/uninstall, icon generation
```

## Testing

```bash
npm test          # all tests
npm run coverage  # coverage report
```

Covers domain logic, the database repositories, market parsing & fallback, Worker routes, i18n dictionary parity, and key UI components.

## Roadmap

- [ ] DCA / rebalancing helpers
- [ ] Richer reports and exports
- [ ] Optional self-hosted sync backend (offline by default)

## Contributing

Issues and pull requests are welcome. Please keep the "local-first, privacy-first" direction and add tests for new logic (this project is largely TDD).

## License

[MIT](./LICENSE)

---

This project is for personal asset tracking only and is not investment advice.
