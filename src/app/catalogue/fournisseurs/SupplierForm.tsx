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

  const labelClass = "text-xs tracking-[0.08em] uppercase text-muted-foreground";

  return (
    <form
      action={handleSubmit}
      className="grid grid-cols-3 gap-3 rounded-md border border-border bg-card p-4 shadow-sm"
    >
      <p className="col-span-3 -mb-1 font-heading text-xs font-semibold tracking-[0.14em] text-primary uppercase">
        Ajouter un fournisseur
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="name" className={labelClass}>Nom</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email" className={labelClass}>Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone" className={labelClass}>Téléphone</Label>
        <Input id="phone" name="phone" className="font-mono" />
      </div>
      <Button type="submit" disabled={pending} className="col-span-3 w-fit">
        Ajouter le fournisseur
      </Button>
    </form>
  );
}
