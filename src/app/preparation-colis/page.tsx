"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listReservedCustomerOrders, markCustomerOrderShipped } from "@/lib/actions/customer-orders";

interface ReservedOrder {
  id: string;
  client: { name: string };
  lines: { quantity: number; product: { name: string } }[];
}

export default function PreparationColisPage() {
  const [orders, setOrders] = useState<ReservedOrder[]>([]);

  useEffect(() => {
    listReservedCustomerOrders().then(setOrders);
  }, []);

  async function handleShip(id: string) {
    const result = await markCustomerOrderShipped(id);
    if (result.success) {
      toast.success("Colis marqué comme expédié");
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="font-heading text-3xl font-semibold tracking-wide uppercase">Préparation du colis</h1>
      {orders.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          Aucune commande à préparer.
        </p>
      )}
      {orders.map((o) => (
        <div
          key={o.id}
          className="flex items-center justify-between rounded-md border border-border bg-card p-4 shadow-sm"
        >
          <div>
            <p className="font-medium">{o.client.name}</p>
            <p className="font-mono text-sm text-muted-foreground">
              {o.lines.map((l) => `${l.product.name} x${l.quantity}`).join(", ")}
            </p>
          </div>
          <Button onClick={() => handleShip(o.id)}>Marquer préparée / expédiée</Button>
        </div>
      ))}
    </div>
  );
}
