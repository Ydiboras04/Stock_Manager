import { listPurchaseOrders } from "@/lib/actions/purchase-orders";
import { PurchaseOrdersList } from "./PurchaseOrdersList";

export default async function PurchaseOrdersPage() {
  const orders = await listPurchaseOrders();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Commandes fournisseurs</h1>
      <PurchaseOrdersList orders={orders} />
    </div>
  );
}
