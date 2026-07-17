# Dashboard Charts, Typography & Notification Translucency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the dashboard's plain KPI summary into a graphical view with three charts, refine the existing typography (no new fonts), and make the notification dropdown translucent.

**Architecture:** Three new client-component charts (Recharts) consuming data prepared by one new pure, unit-tested aggregation function plus data already fetched on the dashboard server component. New chart-only CSS color tokens (validated against the color-blindness/contrast checks in the `dataviz` skill, distinct from the existing muted brand `--chart-1..5` tokens which fail those checks when used at full chart scale) live alongside the existing token system in `globals.css`. Typography and notification-translucency changes are small, isolated CSS/className edits.

**Tech Stack:** Next.js 16 App Router, Recharts (new dependency), Vitest, Tailwind CSS 4 / CSS custom properties.

## Global Constraints

- Chart colors must be the specific validated hex values from the spec — do not substitute the existing `--primary`/`--warning` tokens directly into chart marks (they fail the chroma-floor accessibility check at chart scale): Series 1 (Ventes / Quantité / statut unique) is `#0A6FA8` light / `#3F97CE` dark; Series 2 (Achats) is `#C97A2B` light / `#C77E33` dark.
- The order-status chart uses a **single hue** with direct value labels — no new 4-color categorical palette (rejected in the spec after failing color-blindness adjacency checks).
- The stock-levels chart must not introduce a new color for the Qmin threshold — same hue family as the quantity bar, differentiated by opacity/fill treatment, not a new hue.
- No new fonts. Only `Oswald` (`--font-heading`), `Geist Sans`, `Geist Mono` — already loaded in `src/app/layout.tsx`.
- Notification translucency change is scoped to `src/components/notifications/NotificationBell.tsx`'s own `DropdownMenuContent` usage only — the shared `src/components/ui/dropdown-menu.tsx` component must not be modified (that would make every dropdown in the app translucent, not just the notification bell).
- Legend/axis/tooltip text in every chart must render in ink tokens (`var(--foreground)` / `var(--muted-foreground)`), never in a series' own color — per the "text wears text tokens" rule.

---

### Task 1: Chart color tokens and typography refinement

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: CSS custom properties `--chart-viz-1` / `--chart-viz-2` (root + `.dark`), consumed via `var(--chart-viz-1)` / `var(--chart-viz-2)` by the chart components built in Task 4. Produces a `.font-heading` line-height rule and a `.recharts-legend-item-text` color override, both global.

- [ ] **Step 1: Add the chart-only color tokens**

In `src/app/globals.css`, inside the `:root { ... }` block, add these two lines immediately after `--chart-5: #5B5F57;` (line 82):

```css
  --chart-viz-1: #0A6FA8;
  --chart-viz-2: #C97A2B;
```

Inside the `.dark { ... }` block, add these two lines immediately after `--chart-5: #96A099;` (line 121):

```css
  --chart-viz-1: #3F97CE;
  --chart-viz-2: #C77E33;
```

- [ ] **Step 2: Add the heading line-height refinement and the Recharts legend text-color override**

At the end of `src/app/globals.css`, after the existing `@layer base { ... }` block (after line 142), add:

```css
@layer base {
  .font-heading {
    line-height: 1.15;
    letter-spacing: 0.01em;
  }
}

.recharts-legend-item-text {
  color: var(--muted-foreground) !important;
}
```

- [ ] **Step 3: Verify no visual regression on existing pages**

Run: `npm run build`
Expected: `✓ Compiled successfully`, no CSS/TypeScript errors.

Run: `npm run dev`, open `/dashboard`, `/login`, and `/factures` in a browser. Confirm page titles (`Tableau de bord`, `Connexion`/`Stock//Mgr`, `Factures`) still render correctly with slightly tighter line spacing — no text clipping or overlap. Stop the dev server.

- [ ] **Step 4: Verify all page titles already use the standard title class (no drift to fix)**

