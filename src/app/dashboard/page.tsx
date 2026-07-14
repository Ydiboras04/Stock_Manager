import { listProducts } from "@/lib/actions/products";
import { listCustomerOrders } from "@/lib/actions/customer-orders";
import { listPurchaseOrders } from "@/lib/actions/purchase-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Produits sous le seuil</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{belowThreshold.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Commandes clients en rupture</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{pendingCustomerOrders.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Commandes fournisseur à valider</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{pendingPurchaseOrders.length}</CardContent>
        </Card>
      </div>

      {belowThreshold.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-medium">Alertes stock</h2>
          <ul className="list-inside list-disc">
            {belowThreshold.map((p) => (
              <li key={p.id}>
                {p.name}: {p.quantity} / seuil {p.qMin}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
