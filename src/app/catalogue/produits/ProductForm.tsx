"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createProduct } from "@/lib/actions/products";

interface SupplierOption {
  id: string;
  name: string;
}

export function ProductForm({ suppliers }: { suppliers: SupplierOption[] }) {
  const [pending, setPending] = useState(false);
  const [supplierId, setSupplierId] = useState("");

  async function handleSubmit(formData: FormData) {
    if (!supplierId) {
      toast.error("Veuillez choisir un fournisseur");
      return;
    }
    formData.set("supplierId", supplierId);
    setPending(true);
    const result = await createProduct(formData);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Produit créé");
  }

  return (
    <form action={handleSubmit} className="grid grid-cols-5 gap-3">
      <div>
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" name="sku" required />
      </div>
      <div>
        <Label htmlFor="name">Nom</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="quantity">Quantité initiale</Label>
        <Input id="quantity" name="quantity" type="number" min={0} defaultValue={0} required />
      </div>
      <div>
        <Label htmlFor="qMin">Seuil Qmin</Label>
        <Input id="qMin" name="qMin" type="number" min={0} required />
      </div>
      <div>
        <Label>Fournisseur</Label>
        <Select value={supplierId} onValueChange={(value) => setSupplierId(value ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending} className="col-span-5 w-fit">
        Ajouter le produit
      </Button>
    </form>
  );
}
