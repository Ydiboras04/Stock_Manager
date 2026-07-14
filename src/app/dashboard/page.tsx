import { listProducts } from "@/lib/actions/products";
import { listCustomerOrders } from "@/lib/actions/customer-orders";
import { listPurchaseOrders } from "@/lib/actions/purchase-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default async function DashboardPage() {
  const [products, customerOrders, purchaseOrders] = await Promise.all([
    listProducts(),
    listCustomerOrders(),
    listPurchaseOrders(),
  ]);

  const belowThreshold = products.filter((p) => p.quantity < p.qMin);
  const pendingCustomerOrders = customerOrders.filter((o) => o.status === "STOCK_INSUFFICIENT");
  const pendingPurchaseOrders = purchaseOrders.filter((o) => o.status === "PENDING_VALIDATION");

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