Run: `grep -rn 'h1 className' src/app`
Expected output: every page title (`/dashboard`, `/catalogue/produits`, `/catalogue/fournisseurs`, `/commandes-clients`, `/commandes-clients/nouvelle`, `/commandes-fournisseurs`, `/preparation-colis`, `/reception-livraison`, `/notifications`, `/factures`) uses exactly `font-heading text-3xl font-semibold tracking-wide uppercase` (the login page intentionally differs — `text-2xl` inside a dark stamped header band — that is not drift, it's a distinct context). If any non-login page's `<h1>` differs from the standard class, fix it to match before proceeding; based on the current codebase state this is expected to require no changes.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add validated chart color tokens and typography refinements"
```

---

### Task 2: Notification dropdown translucency

**Files:**
- Modify: `src/components/notifications/NotificationBell.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: no new interface — purely visual.

- [ ] **Step 1: Add translucency to the notification dropdown panel**

In `src/components/notifications/NotificationBell.tsx`, replace:

```tsx
      <DropdownMenuContent align="end" className="w-80">
```

with:

```tsx
      <DropdownMenuContent align="end" className="w-80 bg-popover/85 backdrop-blur-md">
```

- [ ] **Step 2: Verify build and lint**

Run:
```bash
npm run lint
npm run build
```
Expected: both succeed with no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. Log in as either seeded user, scroll a page so there's visible content behind the header, click the notification bell. Confirm the dropdown panel shows a frosted/translucent effect (page content faintly visible through it, blurred) while notification text remains clearly legible. Confirm no other dropdown menu in the app (e.g. the role Select on `/catalogue/produits`'s create-product form) changed appearance — only the notification bell's panel. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/notifications/NotificationBell.tsx
git commit -m "style: make notification dropdown panel translucent"
```

---

### Task 3: Pure revenue-series aggregation logic

**Files:**
- Create: `src/lib/business/dashboard-charts.ts`
- Create: `src/lib/business/dashboard-charts.test.ts`

**Interfaces:**
- Consumes: nothing (pure, framework-free — same style as `src/lib/business/reorder.ts`).
- Produces: `InvoiceForChart` interface and `buildRevenueSeries(invoices: InvoiceForChart[]): RevenuePoint[]`, consumed by Task 5's dashboard page.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/business/dashboard-charts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildRevenueSeries, type InvoiceForChart } from "./dashboard-charts";

describe("buildRevenueSeries", () => {
  it("returns an empty array for no invoices", () => {
    expect(buildRevenueSeries([])).toEqual([]);
  });

  it("buckets a single sale invoice by its issued date", () => {
    const invoices: InvoiceForChart[] = [
      { type: "SALE", issuedAt: new Date("2026-07-15T10:00:00Z"), totalCents: 10800 },
    ];
    expect(buildRevenueSeries(invoices)).toEqual([
      { date: "2026-07-15", salesCents: 10800, purchasesCents: 0 },
    ]);
  });

  it("sums multiple invoices of the same type on the same day", () => {
    const invoices: InvoiceForChart[] = [
      { type: "SALE", issuedAt: new Date("2026-07-15T08:00:00Z"), totalCents: 10800 },
      { type: "SALE", issuedAt: new Date("2026-07-15T14:00:00Z"), totalCents: 2400 },
    ];
    expect(buildRevenueSeries(invoices)).toEqual([
      { date: "2026-07-15", salesCents: 13200, purchasesCents: 0 },
    ]);
  });

  it("keeps sale and purchase totals separate on the same day", () => {
    const invoices: InvoiceForChart[] = [
      { type: "SALE", issuedAt: new Date("2026-07-15T08:00:00Z"), totalCents: 10800 },
      { type: "PURCHASE", issuedAt: new Date("2026-07-15T09:00:00Z"), totalCents: 11940 },
    ];
    expect(buildRevenueSeries(invoices)).toEqual([
      { date: "2026-07-15", salesCents: 10800, purchasesCents: 11940 },
    ]);
  });

  it("sorts multiple days chronologically regardless of input order", () => {
    const invoices: InvoiceForChart[] = [
      { type: "SALE", issuedAt: new Date("2026-07-17T08:00:00Z"), totalCents: 5000 },
      { type: "SALE", issuedAt: new Date("2026-07-15T08:00:00Z"), totalCents: 3000 },
      { type: "PURCHASE", issuedAt: new Date("2026-07-16T08:00:00Z"), totalCents: 4000 },
    ];
    expect(buildRevenueSeries(invoices)).toEqual([
      { date: "2026-07-15", salesCents: 3000, purchasesCents: 0 },
      { date: "2026-07-16", salesCents: 0, purchasesCents: 4000 },
      { date: "2026-07-17", salesCents: 5000, purchasesCents: 0 },
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/business/dashboard-charts.test.ts`
Expected: FAIL — `Failed to resolve import "./dashboard-charts"` (the module doesn't exist yet).

- [ ] **Step 3: Implement the pure function**

Create `src/lib/business/dashboard-charts.ts`:

```ts
export interface InvoiceForChart {
  type: "SALE" | "PURCHASE";
  issuedAt: Date;
  totalCents: number;
}

export interface RevenuePoint {
  date: string;
  salesCents: number;
  purchasesCents: number;
}

export function buildRevenueSeries(invoices: InvoiceForChart[]): RevenuePoint[] {
  const byDate = new Map<string, { salesCents: number; purchasesCents: number }>();

  for (const invoice of invoices) {
    const date = invoice.issuedAt.toISOString().slice(0, 10);
    const entry = byDate.get(date) ?? { salesCents: 0, purchasesCents: 0 };
    if (invoice.type === "SALE") {
      entry.salesCents += invoice.totalCents;
    } else {
      entry.purchasesCents += invoice.totalCents;
    }
    byDate.set(date, entry);
  }

  return Array.from(byDate.entries())
    .map(([date, totals]) => ({ date, ...totals }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/business/dashboard-charts.test.ts`
Expected: `Test Files  1 passed (1)`, `Tests  5 passed (5)`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/business/dashboard-charts.ts src/lib/business/dashboard-charts.test.ts
git commit -m "feat: add pure revenue-series aggregation logic for dashboard charts"
```

---

### Task 4: Chart components

**Files:**
- Modify: `package.json` (new dependency)
- Create: `src/components/dashboard/RevenueChart.tsx`
- Create: `src/components/dashboard/StockLevelsChart.tsx`
- Create: `src/components/dashboard/OrderStatusChart.tsx`

**Interfaces:**
- Consumes: `RevenuePoint` type from `src/lib/business/dashboard-charts.ts` (Task 3); `--chart-viz-1`/`--chart-viz-2` CSS tokens (Task 1).
- Produces: `RevenueChart({ data: RevenuePoint[] })`, `StockLevelsChart({ products: { id: string; name: string; quantity: number; qMin: number }[] })`, `OrderStatusChart({ data: { status: string; count: number }[] })` — all named exports, consumed by Task 5's dashboard page.

- [ ] **Step 1: Install Recharts**

Run: `npm install recharts`
Expected: `package.json` gains `"recharts"` under `dependencies`.

- [ ] **Step 2: Create the revenue chart**

Create `src/components/dashboard/RevenueChart.tsx`:

```tsx
"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { RevenuePoint } from "@/lib/business/dashboard-charts";

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune facture pour le moment.</p>;
  }

  const formatted = data.map((point) => ({
    date: point.date,
    Ventes: point.salesCents / 100,
    Achats: point.purchasesCents / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={formatted} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}€`} />
        <Tooltip
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: "var(--foreground)" }}
          formatter={(value: number) => `${value.toFixed(2)} €`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="Ventes" stroke="var(--chart-viz-1)" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="Achats" stroke="var(--chart-viz-2)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Create the stock levels chart**

Create `src/components/dashboard/StockLevelsChart.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ProductForChart {
  id: string;
  name: string;
  quantity: number;
  qMin: number;
}

export function StockLevelsChart({ products }: { products: ProductForChart[] }) {
  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun produit.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={products} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: "var(--foreground)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="quantity" name="Quantité" fill="var(--chart-viz-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="qMin" name="Seuil Qmin" fill="var(--chart-viz-1)" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Create the order status chart**

Create `src/components/dashboard/OrderStatusChart.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer } from "recharts";

export interface StatusCount {
  status: string;
  count: number;
}

export function OrderStatusChart({ data }: { data: StatusCount[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune commande.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="status" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: "var(--foreground)" }}
        />
        <Bar dataKey="count" fill="var(--chart-viz-1)" radius={[4, 4, 0, 0]}>
          <LabelList dataKey="count" position="top" fill="var(--foreground)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: `✓ Compiled successfully`, no TypeScript errors. These three components aren't imported anywhere yet (Task 5 wires them in), so this only verifies they compile in isolation — that's expected and sufficient for this task.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/dashboard/RevenueChart.tsx src/components/dashboard/StockLevelsChart.tsx src/components/dashboard/OrderStatusChart.tsx
git commit -m "feat: add revenue, stock-levels, and order-status chart components"
```

---

### Task 5: Wire charts into the dashboard page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `listInvoices` from `src/lib/actions/invoices.ts` (existing); `buildRevenueSeries` from `src/lib/business/dashboard-charts.ts` (Task 3); `RevenueChart`, `StockLevelsChart`, `OrderStatusChart` from `src/components/dashboard/` (Task 4).

- [ ] **Step 1: Replace the dashboard page**

Replace the full contents of `src/app/dashboard/page.tsx`:

```tsx
import { listProducts } from "@/lib/actions/products";
import { listCustomerOrders } from "@/lib/actions/customer-orders";
import { listPurchaseOrders } from "@/lib/actions/purchase-orders";
import { listInvoices } from "@/lib/actions/invoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildRevenueSeries } from "@/lib/business/dashboard-charts";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { StockLevelsChart } from "@/components/dashboard/StockLevelsChart";
import { OrderStatusChart } from "@/components/dashboard/OrderStatusChart";

const KPI_ACCENT = {
  primary: "border-l-primary",
  warning: "border-l-warning",
  destructive: "border-l-destructive",
} as const;

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: keyof typeof KPI_ACCENT;
}) {
  return (
    <Card className={`border-l-4 ${KPI_ACCENT[accent]} rounded-md`}>
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="font-mono text-4xl font-semibold tabular-nums">{value}</CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const CUSTOMER_STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  STOCK_INSUFFICIENT: "Stock insuffisant",
  RESERVED: "Réservée",
  SHIPPED: "Expédiée",
};

const PURCHASE_STATUS_LABEL: Record<string, string> = {
  PENDING_VALIDATION: "À valider",
  VALIDATED: "Validée",
  SENT: "Envoyée",
  DELIVERED: "Livrée",
  REJECTED: "Rejetée",
};

function countByStatus<T extends { status: string }>(
  orders: T[],
  labels: Record<string, string>
): { status: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const order of orders) {
    counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([status, count]) => ({
    status: labels[status] ?? status,
    count,
  }));
}

export default async function DashboardPage() {
  const [products, customerOrders, purchaseOrders, invoices] = await Promise.all([
    listProducts(),
    listCustomerOrders(),
    listPurchaseOrders(),
    listInvoices(),
  ]);

  const belowThreshold = products.filter((p) => p.quantity < p.qMin);
  const pendingCustomerOrders = customerOrders.filter((o) => o.status === "STOCK_INSUFFICIENT");
  const pendingPurchaseOrders = purchaseOrders.filter((o) => o.status === "PENDING_VALIDATION");

  const revenueSeries = buildRevenueSeries(
    invoices.map((invoice) => ({
      type: invoice.type,
      issuedAt: invoice.issuedAt,
      totalCents: invoice.totalCents,
    }))
  );
  const customerStatusCounts = countByStatus(customerOrders, CUSTOMER_STATUS_LABEL);
  const purchaseStatusCounts = countByStatus(purchaseOrders, PURCHASE_STATUS_LABEL);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <p className="font-heading text-[11px] font-semibold tracking-[0.3em] text-primary uppercase">
          Vue d&apos;ensemble
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-wide uppercase">Tableau de bord</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Produits sous le seuil" value={belowThreshold.length} accent="warning" />
        <KpiCard label="Commandes clients en rupture" value={pendingCustomerOrders.length} accent="destructive" />
        <KpiCard label="Commandes fournisseur à valider" value={pendingPurchaseOrders.length} accent="primary" />
      </div>

      <ChartCard title="Chiffre d'affaires">
        <RevenueChart data={revenueSeries} />
      </ChartCard>

      <ChartCard title="Niveaux de stock">
        <StockLevelsChart products={products} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title="Commandes clients par statut">
          <OrderStatusChart data={customerStatusCounts} />
        </ChartCard>
        <ChartCard title="Commandes fournisseur par statut">
          <OrderStatusChart data={purchaseStatusCounts} />
        </ChartCard>
      </div>

      {belowThreshold.length > 0 && (
        <div>
          <h2 className="mb-3 font-heading text-sm font-semibold tracking-[0.14em] text-foreground uppercase">
            Alertes stock
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {belowThreshold.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between bg-card px-4 py-2.5 text-sm"
              >
                <span className="font-medium">{p.name}</span>
                <span className="font-mono text-warning tabular-nums">
                  {p.quantity} / seuil {p.qMin}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build and lint**

Run:
```bash
npm run lint
npm run build
```
Expected: both succeed, no TypeScript errors. `/dashboard` remains in the route list.

Run: `npm test`
Expected: all tests pass (18 pre-existing at the start of this plan + 5 new from Task 3 = 23 total — exact pre-existing count may differ slightly depending on what's landed since; the important thing is zero failures).

- [ ] **Step 3: Manual verification**

No browser automation is available in this environment. Run: `npm run dev`, log in as either seeded user, go to `/dashboard`. Confirm:
- The revenue chart renders (or shows "Aucune facture pour le moment." if no invoices exist yet — if so, first walk through creating and shipping a customer order and receiving a purchase order delivery via the existing flows to generate at least one of each invoice type, per the facturation feature, then reload `/dashboard`).
- The stock levels chart shows a bar per seeded product with a lighter secondary bar for its Qmin threshold.
- Both order-status charts show a bar per distinct status present in the data, with a numeric label above each bar.
- No console errors in the browser devtools.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: wire revenue, stock-levels, and order-status charts into the dashboard"
```

---

### Task 6: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, zero failures.

- [ ] **Step 2: Run lint and build**

Run:
```bash
npm run lint
npm run build
```
Expected: lint reports no errors; build completes successfully with no type errors.

- [ ] **Step 3: Full manual walkthrough**

Run: `npm run dev` and, using a browser:
1. Log in, visit `/dashboard`. Confirm all three chart types render with the validated color tokens (a muted steel-blue and a warm amber, not the flatter brand primary/warning colors used elsewhere in the UI).
2. Click the notification bell from any page. Confirm the panel is visibly translucent/blurred against the page behind it, and text stays legible.
3. Spot-check page titles across `/dashboard`, `/factures`, `/catalogue/produits`, `/commandes-clients` — confirm consistent heading style and the slightly tighter line spacing from Task 1.
4. Toggle the browser/OS to dark mode (or use the app's theme toggle if present) and repeat steps 1-3, confirming the dark-mode chart color variants render correctly and remain legible.

Expected: no errors in the browser console or server logs at any step.

Stop the dev server.

- [ ] **Step 4: Commit final state if any fixes were made during verification**

```bash
git add -A
git commit -m "chore: final verification pass for dashboard charts and styling"
```
(Skip this commit if no changes were needed.)

---
