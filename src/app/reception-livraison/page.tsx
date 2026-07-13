"use client";

import { useEffect, useState } from "react";
import { listSentPurchaseOrders } from "@/lib/actions/delivery";
import { ReceiveDeliveryForm } from "./ReceiveDeliveryForm";

interface Order {
  id: string;
  supplier: { name: string };
  lines: { id: string; quantity: number; product: { name: string } }[];
}

export default function ReceptionLivraisonPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function refresh() {
    const data = await listSentPurchaseOrders();
    setOrders(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Réception de livraison</h1>
      {orders.length === 0 && <p className="text-muted-foreground">Aucune livraison en attente.</p>}
      {orders.map((order) => (
        <ReceiveDeliveryForm key={order.id} order={order} onDone={refresh} />
      ))}
    </div>
  );
}
