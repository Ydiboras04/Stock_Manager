"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { validatePurchaseOrder, rejectPurchaseOrder, emitPurchaseOrder } from "@/lib/actions/purchase-orders";

interface Line {
  quantity: number;
  product: { name: string };
}

interface Order {
  id: string;
  status: string;
  supplier: { name: string };
  lines: Line[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_VALIDATION: "À valider",
  VALIDATED: "Validée",
  SENT: "Envoyée",
  DELIVERED: "Livrée",
  REJECTED: "Rejetée",
};

export function PurchaseOrdersList({ orders }: { orders: Order[] }) {
  const [localOrders, setLocalOrders] = useState(orders);

  function updateStatus(id: string, status: string) {
    setLocalOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  async function handleValidate(id: string) {
    const result = await validatePurchaseOrder(id);
    if (result.success) {
      toast.success("Commande validée");
      updateStatus(id, "VALIDATED");
    }
  }

  async function handleReject(id: string) {
    const result = await rejectPurchaseOrder(id);
    if (result.success) {
      toast.success("Commande rejetée");
      updateStatus(id, "REJECTED");
    }
  }

  async function handleEmit(id: string) {
    const result = await emitPurchaseOrder(id);
    if (result.success) {
      toast.success("Commande émise au fournisseur");
      updateStatus(id, "SENT");
    }
  }

  return (
    <div className="space-y-3">
      {localOrders.map((order) => (
        <div key={order.id} className="flex items-center justify-between rounded border p-4">
          <div>
            <p className="font-medium">{order.supplier.name}</p>
            <p className="text-sm text-muted-foreground">
              {order.lines.map((l) => `${l.product.name} x${l.quantity}`).join(", ")}
            </p>
            <Badge variant="secondary" className="mt-1">
              {STATUS_LABEL[order.status]}
            </Badge>
          </div>
          <div className="space-x-2">
            {order.status === "PENDING_VALIDATION" && (
              <>
                <Button onClick={() => handleValidate(order.id)}>Valider</Button>
                <Button variant="destructive" onClick={() => handleReject(order.id)}>
                  Rejeter
                </Button>
              </>
            )}
            {order.status === "VALIDATED" && <Button onClick={() => handleEmit(order.id)}>Émettre au fournisseur</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}
