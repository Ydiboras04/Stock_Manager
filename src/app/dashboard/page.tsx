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

function countByStatus<T extends { status: string }>(orders: T[], labels: Record<string, string>): { status: string; count: number }[] {
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

      <ChartCard title="Chiffre d&apos;affaires">
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
