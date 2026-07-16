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

const STATUS_VARIANT: Record<string, "warning" | "default" | "secondary" | "success" | "destructive"> = {
  PENDING_VALIDATION: "warning",
  VALIDATED: "default",
  SENT: "secondary",
  DELIVERED: "success",
  REJECTED: "destructive",
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
      {localOrders.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          Aucune commande fournisseur.
        </p>
      )}
      {localOrders.map((order) => (
        <div
          key={order.id}
          className="flex items-center justify-between rounded-md border border-border bg-card p-4 shadow-sm"
        >
          <div className="space-y-1.5">
            <p className="font-medium">{order.supplier.name}</p>
            <p className="font-mono text-sm text-muted-foreground">
              {order.lines.map((l) => `${l.product.name} x${l.quantity}`).join(", ")}
            </p>
            <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
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
