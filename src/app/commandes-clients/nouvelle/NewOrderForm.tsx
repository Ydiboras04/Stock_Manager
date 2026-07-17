"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createCustomerOrder, type OrderLineInput } from "@/lib/actions/customer-orders";

interface Option {
  id: string;
  name: string;
}

export function NewOrderForm({ clients, products }: { clients: Option[]; products: Option[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [lines, setLines] = useState<OrderLineInput[]>([{ productId: "", quantity: 1 }]);
  const [pending, setPending] = useState(false);

  function updateLine(index: number, patch: Partial<OrderLineInput>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: "", quantity: 1 }]);
  }

  async function handleSubmit() {
    const validLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (!clientId || validLines.length === 0) {
      toast.error("Client et au moins une ligne valide sont requis");
      return;
    }
    setPending(true);
    const result = await createCustomerOrder(clientId, validLines);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Commande créée");
    router.push("/commandes-clients");
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Client</Label>
        <Select
          items={clients.map((c) => ({ value: c.id, label: c.name }))}
          value={clientId}
          onValueChange={(value) => setClientId(value ?? "")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choisir un client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {lines.map((line, index) => (
        <div key={index} className="flex gap-3">
          <Select
            items={products.map((p) => ({ value: p.id, label: p.name }))}
            value={line.productId}
            onValueChange={(value) => updateLine(index, { productId: value ?? "" })}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choisir un produit" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            value={line.quantity}
            onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
            className="w-24"
          />
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addLine}>
        Ajouter une ligne
      </Button>

      <Button type="button" onClick={handleSubmit} disabled={pending} className="block">
        Créer la commande
      </Button>
    </div>
  );
}
