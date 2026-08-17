# StockQuotes.React — Analysis & Improvement Plan

_Generated 2026-07-31 — architecture, security, quality and roadmap review._

## Stack (verified)

Next.js 16 (Pages Router) exported as a **fully static SPA** (`output: 'export'`) → GitHub Pages,
plus a Docker/nginx variant proxying `/api` to a LAN Azure Functions host.
Auth0 SPA SDK, axios, papaparse, react-window, Tailwind 4, Jest.
No server-side code in this repo — every line runs in the browser.

---

## 🔴 Critical — portfolio data is publicly readable

`components/features/YahooFinance.js:47` builds:

```
https://raw.githubusercontent.com/lionelschiepers/StockQuote.Portfolio/main/Portfolio/<email>.csv
```

Verified against the GitHub API:

```
"full_name": "lionelschiepers/StockQuotes.Portfolio", "private": false, "visibility": "public"
GET /contents/Portfolio → 200   (directory is enumerable)
```

Consequences:

- Anyone can list the directory and **harvest every user's email address**.
- Anyone can download a user's **complete transaction history** (shares, prices, dates).
- Auth0 only hides the UI — it protects nothing.
- The email is used as the identity key: emails are mutable PII and, with an
  unverified-email provider, are impersonatable.

**Fix:** move portfolios behind an authenticated endpoint (Azure Function validating the
Auth0 JWT), key files by `user.sub` instead of email, and make the storage private.
Rotate/purge the public repo history.

## 🟠 High — API calls are unauthenticated

No `getAccessTokenSilently` / `Authorization` header anywhere in `pages/`, `lib/`, `components/`.
`NEXT_PUBLIC_AUTH0_AUDIENCE` is commented out in `.env`, so the app never even requests an
access token. The Azure Functions are effectively an open Yahoo proxy — abuse, cost and
rate-limit exposure.

**Fix:** set an audience, send the bearer token on every API call, validate it server-side.

## 🟠 Medium

| Issue | Location |
| --- | --- |
| `.env` is **tracked in git** despite `.gitignore` (`git ls-files` shows it) | repo root — `git rm --cached .env` |
| Auth0 tokens in `localStorage` → XSS-exfiltratable | `pages/_app.js:17` — prefer in-memory + `useRefreshTokens` |
| CSP allows `'unsafe-eval'` **and** `'unsafe-inline'` for scripts; no `frame-ancestors`, HSTS, Referrer-Policy, Permissions-Policy; `add_header` without `always` | `nginx.conf` |
| GitHub Pages deployment gets **no security headers at all** — the nginx CSP applies only to the Docker path | `.github/workflows/deploy.yml` |
| `productionBrowserSourceMaps: true` ships full sources | `next.config.mjs:7` |
| nginx container runs as root (`USER nginx` commented out); base images unpinned | `Dockerfile` |
| No axios `timeout` → hung requests block the whole load | `Portfolio.js`, `ExchangeRates.js` |

---

## 🐛 Bugs found

1. **`components/layout/NavBar.js:15`** — `logout({ returnTo })` is the auth0-react **v1**
   shape. v2 requires `logout({ logoutParams: { returnTo } })`; today `returnTo` is silently
   ignored.
2. **`Portfolio.js` sell branch** — `while (remaining > 0)` reads `Transactions[length-1]`;
   a sell with no matching buy (or an oversell) yields `undefined` → `TypeError`, and a
   zero-share transaction loops forever.
3. **`Portfolio.js` `getDividendRatio`** — divides by `marketPrice` without a zero guard →
   `Infinity`/`NaN`.
4. **LIFO cost basis** — sells consume the *most recent* lot. Belgian/most reporting
   conventions use FIFO. Verify this is intentional.
5. **`YahooFinanceLoader.Load` mutates the caller's `symbols` array** (`splice`). Safe today
   by luck; make it pure.
6. **`CurrencyHelper.getCurrencyFromTicker`** defaults every unknown suffix to EUR — `.TO`,
   `.HK`, `.AX`, `.T` silently get the wrong FX. Same mismatch for `.SW` vs the tax table's
   `.VX`.

---

## 🏗 Framework & architecture advice

- **Biggest lever:** stop being a pure static SPA. Move to Vercel or Azure Static Web Apps
  with App Router route handlers as a BFF. The portfolio never leaves the server, tokens
  leave `localStorage`, headers become configurable — the critical finding, the high
  finding and half the mediums disappear at once.
- **Adopt TypeScript.** The domain model (`SecurityPosition`, FX, tax rates) is exactly
  where types pay off, and the API project is already TS.
- **Replace hand-rolled caching/retry with TanStack Query or SWR.** `fetchWithRetry` + the
  `yh:` localStorage TTL cache + the static `Cache.Rates` are ~150 lines reimplementing
  stale-while-revalidate, dedup and backoff.
- **Validate external data with zod** — the CSV and the Yahoo payload are untrusted inputs
  checked ad hoc today.
- **Money in floats.** Use `decimal.js` / `dinero.js` for cost basis and gains.
- **Split `YahooFinance.js` (21 KB).** Extract `usePortfolio()`, a pure `computeTotals()`
  module and a `<PortfolioTable/>`. It currently owns 17 `useState` calls, sorting,
  formatting and markup — and has no test, while smaller components do.

## 🎨 UI/UX

- **No error state:** load failures only `console.error` — the user sees an empty table.
  Add an error banner with retry.
- **Accessibility:** the div-based grid has no `role="table"/"row"/"columnheader"` and no
  `aria-sort`; gains/losses are encoded by **colour alone** (WCAG 1.4.1 fail) — add ▲/▼ or
  an explicit sign.
- **Perf:** `navigator.language` and a fresh `toLocaleString` options object are evaluated
  *per cell, per render*. Hoist memoized `Intl.NumberFormat` instances.
- **Mobile:** fixed `0 0 350px` flex columns don't reflow; add a card layout under `md`.
- **Missing:** ticker search, column show/hide, grouping by currency/sector, sticky first
  column.

## ✨ Feature ideas

- Editable transactions (replace the hand-edited CSV)
- Historical value chart from daily snapshots
- Allocation donut by sector / currency / region
- **XIRR / TWR** instead of naive gain %
- Realized vs unrealized split and a tax report (the withholding table already exists)
- Dividend calendar and upcoming earnings
- Multi-portfolio / multi-account support
- PWA offline mode

---

## Suggested first batch (safe, high value)

1. Fix the `logout` v2 API shape (`NavBar.js`).
2. Guard the `Portfolio.js` sell branch against missing/oversold lots.
3. Guard the divide-by-zero in `getDividendRatio`.
4. Untrack `.env` (`git rm --cached .env`).
5. Harden the CSP and add the missing security headers in `nginx.conf`.

Then plan the architectural move (BFF + private portfolio storage) that closes the critical
and high findings.
