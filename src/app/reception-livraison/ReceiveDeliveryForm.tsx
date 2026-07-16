"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { receiveDelivery } from "@/lib/actions/delivery";

interface Line {
  id: string;
  quantity: number;
  product: { name: string };
}

interface Order {
  id: string;
  supplier: { name: string };
  lines: Line[];
}

export function ReceiveDeliveryForm({ order, onDone }: { order: Order; onDone: () => void }) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(order.lines.map((l) => [l.id, l.quantity]))
  );
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setPending(true);
    const result = await receiveDelivery(order.id, quantities);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast[result.conform ? "success" : "error"](
      result.conform ? "Livraison conforme, stock mis à jour" : "Livraison non conforme, rapport généré"
    );
    onDone();
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4 shadow-sm">
      <p className="font-medium">{order.supplier.name}</p>
      {order.lines.map((line) => (
        <div key={line.id} className="flex items-center gap-3">
          <span className="w-48 font-mono text-sm">
            {line.product.name} <span className="text-muted-foreground">(commandé: {line.quantity})</span>
          </span>
          <Input
            type="number"
            min={0}
            value={quantities[line.id]}
            onChange={(e) => setQuantities((prev) => ({ ...prev, [line.id]: Number(e.target.value) }))}
            className="w-24 font-mono"
          />
        </div>
      ))}
      <Button onClick={handleSubmit} disabled={pending}>
        Valider la réception
      </Button>
    </div>
  );
}
