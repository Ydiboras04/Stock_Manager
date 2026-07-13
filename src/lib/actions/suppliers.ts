"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function listSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function createSupplier(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name || !email) {
    return { success: false as const, error: "Nom et email sont requis" };
  }

  try {
    await prisma.supplier.create({ data: { name, email, phone } });
    revalidatePath("/catalogue/fournisseurs");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Erreur lors de la création du fournisseur" };
  }
}
