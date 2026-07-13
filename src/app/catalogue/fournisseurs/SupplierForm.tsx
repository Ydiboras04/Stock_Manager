"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createSupplier } from "@/lib/actions/suppliers";

export function SupplierForm() {
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await createSupplier(formData);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Fournisseur créé");
  }

  return (
    <form action={handleSubmit} className="grid grid-cols-3 gap-3">
      <div>
        <Label htmlFor="name">Nom</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="phone">Téléphone</Label>
        <Input id="phone" name="phone" />
      </div>
      <Button type="submit" disabled={pending} className="col-span-3 w-fit">
        Ajouter le fournisseur
      </Button>
    </form>
  );
}
